Write-Host "🔧 Fixing .env.local file encoding..." -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

$envPath = ".env.local"
$backupPath = ".env.local.backup"

# Check if file exists
if (-not (Test-Path $envPath)) {
    Write-Host "❌ .env.local file not found!" -ForegroundColor Red
    exit 1
}

# Create backup
Write-Host "📋 Creating backup..." -ForegroundColor Yellow
Copy-Item $envPath $backupPath
Write-Host "✅ Backup created: .env.local.backup" -ForegroundColor Green

# Read the file with different encodings
Write-Host "🔍 Reading file with different encodings..." -ForegroundColor Yellow

$content = $null
$encoding = $null

# Try different encodings
$encodings = @("UTF8", "Unicode", "UTF32", "Default")

foreach ($enc in $encodings) {
    try {
        $testContent = Get-Content $envPath -Encoding $enc -Raw
        if ($testContent -and $testContent.Contains("=") -and $testContent.Contains("SUPABASE")) {
            $content = $testContent
            $encoding = $enc
            Write-Host "✅ Successfully read with $enc encoding" -ForegroundColor Green
            break
        }
    }
    catch {
        Write-Host "❌ Failed to read with $enc encoding" -ForegroundColor Red
    }
}

if (-not $content) {
    Write-Host "❌ Could not read file with any encoding!" -ForegroundColor Red
    Write-Host "   Please check the file manually." -ForegroundColor Yellow
    exit 1
}

# Clean the content
Write-Host "🧹 Cleaning content..." -ForegroundColor Yellow

# Split into lines and clean each line
$lines = $content -split "`n" | ForEach-Object {
    $line = $_.Trim()
    # Remove null characters and other encoding artifacts
    $line = $line -replace "`0", ""
    $line
} | Where-Object {
    # Keep only valid environment variable lines
    $_ -and $_.Contains("=") -and -not $_.StartsWith("#")
}

# Create new content
$newContent = $lines -join "`n" + "`n"

Write-Host "📝 Found $($lines.Count) valid environment variables:" -ForegroundColor Green
$lines | ForEach-Object {
    $key = ($_ -split "=")[0]
    Write-Host "   $key" -ForegroundColor Cyan
}

# Write the fixed file
Write-Host "💾 Writing fixed file..." -ForegroundColor Yellow
$newContent | Out-File $envPath -Encoding UTF8

Write-Host "✅ .env.local file fixed!" -ForegroundColor Green
Write-Host "🔄 Please restart your development server" -ForegroundColor Yellow

Write-Host "`n📋 Next steps:" -ForegroundColor Green
Write-Host "   1. Restart your development server: npm run dev" -ForegroundColor White
Write-Host "   2. Test the API route: http://localhost:3000/api/test-db" -ForegroundColor White
Write-Host "   3. If issues persist, check the backup file: .env.local.backup" -ForegroundColor White 