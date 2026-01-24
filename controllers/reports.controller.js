import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import Class from '../models/Class.js';

/**
 * Reports Controller
 * Excel hisobotlarni saqlash va boshqarish
 */

export const getReportStats = async (req, res) => {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const today = now.toISOString().split('T')[0];

        const startOfMonthDate = new Date(year, month, 1);
        const endOfMonthDate = new Date(year, month + 1, 0);
        const startOfMonth = startOfMonthDate.toISOString().split('T')[0];
        const endOfMonth = endOfMonthDate.toISOString().split('T')[0];

        // 1. Statistics Cards Data
        const totalStudents = await Student.countDocuments({ status: 'active' });

        // Monthly average attendance
        const monthlyRecords = await Attendance.find({
            date: { $gte: startOfMonth, $lte: endOfMonth }
        });

        // Simplified avg calculation
        const daysPassed = now.getDate();
        const possibleAttendanceCount = totalStudents * daysPassed;
        const actualPresentCount = monthlyRecords.filter(r => r.status === 'present' || r.firstCheckIn).length;
        const avgAttendance = possibleAttendanceCount > 0 ? (actualPresentCount / possibleAttendanceCount) * 100 : 0;

        // Late arrival percentage for the month
        const lateRecordsCount = monthlyRecords.filter(r => {
            if (!r.firstCheckIn) return false;
            const [h, m] = r.firstCheckIn.split(':').map(Number);
            return (h * 60 + m) > (8 * 60 + 30); // 08:30 threshold
        }).length;
        const latePercentage = actualPresentCount > 0 ? (lateRecordsCount / actualPresentCount) * 100 : 0;

        // 2. Attendance Distribution (Today)
        const todayRecords = await Attendance.find({ date: today });
        const presentToday = todayRecords.filter(r => r.status === 'present' || r.firstCheckIn).length;
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

        // 3. Monthly Attendance Trend (Last 10 months)
        const monthlyTrend = [];
        const monthNames = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

        for (let i = 9; i >= 0; i--) {
            const mDate = new Date(year, month - i, 1);
            const mEnd = new Date(year, month - i + 1, 0);
            const mLabel = monthNames[mDate.getMonth()];

            const monthStartStr = mDate.toISOString().split('T')[0];
            const monthEndStr = mEnd.toISOString().split('T')[0];

            const monthRecordsCount = await Attendance.countDocuments({
                date: { $gte: monthStartStr, $lte: monthEndStr },
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: null } }]
            });

            const estAvg = totalStudents > 0 ? Math.min(100, (monthRecordsCount / (totalStudents * 22)) * 100) : 0;
            monthlyTrend.push({ month: mLabel, attendance: parseFloat(estAvg.toFixed(1)) });
        }

        // 4. Class Performance
        const classes = await Class.find();
        const classPerformance = [];
        for (const cls of classes) {
            const studentsInClass = await Student.find({ className: cls.name, status: 'active' });
            if (studentsInClass.length === 0) continue;

            const classStudentIds = studentsInClass.map(s => s.hikvisionEmployeeId);
            const classRecordsCount = await Attendance.countDocuments({
                date: { $gte: startOfMonth, $lte: endOfMonth },
                hikvisionEmployeeId: { $in: classStudentIds },
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: null } }]
            });

            const classAvg = (classRecordsCount / (studentsInClass.length * daysPassed)) * 100;
            classPerformance.push({
                class: cls.name,
                attendance: parseFloat(Math.min(100, classAvg).toFixed(1))
            });
        }

        const sortedPerformance = [...classPerformance].sort((a, b) => b.attendance - a.attendance);
        const bestClass = sortedPerformance.length > 0 ? sortedPerformance[0] : { class: 'N/A', attendance: 0 };

        // 5. Weekly Comparison
        const weeklyTrendData = [];
        const weekDays = ['Du', 'Se', 'Ch', 'Pa', 'Ju', 'Sh'];

        // Get start of this week (Monday)
        const curr = new Date();
        const first = curr.getDate() - curr.getDay() + (curr.getDay() === 0 ? -6 : 1);

        for (let i = 0; i < 6; i++) {
            const thisWeekDayDate = new Date(year, month, first + i);
            const lastWeekDayDate = new Date(thisWeekDayDate);
            lastWeekDayDate.setDate(lastWeekDayDate.getDate() - 7);

            const thisWeekDayStr = thisWeekDayDate.toISOString().split('T')[0];
            const lastWeekDayStr = lastWeekDayDate.toISOString().split('T')[0];

            const thisWeekCount = await Attendance.countDocuments({
                date: thisWeekDayStr,
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: null } }]
            });
            const lastWeekCount = await Attendance.countDocuments({
                date: lastWeekDayStr,
                role: 'student',
                $or: [{ status: 'present' }, { firstCheckIn: { $exists: true, $ne: null } }]
            });

            weeklyTrendData.push({
                day: weekDays[i],
                thisWeek: totalStudents > 0 ? parseFloat(Math.min(100, (thisWeekCount / totalStudents) * 100).toFixed(1)) : 0,
                lastWeek: totalStudents > 0 ? parseFloat(Math.min(100, (lastWeekCount / totalStudents) * 100).toFixed(1)) : 0
            });
        }

        // 6. Top Students
        const topStudentsRaw = await Attendance.aggregate([
            { $match: { date: { $gte: startOfMonth, $lte: endOfMonth }, role: 'student' } },
            {
                $group: {
                    _id: '$hikvisionEmployeeId',
                    count: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ['$status', 'present'] },
                                        {
                                            $and: [
                                                { $ne: [{ $ifNull: ['$firstCheckIn', null] }, null] },
                                                { $gt: [{ $strLenCP: { $ifNull: ['$firstCheckIn', ""] } }, 0] }
                                            ]
                                        }
                                    ]
                                },
                                1, 0
                            ]
                        }
                    },
                    name: { $first: '$name' },
                    class: { $first: '$department' }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 5 }
        ]);

        const topStudents = topStudentsRaw.map(s => ({
            name: s.name,
            class: s.class || 'N/A',
            attendance: parseFloat(((s.count / daysPassed) * 100).toFixed(1)),
            days: s.count
        }));

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
                classPerformance: sortedPerformance.slice(0, 6)
            },
            topStudents
        });

    } catch (error) {
        console.error('❌ Error in getReportStats:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

export const saveExcelReport = (req, res) => {
    try {
        const { reportDate } = req.body;
        const file = req.file;

        if (!file) {
            return res.status(400).json({
                success: false,
                error: 'Fayl topilmadi'
            });
        }

        const filePath = `C:\\hisobot\\${file.filename}`;

        console.log(`📊 Excel hisobot saqlandi: ${filePath}`);
        console.log(`📅 Hisobot sanasi: ${reportDate}`);

        res.json({
            success: true,
            message: 'Hisobot muvaffaqiyatli saqlandi',
            filePath: filePath,
            reportDate: reportDate,
            filename: file.filename,
            size: file.size
        });
    } catch (error) {
        console.error('❌ Hisobot saqlashda xato:', error);
        res.status(500).json({
            success: false,
            error: 'Hisobot saqlashda xato yuz berdi',
            message: error.message
        });
    }
};
