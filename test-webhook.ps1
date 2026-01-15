# Test webhook with existing employee ID
$body = @{
    employeeNoString = "00000030"  # NURMUHAMMADOV
    name             = "NURMUHAMMADOV"
    time             = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss")
} | ConvertTo-Json

Write-Host "Testing webhook with existing employee..."
Write-Host "Employee ID: 00000030"
Write-Host "Body: $body`n"

try {
    $response = Invoke-WebRequest `
        -Uri "http://localhost:5000/webhook/hikvision" `
        -Method POST `
        -ContentType "application/json" `
        -Body $body

    Write-Host "✅ SUCCESS!"
    Write-Host "Status: $($response.StatusCode)"
    Write-Host "Response: $($response.Content)"
}
catch {
    Write-Host "❌ ERROR!"
    Write-Host $_.Exception.Message
}
