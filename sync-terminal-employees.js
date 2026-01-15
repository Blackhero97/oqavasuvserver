import mongoose from "mongoose";
import dotenv from "dotenv";
import Employee from "./models/Employee.js";

dotenv.config();

// Termin alda ro'yxatga olingan xodimlar
const terminalEmployees = [
  { id: "00000001", name: "Test User" },
  { id: "00000002", name: "RUSTAMOV DILMUROD" },
  { id: "00000003", name: "ABBOSOVA SHAXNOZA" },
  { id: "00000004", name: "ABDUXAKIMOV YAXYOBEK" },
  { id: "00000005", name: "ABDULAJONOV ILHOMJON" },
  { id: "00000006", name: "SHOMARALIYEV RAFIQJON" },
  { id: "00000007", name: "SULAYMONOV ZAYNOBIDDIN" },
  { id: "00000008", name: "SAMIYEVA GULNORA" },
  { id: "00000009", name: "MUSAYEVA NILUFAR" },
  { id: "00000010", name: "MAXKAMOVA MADINA" },
  { id: "00000011", name: "QOSIMOVA BARNO" },
  { id: "00000012", name: "RUSTAMSHAYEVA FOTIMA" },
  { id: "00000013", name: "NURMUHAMMADOV HASANBOY" },
  { id: "00000014", name: "QORABOYEVA MADINA" },
  { id: "00000015", name: "ARTIQOVA MAFTUNA" },
  { id: "00000016", name: "NUMONOVA GULHAYO" },
  { id: "00000017", name: "ALIJONOV AHMADJON" },
  { id: "00000018", name: "ASHUROVA OMINAJON" },
  { id: "00000019", name: "BOBOJONOVA SHAFQAT" },
  { id: "00000020", name: "BOZORBOYEVA MAFTUNA" },
  { id: "00000021", name: "ERGASHEVA MAMURA" },
  { id: "00000022", name: "NISHONA DILOROM" },
  { id: "00000023", name: "JURAYEV FURQATJON" },
  { id: "00000024", name: "HAKIMOVA SAYYORA" },
  { id: "00000025", name: "QURBONOV SHAXBOZ" },
  { id: "00000026", name: "RAHIMOVA ZILOLA" },
  { id: "00000027", name: "TOJIMATOVA LOBAR" },
  { id: "00000029", name: "NURMATOVA FERUZA" },
];

const syncEmployees = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Connected to MongoDB");

    let added = 0;
    let updated = 0;
    let skipped = 0;

    // Eng katta employeeId ni topish
    const maxEmployee = await Employee.findOne()
      .sort({ employeeId: -1 })
      .limit(1);
    let nextEmployeeId = maxEmployee ? maxEmployee.employeeId + 1 : 1;

    for (const emp of terminalEmployees) {
      const existing = await Employee.findOne({
        hikvisionEmployeeId: emp.id,
      });

      if (existing) {
        // Check if name needs update
        if (existing.name !== emp.name) {
          existing.name = emp.name;
          await existing.save();
          console.log(`✏️  Updated: ${emp.name} (${emp.id})`);
          updated++;
        } else {
          console.log(`⏭️  Skipped (already exists): ${emp.name}`);
          skipped++;
        }
      } else {
        // Add new employee
        const nameParts = emp.name.split(" ");
        const avatar =
          nameParts.length > 1
            ? nameParts[0][0] + nameParts[1][0]
            : emp.name.substring(0, 2);

        const newEmployee = new Employee({
          employeeId: nextEmployeeId++,
          name: emp.name,
          department: "Xodim",
          role: "staff",
          hikvisionEmployeeId: emp.id,
          avatar: avatar.toUpperCase(),
          email: `${emp.name.toLowerCase().replace(/\s+/g, ".")}@school.uz`,
          phone: `+99899${Math.floor(1000000 + Math.random() * 9000000)}`,
          status: "active",
          salary: 0,
          salaryStatus: "unpaid",
        });

        await newEmployee.save();
        console.log(`✅ Added: ${emp.name} (${emp.id})`);
        added++;
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n📊 Sync natijasi:`);
    console.log(`   ✅ Qo'shildi: ${added}`);
    console.log(`   ✏️  Yangilandi: ${updated}`);
    console.log(`   ⏭️  O'tkazib yuborildi: ${skipped}`);
    console.log(`   📋 Jami: ${terminalEmployees.length}`);
    console.log(
      "\n👉 Endi http://localhost:5173/staff ga kirib xodimlarni tahrirlang!"
    );

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
};

syncEmployees();
