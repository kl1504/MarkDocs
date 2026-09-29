import PDFDocument from 'pdfkit';
import epubModule from 'epub-gen-memory';
import { splitChapters, lexer } from './markdown.js';

const epub = epubModule.default || epubModule;

export const toMarkdown = (doc) => doc.content || '';

export async function toEpub(doc) {
  return epub({ title: doc.title, author: 'Folio', lang: 'en' }, splitChapters(doc.content, doc.title));
}

const inline = (t = '') =>
  t.replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/(\*\*|__|\*|_|`)/g, '');

export function toPdf(doc) {
  return new Promise((resolve, reject) => {
    const pdf = new PDFDocument({ margin: 64, info: { Title: doc.title } });
    const chunks = [];
    pdf.on('data', (c) => chunks.push(c));
    pdf.on('end', () => resolve(Buffer.concat(chunks)));
    pdf.on('error', reject);
    const sizes = [22, 18, 15, 13, 12, 12];
    pdf.font('Helvetica-Bold').fontSize(28).text(doc.title, { align: 'center' });
    pdf.moveDown(2);
    for (const t of lexer(doc.content)) {
      if (t.type === 'heading') {
        pdf.moveDown(0.6).font('Helvetica-Bold').fontSize(sizes[t.depth - 1]).text(inline(t.text));
        pdf.moveDown(0.3);
      } else if (t.type === 'paragraph') {
        pdf.font('Helvetica').fontSize(11).text(inline(t.text), { align: 'justify' });
        pdf.moveDown(0.6);
      } else if (t.type === 'code') {
        pdf.font('Courier').fontSize(9).text(t.text);
        pdf.moveDown(0.6);
      } else if (t.type === 'list') {
        t.items.forEach((it, i) =>
          pdf.font('Helvetica').fontSize(11).text(`${t.ordered ? `${i + 1}.` : '•'} ${inline(it.text)}`, { indent: 12 })
        );
        pdf.moveDown(0.6);
      } else if (t.type === 'blockquote') {
        pdf.font('Helvetica-Oblique').fontSize(11).text(inline(t.text), { indent: 18 });
        pdf.moveDown(0.6);
      }
    }
    pdf.end();
  });
}

const TYPES = { md: 'text/markdown; charset=utf-8', epub: 'application/epub+zip', pdf: 'application/pdf' };

export async function sendExport(res, doc, fmt) {
  if (!TYPES[fmt]) return res.status(400).json({ error: 'Unknown format. Use md, epub, or pdf.' });
  const body = fmt === 'md' ? toMarkdown(doc) : fmt === 'epub' ? await toEpub(doc) : await toPdf(doc);
  res.attachment(`${doc.slug || 'document'}.${fmt}`);
  res.set('Content-Type', TYPES[fmt]);
  res.send(body);
}
