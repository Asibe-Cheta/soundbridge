# Generate CRON_SECRET for SoundBridge
# Just run this file: .\generate-cron-secret.ps1

Write-Host "🔐 Generating CRON_SECRET..." -ForegroundColor Cyan
Write-Host ""

# Generate 32 random bytes and convert to hex string
$bytes = New-Object byte[] 32
[Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
$secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })

Write-Host "✅ Your CRON_SECRET:" -ForegroundColor Green
Write-Host ""
Write-Host $secret -ForegroundColor Yellow
Write-Host ""
Write-Host "📋 Copy the secret above and add it to:" -ForegroundColor Cyan
Write-Host "   1. Vercel Environment Variables (CRON_SECRET)"
Write-Host "   2. apps/web/.env.local (for local testing)"
Write-Host ""
Write-Host "Press any key to copy to clipboard..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

# Copy to clipboard
Set-Clipboard -Value $secret
Write-Host "✅ Secret copied to clipboard!" -ForegroundColor Green
Write-Host ""
