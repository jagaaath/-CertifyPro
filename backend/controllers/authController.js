// ============================================
// Auth Controller
// Handles login for all 3 roles:
//   - Student  (USN + password)
//   - Faculty  (email + password)
//   - Admin    (email + password)
//
// Every login function follows the same pattern:
//   1. Extract credentials from req.body
//   2. Validate input fields
//   3. Find user in correct collection
//   4. Compare password with stored hash
//   5. Generate JWT token
//   6. Return token + user info to client
// ============================================

const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Admin = require("../models/Admin");
const generateToken = require("../utils/generateToken");

// ============================================
// @desc    Login a Student
// @route   POST /api/auth/student/login
// @access  Public
// @body    { usn, password }
// @returns { success, token, student: { id, name, usn, ... } }
// ============================================
const studentLogin = async (req, res) => {
  try {
    // ── Step 1: Extract credentials from body ──
    const { usn, password } = req.body;

    // ── Step 2: Validate required fields ───────
    if (!usn || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both USN and password",
      });
    }

    // ── Step 3: Find student by USN ─────────────
    // We use .select("+password") because password
    // has select:false in the schema — we need it
    // here to compare with the entered password
    const student = await Student.findOne({
      usn: usn.toUpperCase(), // Normalize USN to uppercase
    }).select("+password");

    // ── Step 4: Check if student exists ─────────
    if (!student) {
      return res.status(401).json({
        success: false,
        message: "Invalid USN or password",
        // NOTE: We deliberately give a vague message
        // to avoid revealing whether the USN exists
      });
    }

    // ── Step 5: Check if account is active ──────
    if (!student.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    // ── Step 6: Compare entered password ────────
    // Uses the matchPassword method we defined
    // on the Student schema (bcrypt.compare internally)
    const isPasswordMatch = await student.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid USN or password",
      });
    }

    // ── Step 7: Generate JWT token ───────────────
    // Token contains { id: student._id, role: 'student' }
    const token = generateToken(student._id, "student");

    // ── Step 8: Send response ────────────────────
    // Never send the password back — even hashed
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      student: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        section: student.section,
        role: "student",
      },
    });
  } catch (error) {
    console.error("Student login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login. Please try again.",
    });
  }
};

// ============================================
// @desc    Login a Faculty Member
// @route   POST /api/auth/faculty/login
// @access  Public
// @body    { email, password }
// @returns { success, token, faculty: { id, name, employeeId, ... } }
// ============================================
const facultyLogin = async (req, res) => {
  try {
    // ── Step 1: Extract credentials ─────────────
    const { email, password } = req.body;
    const normalizedEmail = String(email || "").trim().toLowerCase();

    // ── Step 2: Validate required fields ────────
    if (!normalizedEmail || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      });
    }

    // ── Step 3: Find faculty by employeeId ───────
    const faculty = await Faculty.findOne({
      email: normalizedEmail,
    }).select("+password");

    // ── Step 4: Check if faculty exists ─────────
    if (!faculty) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ── Step 5: Check if account is active ──────
    if (!faculty.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    // ── Step 6: Compare password ─────────────────
    const isPasswordMatch = await faculty.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ── Step 7: Generate JWT token ───────────────
    const token = generateToken(faculty._id, "faculty");

    // ── Step 8: Send response ────────────────────
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      faculty: {
        id: faculty._id,
        name: faculty.name,
        employeeId: faculty.employeeId,
        email: faculty.email,
        department: faculty.department,
        designation: faculty.designation,
        role: "faculty",
      },
    });
  } catch (error) {
    console.error("Faculty login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login. Please try again.",
    });
  }
};

// ============================================
// @desc    Login an Admin
// @route   POST /api/auth/admin/login
// @access  Public
// @body    { email, password }
// @returns { success, token, admin: { id, name, email } }
// ============================================
const adminLogin = async (req, res) => {
  try {
    // ── Step 1: Extract credentials ─────────────
    const { email, password } = req.body;

    // ── Step 2: Validate required fields ────────
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide both email and password",
      });
    }

    // ── Step 3: Find admin by email ──────────────
    // email stored in lowercase (enforced by schema)
    const admin = await Admin.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    // ── Step 4: Check if admin exists ───────────
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ── Step 5: Compare password ─────────────────
    const isPasswordMatch = await admin.matchPassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // ── Step 6: Generate JWT token ───────────────
    const token = generateToken(admin._id, "admin");

    // ── Step 7: Send response ────────────────────
    res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        isSuperAdmin: admin.isSuperAdmin,
        role: "admin",
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during login. Please try again.",
    });
  }
};

// ============================================
// @desc    Get currently logged-in user profile
// @route   GET /api/auth/me
// @access  Private (all roles)
// @headers Authorization: Bearer <token>
// @returns { success, user, role }
// ============================================
const getMe = async (req, res) => {
  try {
    // req.user and req.role are attached by protect middleware
    // No DB query needed — user is already fetched in middleware
    res.status(200).json({
      success: true,
      role: req.role,
      user: req.user,
    });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again.",
    });
  }
};

module.exports = {
  studentLogin,
  facultyLogin,
  adminLogin,
  getMe,
};
