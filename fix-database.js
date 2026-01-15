import mongoose from 'mongoose';
import Attendance from './models/Attendance.js';
import Class from './models/Class.js';

const MONGODB_URI = 'mongodb+srv://boborahimmashrab:boborahim2006@cluster0.mongodb.net/bm-crm?retryWrites=true&w=majority';

async function fixDatabase() {
    try {
        console.log('🔌 Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Fix 1: Update attendance records for students to have correct role
        console.log('\n📝 Fixing attendance records...');
        const result = await Attendance.updateMany(
            {
                hikvisionEmployeeId: { $in: ['00000022', '00000048'] },
                role: 'staff'  // Only update if currently 'staff'
            },
            {
                $set: { role: 'student' }
            }
        );
        console.log(`✅ Updated ${result.modifiedCount} attendance records to role='student'`);

        // Fix 2: Create missing class "1 green"
        console.log('\n📚 Creating missing class...');
        const existingClass = await Class.findOne({ name: '1 green' });

        if (!existingClass) {
            await Class.create({
                name: '1 green',
                grade: '1',
                section: 'green',
                studentCount: 1,
                academicYear: '2024-2025'
            });
            console.log('✅ Created class "1 green"');
        } else {
            console.log('ℹ️  Class "1 green" already exists');
        }

        // Show updated attendance records
        console.log('\n📊 Current attendance records for students:');
        const studentAttendance = await Attendance.find({
            hikvisionEmployeeId: { $in: ['00000022', '00000048'] }
        }).sort({ date: -1 }).limit(5);

        studentAttendance.forEach(record => {
            console.log(`  - ${record.name} (${record.role}): ${record.date} | In: ${record.firstCheckIn} | Out: ${record.lastCheckOut || 'N/A'}`);
        });

        console.log('\n✅ Database fixes completed!');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 Disconnected from MongoDB');
    }
}

fixDatabase();
