import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';

export const getReportStats = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-11
        const dayOfMonth = now.getDate();

        // Date strings in YYYY-MM-DD
        const todayStr = now.toISOString().split('T')[0];
        const startOfMonthStr = new Date(year, month, 1).toISOString().split('T')[0];
        const endOfMonthStr = new Date(year, month + 1, 0).toISOString().split('T')[0];

        // 1. Core Statistics
        const totalStudents = await Student.countDocuments({ status: 'active' });

        // Monthly records for students
        const monthlyRecords = await Attendance.find({
            date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
            role: 'student'
        });

        // Average Attendance calculation
        // presentCount = any record that is 'present' or has check-in time
        const actualPresentCount = monthlyRecords.filter(r =>
            r.status === 'present' || (r.firstCheckIn && r.firstCheckIn.length > 0)
        ).length;

        const possibleCount = totalStudents * dayOfMonth;
        const avgAttendance = possibleCount > 0 ? (actualPresentCount / possibleCount) * 100 : 0;

        // Late arrivals calculation (after 08:30)
        const lateRecords = monthlyRecords.filter(r => {
            if (!r.firstCheckIn) return false;
            const [h, m] = r.firstCheckIn.split(':').map(Number);
            return (h * 60 + m) > (8 * 60 + 30);
        });
        const latePercentage = actualPresentCount > 0 ? (lateRecords.length / actualPresentCount) * 100 : 0;

        // 2. Daily Distribution (Pie Chart)
        const todayRecords = await Attendance.find({ date: todayStr, role: 'student' });
        const presentToday = todayRecords.filter(r => r.status === 'present' || (r.firstCheckIn && r.firstCheckIn.length > 0)).length;
        const lateToday = todayRecords.filter(r => {
            if (!r.firstCheckIn) return false;
            const [h, m] = r.firstCheckIn.split(':').map(Number);
            return (h * 60 + m) > (8 * 60 + 30);
        }).length;
        const absentToday = Math.max(0, totalStudents - presentToday);

        const attendanceDistribution = [
            { name: "Keldi", value: Math.max(0, presentToday - lateToday), color: "#22c55e" },
            { name: "Kech", value: lateToday, color: "#f59e0b" },
            { name: "Yo'q", value: absentToday, color: "#ef4444" },
        ];

        // 3. Monthly Trend (Last 10 months)
        const monthlyTrend = [];
        const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

        for (let i = 9; i >= 0; i--) {
            const mDate = new Date(year, month - i, 1);
            const mEnd = new Date(year, month - i + 1, 0);
            const label = monthNames[mDate.getMonth()];

            const mStartStr = mDate.toISOString().split('T')[0];
            const mEndStr = mEnd.toISOString().split('T')[0];

            const count = await Attendance.countDocuments({
                date: { $gte: mStartStr, $lte: mEndStr },
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: null, $ne: "" } }]
            });

            // Fixed estimate for trend visualization
            const attendance = totalStudents > 0 ? Math.min(100, (count / (totalStudents * 22)) * 100) : 0;
            monthlyTrend.push({ month: label, attendance: parseFloat(attendance.toFixed(1)) });
        }

        // 4. Class Performance (Top 6)
        const classes = await Class.find();
        const classStats = [];
        for (const cls of classes) {
            const students = await Student.find({ className: cls.name, status: 'active' });
            if (students.length === 0) continue;

            const ids = students.map(s => s.hikvisionEmployeeId);
            const count = await Attendance.countDocuments({
                date: { $gte: startOfMonthStr, $lte: endOfMonthStr },
                hikvisionEmployeeId: { $in: ids },
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: null, $ne: "" } }]
            });

            const score = (count / (students.length * dayOfMonth)) * 100;
            classStats.push({
                class: cls.name,
                attendance: parseFloat(Math.min(100, score).toFixed(1))
            });
        }

        const sortedClasses = classStats.sort((a, b) => b.attendance - a.attendance);
        const bestClass = sortedClasses.length > 0 ? sortedClasses[0] : { class: 'N/A', attendance: 0 };

        // 5. Weekly Trend Data
        const weeklyTrendData = [];
        const weekDaysKey = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];
        const tempDate = new Date();
        const dayOfWeek = tempDate.getDay(); // 0 is Sunday
        const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek;

        for (let i = 0; i < 6; i++) {
            const thisWeekDate = new Date();
            thisWeekDate.setDate(tempDate.getDate() + diffToMonday + i);
            const lastWeekDate = new Date(thisWeekDate);
            lastWeekDate.setDate(lastWeekDate.getDate() - 7);

            const tDateStr = thisWeekDate.toISOString().split('T')[0];
            const lDateStr = lastWeekDate.toISOString().split('T')[0];

            const tCount = await Attendance.countDocuments({ date: tDateStr, role: 'student', $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });
            const lCount = await Attendance.countDocuments({ date: lDateStr, role: 'student', $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: "" } }] });

            weeklyTrendData.push({
                day: weekDaysKey[i],
                thisWeek: totalStudents > 0 ? parseFloat(Math.min(100, (tCount / totalStudents) * 100).toFixed(1)) : 0,
                lastWeek: totalStudents > 0 ? parseFloat(Math.min(100, (lCount / totalStudents) * 100).toFixed(1)) : 0
            });
        }

        // 6. Top Students (Best attendance)
        const topStudentsRaw = await Attendance.aggregate([
            { $match: { date: { $gte: startOfMonthStr, $lte: endOfMonthStr }, role: 'student' } },
            {
                $group: {
                    _id: '$hikvisionEmployeeId',
                    count: {
                        $sum: {
                            $cond: [
                                { $or: [{ $eq: ['$status', 'present'] }, { $gt: [{ $strLenCP: { $ifNull: ['$firstCheckIn', ""] } }, 0] }] },
                                1, 0
                            ]
                        }
                    },
                    name: { $first: '$name' },
                    dept: { $first: '$department' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const topStudents = topStudentsRaw.map(s => ({
            name: s.name || "Noma'lum",
            class: s.dept || "N/A",
            attendance: parseFloat(((s.count / dayOfMonth) * 100).toFixed(1)),
            days: s.count
        }));

        // Response
        res.json({
            success: true,
            stats: {
                avgAttendance: parseFloat(avgAttendance.toFixed(1)),
                bestClass: bestClass.class,
                bestClassRate: bestClass.attendance,
                totalStudents,
                latePercentage: parseFloat(latePercentage.toFixed(1))
            },
            charts: {
                monthlyTrend,
                attendanceDistribution,
                weeklyTrendData,
                classPerformance: sortedClasses.slice(0, 6)
            },
            topStudents
        });

    } catch (error) {
        console.error('❌ FATAL API Error (getReportStats):', error);
        res.status(500).json({ success: false, error: 'Ma\'lumotlarni hisoblashda xatolik', message: error.message });
    }
};

export const saveExcelReport = (req, res) => {
    try {
        const { reportDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ success: false, error: 'Fayl topilmadi' });
        }

        const filePath = `C:\\hisobot\\${file.filename}`;
        console.log(`📊 Excel hisobot saqlandi: ${filePath}`);

        res.json({
            success: true,
            message: 'Hisobot muvaffaqiyatli saqlandi',
            reportDate,
            filename: file.filename
        });
    } catch (error) {
        console.error('❌ saveExcelReport error:', error);
        res.status(500).json({ success: false, error: 'Hisobotni saqlashda xato yuz berdi' });
    }
};
