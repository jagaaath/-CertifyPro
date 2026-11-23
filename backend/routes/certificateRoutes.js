// ============================================
// Certificate Routes
// All routes are protected — token required
// Role guards enforce who can access what
// ============================================

const express = require("express");
const router = express.Router();

// ── Import controller functions ──────────────
const {
  getMyCertificates,
  getCertificateById,
  deleteCertificate,
  getAllCertificates,
  getCertificateStats,
} = require("../controllers/certificateController");

// ── Import middleware ────────────────────────
const { protect } = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { uploadSingleToMemory } = require("../middleware/memoryUploadMiddleware");
const { uploadCertificateWithQr } = require("../controllers/qrCertificateController");

// ════════════════════════════════════════════════
// STUDENT ROUTES
// Only students can upload and manage their certs
// ════════════════════════════════════════════════

// POST /api/certificate/upload
// Middleware chain: verify token → check role → upload file → controller
router.post(
  "/upload",
  protect,                        // 1. Verify JWT
  authorizeRoles("student"),      // 2. Only students
  uploadSingleToMemory, // Receive file in memory before QR scan
  uploadCertificateWithQr // Automatically scan, verify and save
);

// GET /api/certificate/my
// Get all certificates for the logged-in student
router.get(
  "/my",
  protect,
  authorizeRoles("student"),
  getMyCertificates
);

// GET /api/certificate/stats
// Get certificate counts + total credits for student
router.get(
  "/stats",
  protect,
  authorizeRoles("student"),
  getCertificateStats
);

// DELETE /api/certificate/:id
// Student deletes their own certificate
router.delete(
  "/:id",
  protect,
  authorizeRoles("student"),
  deleteCertificate
);

// ════════════════════════════════════════════════
// SHARED ROUTES
// Faculty and Admin can view all certificates
// ════════════════════════════════════════════════

// GET /api/certificate/all
// Fetch all certificates (faculty sees own dept only)
router.get(
  "/all",
  protect,
  authorizeRoles("faculty", "admin"),
  getAllCertificates
);

// GET /api/certificate/:id
// View a single certificate — student(own), faculty, admin
// NOTE: This must come AFTER /my, /stats, /all
// because Express matches routes top-to-bottom
// and /:id would greedily match /my if placed first
router.get(
  "/:id",
  protect,
  authorizeRoles("student", "faculty", "admin"),
  getCertificateById
);

module.exports = router;