import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';
import Class from './models/Class.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bm-crm";

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        // Check if class 9-A exists
        let testClass = await Class.findOne({ name: '9-A' });
        if (!testClass) {
            testClass = await Class.create({
                name: '9-A',
                grade: 9,
                section: 'A',
                status: 'active'
            });
            console.log('Created test class 9-A');
        }

        // Check if test student exists
        let testStudent = await Employee.findOne({ hikvisionEmployeeId: 'STUDENT001' });
        if (!testStudent) {
            testStudent = await Employee.create({
                employeeId: 1001,
                name: 'Test O\'quvchi',
                role: 'student',
                hikvisionEmployeeId: 'STUDENT001',
                class: '9-A',
                status: 'active'
            });
            console.log('Created test student in 9-A');
        }

        console.log('Seeding completed successfully');
        process.exit(0);
    } catch (error) {
        console.error('Seeding error:', error);
        process.exit(1);
    }
}

seed();
