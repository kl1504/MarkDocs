import { Router } from 'express';
import Doc from '../models/Doc.js';
import { sendExport } from '../lib/export.js';

const router = Router();
const isPaid = (d) => d.kind === 'book' && d.priceCents > 0;
const PREVIEW_LIMIT = 1500;

// Cuts at the end of the last full paragraph (or, failing that, the last full word)
// at or before the limit, so the preview never stops mid-sentence, mid-link, or
// mid-code-block.
export function safePreview(content) {
  if (content.length <= PREVIEW_LIMIT) return content;
  const slice = content.slice(0, PREVIEW_LIMIT);
  // Prefer the nearest paragraph break, then the nearest sentence end, then just a
  // word boundary — checked in that order so a paragraph break several hundred
  // characters back still wins over a sentence end one character closer.
  const paragraph = slice.lastIndexOf('\n\n');
  const sentence = slice.lastIndexOf('. ');
  const word = slice.lastIndexOf(' ');
  const cut = paragraph > 0 ? paragraph : sentence > 0 ? sentence + 1 : word > 0 ? word : PREVIEW_LIMIT;
  return `${slice.slice(0, cut)}…`;
}

router.get('/admin/status', (_req, res) => res.json({ protected: !!process.env.ADMIN_PASSWORD }));

router.get('/docs/public/:slug', async (req, res, next) => {
  try {
    const d = await Doc.findOne({ slug: req.params.slug, published: true });
    if (!d) return res.status(404).json({ error: 'This page is not published.' });
    const base = { title: d.title, slug: d.slug, kind: d.kind, priceCents: d.priceCents, updatedAt: d.updatedAt };
    res.json(isPaid(d) ? { ...base, paywalled: true, content: safePreview(d.content) } : { ...base, paywalled: false, content: d.content });
  } catch (err) {
    next(err);
  }
});

// Lets a reader download documentation or a free book directly. Paid books are
// only downloadable through /api/orders/:token/download.:fmt, after purchase.
router.get('/docs/public/:slug/export.:fmt', async (req, res, next) => {
  try {
    const d = await Doc.findOne({ slug: req.params.slug, published: true });
    if (!d) return res.status(404).json({ error: 'This page is not published.' });
    if (isPaid(d)) return res.status(402).json({ error: 'Buy this book to download it.' });
    await sendExport(res, d, req.params.fmt);
  } catch (err) {
    next(err);
  }
});

router.get('/docs/by-domain/:host', async (req, res, next) => {
  try {
    const d = await Doc.findOne({ customDomain: req.params.host.toLowerCase(), published: true }).select('slug');
    if (!d) return res.status(404).json({ error: 'No site on this domain.' });
    res.json({ slug: d.slug });
  } catch (err) {
    next(err);
  }
});

router.get('/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim().slice(0, 100);
    if (!q) return res.json([]);
    const rows = await Doc.find({ published: true, $text: { $search: q } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .limit(20);
    const snippet = (c) => {
      const i = Math.max(0, c.toLowerCase().indexOf(q.split(/\s+/)[0].toLowerCase()) - 40);
      return c.slice(i, i + 160).replace(/\s+/g, ' ');
    };
    res.json(rows.map((d) => ({ title: d.title, slug: d.slug, kind: d.kind, snippet: isPaid(d) ? '' : snippet(d.content) })));
  } catch (err) {
    next(err);
  }
});

export default router;
