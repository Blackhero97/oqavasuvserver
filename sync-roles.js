import mongoose from 'mongoose';
import 'dotenv/config';
import Employee from './models/Employee.js';
import Student from './models/Student.js';
import Attendance from './models/Attendance.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function syncRoles() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Syncing roles for date: ${today}`);

        const attendanceRecords = await Attendance.find({ date: today });
        console.log(`📊 Found ${attendanceRecords.length} records to verify.`);

        let updatedCount = 0;

        for (const record of attendanceRecords) {
            // Check in Student first
            let person = await Student.findOne({ hikvisionEmployeeId: record.hikvisionEmployeeId });
            let correctRole = person ? 'student' : null;
            let correctDept = person ? person.className : null;

            if (!person) {
                // Check in Employee
                person = await Employee.findOne({ hikvisionEmployeeId: record.hikvisionEmployeeId });
                if (person) {
                    correctRole = person.role;
                    correctDept = person.department;
                }
            }

            if (correctRole && (record.role !== correctRole || record.department !== correctDept)) {
                console.log(`🔄 Updating ${record.name}: Role ${record.role} -> ${correctRole}, Dept ${record.department} -> ${correctDept}`);
                record.role = correctRole;
                record.department = correctDept;
                await record.save();
                updatedCount++;
            }
        }

        console.log(`✅ Role sync complete. Updated ${updatedCount} records.`);
        process.exit(0);
    } catch (error) {
        console.error('🔥 Error:', error);
        process.exit(1);
    }
}

syncRoles();
