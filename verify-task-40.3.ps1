# Task 40.3 Verification Script
Write-Host "=== Task 40.3: Offline Mode - File Verification ===" -ForegroundColor Cyan
Write-Host ""

$files = @(
    "mobile/src/services/offline.service.ts",
    "mobile/src/components/SyncStatusBanner.tsx",
    "mobile/src/screens/main/ConflictResolutionScreen.tsx",
    "mobile/src/services/api.service.ts",
    "mobile/src/services/__tests__/offline.service.test.ts",
    "js/offline-manager.js",
    "js/offline-ui.js",
    "sw.js",
    "dashboard.html",
    "OFFLINE_MODE_IMPLEMENTATION.md",
    "mobile/OFFLINE_MODE_TEST_PLAN.md",
    "TASK_40.3_COMPLETION.md"
)

$allPresent = $true
$presentCount = 0

foreach ($file in $files) {
    $fullPath = Join-Path $PSScriptRoot ($file -replace '/', '\')
    
    if (Test-Path $fullPath) {
        Write-Host "[OK] $file" -ForegroundColor Green
        $presentCount++
    } else {
        Write-Host "[MISSING] $file" -ForegroundColor Red
        $allPresent = $false
    }
}

Write-Host ""
Write-Host "=== Summary ===" -ForegroundColor Cyan
Write-Host "Files Present: $presentCount / $($files.Count)"

if ($allPresent) {
    Write-Host "Status: ALL FILES PRESENT" -ForegroundColor Green
    Write-Host "Task 40.3: COMPLETE" -ForegroundColor Green
} else {
    Write-Host "Status: INCOMPLETE" -ForegroundColor Red
}
