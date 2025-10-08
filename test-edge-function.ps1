# Test Script for Edge Function
# Replace YOUR_CRON_SECRET with the actual secret from your .env file

Write-Host "Testing Edge Function..." -ForegroundColor Cyan
Write-Host ""

# Get the CRON_SECRET from .env file
$envFile = Get-Content "supabase/functions/.env"
$cronSecret = ($envFile | Select-String "CRON_SECRET=").ToString().Split("=")[1]

Write-Host "Using CRON_SECRET: $($cronSecret.Substring(0, 8))..." -ForegroundColor Yellow
Write-Host ""

# Test the function
$headers = @{
    "x-cron-secret" = $cronSecret
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-RestMethod -Uri "http://localhost:54321/functions/v1/expire-trials" -Method Post -Headers $headers
    
    Write-Host "✅ SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Response:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""
    
    if ($response.success) {
        Write-Host "Expired trials: $($response.expired_count)" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ ERROR!" -ForegroundColor Red
    Write-Host ""
    Write-Host $_.Exception.Message -ForegroundColor Red
    Write-Host ""
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

