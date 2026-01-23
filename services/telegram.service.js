import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;

if (token) {
    bot = new TelegramBot(token, { polling: true });
    console.log('🤖 Telegram Bot initialized');

    // Bot started - listen for /start to get chat ID
    bot.onText(/\/start/, (msg) => {
        const chatId = msg.chat.id;
        bot.sendMessage(chatId, `Assalomu alaykum! Bot ishga tushdi. \nSizning Chat ID: ${chatId}\n\nUshbu ID ni .env faylidagi TELEGRAM_CHAT_ID qismiga qo'shib qo'ying.`);
        console.log(`📩 Telegram Chat ID discovered: ${chatId}`);
    });
}

/**
 * Send attendance report to Telegram
 * @param {string} role - 'student' or 'teacher'
 */
export const sendAttendanceReport = async (role = 'student') => {
    try {
        if (!bot) {
            console.error('❌ Telegram Bot is not initialized (missing token)');
            return;
        }

        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) {
            console.warn('⚠️ TELEGRAM_CHAT_ID is not set in .env');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const roleLabel = role === 'student' ? 'O\'quvchilar' : 'O\'qituvchilar';
        const emoji = role === 'student' ? '🎓' : '👨‍🏫';

        // Fetch today's records for this role
        const records = await Attendance.find({ date: today, role: role });

        // Fetch all active employees of this role to calculate absents
        const allEmployees = await Employee.find({ role: role, status: 'active' });

        const total = allEmployees.length;
        const present = records.filter(r => r.firstCheckIn).length;
        const late = records.filter(r => {
            if (!r.firstCheckIn) return false;
            const [h, m] = r.firstCheckIn.split(':').map(Number);
            return (h * 60 + m) > (8 * 60 + 30); // Late after 08:30
        }).length;
        const absent = total - present;

        let message = `${emoji} *${roleLabel} Davomat Hisoboti*\n`;
        message += `📅 Sana: ${today}\n`;
        message += `━━━━━━━━━━━━━━━━━━\n`;
        message += `👥 Jami: ${total}\n`;
        message += `✅ Kelgan: ${present}\n`;
        message += `⏰ Kechikkan: ${late}\n`;
        message += `❌ Kelmagan: ${absent}\n`;
        message += `━━━━━━━━━━━━━━━━━━\n`;

        if (present > 0) {
            message += `\n*So'nggi kelganlar:*\n`;
            // Get last 5 check-ins
            const lastCheckIns = records
                .filter(r => r.firstCheckIn)
                .sort((a, b) => b.firstCheckIn.localeCompare(a.firstCheckIn))
                .slice(0, 5);

            lastCheckIns.forEach(r => {
                message += `• ${r.name} (${r.firstCheckIn})\n`;
            });
        }

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ ${roleLabel} attendance report sent to Telegram`);

        return { success: true, present, absent, total };
    } catch (error) {
        console.error('❌ Error sending Telegram report:', error);
        return { success: false, error: error.message };
    }
};

export default bot;
