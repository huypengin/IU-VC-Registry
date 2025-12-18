$ErrorActionPreference = "Stop"

$baseUrl = "http://localhost:4000"

Write-Host "=== Testing Registry Server ===" -ForegroundColor Cyan
Write-Host ""

Write-Host "1. Health Check" -ForegroundColor Yellow
$health = Invoke-RestMethod -Uri "$baseUrl/health" -Method GET
Write-Host "Response: $($health | ConvertTo-Json)" -ForegroundColor Green
Write-Host ""

Write-Host "2. Initialize Status List" -ForegroundColor Yellow
$listId = "slu-degree-2025"
$initBody = @{
    listId = $listId
    size = 16384
    statusPurpose = "revocation"
} | ConvertTo-Json

$init = Invoke-RestMethod -Uri "$baseUrl/admin/status-lists/init" -Method POST -Body $initBody -ContentType "application/json"
Write-Host "Response: $($init | ConvertTo-Json -Depth 5)" -ForegroundColor Green
Write-Host ""

Write-Host "3. Allocate Status Indices (should return credentialStatus)" -ForegroundColor Yellow
$allocateBody = @{
    count = 3
    credentialId = "urn:uuid:test-credential-123"
} | ConvertTo-Json

$allocate = Invoke-RestMethod -Uri "$baseUrl/admin/status-lists/$listId/allocate" -Method POST -Body $allocateBody -ContentType "application/json"
Write-Host "Response: $($allocate | ConvertTo-Json -Depth 5)" -ForegroundColor Green
Write-Host ""

Write-Host "4. Verify Status List Published" -ForegroundColor Yellow
$statusListUrl = "$baseUrl/status/degree/2025/status-list.json"
Write-Host "Fetching: $statusListUrl" -ForegroundColor Gray
try {
    $statusList = Invoke-RestMethod -Uri $statusListUrl -Method GET
    Write-Host "Status List Credential:" -ForegroundColor Green
    Write-Host ($statusList | ConvertTo-Json -Depth 5)
} catch {
    Write-Host "Error fetching status list: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "5. Get Status List Metadata" -ForegroundColor Yellow
$metadata = Invoke-RestMethod -Uri "$baseUrl/admin/status-lists/$listId" -Method GET
Write-Host "Response: $($metadata | ConvertTo-Json -Depth 5)" -ForegroundColor Green
Write-Host ""

Write-Host "6. Revoke a Credential" -ForegroundColor Yellow
$revokeBody = @{
    index = 1
    credentialId = "urn:uuid:test-credential-123"
    reason = "Testing revocation"
} | ConvertTo-Json

$revoke = Invoke-RestMethod -Uri "$baseUrl/admin/status-lists/$listId/revoke" -Method POST -Body $revokeBody -ContentType "application/json"
Write-Host "Response: $($revoke | ConvertTo-Json -Depth 5)" -ForegroundColor Green
Write-Host ""

Write-Host "7. Verify Updated Status List" -ForegroundColor Yellow
try {
    $updatedList = Invoke-RestMethod -Uri $statusListUrl -Method GET
    Write-Host "Updated encodedList (first 100 chars): $($updatedList.credentialSubject.encodedList.Substring(0, [Math]::Min(100, $updatedList.credentialSubject.encodedList.Length)))..." -ForegroundColor Green
} catch {
    Write-Host "Error fetching updated status list: $_" -ForegroundColor Red
}
Write-Host ""

Write-Host "8. Get Audit Logs" -ForegroundColor Yellow
$audit = Invoke-RestMethod -Uri "$baseUrl/admin/status-lists/$listId/audit?limit=10" -Method GET
Write-Host "Response: $($audit | ConvertTo-Json -Depth 5)" -ForegroundColor Green
Write-Host ""

Write-Host "=== Test Summary ===" -ForegroundColor Cyan
Write-Host "✅ All tests completed!" -ForegroundColor Green
Write-Host ""
Write-Host "Key URLs:" -ForegroundColor Yellow
Write-Host "  Health: $baseUrl/health"
Write-Host "  Status List: $statusListUrl"
Write-Host "  Admin API: $baseUrl/admin/status-lists"
Write-Host ""
Write-Host "Sample credentialStatus from allocation:" -ForegroundColor Yellow
if ($allocate.allocations -and $allocate.allocations.Count -gt 0) {
    Write-Host ($allocate.allocations[0].credentialStatus | ConvertTo-Json -Depth 5) -ForegroundColor Cyan
}

