import cron from 'node-cron';
import { sendAttendanceReport } from './telegram.service.js';

/**
 * Initialize all scheduled tasks (cron jobs)
 */
export const initializeScheduler = () => {
    console.log('⏰ Scheduler initialized');

    // 1. Morning Report - 09:00 AM
    // Tasks: 09:00 har kuni (0 9 * * *)
    cron.schedule('0 9 * * *', async () => {
        console.log('🕒 Triggering Morning Attendance Report (09:00)...');
        await sendAttendanceReport('student');
        await sendAttendanceReport('teacher');
        await sendAttendanceReport('staff');
    }, {
        scheduled: true,
        timezone: "Asia/Tashkent"
    });

    // 2. Evening Report - 05:00 PM (17:00)
    // Tasks: 17:00 har kuni (0 17 * * *)
    cron.schedule('0 17 * * *', async () => {
        console.log('🕒 Triggering Evening Attendance Report (17:00)...');
        await sendAttendanceReport('student');
        await sendAttendanceReport('teacher');
        await sendAttendanceReport('staff');
    }, {
        scheduled: true,
        timezone: "Asia/Tashkent"
    });

    // Test task - runs every minute (optional, for debugging only)
    // cron.schedule('* * * * *', () => console.log('Cron heartbeat...'));
};

export default initializeScheduler;
