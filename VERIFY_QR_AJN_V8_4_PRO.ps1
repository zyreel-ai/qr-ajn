$ErrorActionPreference="Stop"
$Root=Split-Path -Parent $MyInvocation.MyCommand.Path
$Web=Join-Path $Root "web_dashboard"
if(!(Get-Command node -ErrorAction SilentlyContinue)){throw "Node.js is required."}
if(!(Get-Command npm.cmd -ErrorAction SilentlyContinue)){throw "npm is required."}
Set-Location $Web
Write-Host "QR AJN V8.4 professional verification" -ForegroundColor Cyan
npm.cmd run verify
if($LASTEXITCODE -ne 0){throw "source verification failed"}
npm.cmd test
if($LASTEXITCODE -ne 0){throw "automated tests failed"}
Write-Host "ALL V8.4 LOCAL SOURCE + API TESTS PASSED" -ForegroundColor Green
