import mongoose from "mongoose";
import Employee from "./models/Employee.js";

async function removeDuplicates() {
  try {
    await mongoose.connect(
      "mongodb+srv://hasanboyleo97_db_user:N1TE1f0EakdNjUeg@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority"
    );
    console.log("✅ Connected to MongoDB\n");

    // Dublikat ism bilan ikkita yozuv mavjud bo'lgan xodimlar
    const duplicateNames = [
      "SHOMARALIYEV RAFIQJON",
      "SULAYMONOV ZAYNOBIDDIN",
      "SAMIYEVA GULNORA",
      "QOSIMOVA BARNO",
      "NURMUHAMMADOV HASANBOY",
      "NUMONOVA GULHAYO",
      "QORABOYEVA MADINA",
      "RUSTAMSHAYEVA FOTIMA",
    ];

    let removed = 0;

    for (const name of duplicateNames) {
      // Shu ismli barcha xodimlarni topish
      const employees = await Employee.find({ name }).sort({ employeeId: 1 });

      if (employees.length > 1) {
        console.log(`\n🔍 ${name} uchun ${employees.length} ta yozuv topildi:`);

        // Birinchi yozuvni saqlash (eng eski employeeId)
        const keepEmployee = employees[0];
        console.log(
          `   ✅ Saqlanadi: ${keepEmployee.name} (ID: ${keepEmployee.employeeId}, Hikvision: ${keepEmployee.hikvisionEmployeeId}, Bo'lim: ${keepEmployee.department})`
        );

        // Qolganlarini o'chirish
        for (let i = 1; i < employees.length; i++) {
          const duplicateEmployee = employees[i];
          await Employee.findByIdAndDelete(duplicateEmployee._id);
          console.log(
            `   ❌ O'chirildi: ${duplicateEmployee.name} (ID: ${duplicateEmployee.employeeId}, Hikvision: ${duplicateEmployee.hikvisionEmployeeId}, Bo'lim: ${duplicateEmployee.department})`
          );
          removed++;
        }
      }
    }

    console.log("\n" + "=".repeat(80));
    console.log(`\n📊 Natija:`);
    console.log(`   ❌ O'chirildi: ${removed} ta dublikat yozuv`);
    console.log(`   ✅ Saqlandi: ${duplicateNames.length} ta xodim`);
    console.log(
      `\n👉 Dashboardni yangilang - endi dublikatlar bo'lmasligi kerak!`
    );

    await mongoose.connection.close();
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

removeDuplicates();
