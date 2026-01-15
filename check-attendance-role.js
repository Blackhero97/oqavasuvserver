import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from './models/Attendance.js';

dotenv.config();

async function checkAttendanceData() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Get first 3 attendance records
        const records = await Attendance.find({}).limit(3).lean();

        console.log('\n📊 Sample Attendance Records:');
        records.forEach((record, index) => {
            console.log(`\n${index + 1}. ${record.name}`);
            console.log(`   hikvisionEmployeeId: "${record.hikvisionEmployeeId}"`);
            console.log(`   role: "${record.role}"`);
            console.log(`   department: "${record.department}"`);
            console.log(`   date: ${record.date}`);
            console.log(`   firstCheckIn: ${record.firstCheckIn}`);
        });

        await mongoose.disconnect();
        console.log('\n✅ Done');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAttendanceData();
