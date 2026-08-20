# Fresh-start data procedure

The previous seeded/demo QR data is not part of this build.

The configured Firebase project is shared with another product. QR AJN uses the `/qrajn` namespace, so do not delete unrelated root nodes or unrelated Storage objects.

If you intentionally want a complete QR AJN reset:

1. Open Firebase Console.
2. Select `unna-space-prod-226ff4`.
3. Open Realtime Database -> Data.
4. Delete **only** the `qrajn` node.
5. In Storage, delete only objects under `qrajn/` if you also want uploaded QR AJN images removed.

For normal per-account cleanup, sign in to QR AJN -> Settings -> Delete workspace data. That deletes only the signed-in user's QR AJN workspace and its related public links/profile mirrors/events.
