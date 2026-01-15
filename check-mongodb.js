import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js";
import Attendance from "./models/Attendance.js";

async function checkDatabase() {
    try {
        await connectDB();

        console.log("\n🔍 Checking MongoDB Data...\n");

        // Get all employees
        const employees = await Employee.find({ status: "active" });
        console.log(`📊 Total Employees in MongoDB: ${employees.length}`);
        console.log("\nEmployees:");
        employees.forEach((emp, idx) => {
            console.log(`   ${idx + 1}. ${emp.name} (${emp.hikvisionEmployeeId})`);
        });

        // Get today's attendance
        const today = new Date().toISOString().split("T")[0];
        const attendanceRecords = await Attendance.find({ date: today });
        console.log(`\n📅 Attendance Records for ${today}: ${attendanceRecords.length}`);
        attendanceRecords.forEach((att) => {
            console.log(`   - ${att.name}: ${att.firstCheckIn || "N/A"} - ${att.lastCheckOut || "N/A"} (${att.status})`);
        });

        process.exit(0);
    } catch (error) {
        console.error("❌ Error:", error);
        process.exit(1);
    }
}

checkDatabase();
