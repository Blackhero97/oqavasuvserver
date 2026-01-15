import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

const employees = [
  // IT Department (12 ta)
  {
    name: "ALIYONOV AHMADJON",
    hikvisionId: "00000001",
    department: "IT",
    salary: 5000000,
  },
  {
    name: "FAYZIYEVA DILAFRUZ",
    hikvisionId: "00000002",
    department: "IT",
    salary: 5100000,
  },
  {
    name: "HALIMOV JAHON",
    hikvisionId: "00000003",
    department: "IT",
    salary: 5300000,
  },
  {
    name: "BOBOJONOVA SHAFOAT",
    hikvisionId: "00000004",
    department: "IT",
    salary: 5200000,
  },
  {
    name: "KARIMOV KARIM",
    hikvisionId: "00000005",
    department: "IT",
    salary: 5050000,
  },
  {
    name: "SAMIYEVA GULNORA",
    hikvisionId: "00000006",
    department: "IT",
    salary: 5150000,
  },
  {
    name: "NURMUHAMADOV HASANBOY",
    hikvisionId: "00000007",
    department: "IT",
    salary: 5250000,
  },
  {
    name: "TOSHEV BOBUR",
    hikvisionId: "00000008",
    department: "IT",
    salary: 5300000,
  },
  {
    name: "YUSUPOV YUSUP",
    hikvisionId: "00000009",
    department: "IT",
    salary: 5400000,
  },
  {
    name: "ABDULLAYEV AZIZ",
    hikvisionId: "00000010",
    department: "IT",
    salary: 5100000,
  },
  {
    name: "ISMAUILOV ILHOM",
    hikvisionId: "00000011",
    department: "IT",
    salary: 5050000,
  },
  {
    name: "HUSAINOV HUSAIN",
    hikvisionId: "00000012",
    department: "IT",
    salary: 5200000,
  },

  // HR Department (10 ta)
  {
    name: "ASHUROVA OMINAJON",
    hikvisionId: "00000013",
    department: "HR",
    salary: 4200000,
  },
  {
    name: "ERGASHEVA MAMURA",
    hikvisionId: "00000014",
    department: "HR",
    salary: 3800000,
  },
  {
    name: "ISMATULLOYEVA MADINA",
    hikvisionId: "00000015",
    department: "HR",
    salary: 3900000,
  },
  {
    name: "RASHIDOVA GULNORA",
    hikvisionId: "00000016",
    department: "HR",
    salary: 3950000,
  },
  {
    name: "UMAROVA ZARINA",
    hikvisionId: "00000017",
    department: "HR",
    salary: 4000000,
  },
  {
    name: "ZARIPOVA NARGIZA",
    hikvisionId: "00000018",
    department: "HR",
    salary: 4100000,
  },
  {
    name: "SOBIROVA SHAHLO",
    hikvisionId: "00000019",
    department: "HR",
    salary: 4050000,
  },
  {
    name: "MIRZAEVA GULCHEHRA",
    hikvisionId: "00000020",
    department: "HR",
    salary: 3950000,
  },
  {
    name: "KHOJIEVA ROZIYA",
    hikvisionId: "00000021",
    department: "HR",
    salary: 4150000,
  },
  {
    name: "NOROVA SHAMSIYA",
    hikvisionId: "00000022",
    department: "HR",
    salary: 4000000,
  },

  // Finance Department (10 ta)
  {
    name: "AYUBOVA MOHLAROYIM",
    hikvisionId: "00000023",
    department: "Finance",
    salary: 4800000,
  },
  {
    name: "ERGASHEVA SHIRIN",
    hikvisionId: "00000024",
    department: "Finance",
    salary: 4100000,
  },
  {
    name: "HAYDAROV RAVSHAN",
    hikvisionId: "00000025",
    department: "Finance",
    salary: 4300000,
  },
  {
    name: "QORABOYEVA MADINA",
    hikvisionId: "00000026",
    department: "Finance",
    salary: 4400000,
  },
  {
    name: "SALIMOV SARDOR",
    hikvisionId: "00000027",
    department: "Finance",
    salary: 4350000,
  },
  {
    name: "VALIYEV VALI",
    hikvisionId: "00000028",
    department: "Finance",
    salary: 4450000,
  },
  {
    name: "MIRZOEV MIRZA",
    hikvisionId: "00000029",
    department: "Finance",
    salary: 4500000,
  },
  {
    name: "RAHMATULLAYEV RAKHMAT",
    hikvisionId: "00000030",
    department: "Finance",
    salary: 4250000,
  },
  {
    name: "ABDULLAYEVA NIGORA",
    hikvisionId: "00000031",
    department: "Finance",
    salary: 4300000,
  },
  {
    name: "SHODIYEVA MALIKA",
    hikvisionId: "00000032",
    department: "Finance",
    salary: 4200000,
  },

  // Admin Department (8 ta)
  {
    name: "BOZORIBOYEVA MAFTUNA",
    hikvisionId: "00000033",
    department: "Admin",
    salary: 3500000,
  },
  {
    name: "GAFFAROV ANVAR",
    hikvisionId: "00000034",
    department: "Admin",
    salary: 3600000,
  },
  {
    name: "KARIMOVA NILUFAR",
    hikvisionId: "00000035",
    department: "Admin",
    salary: 3700000,
  },
  {
    name: "SULAYMONOV ZAYNOBIDDIN",
    hikvisionId: "00000036",
    department: "Admin",
    salary: 3750000,
  },
  {
    name: "XABIBOV XABIB",
    hikvisionId: "00000037",
    department: "Admin",
    salary: 3800000,
  },
  {
    name: "SALAEV SALAH",
    hikvisionId: "00000038",
    department: "Admin",
    salary: 3650000,
  },
  {
    name: "NIYAZOV NIYAZ",
    hikvisionId: "00000039",
    department: "Admin",
    salary: 3550000,
  },
  {
    name: "MURODOV MUROD",
    hikvisionId: "00000040",
    department: "Admin",
    salary: 3700000,
  },
];

const seedEmployees = async () => {
  try {
    console.log("🔄 MongoDB'ga ulanilmoqda...");

    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log("✅ MongoDB ulandi");

    // Delete all existing employees
    await Employee.deleteMany({});
    console.log("🗑️  Eski hodimlar o'chirildi");

    // Add new employees
    const employeeDocs = employees.map((emp, index) => ({
      employeeId: index + 1,
      name: emp.name,
      hikvisionEmployeeId: emp.hikvisionId,
      department: emp.department,
      salary: emp.salary,
      role: "staff",
      status: "active",
    }));

    const result = await Employee.insertMany(employeeDocs);
    console.log(`✅ ${result.length} ta hodim qo'shildi!`);

    // Show summary
    const byDept = {};
    employees.forEach((emp) => {
      byDept[emp.department] = (byDept[emp.department] || 0) + 1;
    });

    console.log("\n📊 Bo'limlar bo'yicha taqsimot:");
    console.log("═══════════════════════════════");
    Object.entries(byDept).forEach(([dept, count]) => {
      const deptEmployees = employees.filter((e) => e.department === dept);
      const avgSalary = Math.round(
        deptEmployees.reduce((sum, e) => sum + e.salary, 0) / count / 1000000
      );
      console.log(`${dept}: ${count} ta xodim (O'rtacha: ${avgSalary}M som)`);
    });

    console.log("═══════════════════════════════");
    console.log("✨ Seed jarayoni muvaffaqiyatli yakunlandi!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Xato:", error.message);
    process.exit(1);
  }
};

seedEmployees();
