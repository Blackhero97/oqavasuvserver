// Check attendance records in MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from './models/Attendance.js';

dotenv.config();

async function checkAttendance() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Checking attendance for: ${today}\n`);

        const attendanceRecords = await Attendance.find({ date: today }).sort({ createdAt: -1 });

        console.log(`📊 Total attendance records today: ${attendanceRecords.length}\n`);

        if (attendanceRecords.length > 0) {
            console.log('Attendance Records:');
            attendanceRecords.forEach((record, index) => {
                console.log(`\n${index + 1}. ${record.name}`);
                console.log(`   Employee ID: ${record.employeeId}`);
                console.log(`   Hikvision ID: ${record.hikvisionEmployeeId}`);
                console.log(`   First Check-in: ${record.firstCheckIn || 'N/A'}`);
                console.log(`   Last Check-out: ${record.lastCheckOut || 'N/A'}`);
                console.log(`   Status: ${record.status}`);
                console.log(`   Events: ${record.events?.length || 0}`);
                if (record.events && record.events.length > 0) {
                    record.events.forEach(evt => {
                        console.log(`     - ${evt.type} at ${evt.time}`);
                    });
                }
            });
        } else {
            console.log('⚠️  No attendance records found for today!');
            console.log('Please test Face ID again or check webhook configuration.');
        }

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkAttendance();
