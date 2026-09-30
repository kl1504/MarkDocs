import { Router } from 'express';
import crypto from 'crypto';
import Stripe from 'stripe';
import Doc from '../models/Doc.js';
import Order from '../models/Order.js';
import { sendExport } from '../lib/export.js';

const router = Router();
const currency = () => (process.env.CURRENCY || 'usd').toLowerCase();
const sellable = (slug) => Doc.findOne({ slug: String(slug), published: true, kind: 'book', priceCents: { $gt: 0 } });
const base = (req) => req.body?.returnTo || req.headers.origin || (process.env.CLIENT_URL || 'http://localhost:3000').split(',')[0];

// A browser always sends Origin on a cross-site fetch/XHR POST. Checking it here stops
// a third-party page from silently starting checkouts on a visitor's behalf, while still
// allowing the book's own custom domain (readers buy from the page they're actually on)
// and direct, non-browser calls (which have no Origin to spoof anyway).
export function originAllowed(req, doc) {
  const origin = req.headers.origin;
  if (!origin) return true;
  const allowed = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',').map((s) => s.trim()).filter(Boolean);
  if (allowed.includes(origin)) return true;
  if (doc.customDomain && origin === `https://${doc.customDomain}`) return true;
  return false;
}

const newOrder = (doc, provider) =>
  Order.create({ doc: doc._id, title: doc.title, slug: doc.slug, content: doc.content, provider, amountCents: doc.priceCents, token: crypto.randomBytes(24).toString('hex') });

router.post('/checkout/stripe', async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Card payments are not set up yet.' });
    const doc = await sellable(req.body?.slug);
    if (!doc) return res.status(404).json({ error: 'This book is not for sale.' });
    if (!originAllowed(req, doc)) return res.status(403).json({ error: 'Checkout must be started from the book\u2019s own page.' });
    const order = await newOrder(doc, 'stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: currency(), unit_amount: doc.priceCents, product_data: { name: doc.title } } }],
      success_url: `${base(req)}/d/${doc.slug}?order=${order.token}`,
      cancel_url: `${base(req)}/d/${doc.slug}`,
      metadata: { orderToken: order.token },
    });
    order.providerRef = session.id;
    await order.save();
    res.json({ url: session.url });
  } catch (err) {
    next(err);
  }
});

const PP = () => (process.env.PAYPAL_ENV === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com');
async function paypalToken() {
  const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_SECRET}`).toString('base64');
  const r = await fetch(`${PP()}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  if (!r.ok) throw new Error('PayPal authentication failed');
  return (await r.json()).access_token;
}

router.post('/checkout/paypal', async (req, res, next) => {
  try {
    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_SECRET) return res.status(503).json({ error: 'PayPal is not set up yet.' });
    const doc = await sellable(req.body?.slug);
    if (!doc) return res.status(404).json({ error: 'This book is not for sale.' });
    if (!originAllowed(req, doc)) return res.status(403).json({ error: 'Checkout must be started from the book\u2019s own page.' });
    const order = await newOrder(doc, 'paypal');
    const r = await fetch(`${PP()}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${await paypalToken()}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{ description: doc.title.slice(0, 120), amount: { currency_code: currency().toUpperCase(), value: (doc.priceCents / 100).toFixed(2) } }],
        payment_source: { paypal: { experience_context: { return_url: `${base(req)}/d/${doc.slug}?order=${order.token}`, cancel_url: `${base(req)}/d/${doc.slug}`, user_action: 'PAY_NOW' } } },
      }),
    });
    const data = await r.json();
    const link = (data.links || []).find((l) => ['payer-action', 'approve'].includes(l.rel));
    if (!r.ok || !link) return res.status(502).json({ error: 'PayPal could not start the payment.' });
    order.providerRef = data.id;
    await order.save();
    res.json({ url: link.href });
  } catch (err) {
    next(err);
  }
});

router.post('/checkout/paypal/capture', async (req, res, next) => {
  try {
    const { order: token, paypalOrderId } = req.body || {};
    const order = await Order.findOne({ token: String(token), provider: 'paypal' });
    if (!order || order.providerRef !== paypalOrderId) return res.status(404).json({ error: 'Order not found.' });
    if (order.status !== 'paid') {
      const r = await fetch(`${PP()}/v2/checkout/orders/${paypalOrderId}/capture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${await paypalToken()}`, 'Content-Type': 'application/json' },
      });
      if ((await r.json()).status === 'COMPLETED') {
        order.status = 'paid';
        order.expireAt = undefined;
        await order.save();
      }
    }
    res.json({ status: order.status });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:token', async (req, res, next) => {
  try {
    const order = await Order.findOne({ token: req.params.token });
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    const doc = await Doc.findById(order.doc).select('slug published');
    res.json({ status: order.status, title: order.title, slug: order.slug, linkStillLive: !!doc?.published });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:token/download.:fmt', async (req, res, next) => {
  try {
    const order = await Order.findOne({ token: req.params.token, status: 'paid' });
    if (!order) return res.status(402).json({ error: 'Payment not confirmed yet.' });
    // Served from the snapshot taken at purchase time, so it never depends on
    // the original document still existing or being unchanged.
    await sendExport(res, { title: order.title, slug: order.slug, content: order.content }, req.params.fmt);
  } catch (err) {
    next(err);
  }
});

export default router;
