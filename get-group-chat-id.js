import TelegramBot from 'node-telegram-bot-api';
import 'dotenv/config';

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

console.log('🤖 Bot ishga tushdi. Guruhga xabar yuboring...\n');

bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const chatType = msg.chat.type;
    const chatTitle = msg.chat.title || msg.chat.first_name;

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📱 Chat Type: ${chatType}`);
    console.log(`📝 Chat Title: ${chatTitle}`);
    console.log(`🆔 Chat ID: ${chatId}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (chatType === 'group' || chatType === 'supergroup') {
        console.log('✅ Bu guruh! Chat ID ni .env fayliga qo\'shing:');
        console.log(`TELEGRAM_CHAT_ID=${chatId}\n`);
    } else {
        console.log('ℹ️  Bu shaxsiy chat. Guruhga xabar yuboring.\n');
    }
});

console.log('💡 Guruhga /start yoki biror xabar yuboring...');
console.log('💡 Ctrl+C bosib to\'xtatish mumkin.\n');
