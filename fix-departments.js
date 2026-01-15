import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js";

async function fixDepartments() {
  try {
    await connectDB();

    console.log("🔧 IT department'ini role bo'yicha yangilaymiz...");

    // Barcha IT department'li employeelarni olish
    const itEmployees = await Employee.find({
      department: /IT/i,
      status: "active",
    });

    console.log(`Topildi: ${itEmployees.length} ta IT department employee`);

    for (const employee of itEmployees) {
      let newDepartment = "Bosh";

      switch (employee.role) {
        case "teacher":
          newDepartment = employee.subject || "O'qituvchi";
          break;
        case "student":
          newDepartment = employee.class || "O'quvchi";
          break;
        case "staff":
          newDepartment = "Xodim";
          break;
        case "admin":
          newDepartment = "Administrator";
          break;
        default:
          newDepartment = "Lavozim belgilanmagan";
      }

      await Employee.findByIdAndUpdate(employee._id, {
        department: newDepartment,
      });

      console.log(`✅ ${employee.name}: ${employee.role} -> ${newDepartment}`);
    }

    // ABDULAJONOV'ni alohida tekshirish
    const abdulajonov = await Employee.findOne({ name: /ABDULAJONOV/i });
    if (abdulajonov) {
      console.log("\n🔍 ABDULAJONOV yangilangan holat:");
      console.log({
        name: abdulajonov.name,
        role: abdulajonov.role,
        department: abdulajonov.department,
      });
    }

    console.log("\n✅ Barcha departmentlar role bo'yicha yangilandi!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Xato:", error);
    process.exit(1);
  }
}

fixDepartments();
