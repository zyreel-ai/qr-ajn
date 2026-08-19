# QRForge / QR AJN — Firebase Realtime Production Build

Production domain: **https://qrajn.online**

This build removes the seeded/demo scan database and connects the application UI directly to Firebase for real authentication, real Realtime Database persistence, real-time listeners, and Firebase Storage branding assets.

## What is real

- Firebase Email/Password Authentication
- Google sign-in flow
- Firebase password reset
- Email verification message after sign-up
- Firebase Realtime Database workspace data
- Real-time QR list, branding, settings and scan analytics listeners
- Firebase Storage logo uploads
- Dynamic redirect links at `https://qrajn.online/r/<shortId>`
- Real scan events created only when somebody actually opens a dynamic QR redirect
- Scan time, device class, browser, OS, language, browser timezone, referrer and screen size
- PNG / SVG / JPG / WebP QR export
- Dynamic destination editing without changing the QR image
- Static Wi-Fi, vCard, email, SMS, phone, location and text QR payloads
- Responsive desktop/tablet/mobile UI, including mobile bottom navigation

## Privacy

The redirect flow does **not** request GPS. A scan event does not pretend to know a city when it does not. Precise location can only be added later with a consent-based location flow or a trusted server-side GeoIP provider.

## Firebase project

This build uses the Firebase web app configuration supplied for:

`unna-space-prod-226ff4`

Because that project may also contain UNNA Space data, QRForge data is isolated under:

```text
/qrajn/users/{uid}
/qrajn/publicLinks/{shortId}
/qrajn/publicBranding/{uid}
/qrajn/scanEvents/{ownerUid}/{eventId}
```

Do not delete or overwrite unrelated Firebase data.

## Local run

Requirements: Node.js 20+ and internet access (the browser loads Firebase's official ESM SDK).

```powershell
cd "QR_AJN_PRODUCTION_REALTIME"
npm.cmd run verify
npm.cmd start
```

Open:

`http://localhost:4173`

## Required Firebase Console setup

Before authentication and scan analytics will work, enable:

1. Authentication -> Sign-in method -> Email/Password
2. Authentication -> Sign-in method -> Google
3. Authentication -> Sign-in method -> Anonymous
4. Authentication -> Settings -> Authorized domains:
   - `qrajn.online`
   - `www.qrajn.online`
   - your Vercel preview domain while testing
   - `localhost`
5. Realtime Database rules: merge `firebase/database.rules.qrajn-snippet.json` into the existing rules under the root `rules` object.
6. Storage rules: merge `firebase/storage.rules.qrajn-snippet.txt` into the existing Storage rules.

**Important:** this repository intentionally does not auto-deploy Realtime Database or Storage rules, because replacing the whole ruleset in the shared `unna-space-prod-226ff4` project could break unrelated applications.

## Vercel

`vercel.json` is already configured for SPA routes and dynamic `/r/:shortId` links.

Recommended Vercel settings:

- Framework preset: Other
- Root directory: repository root
- Build command: leave empty
- Output directory: `public`
- Install command: leave empty

After deployment, add `qrajn.online` and `www.qrajn.online` under Project -> Settings -> Domains and point your DNS to the values Vercel shows.

## GitHub

The connected GitHub account currently needs a dedicated QR repository before this project can be pushed safely. Do **not** push QRForge into an unrelated AJN PDF repository.

If GitHub CLI is installed and authenticated:

```powershell
.\scripts\CONNECT_GITHUB.ps1 -Repository "ajnpdf/qr-ajn"
```

The script can create the repository and push `main`.

## Verification

```powershell
npm.cmd run verify
```

The verification checks the QR encoder, required Firebase configuration, qrajn namespace isolation, Vercel routing and absence of seeded/demo scan data.
