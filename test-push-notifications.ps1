# Test Push Notifications Processing
# This script manually triggers the edge function to process queued notifications

# Get Supabase credentials from .env file
$SUPABASE_URL = $null
$SUPABASE_ANON_KEY = $null

$envContent = Get-Content .env -ErrorAction SilentlyContinue
if ($envContent) {
    $urlLine = $envContent | Select-String "EXPO_PUBLIC_SUPABASE_URL"
    $keyLine = $envContent | Select-String "EXPO_PUBLIC_SUPABASE_ANON_KEY"
    
    if ($urlLine) {
        $SUPABASE_URL = $urlLine.ToString().Split("=", 2)[1].Trim()
    }
    if ($keyLine) {
        $SUPABASE_ANON_KEY = $keyLine.ToString().Split("=", 2)[1].Trim()
    }
} else {
    Write-Host "Error: .env file not found" -ForegroundColor Red
    exit 1
}

if (-not $SUPABASE_URL -or -not $SUPABASE_ANON_KEY) {
    Write-Host "Error: Could not read Supabase credentials from .env file" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Invoking push notification processor..." -ForegroundColor Cyan
Write-Host "URL: $SUPABASE_URL/functions/v1/process-push-notifications" -ForegroundColor Gray

try {
    $response = Invoke-RestMethod `
        -Uri "$SUPABASE_URL/functions/v1/process-push-notifications" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $SUPABASE_ANON_KEY"
            "Content-Type" = "application/json"
        } `
        -Body "{}"
    
    Write-Host "✅ Success!" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 5
    
} catch {
    Write-Host "❌ Error processing notifications:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.ErrorDetails.Message) {
        Write-Host "Details:" -ForegroundColor Yellow
        Write-Host $_.ErrorDetails.Message
    }
}

