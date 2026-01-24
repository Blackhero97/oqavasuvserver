import express from 'express';
import { sendAttendanceReport, sendClassAttendanceReport } from '../services/telegram.service.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

console.log('✅ Notification routes file loaded');

/**
 * GET /api/notifications/ping
 * Test end-point
 */
router.get('/ping', (req, res) => {
    res.json({ message: 'Notifications routing works!' });
});

/**
 * POST /api/notifications/telegram/attendance
 * Manually trigger a Telegram attendance report
 */
router.post('/telegram/attendance', async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) {
            return res.status(400).json({ error: 'Role is required' });
        }

        const result = await sendAttendanceReport(role);

        if (result.success) {
            res.json({
                message: `${role === 'student' ? 'O\'quvchilar' : 'O\'qituvchilar'} davomat hisoboti Telegramga yuborildi`,
                stats: result
            });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send report' });
        }
    } catch (error) {
        console.error('Error in manual telegram trigger:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/notifications/telegram/class-attendance
 * Manually trigger a Telegram attendance report for a specific class
 */
router.post('/telegram/class-attendance', async (req, res) => {
    try {
        const { className } = req.body;
        if (!className) {
            return res.status(400).json({ error: 'Sinf nomi kiritilishi shart' });
        }

        const result = await sendClassAttendanceReport(className);

        if (result.success) {
            res.json({
                message: `${className} sinfi davomat hisoboti Telegramga yuborildi`,
                stats: result
            });
        } else {
            res.status(500).json({ error: result.error || 'Failed to send report' });
        }
    } catch (error) {
        console.error('Error in manual class telegram trigger:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/notifications/telegram/status
 * Check if Telegram Bot is configured
 */
router.get('/telegram/status', (req, res) => {
    const isConfigured = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;

    res.json({
        active: isConfigured && hasChatId,
        botConfigured: isConfigured,
        chatIdSet: hasChatId
    });
});

export default router;
