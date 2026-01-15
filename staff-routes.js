import express from "express";
import Teacher from "./models/Teacher.js";
import Guard from "./models/Guard.js";
import Cook from "./models/Cook.js";
import Employee from "./models/Employee.js";
import Student from "./models/Student.js";
import Class from "./models/Class.js";
import { authenticateToken, requireRole } from "./middleware/auth.js";

const router = express.Router();

// Helper function to clean up empty classes
const cleanupEmptyClasses = async () => {
  try {
    console.log("🧹 [CLEANUP] Checking for empty classes...");
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

      console.log(
        `📊 [CLEANUP] Class ${classDoc.name}: ${studentCount} students`
      );

      if (studentCount === 0) {
        await Class.findByIdAndDelete(classDoc._id);
        console.log(`🗑️ [CLEANUP] Deleted empty class: ${classDoc.name}`);

        // Notify via socket
        if (global.io) {
          global.io.emit("class:deleted", {
            id: classDoc._id,
            name: classDoc.name,
          });
        }
      } else if (classDoc.studentCount !== studentCount) {
        // Update count if it's incorrect
        classDoc.studentCount = studentCount;
        await classDoc.save();
        console.log(
          `📈 [CLEANUP] Updated class ${classDoc.name} count: ${studentCount}`
        );
      }
    }
  } catch (error) {
    console.error("❌ [CLEANUP] Error cleaning up classes:", error);
  }
};

// ==================== EMPLOYEES (Generic Staff) ====================

// Get all employees
router.get("/employees", async (req, res) => {
  try {
    const employees = await Employee.find().sort({ createdAt: -1 });
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Employees olib olishda xato" });
  }
});

// Get single employee
router.get("/employee/:id", async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee topilmadi" });
    }
    res.json(employee);
  } catch (error) {
    res.status(500).json({ error: "Employee olib olishda xato" });
  }
});

// Update employee (no auth required for role assignment)
router.put("/employee/:id", async (req, res) => {
  try {
    const {
      name,
      department,
      salary,
      role, // ✅ QO'SHILDI - ROL YANGILASH UCHUN
      staffType, // ✅ YANGI - Xodim lavozimi
      class: className, // ✅ Student sinfi
      phone,
      email,
      status,
      subject,
      shift,
      specialty,
      hikvisionEmployeeId,
    } = req.body;

    console.log(`🔄 [STAFF-ROUTES] Updating employee ${req.params.id}`, {
      role,
      staffType,
      className,
      name,
      department,
    });

    // Role o'zgarsa, department'ni ham avtomatik yangilash
    let newDepartment = department;
    if (role && !department) {
      switch (role) {
        case "teacher":
          newDepartment = subject || "O'qituvchi";
          break;
        case "student":
          newDepartment = "O'quvchi";
          break;
        case "staff":
          newDepartment = staffType
            ? {
              cleaner: "Tozolovchi",
              guard: "Qorovul",
              cook: "Oshpaz",
              director: "Direktor",
              vice_director: "Zavuch",
              hr: "HR/Kadrlar",
            }[staffType] || "Xodim"
            : "Xodim";
          break;
        case "admin":
          newDepartment = "Administrator";
          break;
        default:
          newDepartment = "Bosh";
      }
    }

    // Avval Employee collection'dan qidirish
    let employee = await Employee.findById(req.params.id);
    let isFromStudentCollection = false;
    let studentRecord = null;

    // Agar Employee'da topilmasa, Student collection'dan qidirish
    if (!employee) {
      console.log(`🔍 [STAFF-ROUTES] Not found in Employee, checking Student collection...`);
      studentRecord = await Student.findById(req.params.id);
      
      if (studentRecord) {
        isFromStudentCollection = true;
        console.log(`✅ [STAFF-ROUTES] Found in Student collection: ${studentRecord.name}`);
        
        // Student uchun Employee record mavjudmi tekshirish
        employee = await Employee.findOne({
          $or: [
            { hikvisionEmployeeId: studentRecord.hikvisionEmployeeId },
            { name: studentRecord.name }
          ]
        });
        
        if (!employee) {
          // Employee record yaratish
          console.log(`🆕 [STAFF-ROUTES] Creating Employee record from Student...`);
          employee = new Employee({
            name: studentRecord.name,
            role: role || 'student',
            department: newDepartment || 'O\'quvchi',
            class: studentRecord.className,
            phone: studentRecord.phone,
            email: studentRecord.email,
            hikvisionEmployeeId: studentRecord.hikvisionEmployeeId,
            status: 'active',
          });
          await employee.save();
        }
      }
    }

    if (!employee) {
      return res.status(404).json({ error: "Employee topilmadi" });
    }

    // Employee'ni yangilash
    const updatedEmployee = await Employee.findByIdAndUpdate(
      employee._id,
      {
        $set: {
          ...(name && { name }),
          ...(newDepartment && { department: newDepartment }),
          ...(salary !== undefined && { salary }),
          ...(role && { role }), // ✅ QO'SHILDI
          ...(staffType && { staffType }), // ✅ YANGI
          ...(className && { class: className }), // ✅ Student sinfi
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(status && { status }),
          ...(subject && { subject }),
          ...(shift && { shift }),
          ...(specialty && { specialty }),
        },
      },
      { new: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ error: "Employee topilmadi" });
    }

    // Employee reference ni yangilash
    employee = updatedEmployee;

    console.log(`✅ [STAFF-ROUTES] Updated:`, {
      name: employee.name,
      role: employee.role,
    });

    // 🔍 DEBUG: role o'zgaruvchisini tekshirish
    console.log(`🔍 [DEBUG] role variable:`, {
      value: role,
      type: typeof role,
      isUndefined: role === undefined,
      isStudent: role === "student",
      employeeRole: employee.role,
      employeeRoleType: typeof employee.role,
      employeeIsStudent: employee.role === "student",
    });

    // ✅ Agar rol "student" DAN boshqa rolga o'zgarsa, Student collection'dan o'chirish
    if (role && role !== "student") {
      console.log(`🗑️ [STAFF-ROUTES] Role changed to ${role}, removing from Student collection...`);
      try {
        const deletedStudent = await Student.findOneAndDelete({
          $or: [
            { hikvisionEmployeeId: employee.hikvisionEmployeeId },
            { name: employee.name },
          ],
        });
        if (deletedStudent) {
          console.log(`✅ [STAFF-ROUTES] Removed from Student collection: ${deletedStudent.name}`);
        }
      } catch (deleteError) {
        console.error(`❌ [STAFF-ROUTES] Error removing from Student:`, deleteError);
      }
    }

    // ✅ Agar rol "student" qilib belgilansa, Student collection'ga ham qo'shish
    if (role === "student") {
      console.log(
        `🔍 [STAFF-ROUTES] Role is student, checking for existing record...`
      );
      try {
        // Eski Student record bormi tekshirish
        const existingStudent = await Student.findOne({
          $or: [
            { hikvisionEmployeeId: employee.hikvisionEmployeeId },
            { name: employee.name },
          ],
        });

        console.log(
          `🔍 [STAFF-ROUTES] Existing student check:`,
          existingStudent ? `FOUND: ${existingStudent.name}` : "NOT FOUND"
        );

        if (!existingStudent) {
          console.log(
            `🎓 [STAFF-ROUTES] Creating Student record for: ${employee.name}`
          );

          // Employee'dan class nomini olish - TUZATILDI
          let studentClassName = className || employee.class || ""; // req.body'dan yoki employee.class'dan

          // Agar className hali ham bo'sh bo'lsa, department'dan olishga harakat qilish
          if (!studentClassName && employee.department) {
            const deptLower = employee.department.toLowerCase();
            if (deptLower.includes("o'quvchi")) {
              // "O'quvchi - 1 blue" -> "1 blue"
              studentClassName = employee.department
                .replace(/o'quvchi/gi, "")
                .replace(/^[\s\-]+/, "") // Boshidagi - va bo'shliqlarni olib tashlash
                .trim();
            }
          }

          // Agar hali ham bo'sh bo'lsa
          if (!studentClassName) {
            studentClassName = "Sinf ko'rsatilmagan";
          }

          console.log(
            `📋 [STAFF-ROUTES] Student class: "${studentClassName}" (from req.className: "${className}", employee.class: "${employee.class}", department: "${employee.department}")`
          );

          // Class mavjudligini tekshirish, yo'q bo'lsa yaratish
          let classDoc = null;
          if (studentClassName && studentClassName !== "Sinf ko'rsatilmagan") {
            classDoc = await Class.findOne({ name: studentClassName });
            if (!classDoc) {
              // Parse className to extract grade and section
              // Handle formats: "9-A", "9A", "9 A", "2 blue", "2blue", "2-blue"
              let grade = 1;
              let section = "A";

              const cleanClassName = studentClassName.trim();

              // Try different patterns
              if (/^\d+[-\s]*[a-zA-Z]+$/i.test(cleanClassName)) {
                // Pattern like "2blue", "2 blue", "2-blue", "9A", "9-A"
                const matches = cleanClassName.match(/^(\d+)[-\s]*([a-zA-Z]+)$/i);
                if (matches) {
                  grade = parseInt(matches[1]);
                  section = matches[2];
                }
              } else if (/^\d+$/i.test(cleanClassName)) {
                // Pattern like "2", "9" (just number)
                grade = parseInt(cleanClassName);
                section = "A";
              } else {
                // Fallback: try to extract any number and letter
                const numberMatch = cleanClassName.match(/\d+/);
                const letterMatch = cleanClassName.match(/[a-zA-Z]+/i);

                grade = numberMatch ? parseInt(numberMatch[0]) : 1;
                section = letterMatch ? letterMatch[0] : "A";
              }

              // Ensure valid values
              if (grade < 1 || grade > 12) grade = 1;
              if (!section || section.trim() === "") section = "A";

              console.log(`📚 [STAFF-ROUTES] Parsing "${studentClassName}" -> grade: ${grade}, section: "${section}"`);

              classDoc = await Class.create({
                name: studentClassName,
                grade: grade,
                section: section.charAt(0).toUpperCase() + section.slice(1).toLowerCase(),
                studentCount: 0,
                maxStudents: 30,
              });
              console.log(
                `📚 [STAFF-ROUTES] Created new class: ${studentClassName} (grade: ${grade}, section: ${section})`
              );

              // Broadcast class creation
              if (global.io) {
                global.io.emit("class:added", classDoc);
              }
            }
          }

          // Yangi Student yaratish
          const newStudent = await Student.create({
            name: employee.name,
            className: studentClassName,
            phone: employee.phone || "",
            email: employee.email || "",
            hikvisionEmployeeId: employee.hikvisionEmployeeId || "",
            status: "active",
          });

          // Class studentCount'ni yangilash
          if (classDoc) {
            classDoc.studentCount += 1;
            await classDoc.save();
          }

          console.log(
            `✅ [STAFF-ROUTES] Student created: ${newStudent.name} (ID: ${newStudent._id})`
          );

          // Socket.IO orqali yangi student haqida xabar
          if (global.io) {
            global.io.emit("student:added", newStudent);
          }
        } else {
          // Student mavjud, lekin className yangilanishi kerak bo'lsa
          console.log(
            `ℹ️ [STAFF-ROUTES] Student already exists: ${existingStudent.name}`
          );

          // className yangilanishi kerakmi tekshirish
          let needsUpdate = false;
          const updates = {};

          if (className && className !== existingStudent.className) {
            updates.className = className;
            needsUpdate = true;
            console.log(
              `📝 [STAFF-ROUTES] Updating className: "${existingStudent.className}" → "${className}"`
            );
          } else if (
            employee.class &&
            employee.class !== existingStudent.className
          ) {
            updates.className = employee.class;
            needsUpdate = true;
            console.log(
              `📝 [STAFF-ROUTES] Updating className from employee.class: "${existingStudent.className}" → "${employee.class}"`
            );
          } else if (
            employee.department &&
            employee.department.toLowerCase().includes("o'quvchi") &&
            existingStudent.className === "Sinf ko'rsatilmagan"
          ) {
            const extractedClass = employee.department
              .replace(/o'quvchi/gi, "")
              .replace(/^[\s\-]+/, "")
              .trim();
            if (extractedClass) {
              updates.className = extractedClass;
              needsUpdate = true;
              console.log(
                `📝 [STAFF-ROUTES] Updating className from department: "${existingStudent.className}" → "${extractedClass}"`
              );
            }
          }

          // Boshqa maydonlarni ham tekshirish
          if (employee.phone && employee.phone !== existingStudent.phone) {
            updates.phone = employee.phone;
            needsUpdate = true;
          }
          if (employee.email && employee.email !== existingStudent.email) {
            updates.email = employee.email;
            needsUpdate = true;
          }

          // Yangilash kerak bo'lsa
          if (needsUpdate) {
            await Student.findByIdAndUpdate(existingStudent._id, {
              $set: updates,
            });
            console.log(
              `✅ [STAFF-ROUTES] Student updated: ${existingStudent.name}`,
              updates
            );

            // Agar className yangilansa, Class yaratish yoki yangilash
            if (
              updates.className &&
              updates.className !== "Sinf ko'rsatilmagan"
            ) {
              let classDoc = await Class.findOne({ name: updates.className });
              if (!classDoc) {
                // Parse className to extract grade and section
                let grade = 1;
                let section = "A";

                const cleanClassName = updates.className.trim();

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

                console.log(`📚 [STAFF-ROUTES] Creating class for update "${updates.className}" -> grade: ${grade}, section: "${section}"`);

                classDoc = await Class.create({
                  name: updates.className,
                  grade: grade,
                  section: section.charAt(0).toUpperCase() + section.slice(1).toLowerCase(),
                  studentCount: 1,
                  maxStudents: 30,
                });
                console.log(
                  `📚 [STAFF-ROUTES] Created new class: ${updates.className} (grade: ${grade}, section: ${section})`
                );

                // Broadcast class creation
                if (global.io) {
                  global.io.emit("class:added", classDoc);
                }
              }

              // Agar eski className'dan ko'chsa, eski Class'dan ayirish
              if (
                existingStudent.className &&
                existingStudent.className !== "Sinf ko'rsatilmagan"
              ) {
                const oldClass = await Class.findOne({
                  name: existingStudent.className,
                });
                if (oldClass && oldClass.studentCount > 0) {
                  oldClass.studentCount -= 1;
                  await oldClass.save();
                  console.log(
                    `📉 [STAFF-ROUTES] Decreased count for class: ${existingStudent.className}`
                  );
                }
              }

              // Yangi Class'ga qo'shish (agar hali qo'shilmagan bo'lsa)
              if (classDoc) {
                const studentsInClass = await Student.countDocuments({
                  className: updates.className,
                  status: "active",
                });
                classDoc.studentCount = studentsInClass;
                await classDoc.save();
                console.log(
                  `📈 [STAFF-ROUTES] Updated count for class ${updates.className}: ${studentsInClass}`
                );
              }
            }

            // Socket.IO orqali yangilanganligini xabar qilish
            if (global.io) {
              global.io.emit("student:updated", {
                ...existingStudent.toObject(),
                ...updates,
              });
            }
          }
        }
      } catch (studentError) {
        console.error(
          "❌ [STAFF-ROUTES] Error creating Student:",
          studentError
        );
        // Bu xato butun operatsiyani to'xtatmaydi, faqat log qilinadi
      }
    }

    // Clean up empty classes after role changes
    await cleanupEmptyClasses();

    res.json(employee);
  } catch (error) {
    console.error("Update employee error:", error);
    res.status(500).json({ error: "Employee yangilashda xato" });
  }
});

// Delete employee
router.delete("/employee/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const employee = await Employee.findByIdAndDelete(req.params.id);
    if (!employee) {
      return res.status(404).json({ error: "Employee topilmadi" });
    }

    // Clean up empty classes after deletion
    await cleanupEmptyClasses();

    res.json({ message: "Employee o'chirildi", employee });
  } catch (error) {
    res.status(500).json({ error: "Employee o'chirishda xato" });
  }
});

// ==================== TEACHERS ====================

// Get all teachers (faqat role='teacher' bo'lganlar)
router.get("/teachers", async (req, res) => {
  try {
    const teachers = await Employee.find({
      role: "teacher",
      status: "active",
    }).sort({ name: 1 });

    console.log(`🏫 [TEACHERS] Found ${teachers.length} teachers`);

    res.json({ employees: teachers });
  } catch (error) {
    console.error("Error fetching teachers:", error);
    res.status(500).json({ error: "Teachers olib olishda xato" });
  }
});

// Get single teacher
router.get("/teacher/:id", async (req, res) => {
  try {
    const teacher = await Teacher.findById(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher topilmadi" });
    }
    res.json(teacher);
  } catch (error) {
    res.status(500).json({ error: "Teacher olib olishda xato" });
  }
});

// Create new teacher
router.post("/teacher", authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { name, subject, salary, phone, email, hikvisionEmployeeId } =
      req.body;

    if (!name || !subject) {
      return res.status(400).json({ error: "Ism va fan talab qilinadi" });
    }

    // Get next employeeId
    const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
    const nextEmployeeId = (lastEmployee?.employeeId || 0) + 1;

    const teacher = new Teacher({
      employeeId: nextEmployeeId,
      name,
      subject,
      salary: salary || 0,
      phone: phone || "",
      email: email || "",
      hikvisionEmployeeId: hikvisionEmployeeId || null,
      status: "active",
    });

    await teacher.save();
    res.status(201).json(teacher);
  } catch (error) {
    console.error("Create teacher error:", error);
    res.status(500).json({ error: "Teacher yaratishda xato" });
  }
});

// Update teacher
router.put("/teacher/:id", authenticateToken, requireRole('admin', 'teacher'), async (req, res) => {
  try {
    const { name, subject, salary, phone, email, status } = req.body;

    const teacher = await Teacher.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(name && { name }),
          ...(subject && { subject }),
          ...(salary !== undefined && { salary }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!teacher) {
      return res.status(404).json({ error: "Teacher topilmadi" });
    }

    res.json(teacher);
  } catch (error) {
    console.error("Update teacher error:", error);
    res.status(500).json({ error: "Teacher yangilashda xato" });
  }
});

// Delete teacher
router.delete("/teacher/:id", authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const teacher = await Teacher.findByIdAndDelete(req.params.id);
    if (!teacher) {
      return res.status(404).json({ error: "Teacher topilmadi" });
    }
    res.json({ message: "Teacher o'chirildi", teacher });
  } catch (error) {
    res.status(500).json({ error: "Teacher o'chirishda xato" });
  }
});

// ==================== GUARDS ====================

// Get all guards
router.get("/guards", async (req, res) => {
  try {
    const guards = await Guard.find().sort({ createdAt: -1 });
    res.json(guards);
  } catch (error) {
    console.error("Error fetching guards:", error);
    res.status(500).json({ error: "Guards olib olishda xato" });
  }
});

// Get single guard
router.get("/guard/:id", async (req, res) => {
  try {
    const guard = await Guard.findById(req.params.id);
    if (!guard) {
      return res.status(404).json({ error: "Guard topilmadi" });
    }
    res.json(guard);
  } catch (error) {
    res.status(500).json({ error: "Guard olib olishda xato" });
  }
});

// Create new guard
router.post("/guard", async (req, res) => {
  try {
    const { name, shift, salary, phone, email, hikvisionEmployeeId } = req.body;

    if (!name || !shift) {
      return res.status(400).json({ error: "Ism va smena talab qilinadi" });
    }

    if (!["kunuz", "oqshomi", "tungi"].includes(shift)) {
      return res.status(400).json({ error: "Noto'g'ri smena" });
    }

    // Get next employeeId
    const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
    const nextEmployeeId = (lastEmployee?.employeeId || 0) + 1;

    const guard = new Guard({
      employeeId: nextEmployeeId,
      name,
      shift,
      salary: salary || 0,
      phone: phone || "",
      email: email || "",
      hikvisionEmployeeId: hikvisionEmployeeId || null,
      status: "active",
    });

    await guard.save();
    res.status(201).json(guard);
  } catch (error) {
    console.error("Create guard error:", error);
    res.status(500).json({ error: "Guard yaratishda xato" });
  }
});

// Update guard
router.put("/guard/:id", async (req, res) => {
  try {
    const { name, shift, salary, phone, email, status } = req.body;

    if (shift && !["kunuz", "oqshomi", "tungi"].includes(shift)) {
      return res.status(400).json({ error: "Noto'g'ri smena" });
    }

    const guard = await Guard.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(name && { name }),
          ...(shift && { shift }),
          ...(salary !== undefined && { salary }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!guard) {
      return res.status(404).json({ error: "Guard topilmadi" });
    }

    res.json(guard);
  } catch (error) {
    console.error("Update guard error:", error);
    res.status(500).json({ error: "Guard yangilashda xato" });
  }
});

// Delete guard
router.delete("/guard/:id", async (req, res) => {
  try {
    const guard = await Guard.findByIdAndDelete(req.params.id);
    if (!guard) {
      return res.status(404).json({ error: "Guard topilmadi" });
    }
    res.json({ message: "Guard o'chirildi", guard });
  } catch (error) {
    res.status(500).json({ error: "Guard o'chirishda xato" });
  }
});

// ==================== COOKS ====================

// Get all cooks
router.get("/cooks", async (req, res) => {
  try {
    const cooks = await Cook.find().sort({ createdAt: -1 });
    res.json(cooks);
  } catch (error) {
    console.error("Error fetching cooks:", error);
    res.status(500).json({ error: "Cooks olib olishda xato" });
  }
});

// Get single cook
router.get("/cook/:id", async (req, res) => {
  try {
    const cook = await Cook.findById(req.params.id);
    if (!cook) {
      return res.status(404).json({ error: "Cook topilmadi" });
    }
    res.json(cook);
  } catch (error) {
    res.status(500).json({ error: "Cook olib olishda xato" });
  }
});

// Create new cook
router.post("/cook", async (req, res) => {
  try {
    const { name, specialty, salary, phone, email, hikvisionEmployeeId } =
      req.body;

    if (!name || !specialty) {
      return res
        .status(400)
        .json({ error: "Ism va mutaxassisligi talab qilinadi" });
    }

    // Get next employeeId
    const lastEmployee = await Employee.findOne().sort({ employeeId: -1 });
    const nextEmployeeId = (lastEmployee?.employeeId || 0) + 1;

    const cook = new Cook({
      employeeId: nextEmployeeId,
      name,
      specialty,
      salary: salary || 0,
      phone: phone || "",
      email: email || "",
      hikvisionEmployeeId: hikvisionEmployeeId || null,
      status: "active",
    });

    await cook.save();
    res.status(201).json(cook);
  } catch (error) {
    console.error("Create cook error:", error);
    res.status(500).json({ error: "Cook yaratishda xato" });
  }
});

// Update cook
router.put("/cook/:id", async (req, res) => {
  try {
    const { name, specialty, salary, phone, email, status } = req.body;

    const cook = await Cook.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...(name && { name }),
          ...(specialty && { specialty }),
          ...(salary !== undefined && { salary }),
          ...(phone !== undefined && { phone }),
          ...(email !== undefined && { email }),
          ...(status && { status }),
        },
      },
      { new: true }
    );

    if (!cook) {
      return res.status(404).json({ error: "Cook topilmadi" });
    }

    res.json(cook);
  } catch (error) {
    console.error("Update cook error:", error);
    res.status(500).json({ error: "Cook yangilashda xato" });
  }
});

// Delete cook
router.delete("/cook/:id", async (req, res) => {
  try {
    const cook = await Cook.findByIdAndDelete(req.params.id);
    if (!cook) {
      return res.status(404).json({ error: "Cook topilmadi" });
    }
    res.json({ message: "Cook o'chirildi", cook });
  } catch (error) {
    res.status(500).json({ error: "Cook o'chirishda xato" });
  }
});

// ==================== ALL STAFF (COMBINED) ====================

// Get all staff members (Teachers + Guards + Cooks + Employees)
// Get staff (faqat role='teacher' va role='staff' bo'lganlar)
router.get("/staff", async (req, res) => {
  try {
    // Fetch employees with teacher or staff role
    const staff = await Employee.find({
      role: { $in: ["teacher", "staff"] },
      status: "active",
    }).sort({ name: 1 });

    console.log(`👥 [STAFF] Found ${staff.length} staff members`);

    // Log role distribution
    const roleCounts = {};
    staff.forEach((emp) => {
      roleCounts[emp.role] = (roleCounts[emp.role] || 0) + 1;
    });
    console.log(`📈 [STAFF] Role distribution:`, roleCounts);

    res.json({ employees: staff });
  } catch (error) {
    console.error("Error fetching staff:", error);
    res.status(500).json({ error: "Xodimlarni olib olishda xato" });
  }
});

// Get all staff (backward compatibility)
router.get("/all-staff", async (req, res) => {
  try {
    // Fetch all employees from Employee collection
    const employees = await Employee.find();

    // Fetch all students from Student collection
    const studentsFromStudentCollection = await Student.find({ status: { $ne: 'deleted' } });

    console.log(`📊 [ALL-STAFF] Found ${employees.length} employees, ${studentsFromStudentCollection.length} students`);

    // Studentlar uchun Employee formatiga o'tkazish
    const studentsAsEmployees = studentsFromStudentCollection.map(student => ({
      _id: student._id,
      name: student.name,
      role: 'student',
      class: student.className,
      className: student.className,
      department: student.className ? `O'quvchi - ${student.className}` : "O'quvchi",
      phone: student.phone,
      email: student.email,
      hikvisionEmployeeId: student.hikvisionEmployeeId,
      status: student.status || 'active',
      createdAt: student.createdAt,
      updatedAt: student.updatedAt,
    }));

    // Merge - Employee'dan student role bo'lmaganlarni olish + Student collection'dan
    const nonStudentEmployees = employees.filter(emp => emp.role !== 'student');
    
    // Combine all
    const allStaff = [
      ...nonStudentEmployees.map(e => ({
        ...e.toObject(),
        __typename: "Employee",
      })),
      ...studentsAsEmployees.map(s => ({
        ...s,
        __typename: "Student",
      }))
    ];

    // Log roles for debugging
    const roleCounts = {};
    allStaff.forEach((emp) => {
      roleCounts[emp.role || "undefined"] =
        (roleCounts[emp.role || "undefined"] || 0) + 1;
    });
    console.log(`📈 [ALL-STAFF] Role distribution:`, roleCounts);

    // Sort by creation date
    allStaff.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Return in expected format
    res.json({ employees: allStaff });
  } catch (error) {
    console.error("Error fetching all staff:", error);
    res.status(500).json({ error: "Xodimlarni olib olishda xato" });
  }
});

export default router;
