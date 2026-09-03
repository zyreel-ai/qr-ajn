# QR AJN V8.4 — Professional QR + Public Profiles + Live Analytics

A focused QR AJN release built around three product flows:

1. Create professional QR codes.
2. Create public `qrajn.online/yourname` style profiles without accounts.
3. Track real scans, profile views and actions through private management links.

## V8.4 UI

- Soft-blue atmospheric background with the approved OKLCH indigo design system.
- Manrope-first typography stack with offline-safe system fallbacks; JetBrains Mono-style stack for URLs/technical IDs.
- Professional translucent cards, consistent radii, restrained motion and reduced-motion support.
- Responsive desktop/mobile layout with sticky QR preview and mobile actions.
- No personal demo identity and no fake analytics metrics.

## QR creator

- Static QR: URL, text, Wi-Fi, phone, SMS, email, WhatsApp, location and vCard.
- Trackable QR: permanent redirect + private analytics management link.
- QR templates: Minimal, Business, Professional, Social, Ocean and Emerald.
- Color presets and custom QR/eye/background colors.
- Square, rounded and dot module styles; square/rounded finder-eye styles.
- Logo upload with safe size limits and automatic high-ECC recommendation.
- Transparent background, quiet-zone control, ECC L/M/Q/H and exact export sizes.
- Professional Light/Dark/Card/Phone preview surfaces.
- Optional Rounded Card and Scan Label export frames.
- PNG and SVG downloads, copy and native-share fallback.
- Scan-quality indicator checks contrast, quiet zone, logo size and ECC.

## Profiles

- No login/signup/account/workspace.
- Unique public slug and reserved-name protection.
- Templates: Minimal, Professional, Business, Portfolio, Restaurant and Creator.
- Accent choices: Indigo, Ocean, Emerald, Graphite, Slate, Rose and Amber.
- Generic `✓ Published` status; it is not an identity-verification claim.
- Contact, social links, custom links, logo, cover, PDFs and clean PDF links.
- Local draft recovery and unsaved-change warning.
- Private management URL to edit/pause/delete and view analytics.

## Analytics

- QR scans, profile views and actions are separate metrics.
- Today / 7D / 30D chart ranges.
- Scans / Views / Actions graph selection for profile analytics.
- Devices, browsers, top actions and readable recent activity.
- Approximate privacy-safe unique visitor count.
- Visible tabs refresh about every 5 seconds; hidden tabs back off to reduce requests.
- Existing data stays visible during temporary refresh failures.
- No fake graph data.

## Data and security

- Local JSON persistence in `web_dashboard/data/local-db.json`.
- Serialized database mutation queue prevents lost concurrent scan increments.
- Private management tokens are stored as SHA-256 hashes.
- Request size limits, upload validation, URL protocol validation, rate limiting and security headers.
- PDF and image uploads are local.
- No billing/Razorpay.
- No Google Cloud Functions.
- No automatic Git/Vercel/cloud deployment.

## Run

From the extracted ZIP root:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force
.\START_QR_AJN_V8_4_PRO.ps1
```

The launcher runs source verification and automated tests, finds a free port starting at 4173, starts the local server, detects a LAN address when possible and opens the browser.

For real phone QR testing, keep the PC and phone on the same Wi-Fi and use the LAN URL shown by the launcher.
