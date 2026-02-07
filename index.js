import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Setup paths for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables immediately
const envLocalPath = path.resolve(__dirname, "../.env.local");
const envPath = path.resolve(__dirname, "../.env");
dotenv.config({ path: envLocalPath });
dotenv.config({ path: envPath });

import express from "express";
import cors from "cors";
import { createServer } from "http";
import connectDB from "./db/connection.js";
import { initializeSocket } from "./services/socket.service.js";
import { corsOptions } from "./config/cors.js";
import { initializeScheduler } from "./services/scheduler.service.js";

console.log(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);

// Connect to MongoDB
connectDB();

const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = initializeSocket(httpServer, { cors: corsOptions });

// Middleware
app.use(cors(corsOptions));
app.use(express.json());

// ==================== ROUTES ====================

// Setup routes
console.log("🛠️ Registering /api/setup routes...");
app.use("/api/setup", setupRoutes);

// Webhook routes (for Hikvision terminal integration)
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

// ==================== HEALTH CHECK ====================

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    message: "Oqava Suv Management API is running",
    system: "Water Management - Employee Attendance",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// ==================== ATTENDANCE ENDPOINTS ====================

// Get all attendance records
app.get("/api/attendance", async (req, res) => {
  try {
    const records = await Attendance.find().populate("employeeId");
    res.json({
      success: true,
      data: records,
      total: records.length,
    });
  } catch (error) {
    console.error("Error fetching attendance:", error);
    res.status(500).json({ error: "Davomat ma'lumotlarini olishda xato" });
  }
});

// Get attendance for today
app.get("/api/attendance/today", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const records = await Attendance.find({
      checkinTime: {
        $regex: today,
      },
    }).populate("employeeId");

    res.json({
      success: true,
      date: today,
      data: records,
      total: records.length,
    });
  } catch (error) {
    console.error("Error fetching today's attendance:", error);
    res.status(500).json({ error: "Bugungi davomat ma'lumotlarida xato" });
  }
});

// Get attendance statistics
app.get("/api/attendance/stats", async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const totalEmployees = await Employee.countDocuments();
    const presentToday = await Attendance.distinct("employeeId", {
      checkinTime: {
        $regex: today,
      },
    });

    res.json({
      success: true,
      statistics: {
        totalEmployees,
        presentToday: presentToday.length,
        absentToday: totalEmployees - presentToday.length,
        attendancePercentage:
          totalEmployees > 0
            ? Math.round((presentToday.length / totalEmployees) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Statistika olishda xato" });
  }
});

// ==================== EMPLOYEE ENDPOINTS ====================

// Get all employees
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json({
      success: true,
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Xodimlarni olishda xato" });
  }
});

// Get employee by ID
app.get("/api/employees/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Xodim topilmadi" });
    }
    res.json({
      success: true,
      data: employee,
    });
  } catch (error) {
    console.error("Error fetching employee:", error);
    res.status(500).json({ error: "Xodim ma'lumotida xato" });
  }
});

// Get all staff (alias for employees)
app.get("/api/all-staff", async (req, res) => {
  try {
    const employees = await Employee.find();
    res.json({
      success: true,
      employees: employees,
      data: employees,
      total: employees.length,
    });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Xodimlarni olishda xato" });
  }
});

// Update employee (phone and staffType)
app.put("/api/employee/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { phone, staffType, department } = req.body;

    console.log("📝 Updating employee:", id, { phone, staffType, department });

    const employee = await Employee.findById(id);
    if (!employee) {
      return res.status(404).json({ error: "Xodim topilmadi" });
    }

    // Update fields
    if (phone !== undefined) employee.phone = phone;
    if (staffType !== undefined) employee.staffType = staffType;
    if (department !== undefined) employee.department = department;

    await employee.save();

    res.json({
      success: true,
      message: "Xodim ma'lumotlari yangilandi",
      employee: employee,
    });
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Xodim yangilashda xato" });
  }
});

// Get water usage (attendance) records by date
app.get("/api/water_usage", async (req, res) => {
  try {
    const { date } = req.query;

    let query = {};
    if (date) {
      // Filter by specific date
      query.date = date;
    } else {
      // Default to today
      const today = new Date().toISOString().split("T")[0];
      query.date = today;
    }

    const records = await Attendance.find(query);

    // Format for frontend
    const formattedRecords = records.map((record) => ({
      id: record._id,
      employeeId: record.employeeId,
      name: record.name || "Unknown",
      hikvisionEmployeeId: record.hikvisionEmployeeId,
      checkIn: record.firstCheckIn || null,
      checkOut: record.lastCheckOut || null,
      status: record.status,
      department: record.department,
      role: record.role,
      avatar: record.name?.substring(0, 2).toUpperCase() || "??",
      confidence: 100,
      source: "hikvision",
      date: record.date,
    }));

    res.json({
      success: true,
      data: formattedRecords,
      total: formattedRecords.length,
      date: date || new Date().toISOString().split("T")[0],
    });
  } catch (error) {
    console.error("Error fetching water usage:", error);
    res.status(500).json({ error: "Ma'lumotlarni olishda xato" });
  }
});

// Get water usage stats
app.get("/api/water_usage/stats", async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || new Date().toISOString().split("T")[0];

    const totalEmployees = await Employee.countDocuments();
    const presentToday = await Attendance.find({
      checkinTime: {
        $regex: queryDate,
      },
    }).distinct("employeeId");

    res.json({
      success: true,
      stats: {
        totalEmployees,
        presentToday: presentToday.length,
        absentToday: totalEmployees - presentToday.length,
        attendancePercentage:
          totalEmployees > 0
            ? Math.round((presentToday.length / totalEmployees) * 100)
            : 0,
      },
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ error: "Statistika olishda xato" });
  }
});

// ==================== ERROR HANDLING ====================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
    status: err.status || 500,
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Scheduler
initializeScheduler();

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n🚀 Oqava Suv Management API running on port ${PORT}`);
  console.log(`📡 Socket.IO ready for real-time updates`);
  console.log(
    `🗄️  MongoDB: ${process.env.MONGODB_URI ? "Connected" : "Disconnected"}`,
  );
  console.log(`🔗 Webhook endpoint: POST /webhook/hikvision`);
  console.log(`\n✅ Server is ready to receive terminal data!\n`);
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

export default app;
