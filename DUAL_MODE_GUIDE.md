# 🎯 Dual-Mode Hikvision Integration

Tizim endi **2 ta rejimda** ishlaydi:

## 🏠 LOCAL MODE (Hozir)

### ISUP Server (Port 5200)
- ✅ Local development uchun
- ✅ Real-time TCP ulanish
- ✅ Tezkor va ishonchli

**Hikvision sozlamalari:**
```
Configuration → Network → ISUP
• Server IP: 192.168.1.109
• Port: 5200
• Device ID: 001
```

---

## ☁️ CLOUD MODE (Render/Netlify uchun)

### HTTP Webhook
- ✅ Cloud hosting'da ishlaydi
- ✅ Internet orqali kirish
- ✅ Firewall muammolari yo'q

**Hikvision sozlamalari:**
```
Configuration → Event → HTTP Notification
• URL: https://your-app.onrender.com/webhook/hikvision
• Method: POST
• Login/Parol: (agar kerak bo'lsa)
```

---

## 🔧 Qanday sozlash?

### Local (Development)
1. ISUP sozlangan bo'lsin (screenshot'dagiday)
2. Server ishlasin: `npm start`
3. Register Status **yashil** bo'lishi kerak

### Cloud (Production - Render)

#### 1. Backend Deploy (Render)
```bash
# Render.com'da yangi Web Service yarating
# GitHub repo'ni ulang
# Build command: npm install
# Start command: npm start
```

#### 2. Hikvision HTTP Notification
Configuration → Event → Notification → HTTP

**Settings:**
- Host Name/IP: `your-app.onrender.com`
- URL: `/webhook/hikvision`
- Port: `443` (HTTPS)
- Method: `POST`
- Protocol: `HTTP/1.1`

**Events to notify:**
- ✅ Access Control Events
- ✅ Face Recognition
- ✅ Authentication

**Save** bosing!

---

## 📊 Test qilish

### Local Test:
```bash
curl -X POST http://localhost:5000/webhook/hikvision/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Cloud Test (Render'dan keyin):
```bash
curl -X POST https://your-app.onrender.com/webhook/hikvision/test \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 🎉 Afzalliklar

| Feature | ISUP (Local) | HTTP (Cloud) |
|---------|--------------|--------------|
| Real-time | ✅ Instant | ✅ ~1s delay |
| Cloud hosting | ❌ Yo'q | ✅ Ha |
| Konfiguratsiya | Oddiy | Juda oddiy |
| Firewall | Kerak emas | Kerak emas |
| Internet kerak | ❌ Yo'q | ✅ Ha |

---

## 🚀 Production Checklist

- [ ] Backend Render'ga deploy qilindi
- [ ] MongoDB Atlas ulanish ishlayapti
- [ ] Hikvision HTTP Notification sozlandi
- [ ] `/webhook/hikvision` endpoint test qilindi
- [ ] Face ID event real-time kelmoqda
- [ ] Frontend Netlify'ga deploy qilindi
- [ ] Frontend backend URL'ni ishlatmoqda

---

## 💡 Xulosa

**Hozir:** ISUP sozlamasini **shunday qoldiring** (screenshot'dagiday). Local ishlab chiqish uchun ishlaydi.

**Keyingi:** Render'ga deploy qilgandan keyin, Hikvision'da **HTTP Notification** qo'shasiz. Ikkalasi ham parallel ishlaydi!

Savol bo'lsa yozing! 🎯
