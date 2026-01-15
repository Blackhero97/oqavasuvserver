import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";

dotenv.config();

const listTerminalEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    // Find all employees that have hikvisionEmployeeId (came from terminal)
    const employees = await Employee.find({
      hikvisionEmployeeId: { $exists: true, $ne: null },
    }).sort({ name: 1 });

    console.log("\n📋 Terminaldan o'tgan xodimlar ro'yxati:\n");
    console.log("=".repeat(80));

    if (employees.length === 0) {
      console.log("❌ Terminaldan o'tgan xodimlar topilmadi");
      console.log("\nIltimos, terminalda yuz tanishni amalga oshiring yoki");
      console.log("server loglaridan nomlarni ko'ring.");
    } else {
      employees.forEach((emp, index) => {
        console.log(
          `${(index + 1).toString().padStart(3, " ")}. ${emp.name.padEnd(
            35
          )} (ID: ${emp.hikvisionEmployeeId})`
        );
      });
      console.log("\n" + "=".repeat(80));
      console.log(`\n✅ Jami: ${employees.length} xodim`);
      console.log(
        "\n👉 Bu xodimlarni http://localhost:5174/staff orqali tahrirlang:"
      );
      console.log("   - Bo'limni tanlang (O'qituvchi, Qorovul, Oshpaz...)");
      console.log("   - O'qituvchilar uchun: Fan tanlang");
      console.log("   - Oylik maoshni kiriting");
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

listTerminalEmployees();
