// ============================================
// Admin Controller
// Handles all admin operations:
//   - System-wide dashboard stats
//   - Add / Delete / View students
//   - Add / Delete / View faculty
//   - View all certificates system-wide
//
// Admin has FULL access — no department filter
// All routes locked to role: 'admin'
// ============================================

const Admin = require("../models/Admin");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Certificate = require("../models/Certificate");
const cloudinary = require("../config/cloudinary");

// ============================================
// @desc    Get admin dashboard statistics
// @route   GET /api/admin/dashboard
// @access  Private (Admin only)
// @returns { success, admin, stats }
// ============================================
const getAdminDashboard = async (req, res) => {
  try {
    // ── Step 1: Run all count queries in parallel ─
    // Promise.all fires all queries simultaneously
    // Much faster than running them one by one
    const [
      totalStudents,
      activeStudents,
      totalFaculty,
      activeFaculty,
      totalCertificates,
      pendingCertificates,
      approvedCertificates,
      rejectedCertificates,
    ] = await Promise.all([
      Student.countDocuments(),
      Student.countDocuments({ isActive: true }),
      Faculty.countDocuments(),
      Faculty.countDocuments({ isActive: true }),
      Certificate.countDocuments(),
      Certificate.countDocuments({ status: "pending" }),
      Certificate.countDocuments({ status: "approved" }),
      Certificate.countDocuments({ status: "rejected" }),
    ]);

    // ── Step 2: Get department-wise breakdown ────
    // MongoDB aggregation to group students by dept
    const departmentBreakdown = await Student.aggregate([
      {
        // $group groups documents by a field
        // and counts how many are in each group
        $group: {
          _id: "$department",         // Group by department field
          studentCount: { $sum: 1 },  // Count students per dept
        },
      },
      {
        // $sort sorts results alphabetically by dept name
        $sort: { _id: 1 },
      },
    ]);

    // ── Step 3: Send response ─────────────────────
    res.status(200).json({
      success: true,
      admin: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
      stats: {
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: totalStudents - activeStudents,
        },
        faculty: {
          total: totalFaculty,
          active: activeFaculty,
          inactive: totalFaculty - activeFaculty,
        },
        certificates: {
          total: totalCertificates,
          pending: pendingCertificates,
          approved: approvedCertificates,
          rejected: rejectedCertificates,
        },
        departmentBreakdown,
      },
    });
  } catch (error) {
    console.error("Admin dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while loading dashboard.",
    });
  }
};

// ============================================
// @desc    Get all students (system-wide)
// @route   GET /api/admin/students
// @access  Private (Admin only)
// @query   department, search, isActive
// @returns { success, count, students }
// ============================================
const getAllStudents = async (req, res) => {
  try {
    // ── Step 1: Build dynamic filter ─────────────
    const filter = {};

    // Filter by department: ?department=CSE
    if (req.query.department) {
      filter.department = req.query.department;
    }

    // Filter by active status: ?isActive=true/false
    if (req.query.isActive !== undefined) {
      filter.isActive = req.query.isActive === "true";
    }

    // Search by name or USN: ?search=rahul
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { usn: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // ── Step 2: Fetch students ─────────────────────
    const students = await Student.find(filter)
      .select("-password")
      .sort({ createdAt: -1 }); // Newest first

    // ── Step 3: Send response ──────────────────────
    res.status(200).json({
      success: true,
      count: students.length,
      students,
    });
  } catch (error) {
    console.error("Get all students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching students.",
    });
  }
};

// ============================================
// @desc    Add a new student
// @route   POST /api/admin/student
// @access  Private (Admin only)
// @body    { name, usn, email, password, department, semester }
// @returns { success, message, student }
// ============================================
const addStudent = async (req, res) => {
  try {
    // ── Step 1: Extract fields from body ──────────
    const { name, usn, email, password, department, semester } = req.body;

    // ── Step 2: Validate all required fields ──────
    if (!name || !usn || !email || !password || !department || !semester) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, usn, email, password, department, semester",
      });
    }

    // ── Step 3: Check for duplicate USN ───────────
    const usnExists = await Student.findOne({
      usn: usn.toUpperCase(),
    });

    if (usnExists) {
      return res.status(400).json({
        success: false,
        message: `USN '${usn.toUpperCase()}' is already registered`,
      });
    }

    // ── Step 4: Check for duplicate email ─────────
    const emailExists = await Student.findOne({
      email: email.toLowerCase(),
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: `Email '${email}' is already registered`,
      });
    }

    // ── Step 5: Create the student ─────────────────
    // Password is auto-hashed by pre-save hook
    const student = await Student.create({
      name: name.trim(),
      usn: usn.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      department,
      semester: Number(semester),
    });

    // ── Step 6: Send response ──────────────────────
    // Don't return password — select specific fields only
    res.status(201).json({
      success: true,
      message: `Student '${student.name}' added successfully`,
      student: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        isActive: student.isActive,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error("Add student error:", error);

    // ── Handle Mongoose validation errors ─────────
    // These come from schema-level validations
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while adding student.",
    });
  }
};

// ============================================
// @desc    Delete a student
// @route   DELETE /api/admin/student/:id
// @access  Private (Admin only)
// NOTE: Cascade deletion is handled automatically
//       by the Student model's pre-delete TRIGGER
//       No need to manually delete certs here
// ============================================
const deleteStudent = async (req, res) => {
  try {
    // ── Find and delete — trigger fires automatically ──
    // The pre('findOneAndDelete') trigger in Student.js
    // will cascade delete all certificates + Cloudinary files
    const student = await Student.findOneAndDelete({
      _id: req.params.id,
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `Student '${student.name}' and all their data deleted successfully`,
    });
  } catch (error) {
    console.error("Delete student error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting student.",
    });
  }
};

// ============================================
// @desc    Toggle student active/inactive status
// @route   PUT /api/admin/student/:id/toggle
// @access  Private (Admin only)
// @returns { success, message, isActive }
// ============================================
const toggleStudentStatus = async (req, res) => {
  try {
    // ── Find student and flip isActive ─────────────
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // Toggle: true → false, false → true
    student.isActive = !student.isActive;
    await student.save();

    res.status(200).json({
      success: true,
      message: `Student account ${student.isActive ? "activated" : "deactivated"} successfully`,
      isActive: student.isActive,
    });
  } catch (error) {
    console.error("Toggle student status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating student status.",
    });
  }
};

// ============================================
// @desc    Get all faculty members (system-wide)
// @route   GET /api/admin/faculty
// @access  Private (Admin only)
// @query   department, search
// @returns { success, count, faculty }
// ============================================
const getAllFaculty = async (req, res) => {
  try {
    // ── Build filter ───────────────────────────────
    const filter = {};

    if (req.query.department) {
      filter.department = req.query.department;
    }

    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      filter.$or = [
        { name: { $regex: searchTerm, $options: "i" } },
        { employeeId: { $regex: searchTerm, $options: "i" } },
        { email: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // ── Fetch faculty ──────────────────────────────
    const faculty = await Faculty.find(filter)
      .select("-password")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: faculty.length,
      faculty,
    });
  } catch (error) {
    console.error("Get all faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching faculty.",
    });
  }
};

// ============================================
// @desc    Add a new faculty member
// @route   POST /api/admin/faculty
// @access  Private (Admin only)
// @body    { name, employeeId, email, password, department, designation }
// @returns { success, message, faculty }
// ============================================
const addFaculty = async (req, res) => {
  try {
    // ── Step 1: Extract fields ─────────────────────
    const { name, employeeId, email, password, department, designation } =
      req.body;

    // ── Step 2: Validate required fields ──────────
    if (!name || !employeeId || !email || !password || !department) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: name, employeeId, email, password, department",
      });
    }

    // ── Step 3: Check for duplicate employeeId ─────
    const idExists = await Faculty.findOne({
      employeeId: employeeId.toUpperCase(),
    });

    if (idExists) {
      return res.status(400).json({
        success: false,
        message: `Employee ID '${employeeId.toUpperCase()}' is already registered`,
      });
    }

    // ── Step 4: Check for duplicate email ─────────
    const emailExists = await Faculty.findOne({
      email: email.toLowerCase(),
    });

    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: `Email '${email}' is already registered`,
      });
    }

    // ── Step 5: Create faculty ─────────────────────
    const faculty = await Faculty.create({
      name: name.trim(),
      employeeId: employeeId.toUpperCase().trim(),
      email: email.toLowerCase().trim(),
      password,
      department,
      designation: designation || "Assistant Professor",
    });

    // ── Step 6: Send response ──────────────────────
    res.status(201).json({
      success: true,
      message: `Faculty '${faculty.name}' added successfully`,
      faculty: {
        id: faculty._id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        email: faculty.email,
        department: faculty.department,
        designation: faculty.designation,
        isActive: faculty.isActive,
        createdAt: faculty.createdAt,
      },
    });
  } catch (error) {
    console.error("Add faculty error:", error);

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    res.status(500).json({
      success: false,
      message: "Server error while adding faculty.",
    });
  }
};

// ============================================
// @desc    Delete a faculty member
// @route   DELETE /api/admin/faculty/:id
// @access  Private (Admin only)
// @params  id — Faculty MongoDB _id
// @returns { success, message }
// ============================================
const deleteFaculty = async (req, res) => {
  try {
    // ── Find and delete faculty ────────────────────
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    // ── Unlink verified certificates ───────────────
    // When a faculty is deleted, we don't delete their
    // verified certs — we just clear the verifiedBy ref
    // so certificates remain in the student's record
    await Certificate.updateMany(
      { verifiedBy: faculty._id },
      {
        $set: { verifiedBy: null },
      }
    );

    // ── Delete the faculty document ────────────────
    await Faculty.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: `Faculty '${faculty.name}' has been deleted successfully`,
    });
  } catch (error) {
    console.error("Delete faculty error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting faculty.",
    });
  }
};

// ============================================
// @desc    Toggle faculty active/inactive status
// @route   PUT /api/admin/faculty/:id/toggle
// @access  Private (Admin only)
// @returns { success, message, isActive }
// ============================================
const toggleFacultyStatus = async (req, res) => {
  try {
    const faculty = await Faculty.findById(req.params.id);

    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: "Faculty not found",
      });
    }

    faculty.isActive = !faculty.isActive;
    await faculty.save();

    res.status(200).json({
      success: true,
      message: `Faculty account ${faculty.isActive ? "activated" : "deactivated"} successfully`,
      isActive: faculty.isActive,
    });
  } catch (error) {
    console.error("Toggle faculty status error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating faculty status.",
    });
  }
};

module.exports = {
  getAdminDashboard,
  getAllStudents,
  addStudent,
  deleteStudent,
  toggleStudentStatus,
  getAllFaculty,
  addFaculty,
  deleteFaculty,
  toggleFacultyStatus,
};
