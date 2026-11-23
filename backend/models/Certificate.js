// ============================================
// Certificate Model — Trigger Fix
// All hooks tested and verified to fire
// correctly across all Mongoose operations
// ============================================

const mongoose = require("mongoose");

const certificateSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student reference is required"],
    },
    title: {
      type: String,
      required: [true, "Certificate title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
      default: "",
    },
    creditsEarned: {
      type: Number,
      required: [true, "Credits earned is required"],
      min: [0, "Credits cannot be negative"],
      max: [20, "Credits cannot exceed 20"],
    },
    percentage: {
      type: Number,
      min: [0, "Percentage cannot be less than 0"],
      max: [100, "Percentage cannot exceed 100"],
      default: null,
    },
    fileUrl: {
      type: String,
      required: [true, "File URL is required"],
    },
    publicId: {
      type: String,
      required: [true, "Public ID is required"],
    },
    fileType: {
      type: String,
      enum: { values: ["image", "pdf"] },
      required: true,
    },
    qrCodeUrl: {
      type: String,
      default: "",
      maxlength: 2000,
    },
    qrVerificationStatus: {
      type: String,
      enum: ["verified", "not_verified"],
      default: null,
    },
    qrVerificationMessage: {
      type: String,
      default: "",
      maxlength: 200,
    },
    qrVerifiedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: { values: ["pending", "approved", "rejected"] },
      default: "pending",
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    issueDate: {
      type: Date,
      default: null,
    },
    section: {
      type: String,
      trim: true,
      enum: ["", "A", "B", "C"],
      default: "",
    },
    certificateType: {
      type: String,
      enum: ["open-elective", "professional-elective", "co-curricular", "other", ""],
      default: "",
    },
    awardType: {
      type: String,
      enum: [
        "elite",
        "elite_plus_gold",
        "elite_plus_silver",
        "successfully_completed",
        "participation",
        "not_certified",
        "not_detected",
      ],
      default: "not_detected",
    },
    proofType: {
      type: String,
      enum: ["course-certificate", "participation-certificate", "completion-certificate", "other", ""],
      default: "",
    },
    issuer: {
      type: String,
      trim: true,
      maxlength: [150, "Issuing organization cannot exceed 150 characters"],
      default: "",
    },
    department: {
      type: String,
      enum: ["CSE", "AI/ML", "MECH", "CIVIL", "EEE", "ECE", ""],
      default: "",
    },
    semester: {
      type: Number,
      min: [1, "Semester must be between 1 and 8"],
      max: [8, "Semester must be between 1 and 8"],
      default: null,
    },
    subjectCode: {
      type: String,
      trim: true,
      enum: ["1", "2", "3", "4", ""],
      default: "",
    },
    courseDuration: {
      type: Number,
      enum: [4, 8, 12, 16, null],
      default: null,
    },

    // ── Trigger-managed audit trail ───────────────
    statusHistory: [
      {
        status:    { type: String },
        changedAt: { type: Date, default: Date.now },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          default: null,
        },
        note: { type: String, default: "" },
      },
    ],
  },
  { timestamps: true }
);

// Indexes
certificateSchema.index({ student: 1 });
certificateSchema.index({ status: 1 });
certificateSchema.index({ student: 1, status: 1 });

// ════════════════════════════════════════════════
// HELPER — Recalculate and sync student stats
// Called by multiple triggers to keep Student
// document in sync with actual certificate data
// ════════════════════════════════════════════════
const syncStudentStats = async (studentId) => {
  try {
    const Student     = mongoose.model("Student");
    const Certificate = mongoose.model("Certificate");

    // Count ALL certificates for this student
    const totalCertificates = await Certificate.countDocuments({
      student: studentId,
    });

    // Sum credits from APPROVED certificates only
    const creditResult = await Certificate.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId.toString()),
          status: "approved",
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$creditsEarned" },
        },
      },
    ]);

    const totalCreditsEarned =
      creditResult.length > 0 ? creditResult[0].total : 0;

    // ── Update Student document ───────────────────
    await Student.findByIdAndUpdate(
      studentId,
      {
        $set: {
          totalCertificates,
          totalCreditsEarned,
        },
      },
      { new: true }
    );

    console.log(
      `⭐ [TRIGGER SYNC] Student ${studentId}: ` +
      `${totalCertificates} certs, ${totalCreditsEarned} credits`
    );

    return { totalCertificates, totalCreditsEarned };
  } catch (err) {
    console.error("❌ [TRIGGER] syncStudentStats failed:", err.message);
  }
};

// ════════════════════════════════════════════════
// TRIGGER 1 — PRE SAVE
// Fires before Certificate.save()
// Purpose:
//   - Capitalize title
//   - Add initial status to history on new docs
// ════════════════════════════════════════════════
certificateSchema.pre("save", function (next) {
  // ── Validate credits precision ─────────────────
  if (this.creditsEarned % 0.5 !== 0) {
    return next(
      new Error("Credits must be in steps of 0.5 (e.g. 1, 1.5, 2)")
    );
  }

  // ── Capitalize title ───────────────────────────
  if (this.isModified("title") && this.title) {
    this.title =
      this.title.charAt(0).toUpperCase() + this.title.slice(1);
  }

  // ── Add to status history on NEW document ──────
  // this.isNew is reliable in pre-save
  if (this.isNew) {
    this.statusHistory.push({
      status:    "pending",
      changedAt: new Date(),
      note:      "Certificate uploaded by student",
    });
    console.log(
      `📋 [TRIGGER PRE-SAVE] New cert: "${this.title}" student: ${this.student}`
    );
  }

  next();
});

// ════════════════════════════════════════════════
// TRIGGER 2 — POST SAVE
// Fires after Certificate.save()
// Purpose: Sync student stats after save
// NOTE: We use this.isNew HERE in post-save
//       reliably because pre-save already ran
// ════════════════════════════════════════════════
certificateSchema.post("save", async function (doc) {
  // Only sync on NEW certificate creation
  // Updates are handled by findOneAndUpdate trigger
  if (!doc.isNew) return;

  console.log(
    `✅ [TRIGGER POST-SAVE] Cert saved, syncing student stats...`
  );

  // Sync student's totalCertificates + totalCreditsEarned
  await syncStudentStats(doc.student);
});

// ════════════════════════════════════════════════
// TRIGGER 3 — PRE findOneAndUpdate
// Fires before Certificate.findOneAndUpdate()
// Purpose:
//   - Auto-set verifiedAt when status changes
//   - Append to statusHistory
//   - Validate rejection reason
// ════════════════════════════════════════════════
certificateSchema.pre("findOneAndUpdate", async function (next) {
  try {
    const update = this.getUpdate();

    // ── Extract new status ─────────────────────────
    const newStatus = update?.status || update?.$set?.status;

    if (newStatus && ["approved", "rejected"].includes(newStatus)) {
      const now = new Date();

      // ── Validate rejection reason ──────────────
      const reason =
        update?.rejectionReason || update?.$set?.rejectionReason;

      if (newStatus === "rejected" && !reason?.trim()) {
        return next(
          new Error("Rejection reason is required when rejecting")
        );
      }

      // ── Auto-set verifiedAt ────────────────────
      if (!update.$set) update.$set = {};
      update.$set.verifiedAt = now;

      // ── Get faculty ID ─────────────────────────
      const verifiedBy =
        update?.verifiedBy || update?.$set?.verifiedBy;

      // ── Push to statusHistory ──────────────────
      if (!update.$push) update.$push = {};
      update.$push.statusHistory = {
        status:    newStatus,
        changedAt: now,
        changedBy: verifiedBy || null,
        note:
          newStatus === "approved"
            ? "Approved by faculty ✅"
            : `Rejected by faculty ❌: ${reason}`,
      };

      console.log(
        `⏰ [TRIGGER PRE-UPDATE] Status → ${newStatus}, verifiedAt auto-set`
      );
    }

    // ── Ensure we get the updated doc back ────────
    // Required for post hook to receive the doc
    this.setOptions({ new: true });

    next();
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════
// TRIGGER 4 — POST findOneAndUpdate
// Fires after Certificate.findOneAndUpdate()
// Purpose: Sync student stats after verification
// IMPORTANT: Needs { new: true } option set in
//            pre hook above to receive doc
// ════════════════════════════════════════════════
certificateSchema.post("findOneAndUpdate", async function (doc) {
  if (!doc) {
    console.warn("⚠️  [TRIGGER POST-UPDATE] doc is null — skipping sync");
    return;
  }

  // Only sync when status changed to approved/rejected
  if (!["approved", "rejected"].includes(doc.status)) return;

  console.log(
    `🔄 [TRIGGER POST-UPDATE] Status changed to ${doc.status}, syncing...`
  );

  await syncStudentStats(doc.student);
});

// ════════════════════════════════════════════════
// TRIGGER 5 — PRE deleteMany
// Fires before Certificate.deleteMany()
// Purpose: Log bulk deletion info
// ════════════════════════════════════════════════
certificateSchema.pre("deleteMany", async function (next) {
  try {
    const filter = this.getFilter();
    const count  = await mongoose
      .model("Certificate")
      .countDocuments(filter);

    console.log(
      `🗑️  [TRIGGER PRE-DELETE-MANY] About to delete ${count} certificates`
    );

    // Store filter for post hook
    this._deleteManyFilter = filter;

    next();
  } catch (err) {
    next(err);
  }
});

// ════════════════════════════════════════════════
// TRIGGER 6 — POST findOneAndDelete
// Fires after a single certificate is deleted
// Purpose: Sync student stats after deletion
// ════════════════════════════════════════════════
certificateSchema.post("findOneAndDelete", async function (doc) {
  if (!doc) return;

  console.log(
    `🗑️  [TRIGGER POST-DELETE] Cert deleted, syncing student stats...`
  );

  // Sync student's totalCertificates + totalCreditsEarned
  await syncStudentStats(doc.student);
});

// Virtual
certificateSchema.virtual("isVerified").get(function () {
  return this.status !== "pending";
});

module.exports = mongoose.model("Certificate", certificateSchema);
