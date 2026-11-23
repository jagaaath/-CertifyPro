// ============================================
// Auth Routes
// Maps HTTP endpoints to controller functions
// All auth routes are PUBLIC (no protect middleware)
// except /me which requires a valid token
// ============================================

const express = require("express");
const router = express.Router();

// ── Import controller functions ──────────────
const {
  studentLogin,
  facultyLogin,
  adminLogin,
  getMe,
} = require("../controllers/authController");

// ── Import protect middleware for /me route ──
const { protect } = require("../middleware/authMiddleware");

// ════════════════════════════════════════════════
// PUBLIC ROUTES — No token required
// ════════════════════════════════════════════════

// POST /api/auth/student/login
// Body: { usn, password }
router.post("/student/login", studentLogin);

// POST /api/auth/faculty/login
// Body: { employeeId, password }
router.post("/faculty/login", facultyLogin);

// POST /api/auth/admin/login
// Body: { email, password }
router.post("/admin/login", adminLogin);

// ════════════════════════════════════════════════
// PRIVATE ROUTES — Token required
// ════════════════════════════════════════════════

// GET /api/auth/me
// Returns the currently logged-in user's profile
// Used by frontend to restore session on page refresh
router.get("/me", protect, getMe);

module.exports = router;