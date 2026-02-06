import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';

dotenv.config();

async function cleanSchoolEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB ulandi (water_management)');

        // Hozirgi holatni ko'ramiz
        const totalEmployees = await Employee.countDocuments();
        const totalAttendance = await Attendance.countDocuments();

        console.log('\n📊 HOZIRGI HOLAT:');
        console.log(`   Jami xodimlar: ${totalEmployees}`);
        console.log(`   Jami davomat yozuvlari: ${totalAttendance}`);

        // Birinchi 5 ta xodimni ko'rsatamiz
        if (totalEmployees > 0) {
            console.log('\n📋 Birinchi 5 ta xodim:');
            const sampleEmployees = await Employee.find().limit(5);
            sampleEmployees.forEach((emp, i) => {
                console.log(`   ${i + 1}. ${emp.name} - ${emp.role || 'role yo\'q'} - ID: ${emp.employeeId}`);
            });
        }

        console.log('\n⚠️  Bu barcha xodimlar o\'chiriladi!');
        console.log('⚠️  Agar suv tashkilotining haqiqiy xodimlari bo\'lsa, bu skriptni to\'xtatib, shartni o\'zgartiring.');
        console.log('\n❓ Davom ettirishni xohlaysizmi? (Skriptni 5 soniyadan keyin ishga tushiradi...)');

        // 5 soniya kutish
        await new Promise(resolve => setTimeout(resolve, 5000));

        console.log('\n🗑️  O\'chirish boshlandi...\n');

        // Barcha xodimlarni o'chirish
        const employeeResult = await Employee.deleteMany({});
        console.log(`✅ O'chirildi: ${employeeResult.deletedCount} ta xodim`);

        // Attendance ma'lumotlarini ham tozalash
        const attendanceResult = await Attendance.deleteMany({});
        console.log(`✅ Davomat yozuvlari o'chirildi: ${attendanceResult.deletedCount} ta`);

        console.log('\n✅ Water_management database tozalandi!');
        console.log('💡 Endi suv tashkiloti xodimlarini qo\'shishingiz mumkin.');

        process.exit(0);
    } catch (error) {
        console.error('❌ Xato:', error);
        process.exit(1);
    }
}

cleanSchoolEmployees();
