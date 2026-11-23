// ============================================
// Certificate Controller
// Handles all certificate operations:
//   - Upload certificate (Student)
//   - Get all certificates for logged-in student
//   - Get single certificate by ID
//   - Delete certificate (Student)
//   - Get all certificates (Faculty/Admin)
//
// File Upload Flow:
//   Client → Multer → Cloudinary → Save URL to MongoDB
// ============================================

const Certificate = require("../models/Certificate");
const cloudinary = require("../config/cloudinary");

// ============================================
// @desc    Upload a new certificate
// @route   POST /api/certificate/upload
// @access  Private (Student only)
// @body    { title, description, creditsEarned, issueDate }
// @file    certificate (image or PDF, max 5MB)
// @returns { success, message, certificate }
// ============================================
const uploadCertificate = async (req, res) => {
  try {
    // ── Step 1: Extract text fields from body ───
    // These come alongside the file in the form data
    const { title, description, creditsEarned, issueDate } = req.body;

    // ── Step 2: Validate required text fields ───
    if (!title || !creditsEarned) {
      // If validation fails AFTER file was uploaded to Cloudinary,
      // we must delete the uploaded file to avoid orphaned files
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: "auto",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Certificate title and credits earned are required",
      });
    }

    // ── Step 3: Validate credits range ──────────
    const credits = Number(creditsEarned);
    if (isNaN(credits) || credits < 0 || credits > 20) {
      // Clean up Cloudinary upload if validation fails
      if (req.file) {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: "auto",
        });
      }

      return res.status(400).json({
        success: false,
        message: "Credits earned must be a number between 0 and 20",
      });
    }

    // ── Step 4: Extract file info from Multer ───
    // After uploadSingle middleware runs successfully,
    // req.file contains all the Cloudinary upload details
    //
    // req.file.path     → Full Cloudinary URL (https://res.cloudinary.com/...)
    // req.file.filename → Cloudinary public_id (used for deletion)
    // req.file.mimetype → File MIME type (image/jpeg, application/pdf, etc.)
    const fileUrl = req.file.path;       // Cloudinary secure URL
    const publicId = req.file.filename;  // Cloudinary public_id

    // ── Step 5: Determine file type ─────────────
    // We store either 'image' or 'pdf' in the DB
    // to know how to display it on the frontend
    const fileType = req.file.mimetype === "application/pdf"
      ? "pdf"
      : "image";

    // ── Step 6: Create certificate document ─────
    // Save all metadata + Cloudinary references to MongoDB
    const certificate = await Certificate.create({
      student: req.user._id,   // From protect middleware (req.user)
      title: title.trim(),
      description: description ? description.trim() : "",
      creditsEarned: credits,
      fileUrl,                  // Cloudinary URL
      publicId,                 // Cloudinary public_id
      fileType,
      status: "pending",        // Always starts as pending
      issueDate: issueDate ? new Date(issueDate) : null,
    });

    // ── Step 7: Populate student info ───────────
    // .populate() replaces the student ObjectId with
    // the actual student document fields we specify
    await certificate.populate("student", "name usn department semester");

    // ── Step 8: Send success response ───────────
    res.status(201).json({
      success: true,
      message: "Certificate uploaded successfully! Awaiting faculty verification.",
      certificate,
    });
  } catch (error) {
    console.error("Upload certificate error:", error);

    // ── Cleanup on server error ──────────────────
    // If MongoDB save fails but Cloudinary upload succeeded,
    // delete the file from Cloudinary to stay in sync
    if (req.file) {
      try {
        await cloudinary.uploader.destroy(req.file.filename, {
          resource_type: "auto",
        });
        console.log("🧹 Cleaned up Cloudinary file after error");
      } catch (cleanupError) {
        console.error("Cloudinary cleanup failed:", cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      message: "Server error during certificate upload. Please try again.",
    });
  }
};

// ============================================
// @desc    Get all certificates for logged-in student
// @route   GET /api/certificate/my
// @access  Private (Student only)
// Now includes statusHistory from triggers
// ============================================
const getMyCertificates = async (req, res) => {
  try {
    const filter = { student: req.user._id };

    if (req.query.status) {
      const validStatuses = ["pending", "approved", "rejected"];
      if (validStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }

    const certificates = await Certificate.find(filter)
      .populate("verifiedBy", "name employeeId department designation")
      .sort({ createdAt: -1 });
    // statusHistory is now included automatically
    // because it's part of the Certificate schema

    // Get trigger-managed credits from Student doc
    const Student = require("../models/Student");
    const student = await Student.findById(req.user._id);

    const totalCredits = student.totalCreditsEarned;

    res.status(200).json({
      success: true,
      count: certificates.length,
      totalCredits, // From trigger-managed field
      certificates,
    });
  } catch (error) {
    console.error("Get my certificates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching certificates.",
    });
  }
};

// ============================================
// @desc    Get a single certificate by ID
// @route   GET /api/certificate/:id
// @access  Private (Student who owns it, Faculty, Admin)
// @params  id — Certificate MongoDB _id
// @returns { success, certificate }
// ============================================
const getCertificateById = async (req, res) => {
  try {
    // ── Step 1: Find certificate and populate refs ─
    const certificate = await Certificate.findById(req.params.id)
      .populate("student", "name usn email department semester")
      .populate("verifiedBy", "name employeeId department designation");

    // ── Step 2: Check if certificate exists ─────
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // ── Step 3: Authorization check ─────────────
    // Students can only view their OWN certificates
    // Faculty and Admin can view any certificate
    if (
      req.role === "student" &&
      certificate.student._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own certificates.",
      });
    }

    // ── Step 4: Send response ────────────────────
    res.status(200).json({
      success: true,
      certificate,
    });
  } catch (error) {
    console.error("Get certificate by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching certificate.",
    });
  }
};

// ============================================
// @desc    Delete a certificate
// @route   DELETE /api/certificate/:id
// @access  Private (Student only)
// NOTE: Cloudinary cleanup + student credit
//       recalculation handled by POST trigger
// ============================================
const deleteCertificate = async (req, res) => {
  try {
    const certificate = await Certificate.findById(req.params.id);

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Ownership check
    if (certificate.student.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only delete your own certificates.",
      });
    }

    // Block approved cert deletion
    if (certificate.status === "approved") {
      return res.status(400).json({
        success: false,
        message: "Approved certificates cannot be deleted.",
      });
    }

    // ── Delete from Cloudinary first ─────────────
    try {
      const cloudinary = require("../config/cloudinary");
      await cloudinary.uploader.destroy(certificate.publicId, {
        resource_type: "auto",
      });
    } catch (cloudErr) {
      console.error("Cloudinary delete failed:", cloudErr.message);
    }

    // ── Delete from DB — post trigger auto-updates ─
    // post('findOneAndDelete') trigger will:
    //   - Decrement student's totalCertificates
    //   - Recalculate totalCreditsEarned
    await Certificate.findOneAndDelete({ _id: req.params.id });

    res.status(200).json({
      success: true,
      message: "Certificate deleted successfully",
    });
  } catch (error) {
    console.error("Delete certificate error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting certificate.",
    });
  }
};

// ============================================
// @desc    Get all certificates (for Faculty/Admin)
// @route   GET /api/certificate/all
// @access  Private (Faculty, Admin)
// @query   status, department, studentId
// @returns { success, count, certificates }
// ============================================
const getAllCertificates = async (req, res) => {
  try {
    // ── Step 1: Build dynamic filter ────────────
    // Support multiple optional query parameters
    // for filtering the certificate list
    const filter = {};

    // Filter by status: ?status=pending
    if (req.query.status) {
      const validStatuses = ["pending", "approved", "rejected"];
      if (validStatuses.includes(req.query.status)) {
        filter.status = req.query.status;
      }
    }

    // Filter by specific student: ?studentId=64abc...
    if (req.query.studentId) {
      filter.student = req.query.studentId;
    }

    // ── Step 2: Fetch all matching certificates ──
    const certificates = await Certificate.find(filter)
      .populate("student", "name usn email department semester")
      .populate("verifiedBy", "name employeeId")
      .sort({ createdAt: -1 }); // Newest first

    // ── Step 3: If faculty, filter by department ─
    // Faculty should only see students from
    // their own department
    let filteredCertificates = certificates;

    if (req.role === "faculty") {
      filteredCertificates = certificates.filter(
        (cert) =>
          cert.student && // Guard against null (deleted student)
          cert.student.department === req.user.department
      );
    }

    // ── Step 4: Send response ────────────────────
    res.status(200).json({
      success: true,
      count: filteredCertificates.length,
      certificates: filteredCertificates,
    });
  } catch (error) {
    console.error("Get all certificates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching certificates.",
    });
  }
};

// ============================================
// @desc    Get certificate stats for a student
// @route   GET /api/certificate/stats
// @access  Private (Student)
// Returns BOTH trigger-managed values AND
// live-calculated values for UI comparison
// ============================================
const getCertificateStats = async (req, res) => {
  try {
    // ── Get trigger-managed values from Student ────
    const Student = require("../models/Student");
    const student = await Student.findById(req.user._id);

    // ── Also calculate live from certificates ──────
    const certificates = await Certificate.find({
      student: req.user._id,
    });

    const liveCredits = certificates
      .filter((c) => c.status === "approved")
      .reduce((sum, c) => sum + c.creditsEarned, 0);

    res.status(200).json({
      success: true,
      stats: {
        // Live counts
        total:    certificates.length,
        pending:  certificates.filter((c) => c.status === "pending").length,
        approved: certificates.filter((c) => c.status === "approved").length,
        rejected: certificates.filter((c) => c.status === "rejected").length,

        // ── Trigger-managed values ─────────────────
        // These come directly from the Student document
        // Updated automatically by Mongoose triggers
        totalCreditsEarned:     student.totalCreditsEarned,
        totalCertificates:      student.totalCertificates,

        // Live calculated (should match trigger values)
        liveCreditsCalculated:  liveCredits,

        // Shows if trigger is in sync with live data
        triggerInSync: student.totalCreditsEarned === liveCredits,
      },
    });
  } catch (error) {
    console.error("Get certificate stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching stats.",
    });
  }
};

module.exports = {
  uploadCertificate,
  getMyCertificates,
  getCertificateById,
  deleteCertificate,
  getAllCertificates,
  getCertificateStats,
};