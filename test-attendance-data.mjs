import mongoose from "mongoose";
import Attendance from "./models/Attendance.js";
import Employee from "./models/Employee.js";

await mongoose.connect("mongodb://localhost:27017/crm-system");

try {
  // Get today's date
  const today = new Date().toISOString().split("T")[0];
  console.log(`\n📅 Checking attendance for date: ${today}\n`);

  // Get all attendance records for today
  const attendanceRecords = await Attendance.find({ date: today });
  console.log(
    `✅ Found ${attendanceRecords.length} attendance records for today\n`
  );

  if (attendanceRecords.length > 0) {
    console.log("Sample Attendance Records:");
    attendanceRecords.slice(0, 5).forEach((record, index) => {
      console.log(
        `\n${index + 1}. ${record.name} (${record.hikvisionEmployeeId})`
      );
      console.log(`   First Check-in: ${record.firstCheckIn || "NULL"}`);
      console.log(`   Last Check-out: ${record.lastCheckOut || "NULL"}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Events: ${record.events?.length || 0}`);
    });
  } else {
    console.log("❌ NO ATTENDANCE RECORDS FOUND FOR TODAY!");
    console.log("\n📝 Checking Employee records...");

    const employees = await Employee.find({ status: "active" });
    console.log(`✅ Found ${employees.length} active employees\n`);

    if (employees.length > 0) {
      console.log("Sample Employees:");
      employees.slice(0, 5).forEach((emp, index) => {
        console.log(
          `${index + 1}. ${emp.name} - Hikvision ID: ${emp.hikvisionEmployeeId}`
        );
      });
    }
  }

  // Check webhook status
  console.log("\n\n🔗 Webhook Status Check:");
  const recentRecords = await Attendance.find()
    .sort({ createdAt: -1 })
    .limit(5);
  console.log(`\n✅ Most recent attendance records:`);
  recentRecords.forEach((record) => {
    const createdTime = new Date(record.createdAt).toLocaleString("uz-UZ");
    console.log(`   ${record.name}: ${record.date} at ${createdTime}`);
  });
} catch (error) {
  console.error("❌ Error:", error.message);
} finally {
  await mongoose.connection.close();
  process.exit(0);
}
