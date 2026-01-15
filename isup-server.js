import net from 'net';
import { parseString } from 'xml2js';
import Employee from './models/Employee.js';
import Student from './models/Student.js';
import Attendance from './models/Attendance.js';

const ISUP_PORT = 5200;
const DEVICE_ID = '001'; // From Hikvision config
const ENCRYPTION_KEY = 'bmmaktab2025'; // Match with Hikvision ISUP settings

let connectedDevices = new Map();

/**
 * Parse ISUP XML message from Hikvision
 */
function parseISUPMessage(data) {
    return new Promise((resolve, reject) => {
        parseString(data, { explicitArray: false }, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
}

/**
 * Build ISUP XML response
 */
function buildISUPResponse(cmd, result = 'OK', data = {}) {
    const timestamp = new Date().toISOString();
    return `<?xml version="1.0" encoding="UTF-8"?>
<Message>
  <Header>
    <Version>1.0</Version>
    <Command>${cmd}</Command>
    <Result>${result}</Result>
    <Time>${timestamp}</Time>
  </Header>
  <Body>${Object.entries(data).map(([k, v]) => `<${k}>${v}</${k}>`).join('')}</Body>
</Message>`;
}

/**
 * Process attendance event from Hikvision
 */
async function processAttendanceEvent(eventData) {
    try {
        console.log('📥 Processing attendance event:', eventData);

        const employeeNo = eventData.employeeNoString || eventData.employeeNo;
        const eventTime = new Date(eventData.time);

        // Convert to Tashkent timezone (UTC+5)
        const tashkentOffset = 5 * 60; // 5 hours in minutes
        const localTime = new Date(eventTime.getTime() + tashkentOffset * 60 * 1000);

        const dateStr = localTime.toISOString().split('T')[0];
        const timeStr = localTime.toISOString().split('T')[1].substring(0, 5);

        // Find employee in database - check Student collection first, then Employee
        let employee = await Student.findOne({ hikvisionEmployeeId: employeeNo });
        let isStudent = false;

        if (employee) {
            isStudent = true;
            console.log(`👨‍🎓 Found in Student collection: ${employee.name}`);
        } else {
            // Fallback to Employee collection
            employee = await Employee.findOne({ hikvisionEmployeeId: employeeNo });
            if (employee) {
                console.log(`👤 Found in Employee collection: ${employee.name}`);
            }
        }

        if (!employee) {
            console.warn(`⚠️  Employee/Student not found: ${employeeNo}`);
            return;
        }

        // Find or create attendance record
        let attendance = await Attendance.findOne({
            hikvisionEmployeeId: employeeNo,
            date: dateStr
        });

        if (!attendance) {
            // New check-in - use correct role based on collection
            const role = isStudent ? 'student' : (employee.role || 'staff');
            const department = employee.className || employee.department || 'Unknown';

            attendance = new Attendance({
                employeeId: employee.employeeId || employee.studentId,
                hikvisionEmployeeId: employee.hikvisionEmployeeId,
                name: employee.name,
                role: role,  // ← Fixed: use 'student' for students
                department: department,
                date: dateStr,
                events: [{
                    time: timeStr,
                    type: 'IN',
                    timestamp: eventTime
                }],
                firstCheckIn: timeStr,
                status: 'present'
            });
            console.log(`✅ ${employee.name} (${role}) - CHECK IN at ${timeStr}`);
        } else {
            // Determine if check-in or check-out
            const lastEvent = attendance.events[attendance.events.length - 1];
            const newEventType = lastEvent.type === 'IN' ? 'OUT' : 'IN';

            attendance.events.push({
                time: timeStr,
                type: newEventType,
                timestamp: eventTime
            });

            if (newEventType === 'OUT') {
                attendance.lastCheckOut = timeStr;
                console.log(`✅ ${employee.name} - CHECK OUT at ${timeStr}`);
            } else {
                console.log(`✅ ${employee.name} - CHECK IN again at ${timeStr}`);
            }
        }

        await attendance.save();
        console.log('💾 Attendance saved to database');

    } catch (error) {
        console.error('❌ Error processing attendance:', error);
    }
}

/**
 * Handle ISUP client connection
 */
function handleClient(socket) {
    const clientId = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`🔌 New ISUP connection: ${clientId}`);

    let buffer = '';

    socket.on('data', async (data) => {
        try {
            const rawData = data.toString();
            console.log(`📥 Raw data received (${rawData.length} bytes):`, rawData.substring(0, 200));

            buffer += rawData;

            // Check if we have complete XML message
            if (buffer.includes('</Message>')) {
                const messages = buffer.split('</Message>');

                for (let i = 0; i < messages.length - 1; i++) {
                    const xmlData = messages[i] + '</Message>';

                    try {
                        const parsed = await parseISUPMessage(xmlData);
                        const message = parsed.Message;
                        const command = message.Header?.Command;

                        console.log(`📨 ISUP Command: ${command}`);

                        switch (command) {
                            case 'Register':
                                // Device registration
                                const deviceId = message.Body?.DeviceID || DEVICE_ID;
                                connectedDevices.set(deviceId, {
                                    socket,
                                    connectedAt: new Date(),
                                    deviceInfo: message.Body
                                });
                                console.log(`✅ Device ${deviceId} registered`);

                                const regResponse = buildISUPResponse('Register', 'OK', {
                                    ServerID: '1',
                                    KeepAliveInterval: '60'
                                });
                                socket.write(regResponse);
                                break;

                            case 'Heartbeat':
                                // Keep-alive
                                const hbResponse = buildISUPResponse('Heartbeat', 'OK');
                                socket.write(hbResponse);
                                break;

                            case 'EventNotification':
                                // Attendance event
                                const eventBody = message.Body;
                                if (eventBody) {
                                    await processAttendanceEvent(eventBody);
                                    const eventResponse = buildISUPResponse('EventNotification', 'OK');
                                    socket.write(eventResponse);
                                }
                                break;

                            case 'Alarm':
                                // Alarm/Alert
                                console.log('🚨 Alarm received:', message.Body);
                                const alarmResponse = buildISUPResponse('Alarm', 'OK');
                                socket.write(alarmResponse);
                                break;

                            default:
                                console.log(`⚠️  Unknown command: ${command}`);
                                const defaultResponse = buildISUPResponse(command, 'OK');
                                socket.write(defaultResponse);
                        }
                    } catch (parseError) {
                        console.error('❌ XML Parse error:', parseError.message);
                    }
                }

                buffer = messages[messages.length - 1];
            }
        } catch (error) {
            console.error('❌ ISUP data processing error:', error);
        }
    });

    socket.on('end', () => {
        console.log(`🔌 ISUP connection closed: ${clientId}`);
        // Remove from connected devices
        for (const [deviceId, info] of connectedDevices.entries()) {
            if (info.socket === socket) {
                connectedDevices.delete(deviceId);
                console.log(`📴 Device ${deviceId} unregistered`);
                break;
            }
        }
    });

    socket.on('error', (err) => {
        console.error(`❌ ISUP socket error for ${clientId}:`, err.message);
    });
}

/**
 * Start ISUP server
 */
export function startISUPServer() {
    const server = net.createServer(handleClient);

    server.listen(ISUP_PORT, '0.0.0.0', () => {
        console.log(`🚀 ISUP Server listening on port ${ISUP_PORT}`);
        console.log(`📡 Ready to accept connections from Hikvision devices`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ Port ${ISUP_PORT} is already in use`);
        } else {
            console.error('❌ ISUP Server error:', err);
        }
    });

    return server;
}

/**
 * Get connected devices status
 */
export function getConnectedDevices() {
    const devices = [];
    for (const [deviceId, info] of connectedDevices.entries()) {
        devices.push({
            deviceId,
            connectedAt: info.connectedAt,
            uptime: Math.floor((Date.now() - info.connectedAt.getTime()) / 1000),
            deviceInfo: info.deviceInfo
        });
    }
    return devices;
}
