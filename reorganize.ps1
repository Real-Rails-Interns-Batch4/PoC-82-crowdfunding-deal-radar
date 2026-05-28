# ============================================================
# Crowdfunding Deal Radar - Repo Reorganization Script
# Run from the ROOT of your repository
# ============================================================

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Write-Host "Starting repo reorganization..." -ForegroundColor Cyan

# ── 1. Create frontend/ folder ───────────────────────────────
New-Item -ItemType Directory -Force -Path "frontend" | Out-Null
Write-Host "Created: frontend/" -ForegroundColor Green

# ── 2. Move Next.js source folders ──────────────────────────
foreach ($dir in @("app", "components", "lib", "types")) {
    if (Test-Path $dir) {
        Move-Item -Path $dir -Destination "frontend/$dir"
        Write-Host "Moved: $dir -> frontend/$dir" -ForegroundColor Green
    } else {
        Write-Host "Skipped (not found): $dir" -ForegroundColor Yellow
    }
}

# ── 3. Move Next.js config & package files ───────────────────
$frontendFiles = @(
    "next.config.mjs",
    "next-env.d.ts",
    "tailwind.config.ts",
    "postcss.config.js",
    "tsconfig.json",
    "package.json",
    "package-lock.json"
)

foreach ($file in $frontendFiles) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "frontend/$file"
        Write-Host "Moved: $file -> frontend/$file" -ForegroundColor Green
    } else {
        Write-Host "Skipped (not found): $file" -ForegroundColor Yellow
    }
}

# ── 4. Move backend-related files into backend/ ──────────────
foreach ($file in @("requirements.txt", "start-backend.ps1")) {
    if (Test-Path $file) {
        Move-Item -Path $file -Destination "backend/$file"
        Write-Host "Moved: $file -> backend/$file" -ForegroundColor Green
    } else {
        Write-Host "Skipped (not found): $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "Reorganization complete!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Final structure:" -ForegroundColor White
Write-Host "  /frontend   <- Next.js app" -ForegroundColor Gray
Write-Host "  /backend    <- Python API + scripts" -ForegroundColor Gray
Write-Host "  .gitignore" -ForegroundColor Gray
Write-Host "  README.md" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. cd frontend && npm install  (reinstall node_modules)" -ForegroundColor Gray
Write-Host "  2. Verify any import paths that reference root-level folders" -ForegroundColor Gray
Write-Host "  3. git add -A && git commit -m 'refactor: split into frontend/ and backend/'" -ForegroundColor Gray
