$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$Web = Join-Path $Root "web_dashboard"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " QR AJN V8.4 :: PROFESSIONAL QR + PROFILE + LIVE ANALYTICS" -ForegroundColor Cyan
Write-Host " NO AUTH | NO WORKSPACE | NO PREMIUM/BILLING | NO CLOUD FUNCTIONS" -ForegroundColor DarkGray
Write-Host "============================================================" -ForegroundColor Cyan

if (!(Get-Command node -ErrorAction SilentlyContinue)) { throw "Node.js is required." }
Write-Host "Node: $(node -v)" -ForegroundColor Gray

Set-Location $Web
Write-Host "`n[1/3] V8.4 SOURCE + UI VERIFICATION" -ForegroundColor Yellow
npm.cmd run verify
if ($LASTEXITCODE -ne 0) { throw "Source verification failed." }

Write-Host "`n[2/3] LOGIC + CONCURRENCY TESTS" -ForegroundColor Yellow
npm.cmd test
if ($LASTEXITCODE -ne 0) { throw "Automated tests failed." }

Write-Host "`n[3/3] START LOCAL SERVER" -ForegroundColor Yellow
$Port = 4173
while (Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue) { $Port++; if ($Port -gt 4199) { throw "No free port found between 4173 and 4199." } }

$LanIp = $null
try {
  $LanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' -and $_.PrefixOrigin -ne 'WellKnown' } |
    Sort-Object InterfaceMetric |
    Select-Object -ExpandProperty IPAddress -First 1
} catch {}

$env:HOST = "0.0.0.0"
$env:PORT = "$Port"
if ($LanIp) { $env:PUBLIC_ORIGIN = "http://${LanIp}:$Port" } else { $env:PUBLIC_ORIGIN = "http://127.0.0.1:$Port" }

$LocalUrl = "http://127.0.0.1:$Port"
$LanUrl = if ($LanIp) { "http://${LanIp}:$Port" } else { "Not detected" }

$Job = Start-Job -ScriptBlock {
  param($Path,$HostValue,$PortValue,$OriginValue)
  Set-Location $Path
  $env:HOST=$HostValue; $env:PORT=$PortValue; $env:PUBLIC_ORIGIN=$OriginValue
  node .\server.mjs
} -ArgumentList $Web,$env:HOST,$env:PORT,$env:PUBLIC_ORIGIN

$Ready = $false
for ($i=0; $i -lt 60; $i++) {
  Start-Sleep -Milliseconds 250
  try {
    $r = Invoke-WebRequest "$LocalUrl/api/v1/health" -UseBasicParsing -TimeoutSec 2
    if ($r.StatusCode -eq 200) { $Ready = $true; break }
  } catch {}
}
if (!$Ready) {
  Receive-Job $Job -Keep
  Stop-Job $Job -ErrorAction SilentlyContinue
  throw "QR AJN did not become ready on port $Port."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " QR AJN LOCALHOST READY" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "Local URL : $LocalUrl" -ForegroundColor Cyan
Write-Host "LAN URL   : $LanUrl" -ForegroundColor Cyan
Write-Host "Public URL base used in generated profile links: $env:PUBLIC_ORIGIN" -ForegroundColor Gray
Write-Host ""
Write-Host "For phone QR testing, open the LAN URL on your phone while PC and phone are on the same Wi-Fi." -ForegroundColor Yellow
Write-Host "If Windows Firewall asks, allow Node.js on Private networks." -ForegroundColor Yellow
Write-Host "Data       : $Web\data\local-db.json" -ForegroundColor Gray
Write-Host "Uploads    : $Web\data\uploads" -ForegroundColor Gray
Write-Host ""

Start-Process $LocalUrl
Receive-Job $Job -Keep
Write-Host "Keep this PowerShell window open. Press Ctrl+C to stop QR AJN." -ForegroundColor Yellow
try {
  while ($Job.State -eq 'Running') { Start-Sleep -Seconds 2; Receive-Job $Job }
} finally {
  Stop-Job $Job -ErrorAction SilentlyContinue
  Remove-Job $Job -Force -ErrorAction SilentlyContinue
}
