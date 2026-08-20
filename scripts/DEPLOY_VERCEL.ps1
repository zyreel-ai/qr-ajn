& {
    $ErrorActionPreference = "Stop"
    Set-Location (Split-Path $PSScriptRoot -Parent)
    npm.cmd run verify
    if ($LASTEXITCODE -ne 0) { throw "Verification failed." }
    Write-Host "Deploying QR AJN to a dedicated Vercel project..." -ForegroundColor Cyan
    npx.cmd vercel --prod
    if ($LASTEXITCODE -ne 0) { throw "Vercel deployment failed." }
    Write-Host "After deployment, attach qrajn.online and www.qrajn.online in this QR AJN project only." -ForegroundColor Yellow
}
