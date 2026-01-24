import mongoose from 'mongoose';
import 'dotenv/config';
import Attendance from './models/Attendance.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function test() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        const hikId = '00000042';
        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.findOne({ hikvisionEmployeeId: hikId, date: today });

        if (attendance) {
            console.log(`📊 Attendance for ${attendance.name} (${attendance.date}):`);
            console.log(`- Role: ${attendance.role}`);
            console.log(`- Created At: ${attendance.createdAt}`);
            console.log(`- In Time: ${attendance.firstCheckIn}`);
        } else {
            console.log('❌ No attendance found for today.');
        }

        process.exit(0);
    } catch (error) {
        console.error('🔥 Error:', error);
        process.exit(1);
    }
}

test();
