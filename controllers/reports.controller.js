import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';

export const getReportStats = async (req, res) => {
    try {
        console.log('📊 [REPORTS API] Request received');

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const dayOfMonth = now.getDate();
        const todayStr = now.toISOString().split('T')[0];

        // Core counts
        const totalEmployees = await Employee.countDocuments({ status: 'active' });

        const startOfMonthStr = new Date(year, month, 1).toISOString().split('T')[0];
        const endOfMonthStr = new Date(year, month + 1, 0).toISOString().split('T')[0];

        // Monthly Records
        const monthlyRecords = await Attendance.find({
            date: { $gte: startOfMonthStr, $lte: endOfMonthStr }
        });

        // Stats calculations
        const presentRecords = monthlyRecords.filter(r =>
            r.status === 'present' || (r.firstCheckIn && r.firstCheckIn.length > 0)
        );
        const presentCount = presentRecords.length;

        const possibleCount = (totalEmployees || 0) * dayOfMonth;
        const avgAttendance = possibleCount > 0 ? (presentCount / possibleCount) * 100 : 0;

        const lateRecords = presentRecords.filter(r => {
            if (!r.firstCheckIn) return false;
            const parts = r.firstCheckIn.split(':');
            if (parts.length < 2) return false;
            const h = parseInt(parts[0]);
            const m = parseInt(parts[1]);
            return (h * 60 + m) > (8 * 60 + 30);
        });
        const latePercentage = presentCount > 0 ? (lateRecords.length / presentCount) * 100 : 0;

        // Today Distribution
        const todayRecords = await Attendance.find({ date: todayStr });
        const presentToday = todayRecords.filter(r => r.status === 'present' || (r.firstCheckIn && r.firstCheckIn.length > 0)).length;
        const lateToday = todayRecords.filter(r => {
            if (!r.firstCheckIn) return false;
            const p = r.firstCheckIn.split(':');
            if (p.length < 2) return false;
            return (parseInt(p[0]) * 60 + parseInt(p[1])) > (8 * 60 + 30);
        }).length;
        const absentToday = Math.max(0, (totalEmployees || 0) - presentToday);

        const attendanceDistribution = [
            { name: "Keldi", value: Math.max(0, presentToday - lateToday), color: "#22c55e" },
            { name: "Kech", value: lateToday, color: "#f59e0b" },
            { name: "Yo'q", value: absentToday, color: "#ef4444" },
        ];

        // Last 6 Months Trend
        const monthlyTrend = [];
        const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
        for (let i = 5; i >= 0; i--) {
            const d = new Date(year, month - i, 1);
            const dLabel = monthNames[d.getMonth()];
            const sStr = d.toISOString().split('T')[0];
            const eStr = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

            const mCount = await Attendance.countDocuments({
                date: { $gte: sStr, $lte: eStr },
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
            });
            const mRate = totalEmployees > 0 ? (mCount / (totalEmployees * 22)) * 100 : 0;
            monthlyTrend.push({ month: dLabel, attendance: parseFloat(Math.min(100, mRate).toFixed(1)) });
        }

        // Weekly Trend
        const weeklyTrendData = [];
        const weekLabels = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
        const temp = new Date();
        const dayIdx = temp.getDay();
        const diff = (dayIdx === 0 ? -6 : 1) - dayIdx;
        for (let i = 0; i < 6; i++) {
            const tDate = new Date();
            tDate.setDate(temp.getDate() + diff + i);
            const lDate = new Date(tDate);
            lDate.setDate(lDate.getDate() - 7);

            const tStr = tDate.toISOString().split('T')[0];
            const lStr = lDate.toISOString().split('T')[0];

            const tCount = await Attendance.countDocuments({ date: tStr, $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });
            const lCount = await Attendance.countDocuments({ date: lStr, $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });

            weeklyTrendData.push({
                day: weekLabels[i],
                thisWeek: totalEmployees > 0 ? parseFloat(Math.min(100, (tCount / totalEmployees) * 100).toFixed(1)) : 0,
                lastWeek: totalEmployees > 0 ? parseFloat(Math.min(100, (lCount / totalEmployees) * 100).toFixed(1)) : 0
            });
        }

        // Top Employees by performance
        const employeeStats = {};
        presentRecords.forEach(r => {
            if (!employeeStats[r.hikvisionEmployeeId]) {
                employeeStats[r.hikvisionEmployeeId] = { name: r.name, dept: r.department, count: 0 };
            }
            employeeStats[r.hikvisionEmployeeId].count++;
        });

        const topEmployees = Object.values(employeeStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(s => ({
                name: s.name,
                class: s.dept || "Bo'limsiz",
                days: s.count,
                attendance: parseFloat(((s.count / dayOfMonth) * 100).toFixed(1))
            }));

        res.json({
            success: true,
            stats: {
                avgAttendance: parseFloat(avgAttendance.toFixed(1)),
                bestClass: 'Barcha bo\'limlar',
                bestClassRate: parseFloat(avgAttendance.toFixed(1)),
                totalStudents: totalEmployees || 0,
                latePercentage: parseFloat(latePercentage.toFixed(1))
            },
            charts: {
                monthlyTrend,
                attendanceDistribution,
                weeklyTrendData,
                classPerformance: [] // No classes/departments for now in charts to keep it simple
            },
            topEmployees
        });

    } catch (error) {
        console.error('❌ REPORTS API CRASH:', error);
        res.status(500).json({ success: false, error: 'Database error', message: error.message });
    }
};

export const saveExcelReport = (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, error: 'File missing' });
        res.json({ success: true, message: 'Saved', filename: req.file.filename });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};
