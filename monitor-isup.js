/**
 * Real-time ISUP Connection Monitor
 * Bu script ISUP server holatini va ulanishlarni real-time kuzatadi
 */

import chalk from 'chalk';

const API_BASE = 'http://localhost:5000';

console.clear();
console.log(chalk.cyan.bold('\n🔍 HIKVISION ISUP MONITOR\n'));
console.log(chalk.gray('Press Ctrl+C to stop\n'));
console.log('='.repeat(70));

let lastEventTime = null;

async function checkStatus() {
    try {
        // ISUP status
        const isupRes = await fetch(`${API_BASE}/api/isup/status`);
        const isupData = await isupRes.json();

        // MongoDB employees
        const empRes = await fetch(`${API_BASE}/api/mongodb/employees`);
        const empData = await empRes.json();

        // Today's attendance
        const today = new Date().toISOString().split('T')[0];
        const attRes = await fetch(`${API_BASE}/api/mongodb/attendance?date=${today}`);
        const attData = await attRes.json();

        // Clear and redraw
        console.clear();
        console.log(chalk.cyan.bold('\n🔍 HIKVISION ISUP MONITOR'));
        console.log(chalk.gray(`Last update: ${new Date().toLocaleTimeString()}\n`));
        console.log('='.repeat(70));

        // ISUP Server Status
        console.log(chalk.yellow.bold('\n📡 ISUP SERVER'));
        console.log(chalk.gray('─'.repeat(70)));
        console.log(`Status       : ${chalk.green('● ONLINE')}`);
        console.log(`Port         : ${chalk.cyan(isupData.port)}`);
        console.log(`Devices      : ${chalk.cyan(isupData.connectedDevices)} connected`);

        if (isupData.devices && isupData.devices.length > 0) {
            console.log(chalk.green('\n✅ Connected Devices:'));
            isupData.devices.forEach(device => {
                const uptime = Math.floor(device.uptime / 60);
                console.log(`   • Device ${device.deviceId} - Uptime: ${uptime} minutes`);
            });
        } else {
            console.log(chalk.yellow('\n⚠️  No devices connected yet'));
            console.log(chalk.gray('   Waiting for Hikvision terminal to connect...'));
        }

        // Database Status
        console.log(chalk.yellow.bold('\n💾 DATABASE (MongoDB Atlas)'));
        console.log(chalk.gray('─'.repeat(70)));
        console.log(`Employees    : ${chalk.cyan(empData.employees?.length || 0)}`);
        console.log(`Today        : ${chalk.cyan(attData.attendance?.length || 0)} attendance records`);

        // Today's Attendance
        if (attData.attendance && attData.attendance.length > 0) {
            console.log(chalk.green.bold('\n✅ BUGUNGI DAVOMAT'));
            console.log(chalk.gray('─'.repeat(70)));

            attData.attendance.forEach((att, idx) => {
                const lastEvent = att.events && att.events.length > 0
                    ? att.events[att.events.length - 1]
                    : null;

                const status = lastEvent?.type === 'IN'
                    ? chalk.green('KELDI')
                    : chalk.yellow('KETDI');

                const time = lastEvent?.time || att.firstCheckIn || '??:??';

                console.log(`${idx + 1}. ${chalk.cyan(att.name.padEnd(25))} ${status}  ${time}`);
            });
        } else {
            console.log(chalk.yellow('\n⏳ Hali davomat ma\'lumoti yo\'q'));
            console.log(chalk.gray('   Terminal oldiga yuzingizni ko\'rsating...'));
        }

        // Instructions
        console.log(chalk.gray('\n' + '─'.repeat(70)));
        console.log(chalk.gray('💡 Test: Terminal oldiga yuzingizni ko\'rsating'));
        console.log(chalk.gray('🔄 Auto-refresh: Every 3 seconds'));
        console.log(chalk.gray('🛑 Stop: Press Ctrl+C'));
        console.log(chalk.gray('─'.repeat(70)));

    } catch (error) {
        console.clear();
        console.log(chalk.red.bold('\n❌ SERVER ISHLAMAYAPTI\n'));
        console.log(chalk.yellow('Server ishga tushiring:'));
        console.log(chalk.cyan('   cd server'));
        console.log(chalk.cyan('   node index.js\n'));
    }
}

// Initial check
checkStatus();

// Auto-refresh every 3 seconds
setInterval(checkStatus, 3000);
