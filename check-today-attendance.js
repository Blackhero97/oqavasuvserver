import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Attendance from './models/Attendance.js';

dotenv.config();

async function checkTodayAttendance() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const today = new Date().toISOString().split('T')[0];
    console.log(`\n📅 Checking attendance for: ${today}`);

    // Get today's attendance records
    const records = await Attendance.find({ date: today }).lean();

    console.log(`\n📊 Found ${records.length} records for today\n`);

    if (records.length > 0) {
      records.forEach((record, index) => {
        console.log(`${index + 1}. ${record.name}`);
        console.log(`   hikvisionEmployeeId: "${record.hikvisionEmployeeId}"`);
        console.log(`   role: "${record.role}"`);
        console.log(`   department: "${record.department}"`);
        console.log(`   firstCheckIn: ${record.firstCheckIn}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No attendance records for today!');
    }

    await mongoose.disconnect();
    console.log('✅ Done');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkTodayAttendance();
