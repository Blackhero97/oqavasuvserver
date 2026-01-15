/**
 * Hikvision ISUP Test & Diagnostic Script
 * Bu script serverning holatini tekshiradi va muammolarni topadi
 */

import net from 'net';
import os from 'os';

console.log('🔍 HIKVISION INTEGRATION DIAGNOSTIC TOOL\n');
console.log('='.repeat(60));

// 1. Network Information
console.log('\n📡 1. TARMOQ MA\'LUMOTLARI');
console.log('-'.repeat(60));

const networkInterfaces = os.networkInterfaces();
console.log('Sizning kompyuter IP manzillari:');
Object.keys(networkInterfaces).forEach(name => {
    networkInterfaces[name].forEach(net => {
        if (net.family === 'IPv4' && !net.internal) {
            console.log(`   ✓ ${name}: ${net.address}`);
        }
    });
});

console.log('\n💡 HIKVISION QURILMASI:');
console.log('   IP: 192.168.100.193');
console.log('   Username: admin');
console.log('   Password: Parol8887');

// 2. Port Check
console.log('\n🔌 2. PORT TEKSHIRUV');
console.log('-'.repeat(60));

function checkPort(port, name) {
    return new Promise((resolve) => {
        const server = net.createServer();

        server.once('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`   ✅ Port ${port} (${name}) - BAND (server ishlab turibdi)`);
                resolve(true);
            } else {
                console.log(`   ❌ Port ${port} (${name}) - XATO: ${err.message}`);
                resolve(false);
            }
        });

        server.once('listening', () => {
            console.log(`   ⚠️  Port ${port} (${name}) - BO'SH (server ishlamayapti)`);
            server.close();
            resolve(false);
        });

        server.listen(port, '0.0.0.0');
    });
}

async function runDiagnostics() {
    await checkPort(5200, 'ISUP Server');
    await checkPort(5000, 'HTTP API Server');

    // 3. Firewall Test
    console.log('\n🔥 3. FIREWALL TEKSHIRUV');
    console.log('-'.repeat(60));
    console.log('   ℹ️  PowerShell\'da Administrator sifatida bajaring:');
    console.log('   ');
    console.log('   New-NetFirewallRule -DisplayName "CRM ISUP" \\');
    console.log('       -Direction Inbound -LocalPort 5200 -Protocol TCP -Action Allow');
    console.log('   ');
    console.log('   New-NetFirewallRule -DisplayName "CRM API" \\');
    console.log('       -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow');

    // 4. Hikvision Connection Test
    console.log('\n🎯 4. HIKVISION QURILMAGA ULANISH TESTI');
    console.log('-'.repeat(60));

    const hikvisionHost = '192.168.100.193';
    const hikvisionPort = 80;

    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on('connect', () => {
        console.log(`   ✅ Hikvision qurilmaga ulanish muvaffaqiyatli!`);
        console.log(`   ✅ Tarmoq aloqasi mavjud`);
        socket.destroy();
    });

    socket.on('timeout', () => {
        console.log(`   ❌ Timeout - Qurilmaga ulanib bo'lmadi`);
        console.log(`   ⚠️  Tekshiring:`);
        console.log(`      - Qurilma yoniqmi?`);
        console.log(`      - IP manzil to'g'rimi? (${hikvisionHost})`);
        console.log(`      - Bir tarmoqdamisiz?`);
        socket.destroy();
    });

    socket.on('error', (err) => {
        console.log(`   ❌ Xato: ${err.message}`);
        console.log(`   ⚠️  Hikvision qurilmasi tarmoqda yo'q yoki IP manzil xato`);
    });

    socket.connect(hikvisionPort, hikvisionHost);

    // Wait for connection test
    await new Promise(resolve => setTimeout(resolve, 3500));

    // 5. Configuration Guide
    console.log('\n📝 5. HIKVISION SOZLASH QO\'LLANMASI');
    console.log('-'.repeat(60));
    console.log('\nBrauzerda oching: https://192.168.100.193');
    console.log('Login: admin / Parol8887');
    console.log('\nConfiguration → Network → Platform Access (ISUP)');
    console.log('\nQuyidagilarni kiriting:');
    console.log('   ✓ Enable: ✅ (galochka)');
    console.log('   ✓ Protocol: ISUP 5.0');
    console.log('   ✓ Server Address: [YUQORIDAGI IP MANZILLARDAN BIRINI TANLANG]');
    console.log('   ✓ Port: 5200');
    console.log('   ✓ Device ID: 001');
    console.log('   ✓ Encryption: Disable');

    // 6. Next Steps
    console.log('\n🚀 6. KEYINGI QADAMLAR');
    console.log('-'.repeat(60));
    console.log('\nAgar portlar BO\'SH bo\'lsa:');
    console.log('   1. cd "c:\\Users\\BOBORAHIM MASHRAB\\Downloads\\bm crmm\\bm crmm\\server"');
    console.log('   2. node index.js');
    console.log('\nServer konsolda quyidagini ko\'rishingiz kerak:');
    console.log('   ✅ MongoDB connected');
    console.log('   🚀 ISUP Server listening on port 5200');
    console.log('   🚀 Server running on port 5000');
    console.log('\nHikvision sozlagandan keyin:');
    console.log('   🔌 New ISUP connection: 192.168.100.193:xxxxx');
    console.log('   📨 ISUP Command: Register');
    console.log('   ✅ Device 001 registered');

    // 7. Documentation
    console.log('\n📚 7. TO\'LIQ QO\'LLANMA');
    console.log('-'.repeat(60));
    console.log('To\'liq qo\'llanma yaratildi:');
    console.log('   📄 hikvision_sozlash_qollanma.md');
    console.log('\n');
    console.log('='.repeat(60));
    console.log('Diagnostika tugadi! ✅');
    console.log('='.repeat(60));
}

runDiagnostics();
