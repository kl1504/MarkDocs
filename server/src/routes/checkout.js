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
const newOrder = (doc, provider) =>
  Order.create({ doc: doc._id, provider, amountCents: doc.priceCents, token: crypto.randomBytes(24).toString('hex') });

router.post('/checkout/stripe', async (req, res, next) => {
  try {
    if (!process.env.STRIPE_SECRET_KEY) return res.status(503).json({ error: 'Card payments are not set up yet.' });
    const doc = await sellable(req.body?.slug);
    if (!doc) return res.status(404).json({ error: 'This book is not for sale.' });
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
    const order = await Order.findOne({ token: req.params.token }).populate('doc', 'title slug');
    if (!order) return res.status(404).json({ error: 'Order not found.' });
    res.json({ status: order.status, doc: order.doc });
  } catch (err) {
    next(err);
  }
});

router.get('/orders/:token/download.:fmt', async (req, res, next) => {
  try {
    const order = await Order.findOne({ token: req.params.token, status: 'paid' }).populate('doc');
    if (!order?.doc) return res.status(402).json({ error: 'Payment not confirmed yet.' });
    await sendExport(res, order.doc, req.params.fmt);
  } catch (err) {
    next(err);
  }
});

export default router;
