import mongoose from "mongoose";
import Employee from "./models/Employee.js";

async function checkDuplicates() {
  try {
    await mongoose.connect(
      "mongodb+srv://hasanboyleo97_db_user:N1TE1f0EakdNjUeg@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority"
    );
    console.log("✅ Connected to MongoDB\n");

    // Barcha xodimlarni olish
    const allEmployees = await Employee.find().sort({ employeeId: 1 });
    console.log(`📊 Jami xodimlar soni: ${allEmployees.length}\n`);

    // hikvisionEmployeeId bo'yicha guruhlash
    const groupedByHikvision = {};
    allEmployees.forEach((emp) => {
      const hId = emp.hikvisionEmployeeId || "NO_ID";
      if (!groupedByHikvision[hId]) {
        groupedByHikvision[hId] = [];
      }
      groupedByHikvision[hId].push(emp);
    });

    // Dublikatlarni topish
    console.log("🔍 Dublikatlar tekshiruvi:\n");
    let duplicatesFound = false;

    for (const [hivisionId, employees] of Object.entries(groupedByHikvision)) {
      if (employees.length > 1) {
        duplicatesFound = true;
        console.log(`❌ Dublikat topildi - Hikvision ID: ${hivisionId}`);
        employees.forEach((emp) => {
          console.log(
            `   - ${emp.name} (employeeId: ${emp.employeeId}, _id: ${emp._id})`
          );
        });
        console.log("");
      }
    }

    if (!duplicatesFound) {
      console.log("✅ Dublikatlar topilmadi!\n");
    }

    // Ism bo'yicha guruhlash
    const groupedByName = {};
    allEmployees.forEach((emp) => {
      const name = emp.name;
      if (!groupedByName[name]) {
        groupedByName[name] = [];
      }
      groupedByName[name].push(emp);
    });

    console.log("🔍 Ism bo'yicha dublikatlar:\n");
    let nameDuplicates = false;

    for (const [name, employees] of Object.entries(groupedByName)) {
      if (employees.length > 1) {
        nameDuplicates = true;
        console.log(`❌ Bir xil ism: ${name}`);
        employees.forEach((emp) => {
          console.log(
            `   - hikvisionId: ${emp.hikvisionEmployeeId}, employeeId: ${emp.employeeId}, department: ${emp.department}`
          );
        });
        console.log("");
      }
    }

    if (!nameDuplicates) {
      console.log("✅ Ism bo'yicha dublikatlar topilmadi!\n");
    }

    // Barcha xodimlarni ko'rsatish
    console.log("📋 Barcha xodimlar ro'yxati:\n");
    allEmployees.forEach((emp) => {
      console.log(
        `${emp.employeeId}. ${emp.name} - ${emp.department} (Hikvision: ${emp.hikvisionEmployeeId})`
      );
    });

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

checkDuplicates();
