# Quick Start Script for Testing Docker Deployment
# This script validates, builds, and starts the Docker container

Write-Host "🚀 Starting DID Web Docker Deployment..." -ForegroundColor Green
Write-Host ""

# Step 1: Validate registry
Write-Host "📋 Step 1: Validating registry..." -ForegroundColor Cyan
npm run registry:validate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Validation failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Validation passed!" -ForegroundColor Green
Write-Host ""

# Step 2: Build public folder
Write-Host "🔨 Step 2: Building public folder..." -ForegroundColor Cyan
npm run registry:build
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Build completed!" -ForegroundColor Green
Write-Host ""

# Step 3: Start Docker
Write-Host "🐳 Step 3: Starting Docker container..." -ForegroundColor Cyan
Write-Host "This will build and start the nginx container on port 8080" -ForegroundColor Yellow
Write-Host ""
Write-Host "Press Ctrl+C to stop the container" -ForegroundColor Yellow
Write-Host ""
Write-Host "In another terminal, you can run:" -ForegroundColor Yellow
Write-Host "  ngrok http 8080" -ForegroundColor White
Write-Host ""

docker compose -f infra/docker-compose.yml up --build

