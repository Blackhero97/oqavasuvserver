import axios from "axios";
import https from "https";
import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js";

const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
});

const HIKVISION_CONFIG = {
  ip: "192.168.100.193",
  username: "admin",
  password: "Parol8887",
  baseUrl: "https://192.168.100.193",
};

async function addEmployeeToHikvision(employee, index) {
  try {
    const employeeNo =
      employee.hikvisionEmployeeId || `${index + 1}`.padStart(8, "0");

    const url = `${HIKVISION_CONFIG.baseUrl}/ISAPI/AccessControl/UserInfo/Record?format=json`;

    const requestBody = {
      UserInfo: {
        employeeNo: employeeNo,
        name: employee.name,
        userType: "normal",
        Valid: {
          enable: true,
          beginTime: "2024-01-01T00:00:00",
          endTime: "2030-12-31T23:59:59",
        },
        doorRight: "1",
        RightPlan: [
          {
            doorNo: 1,
            planTemplateNo: "1",
          },
        ],
      },
    };

    const response = await axios.post(url, requestBody, {
      auth: {
        username: HIKVISION_CONFIG.username,
        password: HIKVISION_CONFIG.password,
      },
      headers: {
        "Content-Type": "application/json",
      },
      httpsAgent: httpsAgent,
      timeout: 10000,
    });

    if (response.data && response.data.statusCode === "1") {
      console.log(`✅ ${employee.name} (${employeeNo})`);
      return true;
    } else {
      console.log(
        `⚠️  ${employee.name} - ${
          response.data?.statusString || "Unknown error"
        }`
      );
      return false;
    }
  } catch (error) {
    if (error.response?.data?.statusCode === "3") {
      console.log(`ℹ️  ${employee.name} - allaqachon mavjud`);
      return true;
    }
    console.error(`❌ ${employee.name} - ${error.message}`);
    return false;
  }
}

async function exportToHikvision() {
  try {
    console.log("🔄 MongoDB'dan xodimlarni o'qish...\n");

    // Connect to MongoDB
    await connectDB();

    // Fetch all employees from MongoDB
    const employees = await Employee.find({});

    if (employees.length === 0) {
      console.log("⚠️  MongoDB'da xodimlar topilmadi");
      process.exit(1);
    }

    console.log(`📋 ${employees.length} ta xodim topildi\n`);
    console.log("🚀 Hikvision terminalga yuklash boshlandi...\n");

    let successCount = 0;
    let failCount = 0;

    // Export each employee
    for (let i = 0; i < employees.length; i++) {
      const success = await addEmployeeToHikvision(employees[i], i);
      if (success) {
        successCount++;
      } else {
        failCount++;
      }
      // Small delay to avoid overwhelming the device
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log("\n" + "=".repeat(60));
    console.log(`✅ Muvaffaqiyatli: ${successCount}`);
    console.log(`❌ Xatolik: ${failCount}`);
    console.log("=".repeat(60));
    console.log("\n🎉 Export yakunlandi!");

    console.log("\n💡 Keyingi qadam:");
    console.log("   1. Hikvision terminalga kiring (http://192.168.100.193)");
    console.log("   2. Personnel → User Management");
    console.log("   3. Har bir xodim uchun yuz rasmini qo'shing");

    process.exit(0);
  } catch (error) {
    console.error("❌ Export failed:", error);
    process.exit(1);
  }
}

// Run export
exportToHikvision();
