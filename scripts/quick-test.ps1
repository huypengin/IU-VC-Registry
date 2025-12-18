#!/usr/bin/env pwsh
# Quick Test Script for DID Web Services
# Tests if all services are running and responding correctly

Write-Host "🧪 Testing DID Web Services..." -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan

# Test 1: DID Service Health
Write-Host "`n1️⃣ Testing DID Service Health (Port 3000)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/health" -TimeoutSec 5
    Write-Host "✅ DID Service is healthy" -ForegroundColor Green
    Write-Host "   Status: $($response.status)" -ForegroundColor Gray
    Write-Host "   Timestamp: $($response.timestamp)" -ForegroundColor Gray
} catch {
    Write-Host "❌ DID Service is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure to run: npm run dev" -ForegroundColor Yellow
}

# Test 2: DID Service Root
Write-Host "`n2️⃣ Testing DID Service Root Endpoint..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/" -TimeoutSec 5
    Write-Host "✅ DID Service root endpoint accessible" -ForegroundColor Green
    Write-Host "   Message: $($response.message)" -ForegroundColor Gray
    Write-Host "   DID: $($response.did)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Could not access root endpoint" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 3: DID Document (Standard Path)
Write-Host "`n3️⃣ Testing DID Document (Standard Path)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/.well-known/did.json" -TimeoutSec 5
    Write-Host "✅ DID Document retrieved" -ForegroundColor Green
    Write-Host "   DID ID: $($response.id)" -ForegroundColor Cyan
    Write-Host "   Verification Methods: $($response.verificationMethod.Count)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Could not retrieve DID Document" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 4: DID Document (Custom Path)
Write-Host "`n4️⃣ Testing DID Document (Custom Path)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/issuers/principle/did.json" -TimeoutSec 5
    Write-Host "✅ DID Document retrieved from custom path" -ForegroundColor Green
    Write-Host "   DID ID: $($response.id)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Could not retrieve DID Document from custom path" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 5: Admin API Health
Write-Host "`n5️⃣ Testing Admin API Health (Port 4000)..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:4000/health" -TimeoutSec 5
    Write-Host "✅ Admin API is healthy" -ForegroundColor Green
    Write-Host "   Service: $($response.service)" -ForegroundColor Gray
} catch {
    Write-Host "❌ Admin API is not responding" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure to run: npm run admin:dev" -ForegroundColor Yellow
}

# Test 6: Status List Operations (Optional)
Write-Host "`n6️⃣ Testing Status List Operations..." -ForegroundColor Yellow
$testListId = "test-list-$(Get-Date -Format 'yyyyMMddHHmmss')"

try {
    # Initialize status list
    $initBody = @{
        listId = $testListId
        size = 1024
        statusPurpose = "revocation"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:4000/admin/status-lists/init" `
        -Method Post `
        -ContentType "application/json" `
        -Body $initBody `
        -TimeoutSec 5

    Write-Host "✅ Status list initialized: $($response.statusList.id)" -ForegroundColor Green
    
    # Allocate some indices
    $allocateBody = @{
        count = 3
        credentialId = "test-credential-001"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "http://localhost:4000/admin/status-lists/$testListId/allocate" `
        -Method Post `
        -ContentType "application/json" `
        -Body $allocateBody `
        -TimeoutSec 5

    Write-Host "✅ Allocated $($response.count) indices: $($response.allocations -join ', ')" -ForegroundColor Green
    
    # Get status list info
    $response = Invoke-RestMethod -Uri "http://localhost:4000/admin/status-lists/$testListId" -TimeoutSec 5
    Write-Host "✅ Status list info retrieved" -ForegroundColor Green
    Write-Host "   Next Index: $($response.statusList.nextIndex)" -ForegroundColor Gray
    Write-Host "   Size: $($response.statusList.size)" -ForegroundColor Gray

} catch {
    Write-Host "❌ Status list operations failed" -ForegroundColor Red
    Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Make sure PostgreSQL is running: npm run postgres:up" -ForegroundColor Yellow
}

# Summary
Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "✨ Test Summary" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "📋 Quick Access URLs:" -ForegroundColor White
Write-Host "   DID Service:       http://localhost:3000" -ForegroundColor Gray
Write-Host "   DID Document:      http://localhost:3000/.well-known/did.json" -ForegroundColor Gray
Write-Host "   Admin API:         http://localhost:4000" -ForegroundColor Gray
Write-Host "   Admin Health:      http://localhost:4000/health" -ForegroundColor Gray
Write-Host ""
Write-Host "📚 For more tests, see: API-TEST-GUIDE.md" -ForegroundColor Yellow
Write-Host ""

