import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js";

async function checkEmployees() {
  try {
    await connectDB();

    console.log("🔍 ABDULAJONOV ma'lumotlarini qidiramiz...");
    const employees = await Employee.find({
      name: /ABDULAJONOV/i,
    });

    console.log(`Topildi: ${employees.length} ta employee`);

    employees.forEach((emp, index) => {
      console.log(`\n${index + 1}. Employee:`);
      console.log({
        _id: emp._id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        hikvisionEmployeeId: emp.hikvisionEmployeeId,
        createdAt: emp.createdAt,
      });
    });

    // Barcha employee'larning role statistikasi
    const allEmployees = await Employee.find({ status: "active" });
    const roleStats = {};

    allEmployees.forEach((emp) => {
      const role = emp.role || "undefined";
      roleStats[role] = (roleStats[role] || 0) + 1;
    });

    console.log("\n📊 Role statistikasi:");
    Object.keys(roleStats).forEach((role) => {
      console.log(`${role}: ${roleStats[role]} ta`);
    });

    // IT department'li employeelar
    const itEmployees = await Employee.find({
      department: /IT/i,
    });

    console.log("\n🖥️ IT department'da:");
    itEmployees.forEach((emp) => {
      console.log(`- ${emp.name} (role: ${emp.role || "undefined"})`);
    });

    process.exit(0);
  } catch (error) {
    console.error("❌ Xato:", error);
    process.exit(1);
  }
}

checkEmployees();
