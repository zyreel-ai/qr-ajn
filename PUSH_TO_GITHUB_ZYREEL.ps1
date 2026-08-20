& {
    $ErrorActionPreference = "Stop"
    $PSNativeCommandUseErrorActionPreference = $false
    $RepoUrl = "https://github.com/zyreel-ai/qr-ajn.git"
    $Repo = "zyreel-ai/qr-ajn"
    Set-Location $PSScriptRoot

    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host " QR AJN :: VERIFY + PUSH TO zyreel-ai/qr-ajn" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan

    npm.cmd run verify
    if ($LASTEXITCODE -ne 0) { throw "QR AJN verification failed. Push cancelled." }

    $danger = Get-ChildItem . -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object { $_.FullName -notmatch '\\node_modules\\|\\.git\\' } |
      Select-String -Pattern 'BEGIN PRIVATE KEY|private_key_id|FIREBASE_PRIVATE_KEY\s*=|service_account' -CaseSensitive:$false -ErrorAction SilentlyContinue
    if ($danger) {
      $danger | Select-Object Path,LineNumber | Format-Table -AutoSize
      throw "Possible private credential found. Push cancelled."
    }

    $ghCandidates = @(
      (Get-Command gh.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
      "$env:LOCALAPPDATA\QR_AJN_TOOLS\github-cli\bin\gh.exe",
      "C:\Program Files\GitHub CLI\gh.exe"
    ) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique
    $Gh = $ghCandidates | Select-Object -First 1
    if (-not $Gh) { throw "GitHub CLI was not found. Use the portable gh.exe already downloaded earlier or install GitHub CLI." }

    $login = (& $Gh api user --jq '.login').Trim()
    if ($login -ne 'zyreel-ai') { throw "GitHub CLI is logged in as '$login'. Login as 'zyreel-ai' first." }
    & $Gh auth setup-git
    if ($LASTEXITCODE -ne 0) { throw "Could not configure Git authentication." }

    if (-not (Test-Path .git)) { git init }
    git branch -M main
    git config user.name "zyreel-ai"
    if (-not (git config user.email)) { git config user.email "anjandev325@gmail.com" }

    if (@(git remote) -contains 'origin') { git remote set-url origin $RepoUrl } else { git remote add origin $RepoUrl }

    # Fresh ZIP folders have no Git history. Fetch the existing remote and make
    # the current extracted files the next commit without overwriting them.
    git fetch origin main
    if ($LASTEXITCODE -eq 0) {
      git reset --mixed origin/main
    }

    git add -A
    $changes = git status --porcelain
    if ($changes) {
      git commit -m "feat: QR AJN V4 business profiles and advanced QR controls"
      if ($LASTEXITCODE -ne 0) { throw "Git commit failed." }
    } else {
      Write-Host "No new changes to commit." -ForegroundColor Yellow
    }

    git push -u origin main
    if ($LASTEXITCODE -ne 0) { throw "Git push failed." }

    git fetch origin main
    $local = (git rev-parse HEAD).Trim()
    $remote = (git rev-parse origin/main).Trim()
    if ($local -ne $remote) { throw "Remote verification failed: local and origin/main differ." }

    Write-Host "" 
    Write-Host "QR AJN PUSH COMPLETE" -ForegroundColor Green
    Write-Host "https://github.com/zyreel-ai/qr-ajn" -ForegroundColor Cyan
    Write-Host "Commit: $local" -ForegroundColor Green
}
