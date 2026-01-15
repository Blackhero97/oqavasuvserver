# BM CRM Server - Admin PC O'rnatish

## Talablar
- Node.js (https://nodejs.org dan yuklab oling)
- Internet ulanishi (MongoDB Atlas uchun)

## O'rnatish

### 1. Papkani ko'chiring
`server` papkasini Admin PC ga ko'chiring:
```
C:\bm-crm-server\
```

### 2. O'rnating
`install.bat` ni **Administrator sifatida** ishga tushiring:
- O'ng tugma → "Run as administrator"

### 3. Serverni ishga tushiring
`start-server.bat` ni ikki marta bosing

## Hikvision Terminal Sozlamalari

Terminal veb-interfeysiga kiring: http://192.168.100.193

### HTTP Listening (Webhook)
```
Configuration → Network → Advanced → HTTP Listening
```
- **Listening IP**: [Admin PC IP manzili, masalan: 192.168.100.146]
- **Listening Port**: 5000
- **URL**: /webhook/hikvision
- **Protocol**: HTTP

### ISUP (Ixtiyoriy)
```
Configuration → Network → Advanced → Platform Access
```
- **Platform IP**: [Admin PC IP manzili]
- **Platform Port**: 5200

## Tekshirish

1. Server ishga tushganida ko'rasiz:
```
✅ MongoDB Connected
Server is running on port 5000
🚀 ISUP Server listening on port 5200
```

2. Terminal oldidan o'ting - ko'rasiz:
```
📨 Webhook received from Hikvision
✅ [ISM] - CHECK IN at XX:XX
💾 Webhook attendance saved
```

## Muammolar

### Port band
```cmd
taskkill /f /im node.exe
```

### Firewall
Administrator PowerShell da:
```powershell
netsh advfirewall firewall add rule name="BM CRM" dir=in action=allow protocol=tcp localport=5000
netsh advfirewall firewall add rule name="BM CRM ISUP" dir=in action=allow protocol=tcp localport=5200
```

### MongoDB ulanmaydi
- Internet ulanishini tekshiring
- MongoDB Atlas → Network Access → 0.0.0.0/0 qo'shing
