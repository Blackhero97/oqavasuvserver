# BM School CRM - Server

Backend server for BM School CRM system with Hikvision integration.

## Features

- 🔐 JWT Authentication
- 📊 Attendance Management (ISUP Protocol)
- 👥 Staff & Student Management
- 🎓 Class Management
- 📈 Reports & Statistics

## Deployment

### Render (Recommended)

1. Connect GitHub repo to Render
2. Set environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `CORS_ORIGINS`
3. Deploy

### Local Development

```bash
npm install
npm run seed:admin  # Create default admin
npm run dev         # Start with nodemon
```

## Default Admin

```
Username: admin
Password: admin123
```

## API Endpoints

- `/api/auth/*` - Authentication
- `/api/students/*` - Students
- `/api/classes/*` - Classes
- `/api/employees/*` - Employees
- `/api/attendance/*` - Attendance
- `/api/reports/*` - Reports

## Environment Variables

See `.env.example` for required variables.

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- Socket.IO
- JWT Authentication
- Hikvision ISUP Protocol
