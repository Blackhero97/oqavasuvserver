import mongoose from 'mongoose';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';

mongoose.connect(MONGODB_URI)
    .then(async () => {
        console.log('✅ MongoDB ulanildi');

        // Define schema inside script for quick check
        const TelegramUser = mongoose.model('TelegramUser', new mongoose.Schema({}, { strict: false }));

        const users = await TelegramUser.find();
        console.log(`📊 Telegram foydalanuvchilar soni: ${users.length} ta`);

        if (users.length > 0) {
            console.log('\n📋 Foydalanuvchilar ro\'yxati:');
            users.forEach((u, i) => {
                console.log(`  ${i + 1}. ${u.firstName} (@${u.username}) - ID: ${u.chatId} - Active: ${u.isActive}`);
            });
        } else {
            console.log('\n⚠️ Hech qanday foydalanuvchi ro\'yxatdan o\'tmagan! (Botga /start yuborilishi kerak)');
        }

        process.exit(0);
    })
    .catch(err => {
        console.error('❌ Xato:', err.message);
        process.exit(1);
    });
