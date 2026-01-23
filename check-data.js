import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Employee from './models/Employee.js';
import Student from './models/Student.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/bm-crm";

async function check() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB');

        const employeeStudentCount = await Employee.countDocuments({ role: 'student' });
        const studentCount = await Student.countDocuments({});

        console.log(`Employees with role 'student': ${employeeStudentCount}`);
        console.log(`Students in Student collection: ${studentCount}`);

        if (employeeStudentCount > 0) {
            const sampleEmployee = await Employee.findOne({ role: 'student' });
            console.log('Sample Employee Student:', JSON.stringify(sampleEmployee, null, 2));
        }

        if (studentCount > 0) {
            const sampleStudent = await Student.findOne({});
            console.log('Sample Student:', JSON.stringify(sampleStudent, null, 2));
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

check();
