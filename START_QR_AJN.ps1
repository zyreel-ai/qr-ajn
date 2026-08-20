$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
npm.cmd run verify
if ($LASTEXITCODE -ne 0) { throw "QR AJN verification failed." }
npm.cmd start
