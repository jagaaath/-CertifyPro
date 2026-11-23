
// ============================================
// Student Controller
// Returns student profile, certificate activity
// and total registered students from MongoDB Atlas.
// ============================================

const Student = require("../models/Student");
const Certificate = require("../models/Certificate");

// ============================================
// GET STUDENT PROFILE
// GET /api/student/profile
// ============================================

const getStudentProfile = async (req, res) => {
  try {
    // Get the currently logged-in student.
    const student = await Student.findById(req.user._id);

    if (!student) {
      return res.status(404).json({
        success: false,
        message: "Student profile not found.",
      });
    }

    // Count every registered student document in Atlas.
    const totalStudents = await Student.countDocuments({});

    // Fetch certificates belonging to the logged-in student.
    const certificates = await Certificate.find({
      student: req.user._id,
    })
      .populate("verifiedBy", "name employeeId designation")
      .sort({ createdAt: -1 });

    // Calculate this student's certificate counts.
    const liveCounts = {
      total: certificates.length,

      pending: certificates.filter(
        (cert) => cert.status === "pending"
      ).length,

      approved: certificates.filter(
        (cert) => cert.status === "approved"
      ).length,

      rejected: certificates.filter(
        (cert) => cert.status === "rejected"
      ).length,
    };

    // Generate recent certificate activity.
    const activityFeed = certificates
      .flatMap((cert) =>
        (cert.statusHistory || []).map((history) => ({
          certId: cert._id,
          certTitle: cert.title,
          status: history.status,
          changedAt: history.changedAt,
          note: history.note,
        }))
      )
      .sort(
        (a, b) =>
          new Date(b.changedAt) - new Date(a.changedAt)
      )
      .slice(0, 10);

    return res.status(200).json({
      success: true,

      // Top-level count for the frontend.
      totalStudents,

      student: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        section: student.section,
        isActive: student.isActive,
        createdAt: student.createdAt,
        totalCertificates: student.totalCertificates,
        totalCreditsEarned: student.totalCreditsEarned,

        // Also return the count inside student.
        totalStudents,
      },

      stats: {
        ...liveCounts,
        totalCreditsEarned: student.totalCreditsEarned,
      },

      activityFeed,
    });
  } catch (error) {
    console.error("Get student profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error while fetching profile.",
    });
  }
};

// ============================================
// UPDATE STUDENT PROFILE
// PUT /api/student/profile
// ============================================

const updateStudentProfile = async (req, res) => {
  try {
    const { email, semester } = req.body;
    const updateFields = {};

    if (email) {
      const normalizedEmail = String(email)
        .trim()
        .toLowerCase();

      const emailExists = await Student.findOne({
        email: normalizedEmail,
        _id: { $ne: req.user._id },
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: "This email is already in use.",
        });
      }

      updateFields.email = normalizedEmail;
    }

    if (
      semester !== undefined &&
      semester !== null &&
      semester !== ""
    ) {
      const sem = Number(semester);

      if (
        !Number.isInteger(sem) ||
        sem < 1 ||
        sem > 8
      ) {
        return res.status(400).json({
          success: false,
          message: "Semester must be between 1 and 8.",
        });
      }

      updateFields.semester = sem;
    }

    const updatedStudent = await Student.findByIdAndUpdate(
      req.user._id,
      { $set: updateFields },
      {
        new: true,
        runValidators: true,
      }
    ).select("-password");

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      student: updatedStudent,
    });
  } catch (error) {
    console.error("Update student profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "This email is already in use.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while updating profile.",
    });
  }
};

// ============================================
// SYNC STUDENT STATISTICS
// POST /api/student/sync
// Kept for compatibility with existing routes.
// ============================================

const syncStudentStats = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const studentId = req.user._id;

    const totalCertificates = await Certificate.countDocuments({
      student: studentId,
    });

    // Only approved certificates contribute to credits.
    const creditResult = await Certificate.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(
            studentId.toString()
          ),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          total: {
            $sum: "$creditsEarned",
          },
        },
      },
    ]);

    const totalCreditsEarned =
      creditResult.length > 0
        ? creditResult[0].total
        : 0;

    await Student.findByIdAndUpdate(studentId, {
      $set: {
        totalCertificates,
        totalCreditsEarned,
      },
    });

    console.log(
      `[MANUAL SYNC] Student ${studentId}: ` +
      `${totalCertificates} certificates, ` +
      `${totalCreditsEarned} credits`
    );

    return res.status(200).json({
      success: true,
      message: "Stats synced successfully.",
      synced: {
        totalCertificates,
        totalCreditsEarned,
      },
    });
  } catch (error) {
    console.error("Student stats sync error:", error);

    return res.status(500).json({
      success: false,
      message: "Sync failed.",
    });
  }
};

// ============================================
// EXPORT
// ============================================

module.exports = {
  getStudentProfile,
  updateStudentProfile,
  syncStudentStats,
};
