import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB ulanildi');

        // Student model
        const Student = mongoose.model('Student', new mongoose.Schema({}, { strict: false }));
        const Class = mongoose.model('Class', new mongoose.Schema({}, { strict: false }));

        // 1. 9-A sinfidagi barcha studentlarni topish
        const students = await Student.find({
            $or: [
                { class: '9-A' },
                { className: '9-A' }
            ]
        });

        console.log(`📋 9-A sinfida ${students.length} ta o'quvchi topildi`);

        if (students.length > 0) {
            console.log('👥 O\'quvchilar:');
            students.forEach(s => console.log(`  - ${s.name}`));

            // 2. Studentlarni o'chirish
            const deleteResult = await Student.deleteMany({
                $or: [
                    { class: '9-A' },
                    { className: '9-A' }
                ]
            });
            console.log(`🗑️ ${deleteResult.deletedCount} ta o'quvchi o'chirildi`);
        }

        // 3. 9-A sinfini o'chirish
        const classResult = await Class.deleteOne({ name: '9-A' });
        console.log(`🗑️ 9-A sinfi o'chirildi: ${classResult.deletedCount} ta`);

        // 4. Qolgan sinflarni ko'rsatish
        const remaining = await Class.find();
        console.log(`\n📚 Qolgan sinflar (${remaining.length} ta):`);
        remaining.forEach(c => console.log(`  - ${c.name}`));

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Xato:', err.message);
        process.exit(1);
    });
