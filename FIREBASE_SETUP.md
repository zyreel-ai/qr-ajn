# Firebase setup — QR AJN

## Firebase app configuration

The supplied Firebase web configuration is already in:

`public/firebase-config.js`

Web Firebase configuration values such as the API key and project ID identify the Firebase project; database security must come from Authentication and Security Rules.

## Authentication providers

In Firebase Console for `unna-space-prod-226ff4`:

### Enable Email/Password

Authentication -> Sign-in method -> Email/Password -> Enable.

### Enable Google

Authentication -> Sign-in method -> Google -> Enable.

### Enable Anonymous

Authentication -> Sign-in method -> Anonymous -> Enable.

Anonymous auth is used only for public scanners so Realtime Database rules can verify that a scan event was created by an authenticated Firebase client. It does not give the scanner access to a dashboard.

## Authorized domains

Authentication -> Settings -> Authorized domains.

Add:

```text
qrajn.online
www.qrajn.online
localhost
```

Also add the Vercel preview hostname while testing previews.

## Realtime Database rules

The Firebase project is shared with another product, so **do not replace the whole ruleset**.

Open:

Realtime Database -> Rules

Take the child block from:

`firebase/database.rules.qrajn-snippet.json`

and merge it under your existing root `"rules"` object as the `"qrajn"` child.

Conceptually:

```json
{
  "rules": {
    "...existing UNNA rules...": {},
    "qrajn": {
      "...paste the qrajn block from the snippet..."
    }
  }
}
```

The QR AJN rules enforce:

- a user can read/write only `/qrajn/users/<their uid>`
- public short links are readable by scanners
- only the link owner can create/edit/delete a short link
- only the owner can read scan analytics
- a public scanner may append a scan event only when:
  - they are authenticated (normally anonymous auth)
  - their event references a real active short link
  - the short link maps to the same owner and QR ID
  - the event timestamp is near Firebase server time
  - event fields have bounded types/lengths

## Storage rules

Merge the block in:

`firebase/storage.rules.qrajn-snippet.txt`

inside your existing:

```text
service firebase.storage {
  match /b/{bucket}/o {
    ...
  }
}
```

The QR AJN block makes branding logos publicly readable but only writable by the matching signed-in UID, with a 1 MB image limit.

## Data structure

```text
qrajn
├── users
│   └── {uid}
│       ├── profile
│       ├── qrs
│       ├── branding
│       └── settings
├── publicLinks
│   └── {shortId}
├── publicBranding
│   └── {uid}
└── scanEvents
    └── {ownerUid}
        └── {eventId}
```

## Old/demo data

The local seeded JSON database and fake test-scan API were removed from this build.

This project does not automatically delete any pre-existing data in `unna-space-prod-226ff4`, because that could destroy another application's data.
