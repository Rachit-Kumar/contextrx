# ContextRx — Lambda Package Builder
# Run this from the backend/ directory to create deployment zips
# Usage: .\build_lambdas.ps1

$ErrorActionPreference = "Stop"
$BackendDir = $PSScriptRoot
$PackagesDir = Join-Path $BackendDir "lambda_packages"

Write-Host "`nContextRx — Lambda Package Builder" -ForegroundColor Cyan
Write-Host "===================================`n"

# Create output dir
if (!(Test-Path $PackagesDir)) { New-Item -ItemType Directory -Path $PackagesDir | Out-Null }

# ── Package 1: list_patients.zip ──────────────────────────────────────────────
Write-Host "Building list_patients.zip..." -ForegroundColor Yellow
$TempDir1 = Join-Path $env:TEMP "contextrx_list_patients"
if (Test-Path $TempDir1) { Remove-Item $TempDir1 -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir1 | Out-Null

# Only needs lambda_list_patients.py (boto3 is pre-installed in Lambda)
Copy-Item "$BackendDir\lambda_list_patients.py" "$TempDir1\"

$ZipPath1 = Join-Path $PackagesDir "list_patients.zip"
if (Test-Path $ZipPath1) { Remove-Item $ZipPath1 }
Compress-Archive -Path "$TempDir1\*" -DestinationPath $ZipPath1
Write-Host "  ✓ Created: lambda_packages/list_patients.zip ($([Math]::Round((Get-Item $ZipPath1).Length/1KB, 1)) KB)" -ForegroundColor Green

# ── Package 2: context_engine.zip ─────────────────────────────────────────────
Write-Host "`nBuilding context_engine.zip (includes google-generativeai)..." -ForegroundColor Yellow
$TempDir2 = Join-Path $env:TEMP "contextrx_context_engine"
if (Test-Path $TempDir2) { Remove-Item $TempDir2 -Recurse -Force }
New-Item -ItemType Directory -Path $TempDir2 | Out-Null

# Copy handler files
Copy-Item "$BackendDir\lambda_context_engine.py" "$TempDir2\"
Copy-Item "$BackendDir\prompt_templates.py" "$TempDir2\"

# Install google-generativeai into the temp dir (Lambda needs it bundled)
Write-Host "  Installing google-generativeai into package..." -ForegroundColor Gray
pip install google-generativeai -t "$TempDir2" -q --no-cache-dir

$ZipPath2 = Join-Path $PackagesDir "context_engine.zip"
if (Test-Path $ZipPath2) { Remove-Item $ZipPath2 }
Compress-Archive -Path "$TempDir2\*" -DestinationPath $ZipPath2
$SizeMB = [Math]::Round((Get-Item $ZipPath2).Length/1MB, 1)
Write-Host "  ✓ Created: lambda_packages/context_engine.zip ($SizeMB MB)" -ForegroundColor Green

# ── Summary ───────────────────────────────────────────────────────────────────
Write-Host "`n====================================" -ForegroundColor Cyan
Write-Host "Done! Upload these to Lambda:" -ForegroundColor Cyan
Write-Host "  backend/lambda_packages/list_patients.zip     → contextrx-list-patients"
Write-Host "  backend/lambda_packages/context_engine.zip    → contextrx-context-engine"
Write-Host "`nRemember to set the Handler in each Lambda function config:"
Write-Host "  list_patients   → lambda_list_patients.lambda_handler"
Write-Host "  context_engine  → lambda_context_engine.lambda_handler"
