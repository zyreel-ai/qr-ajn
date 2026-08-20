# QR AJN V4 — Dynamic QR + Business Profiles

QR AJN is a responsive QR management and business-profile application for `qrajn.online`.

## What is implemented

- Email/password and Google account access.
- Real-time QR workspace updates.
- Dynamic website QR codes with stable short links.
- Static Text, Email, SMS, Phone, Wi-Fi, vCard and Location QR codes.
- PNG, SVG, JPG and WebP export.
- Optional scan-page branding.
- QR labels and status controls.
- Expiry date/time and maximum-scan rules.
- Schedule start/end rules with fallback URL.
- Password-protected dynamic redirects through the server endpoint.
- Consent-based QR lead capture.
- Device, country and language smart targeting.
- UTM campaign parameters.
- Custom-domain DNS ownership check.
- Multiple Business Profiles per account.
- Public business URLs at `/b/<slug>` with no customer login.
- Business products, services, offers, hours, contact actions, social links, brochure/review/UPI actions.
- Optional Business Profile logo, cover and colors.
- Business enquiry forms and action analytics.
- Server-side scan recording with coarse edge location headers when available; no browser GPS request.
- Mobile bottom navigation, tablet layouts, desktop layouts and reduced-motion support.

## Local preview

Requires Node.js 22+.

```powershell
npm.cmd run verify
npm.cmd start
```

Open `http://localhost:4173`.

Local preview uses the browser fallback for ordinary dynamic QR redirects. Password-protected redirects and server-controlled lead collection require the deployment environment described in `PRODUCTION_SETUP.md`.

## Security model

The client owns only its own `qrajn/users/{uid}` workspace. Public link/profile mirrors are readable only at individual public paths. Scanner event/lead writes are shape-validated. `qrajn/qrSecrets` is denied to all clients and is written only by the server using privileged credentials.

Because the configured Firebase project is shared with another application, merge the QR AJN rule blocks instead of replacing unrelated global rules.

## Production

Read `PRODUCTION_SETUP.md` before deploying. Do not call the application production-complete until signup/login, dynamic QR creation, second-device scan analytics, destination editing, deactivation, business-profile publishing, enquiry capture and the public domain are verified on real devices.
