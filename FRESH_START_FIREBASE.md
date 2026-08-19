# Fresh-start data procedure

The old local seeded QR and fake scans are already removed from this codebase.

The Firebase project `unna-space-prod-226ff4` appears to be shared with another product, so this project does not automatically delete arbitrary Firebase data.

QR AJN uses only the `/qrajn` namespace.

If `/qrajn` already contains unwanted QR AJN test data and you intentionally want a complete QR AJN reset:

1. Open Firebase Console.
2. Select `unna-space-prod-226ff4`.
3. Open Realtime Database -> Data.
4. Expand the root.
5. Delete **only** the `qrajn` node.
6. Do not delete any other root node.
7. In Firebase Storage, delete only objects under `qrajn/branding/` if old QR AJN logos exist.

For normal per-account cleanup, sign in to QRForge -> Settings -> Danger Zone -> Delete everything. This deletes only the signed-in user's QR AJN workspace and its public short links/scan events.
