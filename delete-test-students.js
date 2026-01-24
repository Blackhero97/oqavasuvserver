import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB ulanildi');

        // Models
        const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
        const Employee = mongoose.model('Employee', new mongoose.Schema({}, { strict: false }));

        // 1. Student collection'da 9-A
        const students = await Student.find({
            $or: [
                { class: '9-A' },
                { className: '9-A' }
            ]
        });
        console.log(`📋 Student collection: ${students.length} ta`);

        // 2. Employee collection'da 9-A
        const employees = await Employee.find({
            $or: [
                { class: '9-A' },
                { className: '9-A' },
                { department: '9-A' }
            ]
        });
        console.log(`📋 Employee collection: ${employees.length} ta`);

        if (employees.length > 0) {
            console.log('\n👥 Employee collection\'dagi 9-A o\'quvchilar:');
            employees.forEach(e => console.log(`  - ${e.name} (role: ${e.role})`));

            // O'chirish
            const deleteResult = await Employee.deleteMany({
                $or: [
                    { class: '9-A' },
                    { className: '9-A' },
                    { department: '9-A' }
                ]
            });
            console.log(`\n🗑️ ${deleteResult.deletedCount} ta employee o'chirildi`);
        }

        // 3. "Test" so'zi bor barcha employeelarni topish
        const testEmployees = await Employee.find({
            name: /test/i
        });

        if (testEmployees.length > 0) {
            console.log(`\n🔍 "Test" so'zi bor employeelar: ${testEmployees.length} ta`);
            testEmployees.forEach(e => console.log(`  - ${e.name} (${e.class || e.className || e.department})`));

            // O'chirish
            const deleteTest = await Employee.deleteMany({
                name: /test/i
            });
            console.log(`🗑️ ${deleteTest.deletedCount} ta test employee o'chirildi`);
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Xato:', err.message);
        process.exit(1);
    });
