import express from 'express';
import { sendAttendanceReport } from '../services/telegram.service.js';
import { authenticateToken, requireRole } from '../middleware/auth.js';

const router = express.Router();

/**
 * POST /api/notifications/telegram/attendance
 * Manually trigger a Telegram attendance report
 */
router.post('/telegram/attendance', authenticateToken, async (req, res) => {
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
 * GET /api/notifications/telegram/status
 * Check if Telegram Bot is configured
 */
router.get('/telegram/status', authenticateToken, (req, res) => {
    const isConfigured = !!process.env.TELEGRAM_BOT_TOKEN;
    const hasChatId = !!process.env.TELEGRAM_CHAT_ID;

    res.json({
        active: isConfigured && hasChatId,
        botConfigured: isConfigured,
        chatIdSet: hasChatId
    });
});

export default router;
