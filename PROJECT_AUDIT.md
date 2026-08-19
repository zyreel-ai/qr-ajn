# QR AJN production audit

## Removed

- seeded ANJAN QR record
- seeded fake scans
- local demo sign-in
- JSON database persistence
- manual "Record test scan" button
- Server-Sent Events test backend
- Firestore service-account architecture
- fake location labels
- automatic shared-project Firebase rule deployment

## Production implementation

- Firebase modular Web SDK
- Firebase Email/Password Auth
- Google sign-in
- Firebase password reset
- verification email on sign-up
- anonymous Firebase auth for public scan-event writes
- Firebase Realtime Database
- Firebase Storage branding logo
- realtime `onValue()` workspace listeners
- UID-scoped owner data
- public dynamic short-link lookup
- real scan event generated only from `/r/:shortId`
- scanner device/browser/OS/language/timezone/referrer/screen metadata
- accurate statement that precise location is not collected
- qrajn namespace separation inside shared Firebase project
- Vercel SPA routing
- production domain fixed to `https://qrajn.online`
- responsive mobile bottom navigation
- indigo/cyan visual system
- Manrope + Inter typography
