import { Router } from 'express';
import crypto from 'crypto';
import Doc from '../models/Doc.js';
import Version from '../models/Version.js';
import { sendExport } from '../lib/export.js';

const router = Router();
const MAX_VERSIONS = 30;
const slugify = (t) =>
  t.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 60) || 'untitled';

function pick(b = {}) {
  const out = {};
  if ('title' in b) out.title = String(b.title).trim().slice(0, 200);
  if ('content' in b) out.content = String(b.content).slice(0, 500_000);
  if ('kind' in b && ['doc', 'book'].includes(b.kind)) out.kind = b.kind;
  if ('published' in b) out.published = !!b.published;
  if ('priceCents' in b) out.priceCents = Math.min(100_000_00, Math.max(0, Math.round(Number(b.priceCents) || 0)));
  if ('customDomain' in b)
    out.customDomain = String(b.customDomain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').slice(0, 253);
  return out;
}

async function snapshot(doc) {
  await Version.create({ doc: doc._id, title: doc.title, content: doc.content });
  const old = await Version.find({ doc: doc._id }).sort({ createdAt: -1 }).skip(MAX_VERSIONS).select('_id');
  if (old.length) await Version.deleteMany({ _id: { $in: old.map((v) => v._id) } });
}

function onSaveError(err, res, next) {
  if (err.code === 11000) return res.status(409).json({ error: 'That domain is already used by another document.' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: Object.values(err.errors)[0]?.message || 'Invalid data.' });
  next(err);
}

const isObjectId = (req, res, next) =>
  /^[a-f0-9]{24}$/i.test(req.params.id) ? next() : res.status(400).json({ error: 'Invalid document id.' });

router.get('/', async (_req, res, next) => {
  try {
    res.json(await Doc.find().select('-content').sort({ updatedAt: -1 }));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const data = pick(req.body);
    if (!data.title) return res.status(400).json({ error: 'A title is required.' });
    if (!data.customDomain) delete data.customDomain;
    const slug = `${slugify(data.title)}-${crypto.randomBytes(2).toString('hex')}`;
    res.status(201).json(await Doc.create({ ...data, slug }));
  } catch (err) {
    onSaveError(err, res, next);
  }
});

router.use('/:id', isObjectId);

router.get('/:id', async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    res.json(doc);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', async (req, res, next) => {
  try {
    const prev = await Doc.findById(req.params.id);
    if (!prev) return res.status(404).json({ error: 'Document not found.' });
    const data = pick(req.body);
    if ('title' in data && !data.title) return res.status(400).json({ error: 'Title cannot be empty.' });
    const update = { $set: data };
    if ('customDomain' in data && !data.customDomain) {
      delete data.customDomain;
      update.$unset = { customDomain: 1 };
    }
    if (('content' in data && data.content !== prev.content) || ('title' in data && data.title !== prev.title)) await snapshot(prev);
    res.json(await Doc.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true }));
  } catch (err) {
    onSaveError(err, res, next);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const doc = await Doc.findByIdAndDelete(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    await Version.deleteMany({ doc: doc._id });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get('/:id/versions', async (req, res, next) => {
  try {
    res.json(await Version.find({ doc: req.params.id }).sort({ createdAt: -1 }).limit(MAX_VERSIONS).select('title createdAt'));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/versions/:vid/restore', async (req, res, next) => {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.vid)) return res.status(400).json({ error: 'Invalid version id.' });
    const [doc, ver] = await Promise.all([Doc.findById(req.params.id), Version.findOne({ _id: req.params.vid, doc: req.params.id })]);
    if (!doc || !ver) return res.status(404).json({ error: 'Version not found.' });
    await snapshot(doc);
    doc.title = ver.title;
    doc.content = ver.content;
    res.json(await doc.save());
  } catch (err) {
    onSaveError(err, res, next);
  }
});

router.get('/:id/export.:fmt', async (req, res, next) => {
  try {
    const doc = await Doc.findById(req.params.id);
    if (!doc) return res.status(404).json({ error: 'Document not found.' });
    await sendExport(res, doc, req.params.fmt);
  } catch (err) {
    next(err);
  }
});

export default router;
