import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import publicRoutes from './routes/public.js';
import docRoutes from './routes/docs.js';
import checkoutRoutes from './routes/checkout.js';
import { stripeWebhook } from './routes/webhooks.js';
import { requireAdmin } from './middleware/admin.js';

const limiter = (limit) => rateLimit({ windowMs: 15 * 60 * 1000, limit, standardHeaders: true, legacyHeaders: false });

// Origins allowed to call the editing API (/api/docs). Public read routes and
// checkout stay open to any origin, since docs sites may run on custom domains.
function adminOrigins() {
  const list = (process.env.ALLOWED_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
    .split(',').map((s) => s.trim()).filter(Boolean);
  return (origin, cb) => cb(null, !origin || list.includes(origin));
}

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), stripeWebhook);
  app.use(express.json({ limit: '2mb' }));
  app.use('/api', limiter(600));
  app.use('/api/checkout', limiter(30));
  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', cors(), publicRoutes);
  app.use('/api', cors(), checkoutRoutes);
  app.use('/api/docs', cors({ origin: adminOrigins(), exposedHeaders: ['Content-Disposition'] }), requireAdmin, docRoutes);
  app.use((req, res) => res.status(404).json({ error: 'Not found.' }));
  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong on our side.' });
  });
  return app;
}
