import express from "express";
import multer from "multer";
import Employee from "./models/Employee.js";
import Attendance from "./models/Attendance.js";

const router = express.Router();
const upload = multer(); // For parsing multipart/form-data

/**
 * HTTP Webhook endpoint for Hikvision
 * This endpoint receives HTTP POST notifications from Hikvision device
 * Works with cloud hosting (Render, Heroku, etc)
 */
router.post("/hikvision", upload.any(), async (req, res) => {
  try {
    console.log("📨 Webhook received from Hikvision");
    console.log("=".repeat(60));
    console.log("Headers:", JSON.stringify(req.headers, null, 2));
    console.log("Body:", JSON.stringify(req.body, null, 2));
    console.log("Files:", req.files ? req.files.length : 0);
    console.log("Form fields:", req.body);
    console.log("=".repeat(60));

    // Hikvision sends data in multipart/form-data
    // Try to parse from form fields or body
    let eventData = req.body;

    // Check if event_log field contains JSON string
    if (req.body.event_log) {
      try {
        const parsedLog = JSON.parse(req.body.event_log);
        eventData = parsedLog;
        console.log("✅ event_log parsed:", parsedLog);
      } catch (e) {
        console.log("Failed to parse event_log:", e.message);
      }
    }

    // Check if data is in a specific field
    if (req.body.data) {
      try {
        eventData =
          typeof req.body.data === "string"
            ? JSON.parse(req.body.data)
            : req.body.data;
      } catch (e) {
        console.log("Failed to parse data field:", e.message);
      }
    }

    // Extract employee info from various possible fields
    // Check nested AccessControllerEvent structure
    const acEvent = eventData.AccessControllerEvent;
    const employeeNo =
      (acEvent && acEvent.employeeNoString) ||
      eventData.employeeNoString ||
      eventData.employeeNo ||
      eventData.EmployeeNoString ||
      eventData.cardNo ||
      req.body.employeeNoString ||
      req.body.employeeNo;

    const eventTime = new Date(
      acEvent?.dateTime ||
        eventData.dateTime ||
        eventData.time ||
        eventData.Time ||
        req.body.time ||
        new Date(),
    );
    const dateStr = eventTime.toISOString().split("T")[0];
    // Convert to Uzbekistan timezone UTC+5
    const timeStr = eventTime.toLocaleTimeString("en-US", {
      timeZone: "Asia/Tashkent",
      hour12: false,
      hour: "2-digit",
      minute: "2-digit",
    });

    console.log("Extracted data:", {
      employeeNo,
      eventTime: eventTime.toISOString(),
      dateStr,
      timeStr,
    });

    if (!employeeNo) {
      console.warn("⚠️  No employee number in webhook data");
      console.log("💡 Terminal oldida yuz taniting va loglarni kuzating...");
      return res
        .status(200)
        .json({ success: false, message: "No employee number" });
    }

    // Find employee or auto-register if not found
    let employee = await Employee.findOne({
      hikvisionEmployeeId: employeeNo,
    });

    if (!employee) {
      // Auto-register new employee from Hikvision data
      const employeeName =
        acEvent?.name ||
        acEvent?.employeeName ||
        eventData.employeeName ||
        req.body.employeeName ||
        "Unknown Employee";

      console.log(
        `📝 Yangi xodim avtomatik ro'yhatga olinmoqda: ${employeeName} (${employeeNo})`,
      );

      employee = new Employee({
        employeeId: parseInt(employeeNo) || Date.now(),
        hikvisionEmployeeId: employeeNo,
        name: employeeName,
        role: "staff", // Default role
        department: "IT", // Default department
        status: "active",
        registeredAt: new Date(),
      });

      await employee.save();
      console.log(`✅ Xodim ro'yhatga olingan: ${employee.name}`);
    }

    // Find or create attendance
    let attendance = await Attendance.findOne({
      hikvisionEmployeeId: employeeNo,
      date: dateStr,
    });

    if (!attendance) {
      // New check-in
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
            timestamp: eventTime,
          },
        ],
        firstCheckIn: timeStr,
        status: "present",
      });
      console.log(`✅ ${employee.name} - CHECK IN at ${timeStr}`);
    } else {
      // ✅ Update role and department if they changed in Employee database
      if (
        attendance.role !== employee.role ||
        attendance.department !== employee.department
      ) {
        attendance.role = employee.role;
        attendance.department = employee.department;
      }

      // Determine check-in or check-out
      const lastEvent = attendance.events[attendance.events.length - 1];
      const newEventType = lastEvent.type === "IN" ? "OUT" : "IN";

      attendance.events.push({
        time: timeStr,
        type: newEventType,
        timestamp: eventTime,
      });

      if (newEventType === "OUT") {
        attendance.lastCheckOut = timeStr;
        console.log(`✅ ${employee.name} - CHECK OUT at ${timeStr}`);
      } else {
        console.log(`✅ ${employee.name} - CHECK IN again at ${timeStr}`);
      }
    }

    await attendance.save();
    console.log("💾 Webhook attendance saved");

    // 🔄 Socket.IO - Broadcast real-time update to all clients
    if (global.io) {
      global.io.emit("attendance:updated", {
        employeeId: employee.employeeId,
        name: employee.name,
        hikvisionEmployeeId: employeeNo,
        department: employee.department,
        role: employee.role,
        date: dateStr,
        checkInTime: attendance.firstCheckIn,
        checkOutTime: attendance.lastCheckOut,
        status: attendance.status,
        timestamp: new Date(),
        eventType:
          attendance.events[attendance.events.length - 1]?.type || "IN",
        isNewEmployee: false,
      });

      // If this is a newly registered employee, send special event
      if (employee.registeredAt && new Date() - employee.registeredAt < 5000) {
        global.io.emit("employee:registered", {
          employeeId: employee.employeeId,
          name: employee.name,
          hikvisionEmployeeId: employeeNo,
          department: employee.department,
          role: employee.role,
          avatar:
            employee.name?.split(" ")[0]?.substring(0, 2).toUpperCase() || "?",
        });
        console.log("🎉 Yangi xodim ro'yhatga olingan event yuborildi");
      }

      console.log("📡 Socket.IO broadcast sent");
    }

    res.status(200).json({
      success: true,
      message: "Event processed",
      employee: employee.name,
      time: timeStr,
    });
  } catch (error) {
    console.error("❌ Webhook processing error:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * Test webhook endpoint
 */
router.post("/hikvision/test", async (req, res) => {
  console.log("🧪 Test webhook called");
  console.log("Body:", req.body);
  res.json({
    success: true,
    message: "Webhook endpoint is working!",
    receivedData: req.body,
  });
});

/**
 * Get webhook status
 */
router.get("/hikvision/status", (req, res) => {
  res.json({
    webhook: "active",
    endpoint: "/webhook/hikvision",
    testEndpoint: "/webhook/hikvision/test",
    method: "POST",
    description: "Receives HTTP notifications from Hikvision device",
  });
});

/**
 * Telegram Bot Webhook endpoint
 * This endpoint receives updates from Telegram servers
 * Used in production (Render) to avoid polling conflicts
 */
router.post("/telegram", async (req, res) => {
  try {
    console.log("📨 Telegram webhook received");

    // Import bot instance dynamically to avoid circular dependency
    const { default: bot } = await import("./services/telegram.service.js");

    if (bot) {
      bot.processUpdate(req.body);
      console.log("✅ Telegram update processed");
    } else {
      console.warn("⚠️ Telegram bot not initialized");
    }

    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Telegram webhook error:", error);
    res.sendStatus(500);
  }
});

export default router;
