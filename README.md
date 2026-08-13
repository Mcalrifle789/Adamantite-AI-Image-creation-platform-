# Adamantite Agent

Next.js App Router site for the Adamantite image/video generation product surface.

## Vercel Deployment

Import this GitHub repository into Vercel as a Next.js project.

- Install command: `npm ci`
- Build command: `npm run build`
- Output directory: Vercel detects this automatically for Next.js
- Node version: `>=22`, declared in `package.json`

The public product pages are static/client-rendered and build without secrets:

- `/`
- `/pricing`
- `/workspace/demo`
- `/owner/wallet`

Caching and security headers are configured in `next.config.ts`. Vercel provides HTTPS/SSL
automatically for production domains; keep Vercel's Firewall/WAF enabled on the project and require
MFA on the Vercel and Stripe accounts that can deploy or manage payments.

## Environment Variables

Set these in Vercel before enabling real checkout:

- `AUTH_SECRET`: required by the server environment layer; use a long random value.
- `ADAMANTITE_PROVIDER_API_KEY`: optional for the current mock milestone; later this should be the shared provider key that funds all model adapters.
- `STRIPE_SECRET_KEY`: Stripe secret key for Checkout Sessions.
- `STRIPE_WEBHOOK_SECRET`: signing secret for the `/api/stripe/webhook` endpoint.
- `OWNER_STRIPE_CONNECTED_ACCOUNT_ID`: Stripe Connect account that receives the owner half.
- `PROVIDER_STRIPE_CONNECTED_ACCOUNT_ID`: Stripe Connect account that receives the provider/API-funding half.
- `SITE_URL`: canonical production URL, for example `https://adamantite.example.com`.
- `MOCK_LATENCY_SCALE`: optional, defaults to `1`.
- `MOCK_FAILURE_RATE`: optional, defaults to `0`.

## Stripe Checkout

The pricing buttons call `/api/stripe/checkout`, which creates a real Stripe Checkout Session for
the selected plan. Stripe hosts the payment-method collection screen. Configure your Stripe webhook
to send `checkout.session.completed` events to:

`https://YOUR_DOMAIN/api/stripe/webhook`

On successful payment, the webhook creates two Stripe Connect transfers:

- 50% to `OWNER_STRIPE_CONNECTED_ACCOUNT_ID`
- 50% to `PROVIDER_STRIPE_CONNECTED_ACCOUNT_ID`

The provider half is the funding pool for the shared upstream API key that fans out to all image
and video model adapters.
