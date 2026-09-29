import { Router } from 'express';
import Doc from '../models/Doc.js';

const router = Router();
const isPaid = (d) => d.kind === 'book' && d.priceCents > 0;

router.get('/admin/status', (_req, res) => res.json({ protected: !!process.env.ADMIN_PASSWORD }));

router.get('/docs/public/:slug', async (req, res, next) => {
  try {
    const d = await Doc.findOne({ slug: req.params.slug, published: true });
    if (!d) return res.status(404).json({ error: 'This page is not published.' });
    const base = { title: d.title, kind: d.kind, priceCents: d.priceCents, updatedAt: d.updatedAt };
    res.json(isPaid(d) ? { ...base, paywalled: true, content: d.content.slice(0, 1500) } : { ...base, paywalled: false, content: d.content });
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
