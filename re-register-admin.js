import mongoose from 'mongoose';
import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

const MONGODB_URI = 'mongodb+srv://hasanboyleo97_db_user:Mjm88aTbZQFmxMNu@bmcrm.1ieuljj.mongodb.net/attendance_db?retryWrites=true&w=majority';
const CHAT_ID = '1744670071';
const TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function run() {
    try {
        // 1. Manually add user to DB
        await mongoose.connect(MONGODB_URI);
        console.log('✅ MongoDB ulanildi');

        const TelegramUser = mongoose.model('TelegramUser', new mongoose.Schema({}, { strict: false }));

        await TelegramUser.findOneAndUpdate(
            { chatId: CHAT_ID },
            {
                chatId: CHAT_ID,
                firstName: 'Admin (Manual)',
                isActive: true,
                subscribedAt: new Date()
            },
            { upsert: true, new: true }
        );
        console.log(`✅ User ${CHAT_ID} bazaga qo'shildi!`);

        // 2. Check Webhook status
        if (TOKEN) {
            const bot = new TelegramBot(TOKEN);
            const webhookInfo = await bot.getWebHookInfo();
            console.log('\n📡 Webhook Ma\'lumotlari:');
            console.log(JSON.stringify(webhookInfo, null, 2));

            if (!webhookInfo.url) {
                console.log('⚠️  Webhook sozlanmagan! Local polling ishlanmoqda bo\'lishi mumkin.');
            }
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Xato:', error.message);
        process.exit(1);
    }
}

run();
