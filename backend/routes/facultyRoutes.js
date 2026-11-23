
// ============================================
// Faculty Routes
// All routes require:
// 1. Valid JWT token
// 2. Role must be 'faculty'
// ============================================

const express = require("express");
const router = express.Router();

// Faculty controller functions
const {
  getFacultyDashboard,
  getDepartmentStudents,
  getStudentProfile,
  verifyCertificate,
  getPendingCertificates,
  getFacultyProfile,
} = require("../controllers/facultyController");

// Excel report controller
const {
  downloadFacultyExcelReport,
  downloadFacultyStudentZip,
} = require("../controllers/reportController");

const {
  uploadNoticePdf,
  createNotice,
  getNotices,
  deleteNotice,
} = require("../controllers/noticeController");

// Authentication middleware
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");

// Apply authentication and faculty role protection to ALL routes.
router.use(protect);
router.use(authorizeRoles("faculty"));

// ============================================
// FACULTY DASHBOARD
// ============================================

router.get("/dashboard", getFacultyDashboard);

router.get("/profile", getFacultyProfile);

// Department notice board: faculty can publish PDF notices and remove their own.
router.get("/notices", getNotices);
router.post("/notices", uploadNoticePdf, createNotice);
router.delete("/notices/:noticeId", deleteNotice);

// ============================================
// STUDENT MANAGEMENT
// ============================================

router.get("/students", getDepartmentStudents);

router.get("/student/:studentId", getStudentProfile);

// ============================================
// CERTIFICATE MANAGEMENT
// ============================================

router.get("/pending", getPendingCertificates);

router.put("/verify/:certId", verifyCertificate);

// ============================================
// EXCEL REPORT DOWNLOAD
// ============================================

// GET /api/faculty/reports/students.xlsx
// Generates the latest department-wise Excel report.
// The Excel file is generated in memory and downloaded locally.
router.get(
  "/reports/students.xlsx",
  downloadFacultyExcelReport
);

router.get("/reports/students.zip", downloadFacultyStudentZip);

module.exports = router;
