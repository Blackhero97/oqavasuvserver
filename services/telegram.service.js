import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import Student from '../models/Student.js';

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

        // Fetch all active employees/students of this role
        // Note: For students, we might need to check the Student collection too if not synced
        const allEmployees = await Employee.find({ role: role, status: 'active' });

        const total = allEmployees.length;
        const presentRecords = records.filter(r => r.firstCheckIn);
        const presentCount = presentRecords.length;

        // Find absentees
        const presentIds = new Set(records.map(r => r.hikvisionEmployeeId));
        const absentees = allEmployees.filter(emp => !presentIds.has(emp.hikvisionEmployeeId));
        const absentCount = absentees.length;

        // Calculate late
        const lateCount = records.filter(r => {
            if (!r.firstCheckIn) return false;
            const [h, m] = r.firstCheckIn.split(':').map(Number);
            return (h * 60 + m) > (8 * 60 + 30); // Late after 08:30
        }).length;

        let message = `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `${emoji} *${roleLabel.toUpperCase()} DAVOMAT* ${emoji}\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        message += `📅 *Sana:* \`${today}\`\n`;
        message += `📊 *Statistika:*\n`;
        message += `├ 👥 Jami: *${total}*\n`;
        message += `├ ✅ Kelgan: *${presentCount}*\n`;
        message += `├ ⏰ Kechikkan: *${lateCount}*\n`;
        message += `└ ❌ Kelmagan: *${absentCount}*\n`;
        message += `\n──────────────────\n\n`;

        if (presentCount > 0) {
            message += `*📍 KELGANLAR VAQTI:*\n`;
            // Sort by check-in time
            const sortedPresent = [...records]
                .filter(r => r.firstCheckIn)
                .sort((a, b) => a.firstCheckIn.localeCompare(b.firstCheckIn));

            sortedPresent.forEach((r, index) => {
                const checkIn = r.firstCheckIn || '--:--';
                const checkOut = r.lastCheckOut || '--:--';
                const isLate = (function () {
                    const [h, m] = checkIn.split(':').map(Number);
                    return (h * 60 + m) > (8 * 60 + 30);
                })();

                const statusIcon = isLate ? '🕒' : '✅';
                message += `${statusIcon} *${r.name}*\n`;
                message += `   └ 🛫 \`${checkIn}\` - 🛬 \`${checkOut}\`\n`;
            });
            message += `\n`;
        }

        if (absentCount > 0) {
            message += `*🚫 KELMAGANLAR:* \`(${absentCount})\` \n`;
            absentees.forEach((emp, index) => {
                message += `• _${emp.name}_\n`;
            });
        }

        if (total === 0) {
            message += `⚠️ _Ushbu kunda ma'lumot topilmadi._\n`;
        }

        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🤖 *BM CRM Tizimi* | ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        console.log(`✅ ${roleLabel} ultra-detailed attendance report sent to Telegram`);

        return { success: true, present: presentCount, absent: absentCount, total };
    } catch (error) {
        console.error('❌ Error sending Telegram report:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send class-specific attendance report to Telegram
 * @param {string} className - The name of the class (e.g., "9-A")
 */
export const sendClassAttendanceReport = async (className) => {
    try {
        if (!bot) return { success: false, error: 'Bot initialization failed' };

        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!chatId) return { success: false, error: 'TELEGRAM_CHAT_ID not set' };

        const today = new Date().toISOString().split('T')[0];

        // Fetch students in this class
        const students = await Student.find({ className: className, status: 'active' });
        if (students.length === 0) {
            return { success: false, error: `Sinfda o'quvchilar topilmadi: ${className}` };
        }

        const studentIds = students.map(s => s.hikvisionEmployeeId);
        const records = await Attendance.find({
            date: today,
            hikvisionEmployeeId: { $in: studentIds }
        });

        const total = students.length;
        const presentRecords = records.filter(r => r.firstCheckIn);
        const presentCount = presentRecords.length;
        const absentCount = total - presentCount;

        const presentHikIds = new Set(presentRecords.map(r => r.hikvisionEmployeeId));
        const absentees = students.filter(s => !presentHikIds.has(s.hikvisionEmployeeId));

        let message = `━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🏫 *${className.toUpperCase()} SINFI DAVOMATI* 🏫\n`;
        message += `━━━━━━━━━━━━━━━━━━━━\n\n`;

        message += `📅 *Sana:* \`${today}\`\n`;
        message += `📊 *Statistika:*\n`;
        message += `├ 👥 Jami o'quvchi: *${total}*\n`;
        message += `├ ✅ Kelgan: *${presentCount}*\n`;
        message += `└ ❌ Kelmagan: *${absentCount}*\n`;
        message += `\n──────────────────\n\n`;

        if (presentCount > 0) {
            message += `*📍 KELGANLAR VAQTI:*\n`;
            const sortedRecords = [...presentRecords].sort((a, b) => a.firstCheckIn.localeCompare(b.firstCheckIn));

            sortedRecords.forEach(r => {
                const checkIn = r.firstCheckIn || '--:--';
                const checkOut = r.lastCheckOut || '--:--';
                message += `✅ *${r.name}*\n`;
                message += `   └ 🛫 \`${checkIn}\` - 🛬 \`${checkOut}\`\n`;
            });
            message += `\n`;
        }

        if (absentCount > 0) {
            message += `*🚫 KELMAGANLAR:* \`(${absentCount})\` \n`;
            absentees.forEach(s => {
                message += `• _${s.name}_\n`;
            });
        }

        message += `\n━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🤖 *BM CRM Tizimi* | ${new Date().toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}`;

        await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
        return { success: true, present: presentCount, absent: absentCount, total };
    } catch (error) {
        console.error('❌ Error sending class report:', error);
        return { success: false, error: error.message };
    }
};

export default bot;
