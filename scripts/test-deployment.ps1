# Test Script for Docker Deployment
# Tests the deployed endpoints on localhost:8080

param(
    [string]$BaseUrl = "http://localhost:8080"
)

Write-Host "🧪 Testing DID Web Deployment at $BaseUrl" -ForegroundColor Green
Write-Host ""

$ErrorCount = 0
$SuccessCount = 0

function Test-Endpoint {
    param(
        [string]$Path,
        [string]$Description
    )
    
    $Url = "$BaseUrl$Path"
    Write-Host "Testing: $Description" -ForegroundColor Cyan
    Write-Host "  URL: $Url" -ForegroundColor Gray
    
    try {
        $Response = Invoke-WebRequest -Uri $Url -Method Get -UseBasicParsing -ErrorAction Stop
        if ($Response.StatusCode -eq 200) {
            Write-Host "  ✅ SUCCESS (HTTP $($Response.StatusCode))" -ForegroundColor Green
            $script:SuccessCount++
            return $true
        } else {
            Write-Host "  ⚠️  WARNING (HTTP $($Response.StatusCode))" -ForegroundColor Yellow
            $script:ErrorCount++
            return $false
        }
    } catch {
        Write-Host "  ❌ FAILED: $($_.Exception.Message)" -ForegroundColor Red
        $script:ErrorCount++
        return $false
    }
    Write-Host ""
}

Write-Host "Testing Root Endpoints..." -ForegroundColor Yellow
Write-Host ""
Test-Endpoint "/" "Root index page"
Write-Host ""

Write-Host "Testing DID Documents..." -ForegroundColor Yellow
Write-Host ""
Test-Endpoint "/issuers/principle/did.json" "Principle Issuer DID Document"
Test-Endpoint "/issuers/test-issuer/did.json" "Test Issuer DID Document"
Test-Endpoint "/issuers/tmp-test/did.json" "Tmp Test Issuer DID Document"
Write-Host ""

Write-Host "Testing Context Files..." -ForegroundColor Yellow
Write-Host ""
Test-Endpoint "/contexts/iu-edu-degree-v1.jsonld" "IU Edu Degree Context"
Test-Endpoint "/contexts/iu-edu-transcript-v1.jsonld" "IU Edu Transcript Context"
Test-Endpoint "/contexts/common/base-vocab.jsonld" "Base Vocabulary Context"
Write-Host ""

Write-Host "Testing Credential Schemas..." -ForegroundColor Yellow
Write-Host ""
Test-Endpoint "/credentialSchema/iu-edu-degree-v1.schema.json" "IU Edu Degree Schema"
Test-Endpoint "/credentialSchema/iu-edu-transcript-v1.schema.json" "IU Edu Transcript Schema"
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor White
Write-Host "Test Summary" -ForegroundColor White
Write-Host "========================================" -ForegroundColor White
Write-Host "✅ Passed: $SuccessCount" -ForegroundColor Green
Write-Host "❌ Failed: $ErrorCount" -ForegroundColor Red
Write-Host ""

if ($ErrorCount -eq 0) {
    Write-Host "🎉 All tests passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠️  Some tests failed. Check the output above." -ForegroundColor Yellow
    exit 1
}
