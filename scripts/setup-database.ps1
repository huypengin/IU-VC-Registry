# Setup Script for PostgreSQL Database
# This script helps you set up the database for the Status List service

Write-Host "🚀 IU DID Web - Database Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Check if Docker is running
Write-Host "🔍 Checking Docker..." -ForegroundColor Yellow
$dockerRunning = $false
try {
    docker ps 2>&1 | Out-Null
    $dockerRunning = $true
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running" -ForegroundColor Red
}

if (-not $dockerRunning) {
    Write-Host ""
    Write-Host "Please start Docker Desktop and run this script again." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Alternative: Install PostgreSQL locally" -ForegroundColor Cyan
    Write-Host "  1. Download from: https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "  2. Install with default settings (port 5432)" -ForegroundColor Gray
    Write-Host "  3. Update DATABASE_URL in .env file" -ForegroundColor Gray
    Write-Host ""
    exit 1
}

# Start PostgreSQL container
Write-Host ""
Write-Host "🐘 Starting PostgreSQL container..." -ForegroundColor Yellow
docker compose up postgres -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to start PostgreSQL container" -ForegroundColor Red
    exit 1
}

Write-Host "✅ PostgreSQL container started" -ForegroundColor Green

# Wait for PostgreSQL to be ready
Write-Host ""
Write-Host "⏳ Waiting for PostgreSQL to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0
$ready = $false

while ($attempt -lt $maxAttempts) {
    $attempt++
    $healthCheck = docker compose exec postgres pg_isready -U iu_did_user -d iu_did_db 2>&1
    
    if ($healthCheck -match "accepting connections") {
        $ready = $true
        break
    }
    
    Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    Start-Sleep -Seconds 1
}

if (-not $ready) {
    Write-Host "❌ PostgreSQL did not become ready in time" -ForegroundColor Red
    Write-Host "Check logs with: docker compose logs postgres" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ PostgreSQL is ready" -ForegroundColor Green

# Check if .env file exists
Write-Host ""
Write-Host "📝 Checking environment configuration..." -ForegroundColor Yellow
if (-not (Test-Path ".env")) {
    Write-Host "  Creating .env file from .env.example..." -ForegroundColor Gray
    Copy-Item ".env.example" ".env"
    Write-Host "✅ Created .env file" -ForegroundColor Green
} else {
    Write-Host "✅ .env file exists" -ForegroundColor Green
}

# Run migrations
Write-Host ""
Write-Host "🗃️  Running database migrations..." -ForegroundColor Yellow
npm run db:migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Database migrations completed" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📊 Database Info:" -ForegroundColor Cyan
Write-Host "  Host: localhost:5432" -ForegroundColor Gray
Write-Host "  Database: iu_did_db" -ForegroundColor Gray
Write-Host "  User: iu_did_user" -ForegroundColor Gray
Write-Host "  Password: iu_did_password" -ForegroundColor Gray
Write-Host ""
Write-Host "🚀 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Start admin API:  npm run admin:dev" -ForegroundColor Yellow
Write-Host "  2. Test health:      curl http://localhost:4000/health" -ForegroundColor Yellow
Write-Host "  3. Read docs:        cat DATABASE.md" -ForegroundColor Yellow
Write-Host ""
Write-Host "💡 Useful Commands:" -ForegroundColor Cyan
Write-Host "  View logs:           npm run postgres:logs" -ForegroundColor Gray
Write-Host "  Stop database:       npm run postgres:down" -ForegroundColor Gray
Write-Host "  Restart database:    npm run postgres:up" -ForegroundColor Gray
Write-Host ""

