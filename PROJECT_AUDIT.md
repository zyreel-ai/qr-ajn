# QR AJN V4 Production Audit

## Completed in this build

- Public brand normalized to QR AJN.
- legacy brand/paywall placeholder UI removed.
- Technical backend/project wording removed from customer-facing screens.
- Modern green/teal/navy UI with animated ambient background.
- Mobile/tablet/desktop responsive layouts and reduced-motion support.
- New QR AJN logo and local business-profile illustration assets.
- Business Profiles with optional branding, products, services, offers, contact actions and leads.
- Labels, expiry, schedule, password, lead capture, targeting, UTM and domain UI/persistence.
- Secure server endpoints for password secrets, custom-domain DNS check and advanced redirect evaluation.
- Server-only password verifier path.
- Server scan metadata uses edge country/region/city when available; browser GPS is not requested.
- Realtime Database and Storage rules expanded for the new model.
- Automated QR encoder, redirect logic and production structure checks.

## Must still be verified in the real deployment

- Firebase provider configuration and merged production rules.
- Vercel Admin environment secrets.
- Dedicated QR AJN Vercel project.
- `qrajn.online` / `www.qrajn.online` DNS and HTTPS.
- Real-device acceptance tests.
- Custom domains must be attached to Vercel after DNS ownership verification.
