import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";

dotenv.config();

const addInitialEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    const employeesToAdd = [
      {
        employeeId: 2,
        hikvisionEmployeeId: "00000002",
        name: "RUSTAMOV DILMUROD",
        department: "IT", // Siz tahrirlaysiz
        salary: 0,
        status: "active",
      },
      {
        employeeId: 3,
        hikvisionEmployeeId: "00000003",
        name: "ABBOSOVA SHAXNOZA",
        department: "O'qituvchi", // Siz tahrirlaysiz
        salary: 0,
        status: "active",
      },
      {
        employeeId: 4,
        hikvisionEmployeeId: "00000004",
        name: "ABDUXAKIMOV YAXYOBEK",
        department: "O'qituvchi", // Siz tahrirlaysiz
        salary: 0,
        status: "active",
      },
      {
        employeeId: 5,
        hikvisionEmployeeId: "00000005",
        name: "ABDULAJONOV ILHOMJON",
        department: "O'qituvchi", // Siz tahrirlaysiz
        salary: 0,
        status: "active",
      },
    ];

    console.log("\n📝 Xodimlarni qo'shyapman...\n");

    for (const emp of employeesToAdd) {
      // Check if already exists
      const existing = await Employee.findOne({
        hikvisionEmployeeId: emp.hikvisionEmployeeId,
      });

      if (existing) {
        console.log(`⏭️  ${emp.name} - allaqachon mavjud`);
      } else {
        const newEmployee = new Employee(emp);
        await newEmployee.save();
        console.log(
          `✅ ${emp.name} - qo'shildi (ID: ${emp.hikvisionEmployeeId})`
        );
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log("\n✨ Tayyor! Endi quyidagilarni qiling:\n");
    console.log("1. 👉 http://localhost:5174/staff - bu sahifaga kiring");
    console.log("2. ✏️  Har bir xodimni tahrirlang:");
    console.log("   - Bo'limni to'g'ri tanlang (O'qituvchi, IT, HR...)");
    console.log("   - O'qituvchilar uchun: Fan tanlang");
    console.log("   - Oylik maoshni kiriting");
    console.log(
      "\n3. 🎯 Qolgan xodimlar terminalni ishlatganda avtomatik qo'shiladi!"
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

addInitialEmployees();
