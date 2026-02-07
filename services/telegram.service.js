import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import TelegramUser from '../models/TelegramUser.js';
import NotificationLog from '../models/NotificationLog.js';

dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;
let bot;

if (token) {
    const isProduction = process.env.NODE_ENV === 'production';
    const webhookUrl = process.env.WEBHOOK_URL;

    if (isProduction && webhookUrl) {
        bot = new TelegramBot(token, { webHook: true });
        const webhookPath = '/webhook/telegram';
        bot.setWebHook(`${webhookUrl}${webhookPath}`)
            .then(() => {
                console.log('🤖 Telegram Bot initialized (WEBHOOK MODE)');
            })
            .catch((err) => {
                console.error('❌ Failed to set webhook:', err.message);
            });
    } else {
        bot = new TelegramBot(token, { polling: true });
        console.log('🤖 Telegram Bot initialized (POLLING MODE - Development)');
    }

    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const user = msg.from;

        try {
            await TelegramUser.findOneAndUpdate(
                { chatId: chatId.toString() },
                {
                    chatId: chatId.toString(),
                    username: user.username,
                    firstName: user.first_name,
                    lastName: user.last_name,
                    isActive: true,
                    subscribedAt: new Date()
                },
                { upsert: true, new: true }
            );

            const userName = user.first_name || user.username || 'Foydalanuvchi';

            let welcomeMsg = `💧 *O'ZSUVTA'MINOT AJ* 💧\n`;
            welcomeMsg += `━━━━━━━━━━━━━━━━━━━━\n\n`;
            welcomeMsg += `Assalomu alaykum, *${userName}*!\n\n`;
            welcomeMsg += `Siz *O'zsuvta'minot AJ* xodimlar davomati va ichki bildirishnomalar tizimiga muvaffaqiyatli ulandingiz.\n\n`;
            welcomeMsg += `📑 *ASOSIY FUNKSIYALAR:* \n`;
            welcomeMsg += `🔹 Kunlik davomat xulosalari\n`;
            welcomeMsg += `🔹 Tezkor korporativ e'lonlar\n`;
            welcomeMsg += `🔹 Xodimlar keldi-ketdi nazorati\n\n`;
            welcomeMsg += `──────────────────\n`;
            welcomeMsg += `✅ *Holat:* Tizim faol ishlash rejimida.\n`;
            welcomeMsg += `🤖 *Suv Ta'minot Bot* | v2.1.0`;

            bot.sendMessage(chatId, welcomeMsg, { parse_mode: 'Markdown' });
            console.log(`✅ Yangi foydalanuvchi qo'shildi: ${userName} (${chatId})`);
        } catch (error) {
            console.error('❌ Error saving telegram user:', error);
        }
    });

    bot.onText(/\/stop/, async (msg) => {
        const chatId = msg.chat.id;
        try {
            await TelegramUser.findOneAndUpdate({ chatId: chatId.toString() }, { isActive: false });
            let stopMsg = `━━━━━━━━━━━━━━━━━━━━\n🔕 *OBUNA BEKOR QILINDI*\n━━━━━━━━━━━━━━━━━━━━\n\nSiz xabarnomalarni olishni to'xtatdingiz.\n\n *Xayr, salomat bo'ling!*`;
            bot.sendMessage(chatId, stopMsg, { parse_mode: 'Markdown' });
        } catch (error) {
            console.error('❌ Error deactivating user:', error);
        }
    });
}

async function broadcastMessage(message) {
    try {
        const activeUsers = await TelegramUser.find({ isActive: true });
        let sent = 0;
        let failed = 0;

        for (const user of activeUsers) {
            try {
                await bot.sendMessage(user.chatId, message, { parse_mode: 'Markdown' });
                sent++;
            } catch (error) {
                failed++;
                if (error.response && error.response.statusCode === 403) {
                    await TelegramUser.findOneAndUpdate({ chatId: user.chatId }, { isActive: false });
                }
            }
        }
        return { success: true, sent, failed };
    } catch (error) {
        return { success: false, sent: 0, failed: 0, error: error.message };
    }
}

/**
 * Send attendance report to Telegram
 */
export const sendAttendanceReport = async () => {
    try {
        if (!bot) return { success: false, error: 'Telegram Bot not initialized' };

        const today = new Date().toISOString().split('T')[0];
        const allEmployees = await Employee.find({ status: 'active' });
        const total = allEmployees.length;

        const hikvisionIds = allEmployees.map(emp => emp.hikvisionEmployeeId).filter(id => id);
        let records = [];
        if (hikvisionIds.length > 0) {
            records = await Attendance.find({
                date: today,
                hikvisionEmployeeId: { $in: hikvisionIds }
            });
        }

        const presentRecords = records.filter(r => r.firstCheckIn);
        const presentCount = presentRecords.length;
        const absentCount = total - presentCount;

        const lateCount = records.filter(r => {
            if (!r.firstCheckIn) return false;
            const [h, m] = r.firstCheckIn.split(':').map(Number);
            return (h * 60 + m) > (8 * 60 + 30);
        }).length;

        const attendanceRate = total > 0 ? Math.round((presentCount / total) * 100) : 0;
        const progressSegments = Math.round(attendanceRate / 10);
        const progressBar = '█'.repeat(progressSegments) + '░'.repeat(10 - progressSegments);

        const now = new Date();
        let message = `💧 *O'ZSUVTA'MINOT AJ | CRM* 💧\n`;
        message += `📈 *XODIMLAR DAVOMATI*\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        message += `📅 *Sana:* \`${today}\`\n`;
        message += `⏰ *Vaqt:* \`${now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' })}\`\n\n`;

        message += `📊 *KO'RSATKICHLAR:*\n`;
        message += `🔹 Jami xodimlar: *${total}*\n`;
        message += `🔹 Kelganlar: *${presentCount}*\n`;
        message += `🔹 Kechikkanlar: *${lateCount}*\n`;
        message += `🔹 Kelmaganlar: *${absentCount}*\n\n`;

        message += `📈 *DAVOMAT:* ${attendanceRate}%\n`;
        message += `${progressBar}\n\n`;

        if (presentCount > 0) {
            message += `📍 *KELGANLAR:* \n`;
            message += `─────────────────────\n`;
            const sortedPresent = [...records]
                .filter(r => r.firstCheckIn)
                .sort((a, b) => a.firstCheckIn.localeCompare(b.firstCheckIn));

            sortedPresent.forEach((r, index) => {
                const checkIn = r.firstCheckIn || '--:--';
                const [h, m] = checkIn.split(':').map(Number);
                const isLate = (h * 60 + m) > (8 * 60 + 30);
                message += `${index + 1}. *${r.name}* ${isLate ? '⏰' : '✅'}\n`;
                message += `   └ Vaqt: \`${checkIn}\`\n`;
            });
            message += `\n`;
        }

        if (absentCount > 0) {
            message += `🚫 *KELMAGANLAR:* \n`;
            message += `─────────────────────\n`;
            const presentIds = new Set(presentRecords.map(r => r.hikvisionEmployeeId));
            const absentees = allEmployees.filter(emp => !presentIds.has(emp.hikvisionEmployeeId));
            absentees.forEach((emp, index) => {
                message += `${index + 1}. _${emp.name}_\n`;
            });
            message += `\n`;
        }

        message += `━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🤖 *Suv Ta'minot CRM* | v2.1.0\n`;
        message += `📅 ${now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', day: '2-digit', month: 'long', year: 'numeric' })}`;

        const broadcastResult = await broadcastMessage(message);
        return { success: true, present: presentCount, absent: absentCount, total, broadcast: broadcastResult };
    } catch (error) {
        console.error('❌ Error sending Telegram report:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Send custom message to Telegram
 */
export const sendCustomMessage = async (title, message, recipient = "Barcha") => {
    try {
        if (!bot) return { success: false, error: 'Bot not initialized' };

        const now = new Date();
        const dateStr = now.toLocaleDateString('uz-UZ', { timeZone: 'Asia/Tashkent', year: 'numeric', month: 'long', day: 'numeric' });
        const timeStr = now.toLocaleTimeString('uz-UZ', { timeZone: 'Asia/Tashkent', hour: '2-digit', minute: '2-digit' });

        let telegramMessage = `💧 *O'ZSUVTA'MINOT AJ | XABARNOMA* 💧\n`;
        telegramMessage += `📢 *${title.toUpperCase()}*\n`;
        telegramMessage += `━━━━━━━━━━━━━━━━━━━━━\n\n`;
        telegramMessage += `👥 *Kimga:* ${recipient}\n`;
        telegramMessage += `📅 *Sana:* ${dateStr}\n\n`;
        telegramMessage += `📝 *XABAR MATNI:*\n`;
        telegramMessage += `──────────────────\n`;
        telegramMessage += `${message}\n\n`;
        telegramMessage += `━━━━━━━━━━━━━━━━━━━━━\n`;
        telegramMessage += `🤖 *Suv Ta'minot CRM*`;

        const broadcastResult = await broadcastMessage(telegramMessage);
        return { success: true, title, recipient, broadcast: broadcastResult };
    } catch (error) {
        console.error('❌ Error sending custom message:', error);
        return { success: false, error: error.message };
    }
};

export default bot;

