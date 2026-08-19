param(
  [Parameter(Mandatory=$true)]
  [string]$Repository,
  [ValidateSet("public","private")]
  [string]$Visibility = "public"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
  throw "Git is not installed or not available in PATH."
}
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
  throw "GitHub CLI (gh) is required. Install it from https://cli.github.com/ and run: gh auth login"
}

gh auth status | Out-Host

if (-not (Test-Path ".git")) {
  git init
}
git branch -M main

git add .
$changes = git status --porcelain
if ($changes) {
  git commit -m "feat: QR AJN Firebase realtime production"
}

$exists = $true
gh repo view $Repository *> $null
if ($LASTEXITCODE -ne 0) { $exists = $false }

if (-not $exists) {
  gh repo create $Repository "--$Visibility" --source . --remote origin --push
} else {
  $remote = git remote get-url origin 2>$null
  if ($LASTEXITCODE -ne 0) {
    git remote add origin "https://github.com/$Repository.git"
  } else {
    git remote set-url origin "https://github.com/$Repository.git"
  }
  git push -u origin main
}

Write-Host ""
Write-Host "GitHub push complete: https://github.com/$Repository" -ForegroundColor Green
