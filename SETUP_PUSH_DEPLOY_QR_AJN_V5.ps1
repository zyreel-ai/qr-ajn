param(
  [switch]$Deploy
)

$ErrorActionPreference = "Continue"
$PSNativeCommandUseErrorActionPreference = $false
$Repo = "zyreel-ai/qr-ajn"
$RepoUrl = "https://github.com/zyreel-ai/qr-ajn.git"

function Step($n,$text){ Write-Host "`n[$n] $text" -ForegroundColor Yellow }
function Pass($text){ Write-Host "[PASS] $text" -ForegroundColor Green }
function Require-Command($name){ $c=Get-Command $name -ErrorAction SilentlyContinue; if(-not $c){ throw "$name is required but was not found." }; return $c.Source }

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " QR AJN V5 :: VERIFY + PACKAGE + GITHUB + SAFE DEPLOY" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Step "1/9" "Checking project and software"
if(-not (Test-Path ".\package.json")){ throw "Run this script from the extracted QR_AJN_PRODUCTION_REALTIME folder." }
$pkg = Get-Content .\package.json -Raw | ConvertFrom-Json
if($pkg.name -ne "qrajn-production" -or $pkg.version -ne "5.0.0"){ throw "This is not the QR AJN V5 package." }
$node = Require-Command "node.exe"
$npm = Require-Command "npm.cmd"
$git = Require-Command "git.exe"
$nodeMajor = [int]((& $node -v).TrimStart('v').Split('.')[0])
if($nodeMajor -lt 22){ throw "Node.js 22+ is required. Current: $(& $node -v)" }
Pass "QR AJN V5 project + Node/npm/git detected"

Step "2/9" "Installing production dependency metadata and verifying source"
# npm install is safe here; firebase-admin is required by Vercel server functions.
& $npm install --no-audit --no-fund
if($LASTEXITCODE -ne 0){ throw "npm install failed." }
& $npm run verify
if($LASTEXITCODE -ne 0){ throw "QR AJN verification failed." }
Pass "All V5 syntax, QR, redirect and project tests passed"

Step "3/9" "Scanning for actual private credentials"
$danger = Get-ChildItem . -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $_.FullName -notmatch "\\node_modules\\|\\.git\\|\\.vercel\\" -and
    $_.Name -notin @(".env.example","SETUP_PUSH_DEPLOY_QR_AJN_V5.ps1","PUSH_TO_GITHUB_ZYREEL.ps1") -and
    $_.Extension -notin @(".md",".txt",".rules")
  } |
  Select-String -Pattern "-----BEGIN (RSA |EC )?PRIVATE KEY-----|github_pat_[A-Za-z0-9_]{20,}|gh[opsu]_[A-Za-z0-9]{20,}" -CaseSensitive:$false -ErrorAction SilentlyContinue
if($danger){ $danger | Select-Object Path,LineNumber | Format-Table -AutoSize; throw "Actual private credential material detected. Push cancelled." }
Pass "No actual private key/GitHub token found"

Step "4/9" "Locating GitHub CLI and confirming zyreel-ai"
$ghCandidates = @(
  (Get-Command gh.exe -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Source -ErrorAction SilentlyContinue),
  "$env:LOCALAPPDATA\QR_AJN_TOOLS\github-cli\bin\gh.exe",
  "C:\Program Files\GitHub CLI\gh.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -Unique
$gh = $ghCandidates | Select-Object -First 1
if(-not $gh){ throw "GitHub CLI was not found." }
$login = (& $gh api user --jq ".login").Trim()
if($login -ne "zyreel-ai"){ throw "GitHub CLI must be logged in as zyreel-ai. Current: $login" }
Pass "GitHub account: zyreel-ai"

Step "5/9" "Connecting existing repository history"
if(-not (Test-Path ".git")){ & $git init; if($LASTEXITCODE -ne 0){ throw "git init failed." } }
& $git config user.name "zyreel-ai"
$currentEmail = (& $git config user.email 2>$null)
if(-not $currentEmail){ & $git config user.email "zyreel-ai@users.noreply.github.com" }
& $git branch -M main
$remotes = @(& $git remote)
if($remotes -contains "origin"){ & $git remote set-url origin $RepoUrl } else { & $git remote add origin $RepoUrl }
& $git fetch origin main
if($LASTEXITCODE -ne 0){ throw "Could not fetch origin/main." }
# Keep the extracted V5 working tree, but use origin/main as its parent.
& $git reset --mixed origin/main
Pass "Existing GitHub main history connected without overwriting V5 files"

Step "6/9" "Creating production ZIP outside the repository"
$downloads = Join-Path $env:USERPROFILE "Downloads"
if(-not (Test-Path $downloads)){ $downloads = Split-Path -Parent (Get-Location) }
$zipOut = Join-Path $downloads ("QR_AJN_V5_REALTIME_COMPLETE_" + (Get-Date -Format "yyyyMMdd_HHmmss") + ".zip")
$temp = Join-Path $env:TEMP ("qrajn-v5-package-" + [guid]::NewGuid().ToString("N"))
$stage = Join-Path $temp "QR_AJN_PRODUCTION_REALTIME"
New-Item -ItemType Directory -Force -Path $stage | Out-Null
Get-ChildItem . -Force | Where-Object { $_.Name -notin @(".git","node_modules",".vercel",".env",".env.local") } | ForEach-Object {
  Copy-Item $_.FullName -Destination $stage -Recurse -Force
}
Compress-Archive -Path $stage -DestinationPath $zipOut -CompressionLevel Optimal -Force
Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue
Pass "ZIP created: $zipOut"

Step "7/9" "Committing QR AJN V5"
& $git add -A
$changes = & $git status --porcelain
if($changes){
  & $git commit -m "feat: QR AJN V5 universal profiles and realtime scan intelligence"
  if($LASTEXITCODE -ne 0){ throw "Git commit failed." }
}else{
  Write-Host "No new changes to commit." -ForegroundColor Yellow
}

Step "8/9" "Pushing without GitHub password prompts"
$token = (& $gh auth token).Trim()
if(-not $token){ throw "Could not obtain the existing GitHub CLI token." }
$askPass = Join-Path $env:TEMP "qrajn_v5_git_askpass.cmd"
@'
@echo off
echo %* | findstr /I "Username" >nul
if %errorlevel%==0 (
  echo x-access-token
) else (
  echo %QRAJN_GITHUB_TOKEN%
)
'@ | Set-Content -LiteralPath $askPass -Encoding ASCII
$env:QRAJN_GITHUB_TOKEN=$token
$env:GIT_ASKPASS=$askPass
$env:GIT_TERMINAL_PROMPT="0"
try {
  & $git -c credential.helper= push -u origin main
  if($LASTEXITCODE -ne 0){ throw "GitHub push failed." }
  & $git -c credential.helper= fetch origin main
  $local=(& $git rev-parse HEAD).Trim(); $remote=(& $git rev-parse origin/main).Trim()
  if($local -ne $remote){ throw "Push verification failed: local and remote commits differ." }
  Pass "GitHub main verified at $remote"
} finally {
  Remove-Item Env:\QRAJN_GITHUB_TOKEN -ErrorAction SilentlyContinue
  Remove-Item Env:\GIT_ASKPASS -ErrorAction SilentlyContinue
  Remove-Item Env:\GIT_TERMINAL_PROMPT -ErrorAction SilentlyContinue
  Remove-Item $askPass -Force -ErrorAction SilentlyContinue
  $token=$null
}

Step "9/9" "Production deployment safety check"
if(-not $Deploy){
  Write-Host "Vercel deploy not requested. GitHub and ZIP are complete." -ForegroundColor Yellow
}else{
  if(-not (Test-Path ".vercel\project.json")){
    Write-Host "No dedicated Vercel link found. Linking this folder only to project 'qr-ajn'." -ForegroundColor Yellow
    & npx.cmd --yes vercel link --yes --project qr-ajn
    if($LASTEXITCODE -ne 0){ throw "Vercel link failed. GitHub push and ZIP are still complete." }
  }
  $envOutput = (& npx.cmd --yes vercel env ls production 2>&1 | Out-String)
  $requiredEnv=@("FIREBASE_PROJECT_ID","FIREBASE_CLIENT_EMAIL","FIREBASE_PRIVATE_KEY","FIREBASE_DATABASE_URL","QR_AJN_SCAN_PEPPER")
  $missing=@($requiredEnv | Where-Object { $envOutput -notmatch [regex]::Escape($_) })
  if($missing.Count -gt 0){
    Write-Host "Vercel deployment stopped safely. Add these Production environment variables:" -ForegroundColor Yellow
    $missing | ForEach-Object { Write-Host "  - $_" }
    Write-Host "Then rerun: .\SETUP_PUSH_DEPLOY_QR_AJN_V5.ps1 -Deploy" -ForegroundColor Cyan
  }else{
    & npx.cmd --yes vercel --prod --yes
    if($LASTEXITCODE -ne 0){ throw "Vercel production deployment failed. GitHub push and ZIP remain complete." }
    Pass "Vercel production deployment completed"
  }
}

Write-Host "`n============================================================" -ForegroundColor Green
Write-Host " QR AJN V5 COMPLETE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Repository : https://github.com/zyreel-ai/qr-ajn" -ForegroundColor Cyan
Write-Host "ZIP        : $zipOut" -ForegroundColor Cyan
Write-Host "RTDB merge : firebase\database.rules.qrajn-snippet.json" -ForegroundColor Cyan
Write-Host "RTDB full  : firebase\database.rules.qrajn-full-dedicated.json" -ForegroundColor Cyan
Write-Host "Storage    : firebase\storage.rules.qrajn-snippet.txt" -ForegroundColor Cyan
Write-Host "`nIMPORTANT: Firebase is shared. Merge QR AJN rule blocks; never overwrite unrelated app rules." -ForegroundColor Yellow
