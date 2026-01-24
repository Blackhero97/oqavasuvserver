import mongoose from 'mongoose';
import 'dotenv/config';
import Attendance from './models/Attendance.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function test() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        const today = new Date().toISOString().split('T')[0];
        const attendance = await Attendance.find({ date: today });

        console.log(`📊 Total records for today (${today}): ${attendance.length}`);

        const roleStats = {};
        attendance.forEach(a => {
            const role = a.role || 'MISSING_ROLE';
            roleStats[role] = (roleStats[role] || 0) + 1;
            if (role === 'MISSING_ROLE' || role === 'staff') {
                // Log some examples to see who they are
                console.log(`- ${a.name} (HIK ID: ${a.hikvisionEmployeeId}, Role: ${role}, Dept: ${a.department})`);
            }
        });

        console.log('📈 Role distribution:', JSON.stringify(roleStats, null, 2));

        process.exit(0);
    } catch (error) {
        console.error('🔥 Error:', error);
        process.exit(1);
    }
}

test();
