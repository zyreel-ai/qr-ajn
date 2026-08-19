# Vercel + qrajn.online deployment

## 1. Verify locally

```powershell
npm.cmd run verify
npm.cmd start
```

## 2. Push to a dedicated GitHub repository

Use `scripts/CONNECT_GITHUB.ps1` after GitHub CLI is authenticated.

## 3. Import repository into Vercel

Create/import the QR repository as a separate Vercel project.

Recommended:

```text
Framework Preset: Other
Root Directory: ./
Build Command: (empty)
Output Directory: public (also set in vercel.json)
Install Command: (empty)
```

`vercel.json` already rewrites SPA routes such as `/dashboard` and `/r/:shortId` to `index.html`.

## 4. Attach domains

Vercel -> Project -> Settings -> Domains:

```text
qrajn.online
www.qrajn.online
```

Use the DNS records Vercel provides. Avoid guessing A/CNAME values because Vercel may provide project-specific instructions.

## 5. Firebase Authentication domains

Add the final domains in Firebase Authentication -> Settings -> Authorized domains:

```text
qrajn.online
www.qrajn.online
```

Add the Vercel preview hostname too if you want Firebase login to work on preview deployments.

## 6. Production check

After DNS and Firebase rules/providers are configured:

1. create an account
2. create a Website QR
3. scan it from a second device
4. confirm it redirects to the destination
5. confirm Dashboard -> Total Scans increments live
6. confirm QR detail -> Scan Log shows the real device/browser/timezone
7. edit the destination and scan the same printed QR again


## Optional CLI deployment

After Git is pushed and you are authenticated with Vercel CLI:

```powershell
.\scripts\DEPLOY_VERCEL.ps1
```

The script intentionally asks you to link the folder to a project instead of guessing an existing Vercel project, because QR AJN must not be deployed over an unrelated application.
