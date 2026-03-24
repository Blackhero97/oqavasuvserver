import cron from 'node-cron';
import { sendAttendanceReport } from './telegram.service.js';

/**
 * Initialize all scheduled tasks (cron jobs)
 */
export const initializeScheduler = () => {
    console.log('⏰ Scheduler initialized');

    // 1. Morning Report - 10:00 AM
    cron.schedule('0 10 * * *', async () => {
        console.log('🕒 Triggering Morning Attendance Report (10:00)...');
        await sendAttendanceReport();
    }, {
        scheduled: true,
        timezone: "Asia/Tashkent"
    });

    // 2. Evening Report - 09:00 PM (21:00)
    cron.schedule('0 21 * * *', async () => {
        console.log('🕒 Triggering Evening Attendance Report (21:00)...');
        await sendAttendanceReport();
    }, {
        scheduled: true,
        timezone: "Asia/Tashkent"
    });
};

export default initializeScheduler;
