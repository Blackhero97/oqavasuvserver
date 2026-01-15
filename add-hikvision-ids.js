// Script to add Hikvision Employee IDs to MongoDB
// This maps Hikvision Face ID terminal users to CRM employees

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';

dotenv.config();

// Hikvision Employee ID mapping (from Person Management)
const hikvisionMapping = [
    { name: "RUSTAMOV DILMUROD", hikvisionEmployeeId: "00000002" },
    { name: "ABIDOVA SHAXNOZA", hikvisionEmployeeId: "00000003" },
    { name: "ABDUXAKIMOV YAXVOBOY", hikvisionEmployeeId: "00000004" },
    { name: "ABDULAZIMOV ILHOMJON", hikvisionEmployeeId: "00000005" },
    { name: "ALDONOV ABMADJON", hikvisionEmployeeId: "00000006" },
    { name: "ARTIQOVA MAXFUNA", hikvisionEmployeeId: "00000007" },
    { name: "ASHUROV OMIDBJON", hikvisionEmployeeId: "00000008" },
    { name: "ASHUROVA MOHLAROYIM", hikvisionEmployeeId: "00000009" },
    { name: "BOBOJONOVA SHAFQAT", hikvisionEmployeeId: "00000010" },
    { name: "BOZOROBOYEVA MAXFUNA", hikvisionEmployeeId: "00000011" },
    { name: "BABASANOVA MUXABBAT", hikvisionEmployeeId: "00000012" },
    { name: "FIRGASHEVA SHIRIN", hikvisionEmployeeId: "00000014" },
    { name: "G`AFFOROV BUXOBEK", hikvisionEmployeeId: "00000015" },
    { name: "HAKIMOV NODIRJON", hikvisionEmployeeId: "00000016" },
    { name: "XAYDAROVA MARUNA", hikvisionEmployeeId: "00000017" },
    { name: "FIRGASHEVA MAPURA", hikvisionEmployeeId: "00000020" },
    { name: "QORABOYEVA MADINA", hikvisionEmployeeId: "00000032" },
    { name: "RISQINBOY ZAVQIDDIN", hikvisionEmployeeId: "00000038" },
    { name: "NURMUHAMAD ZUXRIDDIN", hikvisionEmployeeId: "00000030" },
];

async function updateEmployees() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        let updatedCount = 0;
        let notFoundCount = 0;

        for (const mapping of hikvisionMapping) {
            // Find employee by name (case-insensitive)
            const employee = await Employee.findOne({
                name: { $regex: new RegExp(`^${mapping.name}$`, 'i') }
            });

            if (employee) {
                employee.hikvisionEmployeeId = mapping.hikvisionEmployeeId;
                await employee.save();
                console.log(`✅ Updated: ${employee.name} -> ${mapping.hikvisionEmployeeId}`);
                updatedCount++;
            } else {
                console.log(`⚠️  Not found in DB: ${mapping.name}`);
                notFoundCount++;
            }
        }

        console.log('\n📊 Summary:');
        console.log(`✅ Updated: ${updatedCount}`);
        console.log(`⚠️  Not found: ${notFoundCount}`);
        console.log(`📋 Total processed: ${hikvisionMapping.length}`);

        await mongoose.disconnect();
        console.log('\n✅ Done!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

updateEmployees();
// http://localhost:5173/attendance eng muhim sahifa shu  http://localhost:5173/staff http://localhost:5173/studentshttp://localhost:5173/classes ushbu sahifalar bilan har bir ozgarish sinxron bbolishi lozim barcha boglamlarni tekshir hozirgidek muammolar bolmasin