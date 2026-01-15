# Open port 5000 for Hikvision webhook
# Run as Administrator

New-NetFirewallRule -DisplayName "Node Server Port 5000" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
Write-Host "✅ Firewall rule added for port 5000"
