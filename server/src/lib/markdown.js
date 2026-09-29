import { marked } from 'marked';

// Splits Markdown into chapters on top-level "# " headings, ignoring "#" inside code fences.
export function splitChapters(md = '', fallbackTitle = 'Untitled') {
  const chapters = [];
  let cur = null;
  let fenced = false;
  for (const line of md.split('\n')) {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const h = !fenced && line.match(/^# (.+)/);
    if (h) {
      cur = { title: h[1].trim(), lines: [] };
      chapters.push(cur);
    } else {
      if (!cur) {
        cur = { title: fallbackTitle, lines: [] };
        chapters.push(cur);
      }
      cur.lines.push(line);
    }
  }
  if (!chapters.length) chapters.push({ title: fallbackTitle, lines: [] });
  return chapters.map((c) => ({ title: c.title, content: marked.parse(c.lines.join('\n')) || '<p></p>' }));
}

export const lexer = (md) => marked.lexer(md || '');
