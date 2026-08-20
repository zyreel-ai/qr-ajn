# Git / GitHub setup

Production repository:

```text
https://github.com/zyreel-ai/qr-ajn
```

The easiest path from this ZIP is:

```powershell
Set-ExecutionPolicy -Scope Process Bypass -Force; .\PUSH_TO_GITHUB_ZYREEL.ps1
```

The script verifies the project, blocks obvious private-key files, confirms the active GitHub CLI account is `zyreel-ai`, fetches the existing `main` branch, creates the next commit from the extracted ZIP without overwriting the working files, pushes, then compares local and remote commit hashes.

Never commit service-account JSON or private keys.
