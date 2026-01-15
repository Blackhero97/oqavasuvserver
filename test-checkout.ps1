# Test CHECK OUT webhook  
$body = @{
    employeeNoString = "00000030"
    name             = "NURMUHAMMADOV HASANBOY"
    time             = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
    eventType        = "OUT"
} | ConvertTo-Json

Write-Host "Testing CHECK OUT webhook..."
Write-Host "Body: $body`n"

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:5000/webhook/hikvision" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host "✅ SUCCESS!"
    Write-Host "Response: $($response.Content)"
}
catch {
    Write-Host "❌ ERROR!"
    Write-Host $_.Exception.Message
}
