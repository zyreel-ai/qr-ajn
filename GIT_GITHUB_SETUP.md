# Git / GitHub setup

A dedicated QR repository is required. The connected GitHub account currently exposes an unrelated repository, so this package intentionally does not overwrite it.

With GitHub CLI (`gh`) installed and authenticated:

```powershell
.\scripts\CONNECT_GITHUB.ps1 -Repository "ajnpdf/qr-ajn"
```

The script:

1. initializes Git if needed
2. creates/uses `main`
3. commits the production source
4. creates the GitHub repository if it does not exist
5. sets `origin`
6. pushes `main`

Secrets are not stored in this repository. The Firebase web config is client configuration, while authorization is enforced by Firebase Authentication and Rules.
