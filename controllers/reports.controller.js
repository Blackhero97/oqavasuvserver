import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';

export const getReportStats = async (req, res) => {
    try {
        console.log('📊 [REPORTS API] Request received');

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const dayOfMonth = now.getDate();
        const todayStr = now.toISOString().split('T')[0];

        // Core counts
        const totalStudents = await Student.countDocuments({ status: 'active' });

        const startOfMonthStr = new Date(year, month, 1).toISOString().split('T')[0];
        const endOfMonthStr = new Date(year, month + 1, 0).toISOString().split('T')[0];

        // Monthly Student Records
        const monthlyRecords = await Attendance.find({
            date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
            role: 'student'
        });

        // Stats calculations
        const presentRecords = monthlyRecords.filter(r =>
            r.status === 'present' || (r.firstCheckIn && r.firstCheckIn.length > 0)
        );
        const presentCount = presentRecords.length;

        const possibleCount = (totalStudents || 0) * dayOfMonth;
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
        const todayRecords = await Attendance.find({ date: todayStr, role: 'student' });
        const presentToday = todayRecords.filter(r => r.status === 'present' || (r.firstCheckIn && r.firstCheckIn.length > 0)).length;
        const lateToday = todayRecords.filter(r => {
            if (!r.firstCheckIn) return false;
            const p = r.firstCheckIn.split(':');
            if (p.length < 2) return false;
            return (parseInt(p[0]) * 60 + parseInt(p[1])) > (8 * 60 + 30);
        }).length;
        const absentToday = Math.max(0, (totalStudents || 0) - presentToday);

        const attendanceDistribution = [
            { name: "Keldi", value: Math.max(0, presentToday - lateToday), color: "#22c55e" },
            { name: "Kech", value: lateToday, color: "#f59e0b" },
            { name: "Yo'q", value: absentToday, color: "#ef4444" },
        ];

        // 3. Last 10 Months Trend
        const monthlyTrend = [];
        const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];
        for (let i = 9; i >= 0; i--) {
            const d = new Date(year, month - i, 1);
            const dLabel = monthNames[d.getMonth()];
            const sStr = d.toISOString().split('T')[0];
            const eStr = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];

            const mCount = await Attendance.countDocuments({
                date: { $gte: sStr, $lte: eStr },
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
            });
            const mRate = totalStudents > 0 ? (mCount / (totalStudents * 22)) * 100 : 0;
            monthlyTrend.push({ month: dLabel, attendance: parseFloat(Math.min(100, mRate).toFixed(1)) });
        }

        // 4. Class Performance
        const classes = await Class.find();
        const classPerformance = [];
        for (const cls of classes) {
            const clsStudents = await Student.find({ className: cls.name, status: 'active' });
            if (clsStudents.length === 0) continue;

            const clsIds = clsStudents.map(s => s.hikvisionEmployeeId);
            const clsCount = await Attendance.countDocuments({
                date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
                hikvisionEmployeeId: { $in: clsIds },
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
            });
            const clsRate = (clsCount / (clsStudents.length * dayOfMonth)) * 100;
            classPerformance.push({ class: cls.name, attendance: parseFloat(Math.min(100, clsRate).toFixed(1)) });
        }
        const classPerformanceSorted = classPerformance.sort((a, b) => b.attendance - a.attendance);

        // 5. Weekly Trend
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

            const tCount = await Attendance.countDocuments({ date: tStr, role: 'student', $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });
            const lCount = await Attendance.countDocuments({ date: lStr, role: 'student', $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });

            weeklyTrendData.push({
                day: weekLabels[i],
                thisWeek: totalStudents > 0 ? parseFloat(Math.min(100, (tCount / totalStudents) * 100).toFixed(1)) : 0,
                lastWeek: totalStudents > 0 ? parseFloat(Math.min(100, (lCount / totalStudents) * 100).toFixed(1)) : 0
            });
        }

        // 6. Top Students (Fallback logic)
        // Simplified top students from last 500 records this month to avoid aggregation errors
        const recentMonthly = await Attendance.find({
            date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
            role: 'student',
            $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }]
        }).limit(1000);

        const studentStats = {};
        recentMonthly.forEach(r => {
            if (!studentStats[r.hikvisionEmployeeId]) {
                studentStats[r.hikvisionEmployeeId] = { name: r.name, class: r.department, count: 0 };
            }
            studentStats[r.hikvisionEmployeeId].count++;
        });

        const topStudents = Object.values(studentStats)
            .sort((a, b) => b.count - a.count)
            .slice(0, 5)
            .map(s => ({
                name: s.name,
                class: s.class || "N/A",
                days: s.count,
                attendance: parseFloat(((s.count / dayOfMonth) * 100).toFixed(1))
            }));

        res.json({
            success: true,
            stats: {
                avgAttendance: parseFloat(avgAttendance.toFixed(1)),
                bestClass: classPerformanceSorted.length > 0 ? classPerformanceSorted[0].class : 'N/A',
                bestClassRate: classPerformanceSorted.length > 0 ? classPerformanceSorted[0].attendance : 0,
                totalStudents: totalStudents || 0,
                latePercentage: parseFloat(latePercentage.toFixed(1))
            },
            charts: {
                monthlyTrend,
                attendanceDistribution,
                weeklyTrendData,
                classPerformance: classPerformanceSorted.slice(0, 6)
            },
            topStudents
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
