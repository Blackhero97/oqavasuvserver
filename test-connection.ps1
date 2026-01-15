# Test if Hikvision can reach our server
# Start a simple HTTP listener and wait for any request

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://+:5000/")
$listener.Start()

Write-Host "🔌 Listening on port 5000..."
Write-Host "ℹ️  Now trigger Face ID on Hikvision terminal"
Write-Host "ℹ️  Waiting for incoming request (60 seconds)...`n"

$timeout = 60
$timer = [Diagnostics.Stopwatch]::StartNew()

while ($timer.Elapsed.TotalSeconds -lt $timeout) {
    if ($listener.IsListening) {
        $contextTask = $listener.GetContextAsync()
        if ($contextTask.Wait(1000)) {
            $context = $contextTask.Result
            $request = $context.Request
            
            Write-Host "✅ REQUEST RECEIVED!"
            Write-Host "From: $($request.RemoteEndPoint)"
            Write-Host "URL: $($request.Url)"
            Write-Host "Method: $($request.HttpMethod)"
            Write-Host "`nHeaders:"
            foreach ($key in $request.Headers.AllKeys) {
                Write-Host "  $key : $($request.Headers[$key])"
            }
            
            # Read body
            $reader = New-Object System.IO.StreamReader($request.InputStream)
            $body = $reader.ReadToEnd()
            Write-Host "`nBody:"
            Write-Host $body
            
            # Send response
            $response = $context.Response
            $response.StatusCode = 200
            $buffer = [Text.Encoding]::UTF8.GetBytes('{"success":true}')
            $response.OutputStream.Write($buffer, 0, $buffer.Length)
            $response.Close()
            
            $listener.Stop()
            Write-Host "`n✅ Test complete!"
            exit 0
        }
    }
}

$listener.Stop()
Write-Host "`n⚠️  No request received in $timeout seconds"
Write-Host "Check Hikvision HTTP Listening configuration"
