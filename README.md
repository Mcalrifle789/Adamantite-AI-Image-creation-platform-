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

## Environment Variables

Set these in Vercel when enabling server/API features:

- `AUTH_SECRET`: required by the server environment layer; use a long random value.
- `ADAMANTITE_PROVIDER_API_KEY`: optional for the current mock milestone; later this should be the shared provider key that funds all model adapters.
- `MOCK_LATENCY_SCALE`: optional, defaults to `1`.
- `MOCK_FAILURE_RATE`: optional, defaults to `0`.

The current subscription and owner wallet flow is a browser-local simulation. It records the intended 50/50 split between owner wallet and provider funding pool in `localStorage`; it does not move real money until a payment processor and payout integration are added.
