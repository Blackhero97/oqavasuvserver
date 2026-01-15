# 🔄 BM CRM Server - Avtomatik Ishga Tushirish

## Usul 1: Windows Startup (Tavsiya etiladi)

### O'rnatish:

1. **Startup papkasini ochish:**
   ```
   Win + R → shell:startup → OK
   ```

2. **Shortcut yaratish:**
   - `C:\bm-crm-server\start-server-silent.vbs` faylini Startup papkasiga nusxalang
   - Yoki shortcut yarating

3. **Test qilish:**
   - Kompyuterni qayta ishga tushiring
   - Server avtomatik ishga tushishi kerak

### Tekshirish:

```powershell
# Server ishlab turganini tekshirish
netstat -ano | findstr :5000
netstat -ano | findstr :5200
```

---

## Usul 2: Task Scheduler (Murakkab)

### O'rnatish:

1. **Task Scheduler ochish:**
   ```
   Win + R → taskschd.msc → OK
   ```

2. **Yangi task yaratish:**
   - **Create Basic Task**
   - Name: `BM CRM Server`
   - Trigger: **When I log on**
   - Action: **Start a program**
   - Program: `C:\bm-crm-server\start-server.bat`

3. **Sozlamalar:**
   - ✅ Run whether user is logged on or not
   - ✅ Run with highest privileges
   - ✅ Configure for: Windows 10

---

## Usul 3: PM2 (Professional)

### O'rnatish:

```powershell
# PM2 global o'rnatish
npm install -g pm2
npm install -g pm2-windows-startup

# PM2 startup sozlash
pm2-startup install

# Server qo'shish
cd C:\bm-crm-server
pm2 start index.js --name "bm-crm-server"
pm2 save

# Statusni ko'rish
pm2 status
pm2 logs
```

### Boshqarish:

```powershell
pm2 start bm-crm-server    # Ishga tushirish
pm2 stop bm-crm-server     # To'xtatish
pm2 restart bm-crm-server  # Qayta ishga tushirish
pm2 logs bm-crm-server     # Loglarni ko'rish
```

---

## Fayllar

Serverda quyidagi fayllar yaratildi:

1. **start-server.ps1** - Asosiy PowerShell script
2. **start-server.bat** - Batch wrapper
3. **start-server-silent.vbs** - Silent background runner

---

## Tavsiya

**Eng oson:** Usul 1 (Windows Startup)
- ✅ Oddiy
- ✅ Ishonchli
- ✅ Background'da ishlaydi

**Eng professional:** Usul 3 (PM2)
- ✅ Auto-restart
- ✅ Log management
- ✅ Monitoring

---

## Muammolar

**Server ishlamayapti:**
```powershell
# Loglarni ko'rish
Get-Content C:\bm-crm-server\logs\error.log
```

**Port band:**
```powershell
netstat -ano | findstr :5000
taskkill /F /PID <PID>
```

---

**Tayyor!** Server kompyuter yonganida avtomatik ishga tushadi! 🚀
