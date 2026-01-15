import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";

dotenv.config();

const resetEmployeeData = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all employees
    const employees = await Employee.find();
    console.log(`\n📋 Jami xodimlar: ${employees.length}`);

    let updated = 0;

    // Reset all fields except name and hikvisionEmployeeId
    for (const emp of employees) {
      emp.department = "Xodim"; // Default
      emp.salary = 0;
      emp.subject = undefined;
      emp.shift = undefined;
      emp.specialty = undefined;

      await emp.save();
      updated++;
      console.log(`✅ ${emp.name} - ma'lumotlari tozalandi`);
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n✨ ${updated} ta xodim yangilandi!`);
    console.log(
      "\n👉 Endi http://localhost:5174/staff ga kirib, har bir xodimni tahrirlang:"
    );
    console.log("   - Bo'limni tanlang");
    console.log("   - O'qituvchilar uchun: Fan tanlang");
    console.log("   - Oylik maoshni kiriting");
    console.log(
      "\n📊 Saqlaganingizdan keyin, ma'lumotlar Dashboard va boshqa sahifalarda ko'rinadi!"
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

resetEmployeeData();
