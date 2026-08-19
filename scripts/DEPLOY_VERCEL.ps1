param(
  [string]$Domain = "qrajn.online"
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "Verifying QR AJN..." -ForegroundColor Cyan
npm.cmd run verify

if (-not (Get-Command npx.cmd -ErrorAction SilentlyContinue)) {
  throw "Node.js/npm is required."
}

Write-Host ""
Write-Host "Link this folder to a NEW dedicated Vercel project (recommended name: qr-ajn)." -ForegroundColor Yellow
npx.cmd vercel@latest link

Write-Host ""
Write-Host "Deploying production..." -ForegroundColor Cyan
npx.cmd vercel@latest --prod

Write-Host ""
Write-Host "Now add these domains in Vercel Project Settings -> Domains:" -ForegroundColor Green
Write-Host "  $Domain"
Write-Host "  www.$Domain"
Write-Host ""
Write-Host "Use the exact DNS records Vercel shows for this project." -ForegroundColor Yellow
