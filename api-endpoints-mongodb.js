// ==================== ATTENDANCE API ENDPOINTS (MongoDB) ====================

// Get daily attendance statistics from MongoDB
app.get("/api/attendance/daily-stats", async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Get all employees
    const totalEmployees = await Employee.countDocuments({ status: "active" });

    // Get attendance records for the date
    const attendanceRecords = await Attendance.find({ date: targetDate });

    // Calculate statistics
    const presentCount = attendanceRecords.filter(
      (r) => r.status === "present" || r.status === "partial"
    ).length;
    const absentCount = totalEmployees - presentCount;
    const attendanceRate =
      totalEmployees > 0
        ? Math.round((presentCount / totalEmployees) * 100)
        : 0;

    // Group by role
    const byRole = {
      teachers: 0,
      staff: 0,
      admins: 0,
    };

    attendanceRecords.forEach((record) => {
      if (record.role === "teacher") byRole.teachers++;
      else if (record.role === "staff") byRole.staff++;
      else if (record.role === "admin") byRole.admins++;
    });

    // Format attendance list with all details
    const attendanceList = attendanceRecords.map((record) => ({
      id: record._id,
      employeeId: record.employeeId,
      name: record.name,
      role: record.role,
      department: record.department,
      checkInTime: record.firstCheckIn || "-",
      checkOutTime: record.lastCheckOut || "-",
      workDuration: record.workDuration || 0,
      status: record.status,
      date: record.date,
      avatar: record.name?.split(" ")[0]?.substring(0, 2).toUpperCase() || "?",
    }));

    res.json({
      statistics: {
        date: targetDate,
        totalEmployees,
        presentCount,
        absentCount,
        attendanceRate,
        byRole,
      },
      employees: attendanceList,
    });
  } catch (error) {
    console.error("Error fetching daily stats:", error);
    res.status(500).json({ error: "Failed to fetch daily statistics" });
  }
});

// Get list of absent employees for a specific date
app.get("/api/attendance/absent", async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split("T")[0];

    // Get all active employees
    const allEmployees = await Employee.find({ status: "active" });

    // Get attendance records for the date
    const attendanceRecords = await Attendance.find({ date: targetDate });
    const presentEmployeeIds = attendanceRecords.map((r) => r.employeeId);

    // Filter absent employees
    const absentEmployees = allEmployees
      .filter((emp) => !presentEmployeeIds.includes(emp.employeeId))
      .map((emp) => ({
        id: emp._id,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        role: emp.role,
        status: "absent",
      }));

    res.json({
      date: targetDate,
      absentCount: absentEmployees.length,
      absentEmployees,
    });
  } catch (error) {
    console.error("Error fetching absent employees:", error);
    res.status(500).json({ error: "Failed to fetch absent employees" });
  }
});

// Get all employees from database
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await Employee.find({ status: "active" }).sort({
      name: 1,
    });
    res.json(employees);
  } catch (error) {
    console.error("Error fetching employees:", error);
    res.status(500).json({ error: "Failed to fetch employees" });
  }
});

// Update employee department and salary
app.put("/api/employee/:id", async (req, res) => {
  try {
    const { department, salary, role, status, subject, shift, specialty } = req.body;

    const updateData = { department, salary, role, status };

    // Add optional role-specific fields if provided
    if (subject) updateData.subject = subject;
    if (shift) updateData.shift = shift;
    if (specialty) updateData.specialty = specialty;

    const updatedEmployee = await Employee.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedEmployee) {
      return res.status(404).json({ error: "Employee not found" });
    }

    // Broadcast update via Socket.IO
    if (global.io) {
      global.io.emit("employee:updated", updatedEmployee);
    }

    res.json(updatedEmployee);
  } catch (error) {
    console.error("Error updating employee:", error);
    res.status(500).json({ error: "Failed to update employee" });
  }
});
