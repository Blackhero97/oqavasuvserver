import mongoose from "mongoose";
import Employee from "./models/Employee.js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

const cleanEmployeeData = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB ulandi");

    // Get all employees
    const employees = await Employee.find();
    console.log(`📊 Jami ${employees.length} ta xodim topildi`);

    // Save names for reference
    const namesList = employees.map((emp) => ({
      _id: emp._id,
      name: emp.name,
    }));

    console.log("📝 Ism-familiyalar saqlandi:");
    namesList.forEach((emp) => console.log(`- ${emp.name}`));

    // Clean all employee data - keep only name and _id
    const result = await Employee.updateMany(
      {}, // All employees
      {
        $unset: {
          role: 1,
          department: 1,
          staffType: 1,
          class: 1,
          subject: 1,
          salary: 1,
          phone: 1,
          email: 1,
          status: 1,
          shift: 1,
          specialty: 1,
          employeeId: 1,
          hikvisionId: 1,
          cardNumber: 1,
          createdAt: 1,
          updatedAt: 1,
        },
      }
    );

    console.log(`✅ ${result.modifiedCount} ta xodim ma'lumotlari tozalandi`);
    console.log("🎯 Faqat name va _id qoldi, qolganlari o'chirildi");

    // Show cleaned data
    const cleanedEmployees = await Employee.find();
    console.log("\n📋 Tozalangan ma'lumotlar:");
    cleanedEmployees.slice(0, 5).forEach((emp) => {
      console.log(`${emp.name}: ${JSON.stringify(emp.toObject(), null, 2)}`);
    });

    await mongoose.disconnect();
    console.log("🔚 MongoDB ulanishi yopildi");
  } catch (error) {
    console.error("❌ Xato:", error);
    process.exit(1);
  }
};

// Run the cleaning
cleanEmployeeData();
