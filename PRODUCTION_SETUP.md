# QR AJN V4 Production Setup

## 1. Install and verify

Node.js 22 or newer is required because the current Firebase Admin SDK requires Node 22+.

```powershell
npm.cmd install
npm.cmd run verify
```

## 2. Firebase Authentication

Enable:

- Email/Password
- Google
- Anonymous (used by browser fallback and public Business Profile analytics)

Authorized domains should include:

- `localhost`
- `qrajn.online`
- `www.qrajn.online`
- the Vercel preview hostname while testing

## 3. Realtime Database rules

The file `firebase/database.rules.qrajn-snippet.json` contains the complete QR AJN namespace block.

The Firebase project is shared. Do **not** replace unrelated root rules. Merge the `qrajn` object inside the existing root `rules` object.

The important server-only path is:

```text
qrajn/qrSecrets
```

Client read/write is denied there. The server Admin SDK bypasses client rules.

## 4. Storage rules

Merge `firebase/storage.rules.qrajn-snippet.txt` into the existing Storage rules service.

It covers:

```text
qrajn/branding/{uid}/logo
qrajn/business/{uid}/{profileId}/{fileName}
```

## 5. Vercel secure redirect environment

Create a **dedicated Vercel project** for `zyreel-ai/qr-ajn`.

Set these Production + Preview environment variables:

```text
FIREBASE_PROJECT_ID=unna-space-prod-226ff4
FIREBASE_CLIENT_EMAIL=<service-account-client-email>
FIREBASE_PRIVATE_KEY=<service-account-private-key>
FIREBASE_DATABASE_URL=https://unna-space-prod-226ff4-default-rtdb.asia-southeast1.firebasedatabase.app
QR_AJN_SCAN_PEPPER=<random-long-secret>
```

Never commit the service-account JSON or private key to GitHub.

The secure route is:

```text
/r/{shortId}
  -> Vercel /api/redirect
  -> active check
  -> expiry / scan limit
  -> schedule
  -> password check
  -> optional lead form
  -> smart targeting
  -> UTM
  -> privacy-safe scan event
  -> 302 redirect
```

## 6. Password setup

When a QR owner sets a password, the browser sends the signed-in ID token to `/api/qr-secret`.

The server stores only a salted `scrypt` verifier under:

```text
qrajn/qrSecrets/{qrId}
```

The raw password is not stored in the public link document.

## 7. Custom domain verification

QR AJN generates a TXT challenge such as:

```text
_qrajn.qr.example.com TXT qrajn-verification=<token>
```

The `/api/domain-check` endpoint checks DNS ownership.

**DNS verification alone does not attach the domain to Vercel.** After verification, add the domain to the dedicated QR AJN Vercel project and configure the exact DNS records Vercel displays. Confirm HTTPS before marking the domain active.

## 8. Business Profiles

Public route:

```text
https://qrajn.online/b/business-name
```

No login is required for visitors.

Owners can create multiple profiles. Branding is optional. The profile supports products, services, offers, WhatsApp, call, directions, website, brochure, Google Review, UPI and consent-based enquiries.

## 9. Deployment

After the dedicated Vercel project exists:

```powershell
npx.cmd vercel --prod
```

Then attach:

```text
qrajn.online
www.qrajn.online
```

Choose one canonical hostname and redirect the other.

## 10. Launch acceptance tests

1. Sign up and sign in on the public domain.
2. Create a dynamic QR and save without permission errors.
3. Scan from a second phone/network; confirm the scan appears in the owner dashboard.
4. Edit the destination; scan the unchanged QR and confirm the new destination opens.
5. Deactivate the QR; confirm it no longer redirects.
6. Test expiry and schedule fallbacks.
7. Set a QR password; confirm wrong password fails and correct password redirects.
8. Enable QR lead capture; submit a consented lead and confirm it appears in analytics.
9. Publish a Business Profile and open `/b/<slug>` without login.
10. Test Call, WhatsApp, Directions, Website and enquiry actions from a real phone.
11. Upload Business Profile logo/cover and verify public display.
12. Verify mobile widths at 360/390/430px, tablet, and desktop.
13. Confirm `qrajn.online` and `www.qrajn.online` HTTPS.
