import Stripe from 'stripe';
import Order from '../models/Order.js';

// Mounted with express.raw() so the signature can be verified.
export async function stripeWebhook(req, res) {
  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) return res.status(503).end();
  let event;
  try {
    event = new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(req.body, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return res.status(400).send('Invalid signature');
  }
  if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
    const s = event.data.object;
    if (s.payment_status === 'paid') await Order.updateOne({ token: s.metadata?.orderToken, provider: 'stripe' }, { status: 'paid' });
  }
  res.json({ received: true });
}
