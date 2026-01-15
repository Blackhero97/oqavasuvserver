import mongoose from "mongoose";
import dotenv from "dotenv";
import Attendance from "./models/Attendance.js";

dotenv.config();

const copyAttendanceToToday = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const sourceDate = "2025-12-15";
    const targetDate = new Date().toISOString().split("T")[0]; // Today

    console.log(`\n📅 Copying attendance from ${sourceDate} to ${targetDate}`);

    // Get all attendance records from source date
    const sourceRecords = await Attendance.find({ date: sourceDate });
    console.log(`\n📊 Found ${sourceRecords.length} records on ${sourceDate}`);

    if (sourceRecords.length === 0) {
      console.log("❌ No records found to copy!");
      process.exit(1);
    }

    // Delete existing records for target date
    const deleted = await Attendance.deleteMany({ date: targetDate });
    console.log(
      `🗑️  Deleted ${deleted.deletedCount} existing records for ${targetDate}`
    );

    // Copy records to new date
    let copied = 0;
    for (const record of sourceRecords) {
      const newRecord = new Attendance({
        employeeId: record.employeeId,
        hikvisionEmployeeId: record.hikvisionEmployeeId,
        name: record.name,
        department: record.department,
        role: record.role,
        date: targetDate,
        firstCheckIn: record.firstCheckIn,
        lastCheckOut: record.lastCheckOut,
        events: record.events.map((event) => ({
          time: event.time,
          type: event.type,
          timestamp: new Date(),
        })),
        status: record.status,
        workDuration: record.workDuration,
        source: "copied-from-" + sourceDate,
      });

      await newRecord.save();
      copied++;
      console.log(
        `✅ ${copied}/${sourceRecords.length}: ${record.name} - ${
          record.firstCheckIn
        } → ${record.lastCheckOut || "working"}`
      );
    }

    console.log(
      `\n✨ Successfully copied ${copied} attendance records to ${targetDate}!`
    );
    console.log(`\n🔗 Now refresh: http://localhost:5174/attendance`);

    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

copyAttendanceToToday();
