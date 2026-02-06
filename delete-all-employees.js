import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = process.env.MONGODB_URI;

async function deleteAllEmployees() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to:', MONGODB_URI.includes('water_management') ? 'water_management' : 'UNKNOWN');

        // Get collections
        const Employee = mongoose.connection.collection('employees');
        const Attendance = mongoose.connection.collection('attendances');

        // Count before
        const employeeCount = await Employee.countDocuments();
        const attendanceCount = await Attendance.countDocuments();

        console.log(`\n📊 BEFORE CLEANUP:`);
        console.log(`   Employees: ${employeeCount}`);
        console.log(`   Attendance records: ${attendanceCount}`);

        if (employeeCount === 0) {
            console.log('\n✅ Database already clean!');
            process.exit(0);
        }

        console.log('\n🗑️  DELETING ALL DATA...\n');

        // Delete all
        const empResult = await Employee.deleteMany({});
        const attResult = await Attendance.deleteMany({});

        console.log(`✅ Deleted ${empResult.deletedCount} employees`);
        console.log(`✅ Deleted ${attResult.deletedCount} attendance records`);

        // Verify
        const finalCount = await Employee.countDocuments();
        console.log(`\n📊 AFTER CLEANUP: ${finalCount} employees`);

        if (finalCount === 0) {
            console.log('\n🎉 SUCCESS! Database is now clean.');
        } else {
            console.log(`\n⚠️  WARNING: ${finalCount} employees still remain!`);
        }

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('❌ ERROR:', error.message);
        process.exit(1);
    }
}

deleteAllEmployees();
