import express from "express";
import Student from "./models/Student.js";
import Class from "./models/Class.js";
import Employee from "./models/Employee.js";
import Attendance from "./models/Attendance.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";

const router = express.Router();

// Helper function to create class if not exists
const ensureClassExists = async (className) => {
  if (!className || className === "Sinf ko'rsatilmagan") return null;
  
  let classDoc = await Class.findOne({ name: className });
  if (!classDoc) {
    let grade = 1;
    let section = className;

    const cleanClassName = className.trim();

    // Pattern: "9 blue", "9-blue", "9blue"
    if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
      const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
      if (matches) {
        grade = parseInt(matches[1]);
        section = matches[2];
      }
    } 
    // Pattern: faqat raqam "9"
    else if (/^\d+$/i.test(cleanClassName)) {
      grade = parseInt(cleanClassName);
      section = "A";
    } 
    // Pattern: "1-tibbiyot guruhi", "2-tibbiyot guruhi" - maxsus guruhlar
    else if (cleanClassName.toLowerCase().includes("guruhi") || cleanClassName.toLowerCase().includes("guruh")) {
      const numberMatch = cleanClassName.match(/\d+/);
      grade = numberMatch ? parseInt(numberMatch[0]) : 1;
      section = cleanClassName;
    }
    // Boshqa formatlar
    else {
      const numberMatch = cleanClassName.match(/\d+/);
      grade = numberMatch ? parseInt(numberMatch[0]) : 1;
      section = cleanClassName;
    }

    // Grade chegaralari
    if (grade < 1) grade = 1;
    if (grade > 12) grade = 12;

    classDoc = new Class({
      name: className,
      grade: grade,
      section: typeof section === 'string' ? section.charAt(0).toUpperCase() + section.slice(1).toLowerCase() : section,
    });
    await classDoc.save();
    console.log(`📚 [AUTO] Created class: ${className} (grade: ${grade}, section: ${section})`);
  }
  return classDoc;
};

// Helper function to sync classes from all students
const syncClassesFromStudents = async () => {
  try {
    console.log("🔄 [SYNC] Synchronizing classes from students...");
    
    // Student collection'dan barcha unique className larni olish
    const studentClassNames = await Student.distinct("className", { 
      status: { $ne: "deleted" },
      className: { $ne: null, $ne: "", $ne: "Sinf ko'rsatilmagan" }
    });
    
    // Employee collection'dan student role bilan class larni olish
    const employeeClassNames = await Employee.distinct("class", { 
      role: "student",
      status: { $ne: "deleted" },
      class: { $ne: null, $ne: "", $ne: "Sinf ko'rsatilmagan" }
    });
    
    // Barcha unique class nomlarini birlashtirish
    const allClassNames = [...new Set([...studentClassNames, ...employeeClassNames])];
    
    console.log(`📋 [SYNC] Found ${allClassNames.length} unique class names:`, allClassNames);
    
    // Har bir class uchun mavjudligini tekshirish va yaratish
    for (const className of allClassNames) {
      if (className && className !== "Sinf ko'rsatilmagan") {
        await ensureClassExists(className);
      }
    }
    
    console.log("✅ [SYNC] Classes synchronized successfully");
  } catch (error) {
    console.error("❌ [SYNC] Error syncing classes:", error);
  }
};

// Helper function to sync class counts with actual student data
const syncClassCounts = async () => {
  try {
    console.log("🔄 [SYNC] Synchronizing class counts...");
    
    // Avval o'quvchilardan sinflarni sinxronlash
    await syncClassesFromStudents();
    
    const allClasses = await Class.find({});

    for (const classDoc of allClasses) {
      const studentCount = await Employee.countDocuments({
        role: "student",
        $or: [
          { class: classDoc.name },
          { department: classDoc.name },
          { department: `${classDoc.name} o'quvchi` },
        ],
        status: { $ne: "deleted" },
      });

      if (classDoc.studentCount !== studentCount) {
        classDoc.studentCount = studentCount;
        await classDoc.save();
        console.log(
          `📊 [SYNC] Updated class ${classDoc.name}: ${studentCount} students`
        );
      }

      // Delete empty classes that were not created today
      if (studentCount === 0) {
        const createdToday =
          classDoc.createdAt &&
          new Date(classDoc.createdAt).toDateString() ===
          new Date().toDateString();

        if (!createdToday) {
          await Class.findByIdAndDelete(classDoc._id);
          console.log(`🗑️ [SYNC] Deleted empty class: ${classDoc.name}`);

          if (global.io) {
            global.io.emit("class:deleted", {
              id: classDoc._id,
              name: classDoc.name,
            });
          }
        }
      }
    }
  } catch (error) {
    console.error("❌ [SYNC] Error syncing class counts:", error);
  }
};

// ==================== SINFLAR (CLASSES) ====================

// Barcha sinflarni olish
router.get("/classes", async (req, res) => {
  try {
    const { academicYear, grade } = req.query;

    // Sync class counts before returning data
    await syncClassCounts();

    const filter = { status: "active" };
    if (academicYear) filter.academicYear = academicYear;
    if (grade) filter.grade = parseInt(grade);

    const classes = await Class.find(filter).sort({ grade: 1, section: 1 });

    // Har bir sinf uchun o'quvchilar sonini hisoblash (Student va Employee collection'lardan)
    const classesWithCount = await Promise.all(
      classes.map(async (cls) => {
        // Student collection'dan
        const studentCollectionCount = await Student.countDocuments({
          className: cls.name,
          status: { $ne: "deleted" },
        });
        
        // Employee collection'dan (role: student)
        const employeeStudentCount = await Employee.countDocuments({
          role: "student",
          $or: [
            { class: cls.name },
            { department: cls.name },
            { department: `${cls.name} o'quvchi` },
            { department: `O'quvchi - ${cls.name}` },
          ],
          status: { $ne: "deleted" },
        });
        
        // Ikkalasining maksimumini olish (chunki ba'zi o'quvchilar ikkala joyda bo'lishi mumkin)
        const studentCount = Math.max(studentCollectionCount, employeeStudentCount);
        
        console.log(`📊 [CLASSES] ${cls.name}: Student=${studentCollectionCount}, Employee=${employeeStudentCount}, Total=${studentCount}`);
        
        return {
          ...cls.toObject(),
          studentCount,
        };
      })
    );

    console.log(`📚 [CLASSES] Found ${classesWithCount.length} classes`);
    res.json(classesWithCount);
  } catch (error) {
    console.error("❌ Error fetching classes:", error);
    res.status(500).json({ error: "Failed to fetch classes" });
  }
});

// Yangi sinf qo'shish (faqat admin va teacher)
router.post("/classes", authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const {
      name,
      grade,
      section,
      classTeacherId,
      classTeacherName,
      maxStudents,
      roomNumber,
    } = req.body;

    if (!name || !grade || !section) {
      return res
        .status(400)
        .json({ error: "Sinf nomi, daraja va bo'lim talab qilinadi" });
    }

    // Tekshirish - bu sinf mavjudmi
    const existingClass = await Class.findOne({ name });
    if (existingClass) {
      return res
        .status(400)
        .json({ error: "Bu nomdagi sinf allaqachon mavjud" });
    }

    const newClass = new Class({
      name,
      grade,
      section,
      classTeacherId,
      classTeacherName,
      maxStudents: maxStudents || 30,
      roomNumber,
    });

    await newClass.save();
    console.log(`✅ [CLASSES] New class created: ${name}`);

    res.status(201).json(newClass);
  } catch (error) {
    console.error("❌ Error creating class:", error);
    res.status(500).json({ error: "Failed to create class" });
  }
});

// Sinfni yangilash (faqat admin va teacher)
router.put("/classes/:id", authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const {
      name,
      grade,
      section,
      classTeacherId,
      classTeacherName,
      maxStudents,
      roomNumber,
      status,
    } = req.body;

    const updatedClass = await Class.findByIdAndUpdate(
      req.params.id,
      {
        name,
        grade,
        section,
        classTeacherId,
        classTeacherName,
        maxStudents,
        roomNumber,
        status,
      },
      { new: true, runValidators: true }
    );

    if (!updatedClass) {
      return res.status(404).json({ error: "Sinf topilmadi" });
    }

    console.log(`✅ [CLASSES] Class updated: ${updatedClass.name}`);
    res.json(updatedClass);
  } catch (error) {
    console.error("❌ Error updating class:", error);
    res.status(500).json({ error: "Failed to update class" });
  }
});

// Sinfni o'chirish (faqat admin)
router.delete("/classes/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const cls = await Class.findById(req.params.id);
    if (!cls) {
      return res.status(404).json({ error: "Sinf topilmadi" });
    }

    // Bu sinfdagi o'quvchilar sonini tekshirish
    const studentCount = await Student.countDocuments({ className: cls.name });
    if (studentCount > 0) {
      return res.status(400).json({
        error: `Bu sinfda ${studentCount} ta o'quvchi bor. Avval o'quvchilarni boshqa sinfga ko'chiring.`,
      });
    }

    await Class.findByIdAndDelete(req.params.id);
    console.log(`🗑️ [CLASSES] Class deleted: ${cls.name}`);

    res.json({ success: true, message: "Sinf o'chirildi" });
  } catch (error) {
    console.error("❌ Error deleting class:", error);
    res.status(500).json({ error: "Failed to delete class" });
  }
});

// ==================== O'QUVCHILAR (STUDENTS) ====================

// Barcha o'quvchilarni olish (sinf bo'yicha filter) - UNIFIED endpoint
router.get("/students", async (req, res) => {
  try {
    console.log(`📖 [STUDENTS] GET /students - Loading all students (unified)`);
    console.log("📊 Query params:", req.query);

    const { className, status, search, grade } = req.query;

    // Method 1: Get from Student collection first (primary)
    const studentFilter = {};
    if (className) studentFilter.className = className;
    if (status) studentFilter.status = status;
    else studentFilter.status = "active";

    if (search) {
      studentFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (grade) {
      studentFilter.className = { $regex: `^${grade}-`, $options: "i" };
    }

    console.log("🔍 [STUDENTS] MongoDB Student filter:", studentFilter);

    const studentsFromStudentCollection = await Student.find(studentFilter).sort({ className: 1, name: 1 });
    console.log(`📚 [STUDENTS] Found ${studentsFromStudentCollection.length} students from Student collection`);

    // Method 2: Get from Employee collection (for compatibility)
    const employeeFilter = { role: "student" };
    if (className) employeeFilter.class = className;
    if (status) employeeFilter.status = status;
    else employeeFilter.status = "active";

    if (search) {
      employeeFilter.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
      ];
    }

    if (grade) {
      employeeFilter.class = { $regex: `^${grade}-`, $options: "i" };
    }

    console.log("🔍 [STUDENTS] MongoDB Employee filter:", employeeFilter);

    const studentsFromEmployeeCollection = await Employee.find(employeeFilter).sort({ name: 1 });
    console.log(`📚 [STUDENTS] Found ${studentsFromEmployeeCollection.length} students from Employee collection`);

    // Method 3: Merge and deduplicate
    const allStudents = [];
    const seenIds = new Set();

    // Add from Student collection first (primary source)
    studentsFromStudentCollection.forEach(student => {
      const uniqueKey = student.hikvisionEmployeeId || student.name;
      if (!seenIds.has(uniqueKey)) {
        allStudents.push({
          _id: student._id,
          name: student.name,
          className: student.className,
          age: student.age,
          gender: student.gender,
          phone: student.phone || "",
          email: student.email || "",
          address: student.address || "",
          parentName: student.parentName || "",
          parentPhone: student.parentPhone || "",
          hikvisionEmployeeId: student.hikvisionEmployeeId || "",
          studentId: student.studentId,
          status: student.status,
          source: "Student"
        });
        seenIds.add(uniqueKey);
      }
    });

    // Add from Employee collection if not already present
    studentsFromEmployeeCollection.forEach(employee => {
      const uniqueKey = employee.hikvisionEmployeeId || employee.name;
      if (!seenIds.has(uniqueKey)) {
        allStudents.push({
          _id: employee._id,
          name: employee.name,
          className: employee.class || employee.department,
          age: employee.age,
          gender: employee.gender,
          phone: employee.phone || "",
          email: employee.email || "",
          address: employee.address || "",
          parentName: employee.parentName || "",
          parentPhone: employee.parentPhone || "",
          hikvisionEmployeeId: employee.hikvisionEmployeeId || "",
          studentId: employee.studentId || employee.employeeId,
          status: employee.status,
          source: "Employee"
        });
        seenIds.add(uniqueKey);
      }
    });

    console.log(`🔗 [STUDENTS] Merged result: ${allStudents.length} unique students`);

    // Method 4: Get attendance data for today for each student
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
    console.log(`📅 [STUDENTS] Getting attendance for date: ${today}`);

    // Get all attendance for today
    const todayAttendance = await Attendance.find({ date: today });
    const attendanceMap = new Map();

    todayAttendance.forEach(att => {
      // Use hikvisionEmployeeId as primary key for matching
      if (att.hikvisionEmployeeId) {
        attendanceMap.set(att.hikvisionEmployeeId, {
          keldi: att.firstCheckIn || '',
          ketdi: att.lastCheckOut || '',
          status: att.status || 'absent'
        });
      }
      // Also try name-based matching as fallback
      if (att.name) {
        const nameKey = `name_${att.name.toLowerCase().trim()}`;
        attendanceMap.set(nameKey, {
          keldi: att.firstCheckIn || '',
          ketdi: att.lastCheckOut || '',
          status: att.status || 'absent'
        });
      }
    });

    // Add attendance data to each student
    allStudents.forEach(student => {
      let attendanceData = null;

      // Primary: Match by hikvisionEmployeeId
      if (student.hikvisionEmployeeId) {
        attendanceData = attendanceMap.get(student.hikvisionEmployeeId);
      }

      // Fallback: Match by name  
      if (!attendanceData && student.name) {
        const nameKey = `name_${student.name.toLowerCase().trim()}`;
        attendanceData = attendanceMap.get(nameKey);
      }

      if (attendanceData) {
        student.keldi = attendanceData.keldi;
        student.ketdi = attendanceData.ketdi;
        student.attendanceStatus = attendanceData.status;
      } else {
        student.keldi = '';
        student.ketdi = '';
        student.attendanceStatus = 'absent';
      }
    });

    console.log(`🕐 [STUDENTS] Added attendance data for ${allStudents.filter(s => s.keldi || s.ketdi).length} students`);

    if (allStudents.length > 0) {
      console.log(
        "📄 [STUDENTS] First 3 students with attendance:",
        allStudents.slice(0, 3).map((s) => ({
          id: s._id,
          name: s.name,
          className: s.className,
          keldi: s.keldi,
          ketdi: s.ketdi,
          attendanceStatus: s.attendanceStatus,
          source: s.source
        }))
      );
    }

    res.json(allStudents);
  } catch (error) {
    console.error("❌ Error fetching students:", error);
    res.status(500).json({ error: "Failed to fetch students" });
  }
});

// Sinf bo'yicha o'quvchilar (grouped)
router.get("/students/by-class", async (req, res) => {
  try {
    const { academicYear } = req.query;

    // Barcha sinflarni olish
    const classes = await Class.find({ status: "active" }).sort({
      grade: 1,
      section: 1,
    });

    // Har bir sinf uchun o'quvchilarni olish
    const result = await Promise.all(
      classes.map(async (cls) => {
        const students = await Student.find({
          className: cls.name,
          status: "active",
        }).sort({ name: 1 });

        return {
          classInfo: {
            _id: cls._id,
            name: cls.name,
            grade: cls.grade,
            section: cls.section,
            classTeacherName: cls.classTeacherName,
            roomNumber: cls.roomNumber,
            maxStudents: cls.maxStudents,
          },
          studentCount: students.length,
          students: students,
        };
      })
    );

    // Umumiy statistika
    const totalStudents = result.reduce(
      (sum, cls) => sum + cls.studentCount,
      0
    );
    const totalClasses = result.length;

    console.log(
      `📊 [STUDENTS] By class: ${totalClasses} classes, ${totalStudents} students`
    );

    res.json({
      statistics: {
        totalClasses,
        totalStudents,
      },
      classes: result,
    });
  } catch (error) {
    console.error("❌ Error fetching students by class:", error);
    res.status(500).json({ error: "Failed to fetch students by class" });
  }
});

// Sinf statistikasi (summary)
router.get("/students/class-summary", async (req, res) => {
  try {
    // Aggregation pipeline - sinf bo'yicha guruhlash
    const summary = await Student.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$className",
          count: { $sum: 1 },
          students: { $push: { name: "$name", _id: "$_id" } },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Sinflar ma'lumotlari bilan birlashtirish
    const result = await Promise.all(
      summary.map(async (item) => {
        const classInfo = await Class.findOne({ name: item._id });
        return {
          className: item._id,
          studentCount: item.count,
          grade: classInfo?.grade,
          section: classInfo?.section,
          classTeacher: classInfo?.classTeacherName,
          maxStudents: classInfo?.maxStudents || 30,
          isFull: item.count >= (classInfo?.maxStudents || 30),
        };
      })
    );

    // Grade bo'yicha guruhlash
    const byGrade = {};
    result.forEach((cls) => {
      const grade = cls.grade || "Noma'lum";
      if (!byGrade[grade]) {
        byGrade[grade] = {
          classes: [],
          totalStudents: 0,
        };
      }
      byGrade[grade].classes.push(cls);
      byGrade[grade].totalStudents += cls.studentCount;
    });

    console.log(`📊 [STUDENTS] Class summary: ${result.length} classes`);

    res.json({
      totalStudents: summary.reduce((sum, item) => sum + item.count, 0),
      totalClasses: result.length,
      classSummary: result,
      byGrade,
    });
  } catch (error) {
    console.error("❌ Error fetching class summary:", error);
    res.status(500).json({ error: "Failed to fetch class summary" });
  }
});

// Yangi o'quvchi qo'shish (faqat admin va teacher)
router.post("/students", authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const {
      name,
      className,
      age,
      birthDate,
      gender,
      phone,
      email,
      address,
      parentName,
      parentPhone,
      parentEmail,
      hikvisionEmployeeId,
    } = req.body;

    if (!name || !className) {
      return res.status(400).json({ error: "Ism va sinf talab qilinadi" });
    }

    // Sinf mavjudligini tekshirish
    let classDoc = await Class.findOne({ name: className });
    if (!classDoc) {
      // Sinf yo'q bo'lsa avtomatik yaratish
      // Parse className to extract grade and section
      // Handle formats: "9-A", "9A", "9 A", "2 blue", "2blue", "2-blue"
      let grade = 1;
      let section = "A";

      const cleanClassName = className.trim();

      // Try different patterns
      if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
        const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
        if (matches) {
          grade = parseInt(matches[1]);
          section = matches[2];
        }
      } else if (/^\d+$/i.test(cleanClassName)) {
        grade = parseInt(cleanClassName);
        section = "A";
      } else {
        const numberMatch = cleanClassName.match(/\d+/);
        const letterMatch = cleanClassName.match(/[a-zA-Z]+/i);

        grade = numberMatch ? parseInt(numberMatch[0]) : 1;
        section = letterMatch ? letterMatch[0] : "A";
      }

      // Ensure valid values
      if (grade < 1 || grade > 12) grade = 1;
      if (!section || section.trim() === "") section = "A";

      classDoc = new Class({
        name: className,
        grade: grade,
        section: section.charAt(0).toUpperCase() + section.slice(1).toLowerCase(),
      });
      await classDoc.save();
      console.log(`📚 [STUDENTS] Auto-created class: ${className} (grade: ${grade}, section: ${section})`);
    }

    // Student ID generatsiya
    const studentCount = await Student.countDocuments();
    const studentId = `STU${String(studentCount + 1).padStart(5, "0")}`;

    const newStudent = new Student({
      name,
      studentId,
      className,
      age,
      birthDate,
      gender,
      phone,
      email,
      address,
      parentName,
      parentPhone,
      parentEmail,
      hikvisionEmployeeId,
    });

    await newStudent.save();

    // Sinfdagi o'quvchilar sonini yangilash
    const count = await Student.countDocuments({ className, status: "active" });
    await Class.findByIdAndUpdate(classDoc._id, { studentCount: count });

    console.log(`✅ [STUDENTS] New student added: ${name} to ${className}`);

    // Socket.IO broadcast
    if (global.io) {
      global.io.emit("student:added", newStudent);
    }

    res.status(201).json(newStudent);
  } catch (error) {
    console.error("❌ Error adding student:", error);
    res.status(500).json({ error: "Failed to add student" });
  }
});

// O'quvchini yangilash (faqat admin va teacher)
router.put("/students/:id", async (req, res) => {
  try {
    console.log(
      `📝 [STUDENTS] PUT /students/${req.params.id} - UPDATING STUDENT`
    );
    console.log("📊 Request body:", req.body);

    const {
      name,
      className: classNameFromBody,
      class: classFromBody,
      age,
      birthDate,
      gender,
      phone,
      email,
      address,
      parentName,
      parentPhone,
      parentEmail,
      hikvisionEmployeeId,
      status,
    } = req.body;

    // className ёки class иккаласини қабул қилиш
    const className = classNameFromBody || classFromBody;

    const oldStudent = await Student.findById(req.params.id);
    if (!oldStudent) {
      console.log(`❌ [STUDENTS] Student not found: ${req.params.id}`);
      return res.status(404).json({ error: "O'quvchi topilmadi" });
    }

    console.log(`📚 [STUDENTS] Old student:`, {
      id: oldStudent._id,
      name: oldStudent.name,
      className: oldStudent.className,
    });

    const oldClassName = oldStudent.className;

    // Yangi sinf bo'lsa, uni yaratish
    if (className && className !== oldClassName) {
      let classDoc = await Class.findOne({ name: className });
      if (!classDoc) {
        // Parse className to extract grade and section
        let grade = 1;
        let section = className;

        const cleanClassName = className.trim();

        // Pattern: "9 blue", "9-blue", "9blue"
        if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
          const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
          if (matches) {
            grade = parseInt(matches[1]);
            section = matches[2];
          }
        } 
        // Pattern: faqat raqam "9"
        else if (/^\d+$/i.test(cleanClassName)) {
          grade = parseInt(cleanClassName);
          section = "A";
        } 
        // Pattern: "1-tibbiyot guruhi", "2-tibbiyot guruhi" - maxsus guruhlar
        else if (cleanClassName.toLowerCase().includes("guruhi") || cleanClassName.toLowerCase().includes("guruh")) {
          const numberMatch = cleanClassName.match(/\d+/);
          grade = numberMatch ? parseInt(numberMatch[0]) : 1;
          section = cleanClassName; // To'liq nomni section sifatida saqlash
        }
        // Boshqa formatlar
        else {
          const numberMatch = cleanClassName.match(/\d+/);
          const letterMatch = cleanClassName.match(/[a-zA-Z]+/i);

          grade = numberMatch ? parseInt(numberMatch[0]) : 1;
          section = letterMatch ? letterMatch[0] : cleanClassName;
        }

        // Ensure valid values
        if (grade < 1 || grade > 12) grade = 1;
        if (!section || section.trim() === "") section = "A";

        classDoc = new Class({
          name: className,
          grade: grade,
          section: typeof section === 'string' && section.length > 0 ? section.charAt(0).toUpperCase() + section.slice(1).toLowerCase() : section,
        });
        await classDoc.save();
        console.log(`📚 [STUDENTS] Auto-created class on update: ${className} (grade: ${grade}, section: ${section})`);
      }
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.params.id,
      {
        name,
        className,
        age,
        birthDate,
        gender,
        phone,
        email,
        address,
        parentName,
        parentPhone,
        parentEmail,
        hikvisionEmployeeId,
        status,
      },
      { new: true, runValidators: true }
    );

    console.log(`💾 [STUDENTS] Student SAVED to MongoDB:`, {
      id: updatedStudent._id,
      name: updatedStudent.name,
      className: updatedStudent.className,
      age: updatedStudent.age,
    });

    // Eski va yangi sinf sonlarini yangilash
    if (oldClassName) {
      const oldCount = await Student.countDocuments({
        className: oldClassName,
        status: "active",
      });
      await Class.findOneAndUpdate(
        { name: oldClassName },
        { studentCount: oldCount }
      );
    }
    if (className) {
      const newCount = await Student.countDocuments({
        className,
        status: "active",
      });
      await Class.findOneAndUpdate(
        { name: className },
        { studentCount: newCount }
      );
    }

    console.log(`✅ [STUDENTS] Student updated: ${updatedStudent.name}`);

    if (global.io) {
      global.io.emit("student:updated", updatedStudent);
      console.log(`📡 [STUDENTS] Socket.IO broadcast sent for student update`);
    }

    console.log(`📤 [STUDENTS] Sending response:`, {
      id: updatedStudent._id,
      name: updatedStudent.name,
      className: updatedStudent.className,
    });
    res.json(updatedStudent);
  } catch (error) {
    console.error("❌ Error updating student:", error);
    res.status(500).json({ error: "Failed to update student" });
  }
});

// O'quvchini o'chirish (faqat admin)
router.delete("/students/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: "O'quvchi topilmadi" });
    }

    const className = student.className;
    await Student.findByIdAndDelete(req.params.id);

    // Sinf sonini yangilash
    const count = await Student.countDocuments({ className, status: "active" });
    await Class.findOneAndUpdate({ name: className }, { studentCount: count });

    console.log(`🗑️ [STUDENTS] Student deleted: ${student.name}`);

    if (global.io) {
      global.io.emit("student:deleted", { id: req.params.id });
    }

    res.json({ success: true, message: "O'quvchi o'chirildi" });
  } catch (error) {
    console.error("❌ Error deleting student:", error);
    res.status(500).json({ error: "Failed to delete student" });
  }
});

// Bitta o'quvchi ma'lumotlarini olish
router.get("/students/:id", async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ error: "O'quvchi topilmadi" });
    }
    res.json(student);
  } catch (error) {
    console.error("❌ Error fetching student:", error);
    res.status(500).json({ error: "Failed to fetch student" });
  }
});

// O'quvchilarni bir sinfdan boshqasiga ko'chirish
router.post("/students/transfer", async (req, res) => {
  try {
    const { studentIds, fromClass, toClass } = req.body;

    if (!studentIds || !toClass) {
      return res
        .status(400)
        .json({ error: "O'quvchilar ID va yangi sinf talab qilinadi" });
    }

    // Yangi sinf mavjudligini tekshirish
    let targetClass = await Class.findOne({ name: toClass });
    if (!targetClass) {
      // Parse className to extract grade and section
      let grade = 1;
      let section = "A";

      const cleanClassName = toClass.trim();

      if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
        const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
        if (matches) {
          grade = parseInt(matches[1]);
          section = matches[2];
        }
      } else if (/^\d+$/i.test(cleanClassName)) {
        grade = parseInt(cleanClassName);
        section = "A";
      } else {
        const numberMatch = cleanClassName.match(/\d+/);
        const letterMatch = cleanClassName.match(/[a-zA-Z]+/i);

        grade = numberMatch ? parseInt(numberMatch[0]) : 1;
        section = letterMatch ? letterMatch[0] : "A";
      }

      // Ensure valid values
      if (grade < 1 || grade > 12) grade = 1;
      if (!section || section.trim() === "") section = "A";

      targetClass = new Class({
        name: toClass,
        grade: grade,
        section: section.charAt(0).toUpperCase() + section.slice(1).toLowerCase(),
      });
      await targetClass.save();
      console.log(`📚 [STUDENTS] Auto-created class on transfer: ${toClass} (grade: ${grade}, section: ${section})`);
    }

    // O'quvchilarni ko'chirish
    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { className: toClass }
    );

    // Sinf sonlarini yangilash
    if (fromClass) {
      const fromCount = await Student.countDocuments({
        className: fromClass,
        status: "active",
      });
      await Class.findOneAndUpdate(
        { name: fromClass },
        { studentCount: fromCount }
      );
    }
    const toCount = await Student.countDocuments({
      className: toClass,
      status: "active",
    });
    await Class.findOneAndUpdate({ name: toClass }, { studentCount: toCount });

    console.log(
      `🔄 [STUDENTS] Transferred ${result.modifiedCount} students to ${toClass}`
    );

    res.json({
      success: true,
      message: `${result.modifiedCount} ta o'quvchi ${toClass} ga ko'chirildi`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("❌ Error transferring students:", error);
    res.status(500).json({ error: "Failed to transfer students" });
  }
});

export default router;
