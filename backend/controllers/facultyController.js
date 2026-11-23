// ============================================
// Faculty Controller
// Handles all faculty-specific operations:
//   - Get faculty dashboard stats
//   - Get all students in faculty's department
//   - Get single student profile + certificates
//   - Verify certificate (approve or reject)
//   - Get all pending certificates
//
// All routes are protected and role-locked to 'faculty'
// Faculty can only see/verify students in their department
// ============================================

const Faculty = require("../models/Faculty");
const Student = require("../models/Student");
const Certificate = require("../models/Certificate");

// ============================================
// @desc    Get faculty dashboard statistics
// @route   GET /api/faculty/dashboard
// @access  Private (Faculty only)
// @returns { success, faculty, stats }
// ============================================
const getFacultyDashboard = async (req, res) => {
  try {
    // ── Step 1: Get department of logged-in faculty ─
    // req.user is attached by protect middleware
    const department = req.user.department;

    // ── Step 2: Count students in this department ───
    const totalStudents = await Student.countDocuments({
      department,
      isActive: true,
    });

    // ── Step 3: Get all student IDs in department ───
    // We need these to filter certificates
    const studentsInDept = await Student.find(
      { department, isActive: true },
      "_id" // Only fetch _id field for efficiency
    );

    // Extract just the _id values into an array
    const studentIds = studentsInDept.map((s) => s._id);

    // ── Step 4: Count certificates by status ────────
    // Query certificates only for students in this dept
    const [totalCerts, pendingCerts, approvedCerts, rejectedCerts] =
      await Promise.all([
        // Total certificates in department
        Certificate.countDocuments({ student: { $in: studentIds } }),

        // Certificates awaiting review
        Certificate.countDocuments({
          student: { $in: studentIds },
          status: "pending",
        }),

        // Certificates approved by any faculty
        Certificate.countDocuments({
          student: { $in: studentIds },
          status: "approved",
        }),

        // Certificates rejected by any faculty
        Certificate.countDocuments({
          student: { $in: studentIds },
          status: "rejected",
        }),
      ]);

    // ── Step 5: Get recently verified by THIS faculty ─
    // Show the last 5 certs this faculty member verified
    const recentlyVerified = await Certificate.find({
      verifiedBy: req.user._id,
    })
      .populate("student", "name usn")
      .sort({ verifiedAt: -1 })
      .limit(5);

    // ── Step 6: Send response ───────────────────────
    res.status(200).json({
      success: true,
      faculty: {
        id: req.user._id,
        name: req.user.name,
        employeeId: req.user.employeeId,
        department: req.user.department,
        designation: req.user.designation,
      },
      stats: {
        totalStudents,
        totalCertificates: totalCerts,
        pendingVerification: pendingCerts,
        approved: approvedCerts,
        rejected: rejectedCerts,
      },
      recentlyVerified,
    });
  } catch (error) {
    console.error("Faculty dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while loading dashboard.",
    });
  }
};

// ============================================
// @desc    Get all students in faculty's department
// @route   GET /api/faculty/students
// @access  Private (Faculty only)
// @query   search — search by name or USN
// @returns { success, count, students }
// ============================================
const getDepartmentStudents = async (req, res) => {
  try {
    // ── Step 1: Build filter ─────────────────────
    // Always filter by the faculty's own department
    const filter = {
      department: req.user.department,
      isActive: true,
    };

    // ── Step 2: Optional search by name or USN ───
    // Example: GET /api/faculty/students?search=rahul
    if (req.query.search) {
      const searchTerm = req.query.search.trim();
      filter.$or = [
        // Case-insensitive search on name
        { name: { $regex: searchTerm, $options: "i" } },
        // Case-insensitive search on USN
        { usn: { $regex: searchTerm, $options: "i" } },
      ];
    }

    // ── Step 3: Fetch students ────────────────────
    const students = await Student.find(filter)
      .select("-password") // Never return password
      .sort({ name: 1 });  // Sort alphabetically by name

    // ── Step 4: Enrich with certificate summary ──
    // For each student, add a quick cert count summary
    // This gives faculty a quick overview without
    // having to fetch certificates separately
    const studentsWithStats = await Promise.all(
      students.map(async (student) => {
        // Count certs by status for this student
        const [total, pending, approved, rejected] = await Promise.all([
          Certificate.countDocuments({ student: student._id }),
          Certificate.countDocuments({ student: student._id, status: "pending" }),
          Certificate.countDocuments({ student: student._id, status: "approved" }),
          Certificate.countDocuments({ student: student._id, status: "rejected" }),
        ]);

        // Calculate total approved credits
        const creditsResult = await Certificate.aggregate([
          {
            $match: {
              student: student._id,
              status: "approved",
            },
          },
          {
            // $group sums up all creditsEarned values
            $group: {
              _id: null,
              totalCredits: { $sum: "$creditsEarned" },
            },
          },
        ]);

        const totalCredits =
          creditsResult.length > 0 ? creditsResult[0].totalCredits : 0;

        // Return student as plain object + stats
        return {
          ...student.toObject(), // Convert Mongoose doc to plain JS object
          certStats: {
            total,
            pending,
            approved,
            rejected,
            totalCredits,
          },
        };
      })
    );

    // ── Step 5: Send response ─────────────────────
    res.status(200).json({
      success: true,
      count: studentsWithStats.length,
      department: req.user.department,
      students: studentsWithStats,
    });
  } catch (error) {
    console.error("Get department students error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching students.",
    });
  }
};

// ============================================
// @desc    Get a single student's full profile
//          including all their certificates
// @route   GET /api/faculty/student/:studentId
// @access  Private (Faculty only)
// @params  studentId — Student MongoDB _id
// @returns { success, student, certificates, stats }
// ============================================
const getStudentProfile = async (req, res) => {
  try {
    // ── Step 1: Find the student ──────────────────
    const student = await Student.findById(req.params.studentId).select(
      "-password"
    );

    // ── Step 2: Check if student exists ──────────
    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student not found",
      });
    }

    // ── Step 3: Department authorization check ───
    // Faculty can ONLY view students in their dept
    // This is a critical security check
    if (student.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You can only view students from the ${req.user.department} department.`,
      });
    }

    // ── Step 4: Fetch all certificates for student ─
    const certificates = await Certificate.find({ student: student._id })
      .populate("verifiedBy", "name employeeId designation")
      .sort({ createdAt: -1 });

    // ── Step 5: Calculate stats ───────────────────
    const stats = {
      total: certificates.length,
      pending: certificates.filter((c) => c.status === "pending").length,
      approved: certificates.filter((c) => c.status === "approved").length,
      rejected: certificates.filter((c) => c.status === "rejected").length,
      totalCreditsEarned: certificates
        .filter((c) => c.status === "approved")
        .reduce((sum, c) => sum + c.creditsEarned, 0),
    };

    // ── Step 6: Send response ─────────────────────
    res.status(200).json({
      success: true,
      student,
      certificates,
      stats,
    });
  } catch (error) {
    console.error("Get student profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching student profile.",
    });
  }
};

// ============================================
// @desc    Verify a certificate
// @route   PUT /api/faculty/verify/:certId
// FIXED: Added { new: true } so post hook
//        receives the updated document
// ============================================
const verifyCertificate = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;

    // Validate action
    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: "Action must be 'approve' or 'reject'",
      });
    }

    // Require reason for rejection
    if (action === "reject" && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rejection reason is required",
      });
    }

    // Find the certificate and populate student
    const certificate = await Certificate.findById(
      req.params.certId
    ).populate("student", "name usn department");

    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: "Certificate not found",
      });
    }

    // Only pending certs can be verified
    if (certificate.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Certificate is already ${certificate.status}`,
      });
    }

    // Department check
    if (certificate.student.department !== req.user.department) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Wrong department.",
      });
    }

    // ── FIXED: Use findOneAndUpdate with { new: true } ──
    // This ensures post("findOneAndUpdate") hook
    // receives the updated document correctly
    // which then triggers syncStudentStats()
    const updatedCert = await Certificate.findOneAndUpdate(
      { _id: req.params.certId },
      {
        status: action === "approve" ? "approved" : "rejected",
        verifiedBy: req.user._id,
        rejectionReason: action === "reject"
          ? rejectionReason.trim()
          : "",
        // verifiedAt is auto-set by PRE trigger
      },
      {
        new: true,           // ← CRITICAL: pass updated doc to post hook
        runValidators: true,
      }
    ).populate("verifiedBy", "name employeeId designation");

    res.status(200).json({
      success: true,
      message: `Certificate ${updatedCert.status} successfully`,
      certificate: updatedCert,
    });
  } catch (error) {
    console.error("Verify certificate error:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Server error while verifying.",
    });
  }
};

// ============================================
// @desc    Get all pending certificates in dept
// @route   GET /api/faculty/pending
// @access  Private (Faculty only)
// @returns { success, count, certificates }
// ============================================
const getPendingCertificates = async (req, res) => {
  try {
    // ── Step 1: Get student IDs in department ────
    const studentsInDept = await Student.find(
      { department: req.user.department, isActive: true },
      "_id"
    );
    const studentIds = studentsInDept.map((s) => s._id);

    // ── Step 2: Fetch pending certificates ───────
    const certificates = await Certificate.find({
      student: { $in: studentIds },
      status: "pending",
    })
      .populate("student", "name usn email department semester")
      .sort({ createdAt: 1 }); // Oldest first (FIFO review order)

    // ── Step 3: Send response ─────────────────────
    res.status(200).json({
      success: true,
      count: certificates.length,
      certificates,
    });
  } catch (error) {
    console.error("Get pending certificates error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching pending certificates.",
    });
  }
};

// ============================================
// @desc    Get faculty's own profile
// @route   GET /api/faculty/profile
// @access  Private (Faculty only)
// @returns { success, faculty }
// ============================================
const getFacultyProfile = async (req, res) => {
  try {
    // req.user already has the faculty document
    // from the protect middleware — no extra DB query needed
    res.status(200).json({
      success: true,
      faculty: {
        id: req.user._id,
        name: req.user.name,
        employeeId: req.user.employeeId,
        email: req.user.email,
        department: req.user.department,
        designation: req.user.designation,
        createdAt: req.user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get faculty profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile.",
    });
  }
};

module.exports = {
  getFacultyDashboard,
  getDepartmentStudents,
  getStudentProfile,
  verifyCertificate,
  getPendingCertificates,
  getFacultyProfile,
};