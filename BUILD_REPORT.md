# QR AJN V4 Build Report

Build date: 2026-08-20

## Verified locally

- `npm run verify` — PASS
- QR engine structural test — PASS
- Advanced redirect logic test — PASS
- Production project structure test — PASS
- Node syntax checks for client backend and all Vercel API functions — PASS
- Local static server route check — PASS for `/`, `/auth`, `/dashboard`, `/business-profiles`, `/b/test`, and logo asset

## Important production dependencies

The source is ready to push, but the following are external deployment configuration and cannot be embedded safely in the ZIP:

- Merge the included QR AJN Realtime Database rules into the shared Firebase project.
- Merge the included Storage rule blocks.
- Enable required Authentication providers and authorized domains.
- Configure Vercel server environment secrets from `PRODUCTION_SETUP.md`.
- Create/link a dedicated Vercel project for `zyreel-ai/qr-ajn`.
- Attach `qrajn.online` and `www.qrajn.online`, configure exact DNS records, and confirm HTTPS.
- Run the real-device acceptance tests in `PRODUCTION_SETUP.md`.

No service-account private key is included in this build.
