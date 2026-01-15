# Windows Firewall va Network Sozlash

## 🌐 1. Sizning IP manzilni topish

### Usul 1: CMD/PowerShell
```powershell
ipconfig
```

**Qidirayapmiz:**
```
Ethernet adapter Ethernet:

   IPv4 Address. . . . . . . . . : 192.168.100.25
   Subnet Mask . . . . . . . . . : 255.255.255.0
   Default Gateway . . . . . . . : 192.168.100.1
```

✅ **192.168.100.25** - SHU sizning IP manzil!

### Usul 2: Settings
1. Windows Settings → Network & Internet
2. Properties → IPv4 address

---

## 🔥 2. Firewall Port Ochish

### MUHIM PortLar:
- **5200** - ISUP Server (Hikvision ulanishi)
- **5000** - HTTP API (Dashboard API)

### PowerShell (Administrator)

**PowerShell'ni o'ng tugmada bosib "Run as Administrator" tanlang**

```powershell
# Port 5200 - ISUP Server
New-NetFirewallRule `
    -DisplayName "BM CRM - ISUP Server" `
    -Direction Inbound `
    -LocalPort 5200 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any

# Port 5000 - API Server
New-NetFirewallRule `
    -DisplayName "BM CRM - API Server" `
    -Direction Inbound `
    -LocalPort 5000 `
    -Protocol TCP `
    -Action Allow `
    -Profile Any
```

**Natija:**
```
Name                  : BM CRM - ISUP Server
DisplayName           : BM CRM - ISUP Server
Enabled               : True
```

### Tekshirish

```powershell
# Firewall rule'larni ko'rish
Get-NetFirewallRule -DisplayName "BM CRM*"
```

---

## 🔍 3. Port Band Emasligini Tekshirish

### Port 5200 va 5000 ni tekshirish

```powershell
netstat -ano | findstr :5200
netstat -ano | findstr :5000
```

### Agar band bo'lsa:

**Output:**
```
TCP    0.0.0.0:5200    0.0.0.0:0    LISTENING    12345
```

**PID 12345 ni o'chirish:**
```powershell
taskkill /F /PID 12345
```

---

## 🌐 4. Tarmoq Aloqasini Tekshirish

### Hikvision qurilmaga ping

```powershell
ping 192.168.100.193
```

**✅ Yaxshi javob:**
```
Reply from 192.168.100.193: bytes=32 time=1ms TTL=64
Reply from 192.168.100.193: bytes=32 time=1ms TTL=64
```

**❌ Yomon javob:**
```
Request timed out.
```

Bu degani:
- Qurilma o'chirilgan
- IP manzil xato
- Tarmoq ulanmagan

### Sizning IP va Hikvision IP bir tarmoqda ekanligini tekshirish

**Hikvision:** 192.168.100.193  
**Sizniki:** 192.168.100.???

✅ Birinchi **3 ta raqam** bir xil bo'lishi kerak!

Masalan:
- ✅ Sizniki: `192.168.100.25` - TO'G'RI
- ❌ Sizniki: `192.168.1.50` - XATO (boshqa tarmoq)

---

## 🔧 5. Port Testing Tool

### Test qilish

Server ishga tushganidan keyin:

```powershell
# Port 5200 (ISUP)
Test-NetConnection -ComputerName localhost -Port 5200

# Port 5000 (API)  
Test-NetConnection -ComputerName localhost -Port 5000
```

**Natija:**
```
TcpTestSucceeded : True
```

---

## 📋 6. Firewall qoidalarni o'chirish (agar kerak bo'lsa)

```powershell
Remove-NetFirewallRule -DisplayName "BM CRM - ISUP Server"
Remove-NetFirewallRule -DisplayName "BM CRM - API Server"
```

---

## 🎯 Quick Checklist

Server ishga tushishidan oldin:

- [ ] IP manzil topildi (ipconfig)
- [ ] Hikvision'ga ping ishlaydi
- [ ] Firewall portlar ochildi (5200, 5000)
- [ ] Portlar bo'sh (netstat)
- [ ] Bir tarmoqda (192.168.100.xxx)

✅ HAMMASI TAYYOR - Server ishga tushiring!

---

## 🆘 Muammolar

### "New-NetFirewallRule: Access Denied"
→ PowerShell'ni Administrator sifatida ochmadingiz

### Ping ishlamayapti
→ Hikvision IP manzilni qayta tekshiring

### Port allaqachon band
→ Server allaqachon ishlab turibdi (yaxshi!)

---

**Tayyor!** 🚀
