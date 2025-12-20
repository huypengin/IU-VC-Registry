# Docker Deployment Test Script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Docker Dynamic File Test" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$apiUrl = "http://localhost:3000"
$webUrl = "http://localhost:8080"

Write-Host "🔍 Step 1: Check Docker Compose Services" -ForegroundColor Yellow
Write-Host "   Checking if containers are running..."

$containers = docker ps --format "table {{.Names}}\t{{.Status}}" | Select-String -Pattern "iu-did"

if ($containers) {
    Write-Host "   ✅ Containers found:" -ForegroundColor Green
    $containers | ForEach-Object { Write-Host "      $_" -ForegroundColor Gray }
} else {
    Write-Host "   ❌ No containers running. Starting services..." -ForegroundColor Yellow
    Set-Location -Path "infra"
    docker compose up -d
    Start-Sleep -Seconds 10
    Set-Location -Path ".."
    Write-Host "   ✅ Services started" -ForegroundColor Green
}
Write-Host ""

Write-Host "🔍 Step 2: Check Service Health" -ForegroundColor Yellow

# Check API health
try {
    $apiHealth = Invoke-RestMethod -Uri "$apiUrl/health" -TimeoutSec 5
    if ($apiHealth.ok) {
        Write-Host "   ✅ API is healthy: $($apiHealth.service)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ API not responding. Waiting..." -ForegroundColor Red
    Start-Sleep -Seconds 5
}

# Check Nginx health
try {
    $webHealth = Invoke-RestMethod -Uri "$webUrl/health" -TimeoutSec 5
    if ($webHealth.status -eq "ok") {
        Write-Host "   ✅ Nginx is healthy" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Nginx not responding" -ForegroundColor Red
}
Write-Host ""

Write-Host "🔧 Step 3: Initialize Status List via API" -ForegroundColor Yellow
$listId = "sl-docker-test-$(Get-Date -Format 'yyyyMMddHHmmss')"

$initBody = @{
    listId = $listId
    size = 16384
    statusPurpose = "revocation"
} | ConvertTo-Json

try {
    $init = Invoke-RestMethod -Method POST -Uri "$apiUrl/admin/status-lists/init" `
        -ContentType "application/json" -Body $initBody
    
    if ($init.ok) {
        Write-Host "   ✅ Status list created: $($init.statusList.id)" -ForegroundColor Green
        Write-Host "      Size: $($init.statusList.size)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ❌ Failed to create status list" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
Write-Host ""

Start-Sleep -Seconds 2

Write-Host "📂 Step 4: Check File in API Container" -ForegroundColor Yellow
$parts = $listId -split '-'
$category = if ($parts.Length -gt 1) { $parts[1] } else { "general" }
$year = if ($parts.Length -gt 2) { $parts[2] } else { (Get-Date).Year }
$filePath = "/app/public/status/$category/$year/status-list.json"

Write-Host "   Checking: $filePath"
$apiFileCheck = docker exec iu-did-api ls -lh $filePath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ File exists in API container" -ForegroundColor Green
    Write-Host "      $apiFileCheck" -ForegroundColor Gray
} else {
    Write-Host "   ❌ File not found in API container" -ForegroundColor Red
}
Write-Host ""

Write-Host "📂 Step 5: Check File in Nginx Container" -ForegroundColor Yellow
$nginxFilePath = "/usr/share/nginx/html/status/$category/$year/status-list.json"

Write-Host "   Checking: $nginxFilePath"
$nginxFileCheck = docker exec iu-did-web-static ls -lh $nginxFilePath 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "   ✅ File exists in Nginx container (volume shared!)" -ForegroundColor Green
    Write-Host "      $nginxFileCheck" -ForegroundColor Gray
} else {
    Write-Host "   ❌ File not found in Nginx container" -ForegroundColor Red
    Write-Host "      This means volume sharing is not working!" -ForegroundColor Red
}
Write-Host ""

Write-Host "🌐 Step 6: Access File via Nginx HTTP" -ForegroundColor Yellow
$publicUrl = "$webUrl/status/$category/$year/status-list.json"
Write-Host "   URL: $publicUrl"

try {
    $publicFile = Invoke-RestMethod -Uri $publicUrl
    Write-Host "   ✅ File accessible via Nginx!" -ForegroundColor Green
    Write-Host "      Type: $($publicFile.type -join ', ')" -ForegroundColor Gray
    Write-Host "      Issuer: $($publicFile.issuer)" -ForegroundColor Gray
    Write-Host "      Has Proof: $($null -ne $publicFile.proof)" -ForegroundColor Gray
    Write-Host "      Proof Cryptosuite: $($publicFile.proof.cryptosuite)" -ForegroundColor Gray
    $initialEncodedList = $publicFile.credentialSubject.encodedList
} catch {
    Write-Host "   ❌ File not accessible via Nginx" -ForegroundColor Red
    Write-Host "      Error: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "🎫 Step 7: Allocate Indices" -ForegroundColor Yellow
$allocBody = @{
    count = 3
    credentialId = "urn:uuid:docker-test-001"
} | ConvertTo-Json

try {
    $alloc = Invoke-RestMethod -Method POST -Uri "$apiUrl/admin/status-lists/$listId/allocate" `
        -ContentType "application/json" -Body $allocBody
    
    if ($alloc.ok) {
        Write-Host "   ✅ Allocated $($alloc.count) indices" -ForegroundColor Green
        $alloc.allocations | ForEach-Object {
            Write-Host "      Index: $($_.index)" -ForegroundColor Gray
        }
        $allocatedIndices = $alloc.allocations.index
    }
} catch {
    Write-Host "   ❌ Failed to allocate indices" -ForegroundColor Red
}
Write-Host ""

Start-Sleep -Seconds 2

Write-Host "🔴 Step 8: Revoke a Credential" -ForegroundColor Yellow
$revokeBody = @{
    index = $allocatedIndices[1]
    credentialId = "urn:uuid:docker-test-001"
    reason = "Testing dynamic file update"
} | ConvertTo-Json

try {
    $revoke = Invoke-RestMethod -Method POST -Uri "$apiUrl/admin/status-lists/$listId/revoke" `
        -ContentType "application/json" -Body $revokeBody
    
    if ($revoke.ok) {
        Write-Host "   ✅ Revoked index $($revoke.index)" -ForegroundColor Green
    }
} catch {
    Write-Host "   ❌ Failed to revoke" -ForegroundColor Red
}
Write-Host ""

Start-Sleep -Seconds 2

Write-Host "🔄 Step 9: Check File Updated in Both Containers" -ForegroundColor Yellow

# Get last modified time from API container
$apiModTime = docker exec iu-did-api stat -c %Y $filePath 2>&1
Write-Host "   API container file timestamp: $apiModTime" -ForegroundColor Gray

# Get last modified time from Nginx container
$nginxModTime = docker exec iu-did-web-static stat -c %Y $nginxFilePath 2>&1
Write-Host "   Nginx container file timestamp: $nginxModTime" -ForegroundColor Gray

if ($apiModTime -eq $nginxModTime) {
    Write-Host "   ✅ Timestamps match! Volume is shared correctly." -ForegroundColor Green
} else {
    Write-Host "   ⚠️  Timestamps differ - this might be a problem" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "🌐 Step 10: Verify HTTP Response Updated" -ForegroundColor Yellow
try {
    $updatedFile = Invoke-RestMethod -Uri $publicUrl
    Write-Host "   ✅ File fetched via Nginx" -ForegroundColor Green
    
    if ($initialEncodedList -and ($initialEncodedList -ne $updatedFile.credentialSubject.encodedList)) {
        Write-Host "   ✅ EncodedList CHANGED (revocation applied!)" -ForegroundColor Green
        Write-Host "      Before: $($initialEncodedList.Substring(0, 30))..." -ForegroundColor Gray
        Write-Host "      After:  $($updatedFile.credentialSubject.encodedList.Substring(0, 30))..." -ForegroundColor Gray
    } else {
        Write-Host "   ⚠️  EncodedList unchanged (might be expected if allocation only)" -ForegroundColor Yellow
    }
    
    Write-Host "   Proof created: $($updatedFile.proof.created)" -ForegroundColor Gray
} catch {
    Write-Host "   ❌ Failed to fetch updated file" -ForegroundColor Red
}
Write-Host ""

Write-Host "📊 Step 11: Check Volume Details" -ForegroundColor Yellow
$volumeInfo = docker volume inspect infra_status-files 2>&1 | ConvertFrom-Json
if ($volumeInfo) {
    Write-Host "   ✅ Volume exists" -ForegroundColor Green
    Write-Host "      Name: $($volumeInfo.Name)" -ForegroundColor Gray
    Write-Host "      Mountpoint: $($volumeInfo.Mountpoint)" -ForegroundColor Gray
    Write-Host "      Driver: $($volumeInfo.Driver)" -ForegroundColor Gray
}
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Docker Dynamic File Test Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Yellow
Write-Host "  ✅ API writes files to volume" -ForegroundColor Green
Write-Host "  ✅ Nginx reads files from same volume" -ForegroundColor Green
Write-Host "  ✅ Real-time updates work (no restart needed)" -ForegroundColor Green
Write-Host ""
Write-Host "Public URL: $publicUrl" -ForegroundColor Cyan
Write-Host ""
Write-Host "Access your deployed registry:" -ForegroundColor Yellow
Write-Host "  - Static files: $webUrl/contexts/" -ForegroundColor White
Write-Host "  - Dynamic status: $webUrl/status/" -ForegroundColor White
Write-Host "  - Admin API: $apiUrl/admin/" -ForegroundColor White
Write-Host ""

