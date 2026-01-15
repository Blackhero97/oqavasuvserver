// MongoDB-based Hikvision Sync Endpoint
// Copy this code and replace the old /api/hikvision/sync endpoint in index.js

app.post("/api/hikvision/sync-mongodb", async (req, res) => {
    try {
        console.log("🔄 Starting Hikvision sync (MongoDB)...");

        // Fetch events from Hikvision device
        const hikvisionResult = await fetchHikvisionEvents(50);

        if (!hikvisionResult.success) {
            console.error("❌ Hikvision fetch failed:", hikvisionResult.error);
            return res.status(500).json({
                success: false,
                error: "Failed to fetch events from Hikvision",
                details: hikvisionResult.error,
            });
        }

        const events = hikvisionResult.events;
        console.log(`📥 Received ${events.length} events from Hikvision`);

        // Get all active employees from MongoDB
        const allEmployees = await Employee.find({ status: "active" });
        console.log(`👥 Found ${allEmployees.length} employees in MongoDB`);

        // Process each event
        let syncedCount = 0;
        const syncedEmployees = [];

        for (const event of events) {
            // Find employee by hikvisionEmployeeId
            const employee = allEmployees.find(
                (emp) => emp.hikvisionEmployeeId === event.employeeNoString
            );

            if (!employee) {
                console.warn(`⚠️  No employee found for Hikvision ID: ${event.employeeNoString}`);
                continue;
            }

            const eventDate = new Date(event.time);
            const dateStr = eventDate.toISOString().split("T")[0];
            const timeStr = eventDate.toTimeString().substring(0, 5);

            // Find or create attendance record
            let attendance = await Attendance.findOne({
                hikvisionEmployeeId: event.employeeNoString,
                date: dateStr,
            });

            if (!attendance) {
                // Create new attendance record with check-in
                attendance = new Attendance({
                    employeeId: employee.employeeId,
                    hikvisionEmployeeId: employee.hikvisionEmployeeId,
                    name: employee.name,
                    role: employee.role,
                    department: employee.department,
                    date: dateStr,
                    events: [{
                        time: timeStr,
                        type: 'IN',
                        timestamp: eventDate
                    }],
                    firstCheckIn: timeStr,
                    status: 'present'
                });
                await attendance.save();
                syncedCount++;
                syncedEmployees.push({ name: employee.name, action: 'checkin', time: timeStr });
                console.log(`✅ ${employee.name} - CHECK IN at ${timeStr}`);
            } else {
                // Update existing - add event
                const lastEvent = attendance.events[attendance.events.length - 1];
                if (lastEvent.type === 'IN') {
                    attendance.events.push({
                        time: timeStr,
                        type: 'OUT',
                        timestamp: eventDate
                    });
                    attendance.lastCheckOut = timeStr;
                    syncedEmployees.push({ name: employee.name, action: 'checkout', time: timeStr });
                    console.log(`✅ ${employee.name} - CHECK OUT at ${timeStr}`);
                } else {
                    attendance.events.push({
                        time: timeStr,
                        type: 'IN',
                        timestamp: eventDate
                    });
                    syncedEmployees.push({ name: employee.name, action: 'checkin', time: timeStr });
                    console.log(`✅ ${employee.name} - CHECK IN again at ${timeStr}`);
                }
                await attendance.save();
                syncedCount++;
            }
        }

        console.log(`✅ Sync completed: ${syncedCount} records processed`);

        res.json({
            success: true,
            message: `Synced ${syncedCount} attendance records`,
            statistics: {
                totalEventsFromDevice: events.length,
                syncedRecords: syncedCount,
                unmatchedEvents: events.length - syncedCount,
            },
            syncedEmployees: syncedEmployees,
            lastSyncTime: new Date().toISOString(),
        });
    } catch (error) {
        console.error("❌ Hikvision sync error:", error);
        res.status(500).json({
            success: false,
            error: error.message,
        });
    }
});
