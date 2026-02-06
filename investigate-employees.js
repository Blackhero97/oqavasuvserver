import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';

dotenv.config();

async function investigateEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB ulandi (water_management)\n');

        // Jami xodimlar
        const totalEmployees = await Employee.countDocuments();
        console.log(`📊 JAMI XODIMLAR: ${totalEmployees}\n`);

        // Eng eski 10 ta xodimni ko'ramiz
        console.log('📅 ENG ESKI 10 TA XODIM (createdAt):');
        const oldestEmployees = await Employee.find()
            .sort({ createdAt: 1 })
            .limit(10)
            .select('name role department createdAt updatedAt employeeId');

        oldestEmployees.forEach((emp, i) => {
            console.log(`${i + 1}. ${emp.name}`);
            console.log(`   Role: ${emp.role || 'ROLE YO\'Q'}`);
            console.log(`   Dept: ${emp.department || 'BO\'LIM YO\'Q'}`);
            console.log(`   Created: ${emp.createdAt}`);
            console.log(`   ID: ${emp.employeeId}`);
            console.log('');
        });

        // Eng yangi 5 ta
        console.log('\n🆕 ENG YANGI 5 TA XODIM:');
        const newestEmployees = await Employee.find()
            .sort({ createdAt: -1 })
            .limit(5)
            .select('name role department createdAt employeeId');

        newestEmployees.forEach((emp, i) => {
            console.log(`${i + 1}. ${emp.name} - ${emp.role || 'ROLE YO\'Q'} - ${emp.createdAt}`);
        });

        // Role'lar bo'yicha statistika
        console.log('\n📈 ROLE\'LAR BO\'YICHA:');
        const roleStats = await Employee.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
        roleStats.forEach(stat => {
            console.log(`   ${stat._id || 'ROLE YO\'Q'}: ${stat.count} ta`);
        });

        process.exit(0);
    } catch (error) {
        console.error('❌ Xato:', error);
        process.exit(1);
    }
}

investigateEmployees();
