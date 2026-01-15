// Check what employees exist in MongoDB
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';

dotenv.config();

async function checkEmployees() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ Connected to MongoDB\n');

        const employees = await Employee.find({});

        console.log(`📊 Total employees in database: ${employees.length}\n`);

        if (employees.length > 0) {
            console.log('Employees:');
            employees.forEach((emp, index) => {
                console.log(`${index + 1}. ${emp.name} (ID: ${emp.employeeId}, Hikvision: ${emp.hikvisionEmployeeId || 'NOT SET'})`);
            });
        } else {
            console.log('⚠️  No employees found in database!');
            console.log('You need to create employees first.');
        }

        await mongoose.disconnect();
        process.exit(0);

    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

checkEmployees();
