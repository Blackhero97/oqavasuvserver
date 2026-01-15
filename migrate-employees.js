import connectDB from "./db/connection.js";
import Employee from "./models/Employee.js";

const employees = [
    {
        employeeId: 1,
        name: "ASHUROVA OMINAJON",
        department: "Xodim",
        role: "staff",
        faceId: "face_008",
        hikvisionEmployeeId: "00000008",
        avatar: "AO",
        email: "ashurova@school.uz",
        phone: "+998991234567",
        status: "active",
    },
    {
        employeeId: 2,
        name: "DADAXANOVA MUHA",
        department: "Xodim",
        role: "staff",
        faceId: "face_012",
        hikvisionEmployeeId: "00000012",
        avatar: "DM",
        email: "dadaxanova@school.uz",
        phone: "+998991234568",
        status: "active",
    },
    {
        employeeId: 3,
        name: "QORABOYEVA NOZI",
        department: "Xodim",
        role: "staff",
        faceId: "face_033",
        hikvisionEmployeeId: "00000033",
        avatar: "QN",
        email: "qoraboyeva@school.uz",
        phone: "+998991234569",
        status: "active",
    },
];

async function migrateEmployees() {
    try {
        await connectDB();

        console.log("🔄 Migrating employees to MongoDB...\n");

        // Clear existing employees
        await Employee.deleteMany({});
        console.log("✅ Cleared existing employees");

        // Insert new employees
        const result = await Employee.insertMany(employees);
        console.log(`✅ Inserted ${result.length} employees:`);

        result.forEach(emp => {
            console.log(`   - ${emp.name} (${emp.hikvisionEmployeeId})`);
        });

        console.log("\n🎉 Migration completed successfully!");
        process.exit(0);
    } catch (error) {
        console.error("❌ Migration failed:", error);
        process.exit(1);
    }
}

migrateEmployees();
