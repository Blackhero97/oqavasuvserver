import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createServer } from "http";
import connectDB from "./db/connection.js";
import { startISUPServer, getConnectedDevices } from "./isup-server.js";
import { initializeSocket } from "./services/socket.service.js";
import { corsOptions } from "./config/cors.js";
import { initializeScheduler } from "./services/scheduler.service.js";

// Routes
import webhookRoutes from "./webhookRoutes.js";
import authRoutes from "./routes/auth.routes.js";
import staffRoutes from "./staff-routes.js";
import studentRoutes from "./student-routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import notificationRoutes from "./routes/notification.routes.js";

// Models (for backward compatibility with existing code)
import Employee from "./models/Employee.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";
import Attendance from "./models/Attendance.js";
import {
  fetchHikvisionEvents,
  testHikvisionConnection,
  processHikvisionEvents,
} from "./hikvision-service.js";

dotenv.config();

// Connect to MongoDB
connectDB();

// Start ISUP Server for Hikvision real-time events (LOCAL MODE)
console.log("🚀 Starting ISUP Server for local connections...");
startISUPServer();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer, { cors: corsOptions });

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// ==================== ROUTES ====================

// Webhook routes (CLOUD MODE - for Render/Netlify)
app.use("/webhook", webhookRoutes);

// Authentication routes
console.log("🛠️ Registering /api/auth routes...");
app.use("/api/auth", authRoutes);

// Reports routes
console.log("🛠️ Registering /api/reports routes...");
app.use("/api/reports", reportsRoutes);

// Notification routes
console.log("🛠️ Registering /api/notifications routes...");
app.use("/api/notifications", notificationRoutes);

// Staff routes
console.log("🛠️ Registering /api staff routes...");
app.use("/api", staffRoutes);

// Student routes
console.log("🛠️ Registering /api student routes...");
app.use("/api", studentRoutes);

const attendanceStats = {
  totalStudents: 245,
  presentToday: 230,
  absentToday: 15,
  lateToday: 8,
  averageAttendance: 94.2,
};

// Face Recognition attendance records
let faceRecognitionRecords = [];

// Hikvision raw events storage (for debugging and logging)
let hikvisionRawEvents = [];
let lastSyncTimestamp = null;

// ============ EMPLOYEES DATABASE ============
// Real Hikvision Face ID qurilmasidagi xodimlar
let employees = [
  {
    id: 1,
    name: "ASHUROVA OMINAJON",
    department: "Xodim",
    role: "staff",
    faceId: "face_008",
    hikvisionEmployeeId: "00000008", // Hikvision qurilmasidagi ID
    avatar: "AO",
    email: "ashurova@school.uz",
    phone: "+998991234567",
    status: "active",
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: 2,
    name: "DADAXANOVA MUHA",
    department: "Xodim",
    role: "staff",
    faceId: "face_012",
    hikvisionEmployeeId: "00000012", // Hikvision qurilmasidagi ID
    avatar: "DM",
    email: "dadaxanova@school.uz",
    phone: "+998991234568",
    status: "active",
    createdAt: new Date("2024-01-01").toISOString(),
  },
  {
    id: 3,
    name: "QORABOYEVA NOZI",
    department: "Xodim",
    role: "staff",
    faceId: "face_033",
    hikvisionEmployeeId: "00000033", // Hikvision qurilmasidagi ID
    avatar: "QN",
    email: "qoraboyeva@school.uz",
    phone: "+998991234569",
    status: "active",
    createdAt: new Date("2024-01-01").toISOString(),
  },
];

// ============ ATTENDANCE DATABASE ============
// Real davomat ma'lumotlari - Hikvision webhook'dan keladigan data
// Bo'sh boshlanadi, Face ID qurilmasidan eventlar kelganda to'ladi
let attendanceRecords = [];

// Teachers data (legacy)
const teachers = [
  {
    id: 101,
    name: "Dr. Karim Hasan",
    subject: "Matematika",
    avatar: "KH",
    checkInTime: "08:05",
  },
  {
    id: 102,
    name: "O'ktam Mirfayazov",
    subject: "Fizika",
    avatar: "OM",
    checkInTime: "08:10",
  },
  {
    id: 103,
    name: "Gulnoza Tursunova",
    subject: "Ingliz tili",
    avatar: "GT",
    checkInTime: "08:00",
  },
];

// Routes
app.get("/api/health", (req, res) => {
  res.json({ status: "OK", message: "Server is running" });
});

// Get students from MongoDB (real data) - FALLBACK ENDPOINT
app.get("/api/students-db", async (req, res) => {
  try {
    const students = await Employee.find({
      $or: [
        { role: "student" },
        { department: { $regex: "o'quvchi", $options: "i" } },
        { department: { $regex: "oquvchi", $options: "i" } },
        { department: { $regex: "student", $options: "i" } },
      ],
    }).sort({ name: 1 });

    console.log(`✅ Found ${students.length} students`);
    res.json(students);
  } catch (error) {
    console.error("Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

app.get("/api/attendance/stats", (req, res) => {
  res.json(attendanceStats);
});

// Student check-in/out endpoints (for backwards compatibility with mock UI)
app.post("/api/students/:id/checkin", (req, res) => {
  const studentId = parseInt(req.params.id);

  const currentTime = new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Tashkent",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Mock response for UI compatibility
  const student = {
    id: studentId,
    checkInTime: currentTime,
    status: currentTime > "08:30" ? "late" : "present",
  };

  res.json(student);
});

app.post("/api/students/:id/checkout", (req, res) => {
  const studentId = parseInt(req.params.id);

  const currentTime = new Date().toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  // Mock response for UI compatibility
  const student = {
    id: studentId,
    checkOutTime: currentTime,
  };

  res.json(student);
});

// ==================== EMPLOYEE ENDPOINTS ====================

// Xodim qo'shish (admin)
app.post("/api/employees", (req, res) => {
  try {
    const { name, department, role, email, phone, faceId } = req.body;

    if (!name || !department || !role) {
      return res
        .status(400)
        .json({ error: "Name, department, va role majburiy" });
    }

    const newEmployee = {
      id: Math.max(...employees.map((e) => e.id), 0) + 1,
      name,
      department,
      role,
      faceId: faceId || `face_${Date.now()}`,
      avatar: name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase(),
      email,
      phone,
      status: "active",
      createdAt: new Date().toISOString(),
    };

    employees.push(newEmployee);
    res.status(201).json(newEmployee);
  } catch (error) {
    res.status(500).json({ error: "Xodim qo'shishda xato" });
  }
});

// Xodimni o'chirish
app.delete("/api/employees/:id", (req, res) => {
  const employeeId = parseInt(req.params.id);
  const index = employees.findIndex((e) => e.id === employeeId);

  if (index === -1) {
    return res.status(404).json({ error: "Xodim topilmadi" });
  }

  const deleted = employees.splice(index, 1);
  res.json({ success: true, deleted: deleted[0] });
});

// ==================== ATTENDANCE ENDPOINTS (DATABASE) ====================

// Bugungi attendance ma'lumotlarini olish - MongoDB
app.get("/api/attendance", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const { date, role } = req.query;
    const filterDate = date || today;

    console.log(
      `📊 [ATTENDANCE API] Fetching attendance for date: ${filterDate}`
    );

    let filter = { date: filterDate };
    if (role) {
      filter.role = role;
    }

    const records = await Attendance.find(filter).sort({ firstCheckIn: 1 });
    console.log(`📋 [ATTENDANCE API] Found ${records.length} records`);

    res.json({
      date: filterDate,
      total: records.length,
      records: records,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Failed to fetch attendance data" });
  }
});

// Attendance summaryni olish
app.get("/api/attendance/summary", (req, res) => {
  const today = new Date().toISOString().split("T")[0];
  const { date } = req.query;
  const filterDate = date || today;

  const todayRecords = attendanceRecords.filter((r) => r.date === filterDate);

  const teachers = todayRecords.filter((r) => r.role === "teacher");
  const staff = todayRecords.filter((r) => r.role === "staff");
  const admins = todayRecords.filter((r) => r.role === "admin");

  res.json({
    date: filterDate,
    summary: {
      teachers: {
        total: employees.filter((e) => e.role === "teacher").length,
        present: teachers.length,
        percentage:
          employees.filter((e) => e.role === "teacher").length > 0
            ? Math.round(
              (teachers.length /
                employees.filter((e) => e.role === "teacher").length) *
              100
            )
            : 0,
      },
      staff: {
        total: employees.filter((e) => e.role === "staff").length,
        present: staff.length,
        percentage:
          employees.filter((e) => e.role === "staff").length > 0
            ? Math.round(
              (staff.length /
                employees.filter((e) => e.role === "staff").length) *
              100
            )
            : 0,
      },
      admins: {
        total: employees.filter((e) => e.role === "admin").length,
        present: admins.length,
        percentage:
          employees.filter((e) => e.role === "admin").length > 0
            ? Math.round(
              (admins.length /
                employees.filter((e) => e.role === "admin").length) *
              100
            )
            : 0,
      },
      totalPresent: todayRecords.length,
      totalEmployees: employees.length,
    },
    records: todayRecords,
  });
});

// Manual attendance qo'shish (IVMS 4200 dan yoki other sources dan)
app.post("/api/attendance/record", (req, res) => {
  try {
    const { employeeId, checkInTime, checkOutTime, date, source } = req.body;

    if (!employeeId || !date) {
      return res.status(400).json({ error: "employeeId va date majburiy" });
    }

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Xodim topilmadi" });
    }

    // Agar bu sana uchun record bo'lsa, update qilish
    const existingRecord = attendanceRecords.find(
      (r) => r.employeeId === employeeId && r.date === date
    );

    if (existingRecord) {
      existingRecord.checkInTime = checkInTime || existingRecord.checkInTime;
      existingRecord.checkOutTime = checkOutTime || existingRecord.checkOutTime;
      existingRecord.source = source || "manual";
      existingRecord.updatedAt = new Date().toISOString();

      return res.json({
        success: true,
        message: "Davomat ma'lumoti yangilandi",
        record: existingRecord,
      });
    }

    // Yangi record qo'shish
    const newRecord = {
      id: Math.max(...attendanceRecords.map((r) => r.id), 0) + 1,
      employeeId,
      name: employee.name,
      role: employee.role,
      checkInTime,
      checkOutTime,
      date,
      source: source || "manual",
      confidence: 0,
      createdAt: new Date().toISOString(),
    };

    attendanceRecords.push(newRecord);

    res.status(201).json({
      success: true,
      message: "Davomat ma'lumoti saqlandi",
      record: newRecord,
    });
  } catch (error) {
    console.error("Attendance record xatosi:", error);
    res.status(500).json({ error: "Davomat ma'lumotini saqlashda xato" });
  }
});

// Face ID hardware'dan davomat qabul qilish (IVMS 4200 integration)
app.post("/api/attendance/hardware", (req, res) => {
  try {
    const { faceId, timestamp, confidence, action } = req.body; // action: "checkin" yoki "checkout"

    if (!faceId || !timestamp) {
      return res
        .status(400)
        .json({ error: "faceId va timestamp majburiy (hardware format)" });
    }

    // FaceId bo'yicha xodimni topish
    const employee = employees.find((e) => e.faceId === faceId);
    if (!employee) {
      return res
        .status(404)
        .json({ error: "Xodim face database'da topilmadi" });
    }

    const date = timestamp.split("T")[0];
    let record = attendanceRecords.find(
      (r) => r.employeeId === employee.id && r.date === date
    );

    if (!record) {
      // Yangi record
      record = {
        id: Math.max(...attendanceRecords.map((r) => r.id), 0) + 1,
        employeeId: employee.id,
        name: employee.name,
        role: employee.role,
        checkInTime: null,
        checkOutTime: null,
        date,
        source: "face-recognition",
        confidence: Math.round(confidence || 95),
        createdAt: new Date().toISOString(),
      };
      attendanceRecords.push(record);
    }

    // Check-in yoki check-out vaqtini set qilish
    if (action === "checkin" || !action) {
      record.checkInTime = timestamp.split("T")[1].substring(0, 5);
      record.confidence = Math.round(confidence || 95);
    } else if (action === "checkout") {
      record.checkOutTime = timestamp.split("T")[1].substring(0, 5);
    }

    record.updatedAt = new Date().toISOString();

    res.json({
      success: true,
      message: `${employee.name} ${action === "checkout" ? "ketdi" : "keldi"}`,
      record,
    });
  } catch (error) {
    console.error("Hardware attendance xatosi:", error);
    res.status(500).json({ error: "Hardware integration xatosi" });
  }
});

// OLD daily-stats ENDPOINT REMOVED - Now using MongoDB endpoint at line ~1384

// Haftalik attendance statistikasini olish (charts uchun)
app.get("/api/attendance/weekly-stats", (req, res) => {
  const today = new Date();
  const weeklyData = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const dayRecords = attendanceRecords.filter((r) => r.date === dateStr);
    const dayNames = [
      "Yakshanba",
      "Dushanba",
      "Seshanba",
      "Chorshanba",
      "Payshanba",
      "Juma",
      "Shanba",
    ];
    const dayName = dayNames[date.getDay()];

    weeklyData.push({
      date: dateStr,
      day: dayName,
      present: dayRecords.length,
      absent: employees.length - dayRecords.length,
      percentage: Math.round((dayRecords.length / employees.length) * 100 || 0),
    });
  }

  res.json(weeklyData);
});

// Xodimni topish (employee ID bilan)
app.get("/api/employees/:id", (req, res) => {
  const employeeId = parseInt(req.params.id);
  const employee = employees.find((e) => e.id === employeeId);

  if (!employee) {
    return res.status(404).json({ error: "Xodim topilmadi" });
  }

  // Bu xodimning barcha davomat ma'lumotlari
  const attendanceHistory = attendanceRecords.filter(
    (r) => r.employeeId === employeeId
  );

  res.json({
    employee,
    attendanceHistory,
  });
});

// Attendance tarixini olish (filter: date range, role, department)
app.get("/api/attendance/history", (req, res) => {
  const { startDate, endDate, role, employeeId } = req.query;

  let filtered = attendanceRecords;

  if (startDate && endDate) {
    filtered = filtered.filter((r) => r.date >= startDate && r.date <= endDate);
  }

  if (role) {
    filtered = filtered.filter((r) => r.role === role);
  }

  if (employeeId) {
    filtered = filtered.filter((r) => r.employeeId === parseInt(employeeId));
  }

  res.json({
    total: filtered.length,
    startDate,
    endDate,
    records: filtered.sort((a, b) => new Date(b.date) - new Date(a.date)),
  });
});

// ==================== FACE RECOGNITION ENDPOINTS ====================

// Face recognition orqali davomat qo'shish
app.post("/api/attendance/face-recognition", (req, res) => {
  try {
    const { personId, personName, role, confidence, timestamp } = req.body;

    if (!personId || !personName || !role) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const record = {
      id: faceRecognitionRecords.length + 1,
      personId,
      personName,
      role, // "student" yoki "teacher"
      confidence: Math.round(confidence || 95),
      timestamp: timestamp || new Date().toISOString(),
      date: new Date().toISOString().split("T")[0],
    };

    faceRecognitionRecords.push(record);

    // Agar o'quvchi bo'lsa, davomat ma'lumotlarini yangilash
    if (role === "student") {
      const student = students.find((s) => s.id === personId);
      if (student) {
        const currentTime = new Date().toLocaleTimeString("en-US", {
          timeZone: "Asia/Tashkent",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
        student.checkInTime = currentTime;
        student.status = currentTime > "08:30" ? "late" : "present";
      }
    }

    // Agar o'qituvchi bo'lsa
    if (role === "teacher") {
      const teacher = teachers.find((t) => t.id === personId);
      if (teacher) {
        const currentTime = new Date().toLocaleTimeString("en-US", {
          timeZone: "Asia/Tashkent",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
        teacher.checkInTime = currentTime;
      }
    }

    res.json({
      success: true,
      message: `${personName} muvaffaqiyatli tanish qilindi`,
      record,
    });
  } catch (error) {
    console.error("Face recognition xatosi:", error);
    res.status(500).json({ error: "Face recognition xatosi yuz berdi" });
  }
});

// Face recognition ma'lumotlarini olish
app.get("/api/attendance/face-records", (req, res) => {
  const { date } = req.query;
  const today = new Date().toISOString().split("T")[0];
  const filterDate = date || today;

  const filtered = faceRecognitionRecords.filter(
    (record) => record.date === filterDate
  );

  res.json({
    total: filtered.length,
    date: filterDate,
    records: filtered,
  });
});

// Bugungi davomat statistikasi
app.get("/api/attendance/today-summary", (req, res) => {
  const today = new Date().toISOString().split("T")[0];

  const studentCheckIns = faceRecognitionRecords.filter(
    (r) => r.role === "student" && r.date === today
  );

  const teacherCheckIns = faceRecognitionRecords.filter(
    (r) => r.role === "teacher" && r.date === today
  );

  res.json({
    date: today,
    students: {
      total: students.length,
      checkedIn: studentCheckIns.length,
      percentage: Math.round((studentCheckIns.length / students.length) * 100),
    },
    teachers: {
      total: teachers.length,
      checkedIn: teacherCheckIns.length,
      percentage: Math.round((teacherCheckIns.length / teachers.length) * 100),
    },
    recentRecords: faceRecognitionRecords.slice(-10),
  });
});

// O'qituvchilar ro'yxati
app.get("/api/teachers", (req, res) => {
  res.json(teachers);
});

// O'qituvchi davomat check-in
app.post("/api/teachers/:id/checkin", (req, res) => {
  const teacherId = parseInt(req.params.id);
  const teacher = teachers.find((t) => t.id === teacherId);

  if (!teacher) {
    return res.status(404).json({ error: "Teacher not found" });
  }

  const currentTime = new Date().toLocaleTimeString("en-US", {
    timeZone: "Asia/Tashkent",
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
  });

  teacher.checkInTime = currentTime;

  res.json({ success: true, teacher });
});

// ==================== END FACE RECOGNITION ENDPOINTS ====================

// ==================== CRM STATISTICS & ANALYTICS ====================

// CRM Mock Data - Real production uchun database'dan olinadi
const crmMockData = {
  revenue: {
    net: 3131021,
    arr: 1511121,
    lastMonth: 2956000,
    lastQuarter: 1167000,
    quarterlyGoal: 1100000,
  },
  orders: {
    total: 18221,
    lastQuarter: 16400,
    newToday: 47,
  },
  profit: {
    total: 136765.77,
    lastMonth: 125000,
    newCustomers: 892,
    totalRevenue: 25600,
  },
  salesByCategory: [
    { name: "Electronic", value: 65640, percentage: 35 },
    { name: "Furniture", value: 11420, percentage: 25 },
    { name: "Clothes", value: 1840, percentage: 20 },
    { name: "Shoes", value: 2120, percentage: 20 },
  ],
  profitTrend: [
    { date: "2025-12-09", profit: 95000 },
    { date: "2025-12-10", profit: 102000 },
    { date: "2025-12-11", profit: 98000 },
    { date: "2025-12-12", profit: 115000 },
    { date: "2025-12-13", profit: 125000 },
    { date: "2025-12-14", profit: 132000 },
    { date: "2025-12-15", profit: 136765 },
  ],
  customers: [
    {
      id: 1,
      name: "Danny Liu",
      email: "danny@gmail.com",
      deals: 1023,
      totalValue: 37431,
      avatar: "DL",
    },
    {
      id: 2,
      name: "Bella Deviant",
      email: "bella@outlook.com",
      deals: 963,
      totalValue: 30423,
      avatar: "BD",
    },
    {
      id: 3,
      name: "Darrell Steward",
      email: "darrell@yahoo.com",
      deals: 843,
      totalValue: 28540,
      avatar: "DS",
    },
    {
      id: 4,
      name: "Alisher Navoiy",
      email: "alisher@school.uz",
      deals: 756,
      totalValue: 24320,
      avatar: "AN",
    },
    {
      id: 5,
      name: "Gulnora Karimova",
      email: "gulnora@school.uz",
      deals: 689,
      totalValue: 22150,
      avatar: "GK",
    },
  ],
  recentActivities: [
    {
      id: 1,
      type: "users",
      message: "56 New users registered.",
      time: "2 mins ago",
    },
    {
      id: 2,
      type: "orders",
      message: "132 Orders placed.",
      time: "12 mins ago",
    },
    {
      id: 3,
      type: "withdraw",
      message: "Funds have been withdrawn.",
      time: "45 mins ago",
    },
    {
      id: 4,
      type: "messages",
      message: "5 Unread messages.",
      time: "1 hour ago",
    },
  ],
  managerContacts: [
    { name: "Daniel Craig", role: "Manager", online: false },
    { name: "Kate Morrison", role: "Sales", online: true },
    { name: "Nataniel Donovan", role: "Support", online: true },
    { name: "Elisabeth Wayne", role: "HR", online: false },
    { name: "Felicia Rassel", role: "Marketing", online: true },
  ],
};

// Dashboard umumiy statistikasi
app.get("/api/crm/dashboard-stats", (req, res) => {
  const revenueChange = Math.round(
    ((crmMockData.revenue.net - crmMockData.revenue.lastMonth) /
      crmMockData.revenue.lastMonth) *
    100
  );
  const arrChange = Math.round(
    ((crmMockData.revenue.arr - crmMockData.revenue.lastQuarter) /
      crmMockData.revenue.lastQuarter) *
    100
  );
  const ordersChange = Math.round(
    ((crmMockData.orders.total - crmMockData.orders.lastQuarter) /
      crmMockData.orders.lastQuarter) *
    100
  );
  const goalPercentage = Math.round(
    (crmMockData.revenue.arr / crmMockData.revenue.quarterlyGoal) * 100
  );

  res.json({
    revenue: {
      net: crmMockData.revenue.net,
      change: `${revenueChange > 0 ? "+" : ""}${revenueChange}%`,
      trend: revenueChange > 0 ? "up" : "down",
    },
    arr: {
      value: crmMockData.revenue.arr,
      change: `${arrChange > 0 ? "+" : ""}${arrChange}%`,
      trend: arrChange > 0 ? "up" : "down",
    },
    quarterlyGoal: {
      percentage: goalPercentage,
      target: crmMockData.revenue.quarterlyGoal,
    },
    orders: {
      total: crmMockData.orders.total,
      change: `${ordersChange > 0 ? "+" : ""}${ordersChange}%`,
      trend: ordersChange > 0 ? "up" : "down",
    },
    profit: {
      total: crmMockData.profit.total,
      newCustomers: crmMockData.profit.newCustomers,
      totalRevenue: crmMockData.profit.totalRevenue,
    },
  });
});

// Sales overview - kategoriya bo'yicha
app.get("/api/crm/sales-overview", (req, res) => {
  const totalSales = crmMockData.salesByCategory.reduce(
    (sum, cat) => sum + cat.value,
    0
  );

  res.json({
    total: totalSales,
    categories: crmMockData.salesByCategory,
  });
});

// Profit trend - haftalik/oylik
app.get("/api/crm/profit-trend", (req, res) => {
  const { period = "weekly" } = req.query;

  if (period === "weekly") {
    res.json({
      period: "weekly",
      data: crmMockData.profitTrend,
    });
  } else {
    // Monthly data (simplified)
    res.json({
      period: "monthly",
      data: crmMockData.profitTrend,
    });
  }
});

// Customers ro'yxati
app.get("/api/crm/customers", (req, res) => {
  const { limit, sort } = req.query;
  let customers = [...crmMockData.customers];

  // Sorting
  if (sort === "deals") {
    customers.sort((a, b) => b.deals - a.deals);
  } else if (sort === "value") {
    customers.sort((a, b) => b.totalValue - a.totalValue);
  }

  // Limit
  if (limit) {
    customers = customers.slice(0, parseInt(limit));
  }

  res.json({
    total: crmMockData.customers.length,
    customers,
  });
});

// Recent activities
app.get("/api/crm/recent-activities", (req, res) => {
  res.json({
    activities: crmMockData.recentActivities,
  });
});

// Manager contacts
app.get("/api/crm/managers", (req, res) => {
  res.json({
    managers: crmMockData.managerContacts,
  });
});

// ==================== END CRM ENDPOINTS ====================

// ==================== HIKVISION FACE ID ENDPOINTS ====================

// Test Hikvision device connection
app.get("/api/hikvision/test-connection", async (req, res) => {
  try {
    const result = await testHikvisionConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to test connection",
      message: error.message,
    });
  }
});

// Fetch latest events from Hikvision (for debugging/viewing raw data)
app.get("/api/hikvision/latest-events", async (req, res) => {
  try {
    const { limit } = req.query;
    const maxResults = parseInt(limit) || 30;

    const result = await fetchHikvisionEvents(maxResults);

    if (result.success) {
      res.json({
        success: true,
        totalEvents: result.totalEvents,
        events: result.events,
        message: `Successfully fetched ${result.totalEvents} events`,
      });
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch events",
      message: error.message,
    });
  }
});

// Sync attendance from Hikvision device
app.post("/api/hikvision/sync", async (req, res) => {
  try {
    console.log("🔄 Starting Hikvision sync...");

    // Fetch events from Hikvision
    const hikvisionResult = await fetchHikvisionEvents(50); // Get last 50 events

    if (!hikvisionResult.success) {
      console.error("❌ Hikvision fetch failed:", hikvisionResult.error);
      return res.status(500).json({
        success: false,
        error: "Failed to fetch events from Hikvision",
        details: hikvisionResult.error,
      });
    }

    const events = hikvisionResult.events;
    console.log(`📥 Received ${events.length} events from Hikvision`);

    // Get all active employees from MongoDB
    const allEmployees = await Employee.find({ status: "active" });
    console.log(`👥 Found ${allEmployees.length} employees in MongoDB`);

    // Process each event
    let syncedCount = 0;
    const syncedEmployees = [];

    for (const event of events) {
      // Find employee by hikvisionEmployeeId
      const employee = allEmployees.find(
        (emp) => emp.hikvisionEmployeeId === event.employeeNoString
      );

      if (!employee) {
        console.warn(
          `⚠️  No employee found for Hikvision ID: ${event.employeeNoString}`
        );
        continue;
      }

      const eventDate = new Date(event.time);
      const dateStr = eventDate.toISOString().split("T")[0];
      const timeStr = eventDate.toTimeString().substring(0, 5);

      // Find or create attendance record
      let attendance = await Attendance.findOne({
        hikvisionEmployeeId: event.employeeNoString,
        date: dateStr,
      });

      if (!attendance) {
        // Create new attendance record with check-in
        attendance = new Attendance({
          employeeId: employee.employeeId,
          hikvisionEmployeeId: employee.hikvisionEmployeeId,
          name: employee.name,
          role: employee.role,
          department: employee.department,
          date: dateStr,
          events: [
            {
              time: timeStr,
              type: "IN",
              timestamp: eventDate,
            },
          ],
          firstCheckIn: timeStr,
          status: "present",
        });
        await attendance.save();
        syncedCount++;
        syncedEmployees.push({
          name: employee.name,
          action: "checkin",
          time: timeStr,
        });
        console.log(`✅ ${employee.name} - CHECK IN at ${timeStr}`);
      } else {
        // Update existing record - add to events
        const lastEvent = attendance.events[attendance.events.length - 1];
        if (lastEvent.type === "IN") {
          // Last was IN, this should be OUT
          attendance.events.push({
            time: timeStr,
            type: "OUT",
            timestamp: eventDate,
          });
          attendance.lastCheckOut = timeStr;
          syncedEmployees.push({
            name: employee.name,
            action: "checkout",
            time: timeStr,
          });
          console.log(`✅ ${employee.name} - CHECK OUT at ${timeStr}`);
        } else {
          // Last was OUT, this is a new IN
          attendance.events.push({
            time: timeStr,
            type: "IN",
            timestamp: eventDate,
          });
          syncedEmployees.push({
            name: employee.name,
            action: "checkin",
            time: timeStr,
          });
          console.log(`✅ ${employee.name} - CHECK IN again at ${timeStr}`);
        }
        await attendance.save();
        syncedCount++;
      }
    }

    console.log(`✅ Sync completed: ${syncedCount} records processed`);

    res.json({
      success: true,
      message: `Synced ${syncedCount} attendance records`,
      statistics: {
        totalEventsFromDevice: events.length,
        syncedRecords: syncedCount,
        unmatchedEvents: events.length - syncedCount,
      },
      syncedEmployees: syncedEmployees,
      lastSyncTime: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ Hikvision sync error:", error);
    res.status(500).json({
      success: false,
      error: "Sync failed",
      message: error.message,
    });
  }
});

// Get sync status and last sync time
app.get("/api/hikvision/sync-status", (req, res) => {
  res.json({
    lastSyncTime: lastSyncTimestamp,
    totalRawEvents: hikvisionRawEvents.length,
    status: lastSyncTimestamp ? "synced" : "never_synced",
  });
});

// Get latest attendance events (Real-Time Events)
app.get("/api/hikvision/latest-events", async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    // Get latest attendance records with all events
    const latestAttendance = await Attendance.find()
      .sort({ updatedAt: -1 })
      .limit(parseInt(limit));

    // Flatten all events from all attendance records
    const allEvents = [];

    latestAttendance.forEach((attendance) => {
      attendance.events.forEach((event) => {
        allEvents.push({
          employeeId: attendance.employeeId,
          hikvisionEmployeeId: attendance.hikvisionEmployeeId,
          name: attendance.name,
          department: attendance.department,
          eventType: event.type, // IN or OUT
          time: event.time,
          timestamp: event.timestamp,
          date: attendance.date,
        });
      });
    });

    // Sort by timestamp descending
    allEvents.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Return only the requested number
    const recentEvents = allEvents.slice(0, parseInt(limit));

    res.json({
      success: true,
      count: recentEvents.length,
      events: recentEvents,
    });
  } catch (error) {
    console.error("Error fetching latest events:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch latest events",
    });
  }
});

// Hikvision Event Notification Webhook (Real-time push from device)
app.post("/api/hikvision/webhook", async (req, res) => {
  console.log("\n🎯 Hikvision Event Notification Received!");
  console.log("Timestamp:", new Date().toISOString());
  console.log("Body:", JSON.stringify(req.body, null, 2));

  try {
    const event = req.body;
    let employeeNo, employeeName, eventTime;

    // Parse event data
    if (event.EventNotificationAlert) {
      employeeNo = event.EventNotificationAlert.employeeNoString;
      employeeName = event.EventNotificationAlert.name;
      eventTime = event.EventNotificationAlert.dateTime;
    } else if (event.employeeNoString) {
      employeeNo = event.employeeNoString;
      employeeName = event.name;
      eventTime = event.time || event.dateTime;
    }

    // If we have either employee number or name, process the event
    if (employeeNo || employeeName) {
      console.log(
        `✅ Face detected: ${employeeName || "Unknown"} (${employeeNo || "No ID"
        })`
      );

      // Find employee in database (by ID if available, otherwise by name)
      let employee = null;

      if (employeeNo) {
        employee = await Employee.findOne({
          hikvisionEmployeeId: employeeNo,
        });
      } else if (employeeName) {
        // Try to find by name if no ID provided
        employee = await Employee.findOne({
          name: employeeName,
        });
      }

      // AUTO-REGISTRATION: If employee not found and we have a name, create new record
      if (!employee && employeeName) {
        console.log(
          `📝 New employee detected - Auto-registering: ${employeeName}`
        );

        const nameParts = employeeName.split(" ");
        const avatar =
          nameParts.length > 1
            ? nameParts[0][0] + nameParts[1][0]
            : employeeName.substring(0, 2);

        const employeeCount = await Employee.countDocuments();

        employee = new Employee({
          employeeId: employeeCount + 1,
          name: employeeName,
          department: "Bosh", // Default bo'lim
          role: "staff", // Default role
          faceId: employeeNo
            ? `face_${employeeNo}`
            : `face_auto_${employeeCount + 1}`,
          hikvisionEmployeeId: employeeNo || `AUTO_${employeeCount + 1}`,
          avatar: avatar.toUpperCase(),
          email: `${employeeName.toLowerCase().replace(/\s+/g, ".")}@school.uz`,
          phone: `+99899${Math.floor(1000000 + Math.random() * 9000000)}`,
          status: "active",
        });

        await employee.save();
        console.log(`✅ New employee registered: ${employeeName}`);
      }

      if (employee) {
        const today = new Date().toISOString().split("T")[0];
        // Uzbekistan timezone UTC+5
        const currentTime = new Date().toLocaleTimeString("en-US", {
          timeZone: "Asia/Tashkent",
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });

        // Find or create today's attendance record
        let attendance = await Attendance.findOne({
          employeeId: employee.employeeId,
          date: today,
        });

        if (!attendance) {
          // First detection of the day - set as first check-in
          attendance = new Attendance({
            employeeId: employee.employeeId,
            hikvisionEmployeeId: employee.hikvisionEmployeeId,
            name: employee.name,
            department: employee.department,
            role: employee.role,
            date: today,
            firstCheckIn: currentTime,
            lastCheckOut: currentTime, // Same as first check-in initially
            events: [
              {
                time: currentTime,
                type: "IN",
                timestamp: new Date(),
              },
            ],
            status: "present",
            workDuration: 0,
          });

          await attendance.save();
          console.log(
            `✅ ${employee.name} - Birinchi marta ko'rildi: ${currentTime}`
          );
        } else {
          // Update last seen time (ketgan vaqti) every time they are detected
          attendance.lastCheckOut = currentTime;
          attendance.events.push({
            time: currentTime,
            type: "SEEN",
            timestamp: new Date(),
          });

          // Calculate work duration from first to last seen
          const checkInParts = attendance.firstCheckIn.split(":");
          const checkOutParts = currentTime.split(":");
          const checkInMinutes =
            parseInt(checkInParts[0]) * 60 + parseInt(checkInParts[1]);
          const checkOutMinutes =
            parseInt(checkOutParts[0]) * 60 + parseInt(checkOutParts[1]);
          attendance.workDuration = checkOutMinutes - checkInMinutes;

          await attendance.save();
          console.log(
            `🔄 ${employee.name} - Ohirgi marta ko'rildi: ${currentTime}`
          );
        }
      } else {
        console.log(
          `⚠️  Employee not found in database for Hikvision ID: ${employeeNo} (${employeeName})`
        );
      }
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).send("Error");
  }
});

// Get all staff (employees) + students - used by AttendancePage
app.get("/api/all-staff", async (req, res) => {
  try {
    // Загружаем сотрудников
    const employees = await Employee.find({ status: "active" }).sort({
      name: 1,
    });

    // Загружаем студентов
    const students = await Student.find({ status: "active" }).sort({
      name: 1,
    });

    // Конвертируем студентов в формат employee для совместимости
    const studentsAsEmployees = students.map((student) => ({
      _id: student._id,
      name: student.name,
      role: "student",
      class: student.className,
      department: student.className,
      employeeId: student.studentId,
      hikvisionEmployeeId: student.hikvisionEmployeeId,
      status: student.status,
      phone: student.phone,
      email: student.email,
    }));

    // Объединяем всех
    const allStaff = [
      ...employees.map((emp) => emp.toObject()),
      ...studentsAsEmployees,
    ];

    console.log(
      `✅ Loaded ${allStaff.length} total (${employees.length} employees + ${students.length} students)`
    );
    res.json({ employees: allStaff });
  } catch (error) {
    console.error("Error fetching all staff:", error);
    res.status(500).json({ error: "Failed to fetch staff" });
  }
});

// ==================== MONGODB API ENDPOINTS ====================

// Get all employees from MongoDB
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find({ status: "active" }).sort({
      name: 1,
    });
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// Get daily attendance stats from MongoDB
app.get("/api/attendance/daily-stats", async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    console.log(`📊 Loading attendance stats for: ${targetDate}`);

    // Get all active employees with a timeout
    let allEmployees = [];
    try {
      allEmployees = await Promise.race([
        Employee.find({ status: "active" }).sort({ name: 1 }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Employee query timeout")), 5000)
        ),
      ]);
      console.log(`✅ Loaded ${allEmployees.length} active employees`);
    } catch (err) {
      console.error(`⚠️ Error loading employees: ${err.message}`);
      // Continue with empty list if employees don't load
      allEmployees = [];
    }

    const totalEmployees = allEmployees.length;

    // Get attendance records for the date
    let attendanceRecords = [];
    try {
      attendanceRecords = await Promise.race([
        Attendance.find({ date: targetDate }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Attendance query timeout")), 5000)
        ),
      ]);
      console.log(
        `✅ Loaded ${attendanceRecords.length} attendance records for ${targetDate}`
      );
    } catch (err) {
      console.error(`⚠️ Error loading attendance: ${err.message}`);
      attendanceRecords = [];
    }

    const presentCount = attendanceRecords.filter(
      (r) => r.status === "present" || r.status === "partial"
    ).length;
    const absentCount = totalEmployees - presentCount;
    const attendanceRate =
      totalEmployees > 0
        ? Math.round((presentCount / totalEmployees) * 100)
        : 0;

    // Map all employees with their attendance status
    const employeesList = allEmployees.map((emp) => {
      const attendance = attendanceRecords.find(
        (r) => r.hikvisionEmployeeId === emp.hikvisionEmployeeId
      );

      return {
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        salary: emp.salary,
        avatar: emp.avatar || emp.name.charAt(0).toUpperCase(),
        checkInTime: attendance?.firstCheckIn || "-",
        checkOutTime: attendance?.lastCheckOut || "-",
        workDuration: attendance?.workDuration || 0,
        status: attendance ? attendance.status : "absent",
        date: targetDate,
      };
    });

    // Group by role
    const byRole = {
      teachers: {
        total: allEmployees.filter((e) => e.role === "teacher").length,
        present: attendanceRecords.filter(
          (r) =>
            r.role === "teacher" &&
            (r.status === "present" || r.status === "partial")
        ).length,
      },
      staff: {
        total: allEmployees.filter((e) => e.role === "staff").length,
        present: attendanceRecords.filter(
          (r) =>
            r.role === "staff" &&
            (r.status === "present" || r.status === "partial")
        ).length,
      },
      admins: {
        total: allEmployees.filter((e) => e.role === "admin").length,
        present: attendanceRecords.filter(
          (r) =>
            r.role === "admin" &&
            (r.status === "present" || r.status === "partial")
        ).length,
      },
    };

    res.json({
      statistics: {
        date: targetDate,
        totalEmployees,
        presentCount,
        absentCount,
        attendanceRate,
        byRole,
      },
      employees: employeesList,
    });
  } catch (error) {
    console.error("❌ Error fetching daily stats:", error);
    res.status(500).json({
      error: "Failed to fetch daily statistics",
      details: error.message,
    });
  }
});

// Get employee attendance history
app.get("/api/attendance/employee-history/:employeeId", async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { startDate, endDate } = req.query;

    console.log(
      `📅 Loading history for employee ${employeeId} from ${startDate} to ${endDate}`
    );

    // Get employee
    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Get attendance records for date range
    const attendanceRecords = await Attendance.find({
      hikvisionEmployeeId: employee.hikvisionEmployeeId,
      date: {
        $gte: startDate,
        $lte: endDate,
      },
    }).sort({ date: -1 });

    console.log(`✅ Found ${attendanceRecords.length} attendance records`);

    // Calculate work duration for each day
    const history = attendanceRecords.map((record) => {
      let workDuration = "-";
      if (record.firstCheckIn && record.lastCheckOut) {
        const [checkInHour, checkInMin] = record.firstCheckIn
          .split(":")
          .map(Number);
        const [checkOutHour, checkOutMin] = record.lastCheckOut
          .split(":")
          .map(Number);

        const checkInMinutes = checkInHour * 60 + checkInMin;
        const checkOutMinutes = checkOutHour * 60 + checkOutMin;

        const diffMinutes = checkOutMinutes - checkInMinutes;
        if (diffMinutes > 0) {
          const hours = Math.floor(diffMinutes / 60);
          const minutes = diffMinutes % 60;
          workDuration = `${hours}s ${minutes}d`;
        }
      }

      return {
        date: record.date,
        firstCheckIn: record.firstCheckIn || "-",
        lastCheckOut: record.lastCheckOut || "-",
        workDuration,
        status: record.status,
      };
    });

    // Generate all dates in range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const allDates = [];

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      allDates.push(d.toISOString().split("T")[0]);
    }

    // Fill in missing dates as absent
    const completeHistory = allDates.map((date) => {
      const existing = history.find((h) => h.date === date);
      return (
        existing || {
          date,
          firstCheckIn: "-",
          lastCheckOut: "-",
          workDuration: "-",
          status: "absent",
        }
      );
    });

    // Calculate stats
    const totalDays = completeHistory.length;
    const presentDays = completeHistory.filter(
      (h) =>
        h.status === "present" || h.status === "partial" || h.status === "late"
    ).length;
    const absentDays = totalDays - presentDays;
    const attendanceRate =
      totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;

    res.json({
      employee: {
        name: employee.name,
        department: employee.department,
      },
      history: completeHistory,
      stats: {
        totalDays,
        presentDays,
        absentDays,
        attendanceRate,
      },
    });
  } catch (error) {
    console.error("❌ Error fetching employee history:", error);
    res.status(500).json({
      error: "Failed to fetch employee history",
      details: error.message,
    });
  }
});

// Get ISUP Server Status
app.get("/api/isup/status", (req, res) => {
  const devices = getConnectedDevices();
  res.json({
    server: "online",
    port: 5200,
    connectedDevices: devices.length,
    devices: devices,
  });
});

// Update employee with role-specific fields + Student collection sync
app.put("/api/employee/:id", async (req, res) => {
  try {
    const {
      name,
      department,
      salary,
      role,
      status,
      subject,
      shift,
      specialty,
      phone,
      email,
      class: studentClass,
      studentId,
      isClassTeacher,
      classTeacherOf,
      hikvisionEmployeeId, // ✅ Added for attendance matching
    } = req.body;

    console.log(`🔄 [INDEX.JS] Updating employee ${req.params.id}:`, {
      role,
      department,
      class: studentClass,
    });
    console.log(`📥 [INDEX.JS] Request body:`, req.body);

    // Get current employee to check role change
    const currentEmployee = await Employee.findById(req.params.id);
    if (!currentEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Role o'zgarsa, department'ni avtomatik yangilash
    let finalDepartment = department;
    if (role && !department) {
      switch (role) {
        case "teacher":
          finalDepartment = subject || "O'qituvchi";
          break;
        case "student":
          finalDepartment = studentClass || "O'quvchi";
          break;
        case "staff":
          finalDepartment = "Xodim";
          break;
        case "admin":
          finalDepartment = "Administrator";
          break;
        default:
          finalDepartment = "Lavozim belgilanmagan";
      }
      console.log(
        `🔄 [INDEX.JS] Role "${role}" -> Department "${finalDepartment}"`
      );
    }

    const updateData = {};

    // Add all provided fields to update
    if (name !== undefined) updateData.name = name;
    if (finalDepartment !== undefined) updateData.department = finalDepartment;
    if (salary !== undefined) updateData.salary = salary;
    if (role !== undefined) updateData.role = role;
    if (status !== undefined) updateData.status = status;
    if (subject !== undefined) updateData.subject = subject;
    if (shift !== undefined) updateData.shift = shift;
    if (specialty !== undefined) updateData.specialty = specialty;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    // Student fields
    if (studentClass !== undefined) updateData.class = studentClass;
    if (studentId !== undefined) updateData.studentId = studentId;

    // Class teacher fields
    if (isClassTeacher !== undefined)
      updateData.isClassTeacher = isClassTeacher;
    if (classTeacherOf !== undefined)
      updateData.classTeacherOf = classTeacherOf;

    // ✅ Hikvision ID for attendance matching
    if (hikvisionEmployeeId !== undefined)
      updateData.hikvisionEmployeeId = hikvisionEmployeeId;

    console.log(`📊 [INDEX.JS] Final update data:`, updateData);

    // Use updateOne with $set operator for direct MongoDB update
    const updateResult = await Employee.collection.updateOne(
      { _id: new mongoose.Types.ObjectId(req.params.id) },
      { $set: updateData }
    );

    console.log(`📊 [INDEX.JS] MongoDB update result:`, {
      matchedCount: updateResult.matchedCount,
      modifiedCount: updateResult.modifiedCount,
      acknowledged: updateResult.acknowledged,
    });

    if (updateResult.matchedCount === 0) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Fetch updated document
    const updatedEmployee = await Employee.findById(req.params.id);

    console.log(`✅ [INDEX.JS] Updated employee:`, {
      _id: updatedEmployee._id,
      name: updatedEmployee.name,
      role: updatedEmployee.role,
      department: updatedEmployee.department,
      class: updatedEmployee.class,
    });

    // 🆕 AUTO-SYNC TO STUDENT COLLECTION when role becomes "student"
    if (role === "student" && currentEmployee.role !== "student") {
      console.log(`🎯 [INDEX.JS] Role changed to student - Creating Student record for ${updatedEmployee.name}`);

      // Check if student record already exists
      let existingStudent = await Student.findOne({
        $or: [
          { hikvisionEmployeeId: updatedEmployee.hikvisionEmployeeId },
          { name: updatedEmployee.name }
        ]
      });

      if (!existingStudent) {
        try {
          // Generate student ID
          const studentCount = await Student.countDocuments();
          const autoStudentId = `STU${String(studentCount + 1).padStart(5, "0")}`;

          // Auto-extract class from department
          let className = studentClass || updatedEmployee.class || updatedEmployee.department;

          // Clean department string if it contains "o'quvchi" or similar
          if (className.includes("o'quvchi") || className.includes("O'quvchi")) {
            className = className.replace(/\s*(o'quvchi|O'quvchi)\s*/gi, '').trim();
          }

          // If className is empty, set default
          if (!className) {
            className = "Sinf belgilanmagan";
          }

          // Create Student record
          const newStudent = new Student({
            name: updatedEmployee.name,
            studentId: autoStudentId,
            className: className,
            hikvisionEmployeeId: updatedEmployee.hikvisionEmployeeId,
            phone: updatedEmployee.phone || "",
            email: updatedEmployee.email || "",
            status: "active"
          });

          await newStudent.save();
          console.log(`✅ [INDEX.JS] Created Student record for ${updatedEmployee.name} in class ${className}`);

          // Auto-create or update Class record
          let classDoc = await Class.findOne({ name: className });
          if (!classDoc && className !== "Sinf belgilanmagan") {
            // Parse className to extract grade and section
            // Handle formats: "9-A", "9A", "9 A", "2 blue", "2blue", "2-blue"
            let grade = 1;
            let section = "A";

            const cleanClassName = className.trim();

            // Try different patterns
            if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
              // Pattern like "2blue", "2 blue", "2-blue", "9A", "9-A"
              const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
              if (matches) {
                grade = parseInt(matches[1]);
                section = matches[2];
              }
            } else if (/^\d+$/i.test(cleanClassName)) {
              // Pattern like "2", "9" (just number)
              grade = parseInt(cleanClassName);
              section = "A";
            } else {
              // Fallback: try to extract any number and letter
              const numberMatch = cleanClassName.match(/\d+/);
              const letterMatch = cleanClassName.match(/[a-zA-Z]+/i);

              grade = numberMatch ? parseInt(numberMatch[0]) : 1;
              section = letterMatch ? letterMatch[0] : "A";
            }

            // Ensure valid values
            if (grade < 1 || grade > 12) grade = 1;
            if (!section || section.trim() === "") section = "A";

            console.log(`📚 [INDEX.JS] Parsing "${className}" -> grade: ${grade}, section: "${section}"`);

            classDoc = new Class({
              name: className,
              grade: grade,
              section: section.charAt(0).toUpperCase() + section.slice(1).toLowerCase()
            });
            await classDoc.save();
            console.log(`📚 [INDEX.JS] Auto-created class: ${className} (grade: ${grade}, section: ${section})`);
          }

          // Update class student count
          if (classDoc) {
            const studentCount = await Student.countDocuments({ className, status: "active" });
            await Class.findByIdAndUpdate(classDoc._id, { studentCount });
            console.log(`📊 [INDEX.JS] Updated class ${className} student count: ${studentCount}`);
          }

          // Broadcast student creation
          if (global.io) {
            global.io.emit("student:added", newStudent);
          }
        } catch (studentError) {
          console.error("❌ [INDEX.JS] Error creating Student record:", studentError);
        }
      } else {
        console.log(`ℹ️ [INDEX.JS] Student record already exists for ${updatedEmployee.name}`);
      }
    }

    // Broadcast update via Socket.IO
    if (global.io) {
      global.io.emit("employee:updated", updatedEmployee);
      console.log(
        `📡 [INDEX.JS] Socket.IO broadcast sent for:`,
        updatedEmployee.name
      );
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});

// Delete employee
app.delete("/api/employee/:id", async (req, res) => {
  try {
    const deletedEmployee = await Employee.findByIdAndDelete(req.params.id);

    if (!deletedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Also delete all attendance records for this employee
    await Attendance.deleteMany({ employeeId: req.params.id });

    // Broadcast deletion via Socket.IO
    if (global.io) {
      global.io.emit("employee:deleted", { id: req.params.id });
    }

    res.json({
      success: true,
      message: "Employee and related attendance records deleted",
      deleted: deletedEmployee,
    });
  } catch (error) {
    console.error("Error deleting employee:", error);
    res.status(500).json({ error: "Failed to delete employee" });
  }
});

// Update employee salary status
app.patch("/api/employee/:id/salary-status", async (req, res) => {
  try {
    const { salaryStatus, salaryMonth } = req.body;

    const employee = await Employee.findByIdAndUpdate(
      req.params.id,
      {
        salaryStatus,
        salaryMonth:
          salaryMonth ||
          `${new Date().getFullYear()}-${String(
            new Date().getMonth() + 1
          ).padStart(2, "0")}`,
      },
      { new: true }
    );

    if (!employee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Broadcast update
    if (global.io) {
      global.io.emit("salary:updated", employee);
    }

    res.json(employee);
  } catch (error) {
    console.error("Error updating salary status:", error);
    res.status(500).json({ error: "Failed to update salary status" });
  }
});

// Get salary statistics
app.get("/api/salary/stats", async (req, res) => {
  try {
    const currentMonth = `${new Date().getFullYear()}-${String(
      new Date().getMonth() + 1
    ).padStart(2, "0")}`;
    const { month = currentMonth } = req.query;

    const employees = await Employee.find({ status: "active" });

    const stats = {
      totalEmployees: employees.length,
      totalSalary: employees.reduce((sum, emp) => sum + (emp.salary || 0), 0),
      paidCount: employees.filter(
        (e) => e.salaryStatus === "paid" && e.salaryMonth === month
      ).length,
      unpaidCount: employees.filter(
        (e) => e.salaryStatus === "unpaid" || e.salaryMonth !== month
      ).length,
      paidAmount: employees
        .filter((e) => e.salaryStatus === "paid" && e.salaryMonth === month)
        .reduce((sum, emp) => sum + (emp.salary || 0), 0),
      unpaidAmount: employees
        .filter((e) => e.salaryStatus === "unpaid" || e.salaryMonth !== month)
        .reduce((sum, emp) => sum + (emp.salary || 0), 0),
      month,
    };

    res.json(stats);
  } catch (error) {
    console.error("Error getting salary stats:", error);
    res.status(500).json({ error: "Failed to get salary stats" });
  }
});

// Socket.IO Connection
io.on("connection", (socket) => {
  console.log(`📱 Client connected: ${socket.id}`);

  socket.on("disconnect", () => {
    console.log(`📱 Client disconnected: ${socket.id}`);
  });
});

// Make io accessible globally
global.io = io;

// Start server
// ==================== EMERGENCY CLEANUP ====================
app.post("/api/emergency-cleanup", async (req, res) => {
  try {
    console.log("🧹 EMERGENCY DATABASE CLEANUP REQUESTED");

    // Delete all employees
    const employees = await Employee.deleteMany({});

    // Check other collections that might exist
    const db = mongoose.connection.db;
    const collections = ["teachers", "students", "attendances", "facerecords"];

    let totalDeleted = employees.deletedCount;
    const report = [`employees: ${employees.deletedCount}`];

    for (const collectionName of collections) {
      try {
        const collection = db.collection(collectionName);
        const result = await collection.deleteMany({});
        if (result.deletedCount > 0) {
          report.push(`${collectionName}: ${result.deletedCount}`);
          totalDeleted += result.deletedCount;
        }
      } catch (error) {
        // Collection doesn't exist, that's fine
      }
    }

    console.log(`✅ CLEANUP COMPLETE: ${totalDeleted} total records deleted`);

    res.json({
      success: true,
      message: "Database cleaned successfully",
      deleted: report,
      total: totalDeleted,
    });
  } catch (error) {
    console.error("❌ Cleanup error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Drop unnecessary collections completely
app.post("/api/drop-unused-collections", async (req, res) => {
  try {
    console.log("🗑️ DROPPING UNUSED COLLECTIONS...");

    const db = mongoose.connection.db;
    // Лишние коллекции - все должно быть в employees
    const unusedCollections = [
      "cooks",
      "guards",
      "teachers",
      "students",
      "facerecords",
    ];

    const dropped = [];
    const errors = [];

    for (const collectionName of unusedCollections) {
      try {
        await db.collection(collectionName).drop();
        dropped.push(collectionName);
        console.log(`✅ Dropped: ${collectionName}`);
      } catch (error) {
        if (error.code === 26) {
          // Collection doesn't exist - that's fine
          console.log(`⚪ ${collectionName} - already doesn't exist`);
        } else {
          errors.push(`${collectionName}: ${error.message}`);
        }
      }
    }

    console.log(`🧹 CLEANUP COMPLETE: Dropped ${dropped.length} collections`);

    res.json({
      success: true,
      message: "Unused collections dropped",
      dropped: dropped,
      kept: ["employees", "attendances"],
      errors: errors,
    });
  } catch (error) {
    console.error("❌ Drop error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("❌ GLOBAL ERROR HANDLER:", err);
  console.error("Stack:", err.stack);
  res.status(500).json({
    success: false,
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;
// Initialize Scheduler for Cron Jobs
initializeScheduler();

httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Socket.IO ready for real-time updates`);
});

// Unhandled promise rejection handler
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection at:", promise);
  console.error("❌ Reason:", reason);
});

// Uncaught exception handler
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  console.error("Stack:", error.stack);
});
