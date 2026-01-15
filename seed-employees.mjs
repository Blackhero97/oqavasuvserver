import mongoose from "mongoose";
import Employee from "./models/Employee.js";
import dotenv from "dotenv";

dotenv.config();

const testEmployees = [
  {
    employeeId: 1,
    name: "Test Employee 1",
    department: "O'qituvchi",
    salary: 2000000,
    role: "teacher",
    hikvisionEmployeeId: "00000001",
    avatar: "T",
    status: "active",
  },
  {
    employeeId: 2,
    name: "Test Employee 2",
    department: "Qorovul",
    salary: 1500000,
    role: "staff",
    hikvisionEmployeeId: "00000002",
    avatar: "T",
    status: "active",
  },
];

async function seed() {
  try {
    await mongoose.connect("mongodb://localhost:27017/crm-system");
    console.log("Connected to MongoDB");

    // Clear existing test employees
    await Employee.deleteMany({ employeeId: { $in: [1, 2] } });

    // Insert new employees
    const result = await Employee.insertMany(testEmployees);
    console.log(`✅ Inserted ${result.length} test employees`);

    // Show all employees
    const allEmps = await Employee.find({});
    console.log(`\n📊 Total employees in database: ${allEmps.length}\n`);

    allEmps.slice(0, 5).forEach((emp, i) => {
      console.log(`${i + 1}. ${emp.name} (ID: ${emp.hikvisionEmployeeId})`);
    });
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

seed();
