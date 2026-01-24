import mongoose from 'mongoose';
import 'dotenv/config';
import Employee from './models/Employee.js';
import Attendance from './models/Attendance.js';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

async function test() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB connected');

        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Checking for date: ${today}`);

        // Check Teachers in Employee collection
        const teachers = await Employee.find({ role: 'teacher', status: 'active' });
        console.log(`👨‍🏫 Active Teachers in DB: ${teachers.length}`);
        teachers.forEach(t => console.log(`- ${t.name} (HIK ID: ${t.hikvisionEmployeeId}, Role: ${t.role})`));

        // Check all employees to see if role differs
        const allEmployees = await Employee.find({ status: 'active' });
        const roles = [...new Set(allEmployees.map(e => e.role))];
        console.log(`📋 Roles found in Employee table: ${roles.join(', ')}`);

        // Check attendance records for today
        const attendance = await Attendance.find({ date: today });
        console.log(`📊 Attendance records found for today: ${attendance.length}`);

        const teacherAttendance = attendance.filter(a => a.role === 'teacher');
        console.log(`✅ Teacher attendance records: ${teacherAttendance.length}`);
        teacherAttendance.forEach(a => console.log(`- ${a.name} (HIK ID: ${a.hikvisionEmployeeId}, Role: ${a.role}, In: ${a.firstCheckIn})`));

        process.exit(0);
    } catch (error) {
        console.error('🔥 Error:', error);
        process.exit(1);
    }
}

test();
