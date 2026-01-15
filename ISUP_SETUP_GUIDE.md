# Hikvision ISUP Configuration Guide

Hikvision qurilmani bizning serverga ulash uchun quyidagi sozlamalarni bajaring:

## 1.  Hikvision Web Interface'ga kiring

URL: `https://192.168.100.193`
- Login: `admin`  
- Password: `Parol8887`

## 2. ISUP Configuration sahifasiga o'ting

**Configuration** → **Network** → **Network platformaccess/ISUP**

## 3. Quyidagi sozlamalarni kiriting:

### Main Settings:
- ✅ **Enable**: ON (yashil)
- ✅ **Protocol Version**: ISUP 5.0 yoki eng yuqori versiya
- ✅ **Server IP Address**: `192.168.1.109` (Sizning kompyuter IP'si)
- ✅ **Port**: `5200`
- ✅ **Device ID**: `001` (yoki o'zingizning device ID)

### Optional:
- **Encryption Key**: Bo'sh qoldiring (agar talab qilmasa)
- **Keep Alive Interval**: `60` (secondlarda)

## 4. Save tugmasini bosing

**Register Status** qizildan **yashilga** o'zgarishi kerak!

## 5. Serverni tekshiring

Server console'da quyidagi loglar paydo bo'lishi kerak:

```
🔌 New ISUP connection: 192.168.100.193:xxxxx
✅ Device 001 registered
```

## 6. Test qilish

Frontend'dan:
1. Browser'da `http://localhost:5173/staff` oching
2. F12 bosing → Console
3. Quyidagi buyruqni yozing:

```javascript
fetch('http://localhost:5000/api/isup/status')
  .then(r => r.json())
  .then(d => console.log('ISUP Status:', d));
```

Natija:
```json
{
  "server": "online",
  "port": 5200,
  "connectedDevices": 1,
  "devices": [...]
}
```

## 7. Face ID Test

1. Hikvision qurilma oldiga turing
2. Yuzingizni taniting
3. Server console'da real-time log paydo bo'ladi:
   ```
   📥 Processing attendance event: {...}
   ✅ [Ismingiz] - CHECK IN at 09:25
   💾 Attendance saved to database
   ```

4. Frontend'da avtomatik yangilanadi (30 soniyada)

## Troubleshooting

### Agar "Register Status" qizil bo'lsa:

**1️⃣ Network Connectivity:**
```bash
ping 192.168.1.109
```
Javob kelishi kerak!

**2️⃣ Firewall:**
Windows Firewall port 5200'ni ochish:
- Control Panel → Windows Defender Firewall
- Advanced Settings → Inbound Rules → New Rule
- Port: 5200, TCP
- Allow the connection

**3️⃣ Server IP:**
Sizning kompyuter IP'sini tekshiring:
```bash
ipconfig
```
`192.168.1.109` to'g'ri IP ekanligini tasdiqlang.

**4️⃣ Server ishlamoqdami:**
```bash
netstat -an | findstr 5200
```
Ko'rsatishi kerak: `0.0.0.0:5200   LISTENING`

---

## Success Indicators ✅

- ✅ Register Status: **Online** (yashil)
- ✅ Server console: Device registered
- ✅ Face ID event: Real-time log ko'rsatiladi
- ✅ Frontend: Davomat ma'lumotlari avtomatik yangilanadi

Tayyor! 🎉
