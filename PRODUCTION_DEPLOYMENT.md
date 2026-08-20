# QR AJN V4 deployment

Read `PRODUCTION_SETUP.md` first.

## Verify locally

```powershell
npm.cmd run verify
npm.cmd start
```

## Push

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; .\PUSH_TO_GITHUB_ZYREEL.ps1
```

## Vercel

Create a separate Vercel project from `zyreel-ai/qr-ajn`. Do not reuse an unrelated project.

The repository includes serverless endpoints under `api/`. Install dependencies normally so `firebase-admin` is available to those functions.

Set the server environment variables from `PRODUCTION_SETUP.md`, then deploy:

```powershell
npx.cmd vercel --prod
```

`vercel.json` sends `/r/:shortId` to the secure server redirect and sends dashboard/business-profile SPA routes to `public/index.html`.

Attach `qrajn.online` and `www.qrajn.online` to this QR AJN project and use the exact DNS records Vercel provides. Confirm HTTPS before launch.
