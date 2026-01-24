import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB ulanildi');

        const Attendance = mongoose.model('Attendance', new mongoose.Schema({}, { strict: false }));

        const today = new Date().toISOString().split('T')[0];
        console.log(`📅 Bugungi sana: ${today}`);

        const records = await Attendance.find({ date: today });
        console.log(`📊 Bugungi davomat: ${records.length} ta`);

        if (records.length > 0) {
            console.log('\n📋 Birinchi 5 record:');
            records.slice(0, 5).forEach((r, i) => {
                console.log(`  ${i + 1}. ${r.name} (${r.role || 'NO_ROLE'}) - Keldi: ${r.firstCheckIn || 'YO\'Q'}`);
            });
        } else {
            console.log('\n⚠️ Bugungi sana uchun hech qanday record topilmadi!');

            // Oxirgi 5 recordni ko'rsatish
            const latestRecords = await Attendance.find().sort({ _id: -1 }).limit(5);
            console.log(`\n📋 Oxirgi 5 record (har qanday sana):`);
            latestRecords.forEach((r, i) => {
                console.log(`  ${i + 1}. ${r.name} - Sana: ${r.date} - Keldi: ${r.firstCheckIn || 'YO\'Q'}`);
            });
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Xato:', err.message);
        process.exit(1);
    });
