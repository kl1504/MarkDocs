# Folio

Write professional documentation and sell books from one Markdown workspace, as an installable PWA.

**Stack:** Next.js 14 (App Router) · React 18 · Material-UI · Express · Mongoose · MongoDB

## What works today

- Marketing landing page at `/`
- Writing workspace at `/app`: create, edit, delete Markdown documents
- Publish a document to a public page at `/d/<slug>`, or on your own domain
- Two content types: **Documentation** (always fully public once published) and **Book** (free, or paid)
- Paid books: preview only until purchase, checkout with **Stripe** or **PayPal**, then EPUB/PDF download
- Export any document as **Markdown, EPUB, or PDF**
- Automatic version history on every save, with one-click restore
- Full-text search across published content (`GET /api/search?q=`)
- Installable PWA (manifest, icons, offline-capable service worker in production builds)
- Optional single-password protection for the editing API and workspace
- The `/app` workspace and the landing page (`/`) both have a French/English toggle (top right), remembered per browser and shared between the two

## Roadmap

- Multiple editor accounts (today there is one shared admin password, not per-user accounts)
- Themes for docs sites
- Automated tests for the checkout flow against Stripe's and PayPal's sandboxes

## Project structure

```
.
├── server/                 Express API
│   └── src/
│       ├── app.js          Express app: security headers, CORS, rate limits, routing
│       ├── index.js        entry point, Mongo connection
│       ├── models/         Doc, Version, Order (Mongoose)
│       ├── routes/         docs.js (admin), public.js, checkout.js, webhooks.js
│       ├── middleware/     admin.js (password check)
│       └── lib/            markdown.js, export.js (EPUB/PDF generation)
│   └── test/                node:test unit tests
├── web/                    Next.js + Material-UI PWA
│   ├── app/
│   │   ├── route.js         serves the landing page at "/"
│   │   ├── app/              the writing workspace (AdminGate + Editor)
│   │   └── d/[slug]/         public doc/book page + BuyBook checkout UI
│   ├── landing/index.html   the marketing page
│   ├── lib/api.js           API client (attaches the admin password, if set)
│   └── public/               manifest.json, sw.js, icons
├── docker-compose.yml       local MongoDB only
├── docker-compose.prod.yml  reference production compose (Mongo + API + web)
└── .github/workflows/ci.yml
```

## Quick start (local development)

Requirements: Node.js 18.18+ and Docker (or any MongoDB instance).

```bash
docker compose up -d                       # MongoDB on :27017
cp server/.env.example server/.env         # adjust MONGODB_URI if needed; leave ADMIN_PASSWORD empty for open local dev
cp web/.env.example web/.env.local
npm install
npm run dev
```

- Landing page: http://localhost:3000
- Writing workspace: http://localhost:3000/app
- API health check: http://localhost:4000/api/health

## Security

- **Admin password.** Set `ADMIN_PASSWORD` in `server/.env` to protect every write to `/api/docs` (create, edit, delete, export, history). Without it, anyone who can reach the API can edit and delete every document — fine for local development, not for anything public. The server logs a warning at startup in production if it is unset. The password is checked with a constant-time comparison and is never persisted client-side beyond the current browser tab (`sessionStorage`).
- **CORS.** The editing API only accepts requests from the origins listed in `ALLOWED_ORIGINS` (defaults to `CLIENT_URL`). Public read endpoints and checkout stay open to any origin, since a published docs site may run on a reader's own domain.
- **Rate limiting.** All API routes are limited per IP (600 requests / 15 min); checkout is limited more tightly (30 / 15 min) to slow down payment abuse.
- **Security headers.** `helmet` sets standard hardening headers (no inline `X-Powered-By`, sensible defaults for framing, sniffing, etc.).
- **Input validation.** Title, content, price, and custom-domain fields are length-checked and type-checked server-side (not just in the UI); Mongoose validation errors return a 400 with a clear message instead of a 500.
- **Payments.** Stripe sessions and PayPal orders are created server-side; a Stripe order is only marked paid from the signed webhook (`STRIPE_WEBHOOK_SECRET`), not from the browser redirect, so a user can't fake a purchase by editing the URL. Download links for paid content require a real `paid` order.
- **What is still missing:** per-user accounts (there is one shared admin password), audit logging, and 2FA. If you need multiple editors with separate permissions, that is the next thing to build before a multi-person launch.

## Environment variables

| File | Variable | Purpose |
| --- | --- | --- |
| `server/.env` | `PORT` | API port (default 4000) |
| | `MONGODB_URI` | MongoDB connection string |
| | `CLIENT_URL` | Your web app's URL, used for CORS default and payment redirects |
| | `ALLOWED_ORIGINS` | Comma-separated origins allowed to use `/api/docs` (defaults to `CLIENT_URL`) |
| | `ADMIN_PASSWORD` | Protects editing. Strongly recommended outside local development |
| | `CURRENCY` | ISO currency code for checkout, e.g. `usd` |
| | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Enable card payments |
| | `PAYPAL_CLIENT_ID`, `PAYPAL_SECRET`, `PAYPAL_ENV` | Enable PayPal (`PAYPAL_ENV` is `sandbox` or `live`) |
| `web/.env.local` | `NEXT_PUBLIC_API_URL` | API URL used by the browser |
| | `API_URL` | API URL used by server-side rendering |

Leave a payment provider's keys empty to disable it; its checkout button then returns a clear "not set up yet" error instead of failing silently.

### Setting up Stripe

1. Get your secret key from the [Stripe dashboard](https://dashboard.stripe.com/apikeys) and set `STRIPE_SECRET_KEY`.
2. Add a webhook endpoint pointing to `https://your-api/api/webhooks/stripe`, listening for `checkout.session.completed`, and set `STRIPE_WEBHOOK_SECRET` to its signing secret.

### Setting up PayPal

1. Create an app in the [PayPal developer dashboard](https://developer.paypal.com/dashboard/applications) and set `PAYPAL_CLIENT_ID` and `PAYPAL_SECRET`.
2. Use `PAYPAL_ENV=sandbox` while testing, `live` once you're ready to accept real payments.

## API

Public routes need no authentication. Everything under `/api/docs` requires the admin password as `Authorization: Bearer <ADMIN_PASSWORD>` when one is set.

| Method | Route | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/admin/status` | no | Whether an admin password is required |
| GET | `/api/docs` | admin | List documents |
| POST | `/api/docs` | admin | Create a document |
| GET | `/api/docs/:id` | admin | Read a document |
| PUT | `/api/docs/:id` | admin | Update title, content, kind, price, published state, or domain |
| DELETE | `/api/docs/:id` | admin | Delete a document |
| GET | `/api/docs/:id/versions` | admin | List saved snapshots |
| POST | `/api/docs/:id/versions/:vid/restore` | admin | Restore a snapshot |
| GET | `/api/docs/:id/export.:fmt` | admin | Export as `md`, `epub`, or `pdf` |
| GET | `/api/docs/public/:slug` | no | Read a published document (preview only if it's a paid book) |
| GET | `/api/docs/by-domain/:host` | no | Resolve a custom domain to a slug |
| GET | `/api/search?q=` | no | Full-text search across published content |
| POST | `/api/checkout/stripe` \| `/paypal` | no | Start a checkout session for a paid book |
| POST | `/api/checkout/paypal/capture` | no | Confirm a PayPal payment after redirect |
| GET | `/api/orders/:token` | no | Check an order's status |
| GET | `/api/orders/:token/download.:fmt` | no | Download a purchased book (only once paid) |
| POST | `/api/webhooks/stripe` | signed | Stripe payment confirmation webhook |

## Tests

```bash
npm test
```

Covers Markdown chapter-splitting, EPUB/PDF export, and the admin password check.

## Production

```bash
npm run build
npm start
```

Or with Docker:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Set real values for every variable in `docker-compose.prod.yml` (`CLIENT_URL`, `API_URL`, `ADMIN_PASSWORD`, and your payment keys) via a `.env` file or your host's secret manager. Put both services behind HTTPS (a reverse proxy like Caddy or nginx, or your platform's built-in TLS) before going live; the app itself does not terminate TLS.

## Copyright

Copyright (c) 2026 Folio. All rights reserved.
