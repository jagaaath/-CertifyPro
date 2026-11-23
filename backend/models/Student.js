// ============================================
// Student Model — with Mongoose Triggers
//
// Triggers implemented:
//   PRE  save         → Hash password before save
//   PRE  save         → Normalize USN to uppercase
//   POST save         → Log new student creation
//   PRE  findOneAndUpdate → Prevent USN modification
//   PRE  findOneAndDelete → Cascade delete certificates
//   POST findOneAndDelete → Log deletion
// ============================================

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Student name is required"],
      trim: true,
    },
    usn: {
      type: String,
      required: [true, "USN is required"],
      unique: true,
      uppercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (email) =>
          /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(email) ||
          /^[a-z0-9._-]+@students\.invalid$/i.test(email),
        message: "Please enter a valid email address",
      },
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false,
    },
    department: {
      type: String,
      required: [true, "Department is required"],
      trim: true,
      enum: {
        values: ["CSE","ISE","ECE","EEE","MECH","CIVIL","AIDS","AIML"],
        message: "{VALUE} is not a valid department",
      },
    },
    semester: {
      type: Number,
      required: [true, "Semester is required"],
      min: [1, "Semester must be between 1 and 8"],
      max: [8, "Semester must be between 1 and 8"],
    },
    section: {
      type: String,
      trim: true,
      uppercase: true,
      enum: ["A", "B", "C"],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // ── Trigger-managed fields ─────────────────
    // These are updated automatically by triggers
    // Never set these manually in controllers
    lastLogin: {
      type: Date,
      default: null,
    },
    totalCertificates: {
      type: Number,
      default: 0, // Auto-incremented by certificate triggers
    },
    totalCreditsEarned: {
      type: Number,
      default: 0, // Auto-updated when cert is approved
    },
  },
  { timestamps: true }
);

// ════════════════════════════════════════════════
// TRIGGER 1 — PRE SAVE
// Fires BEFORE every student document is saved
// Purpose: Hash password + normalize USN
// ════════════════════════════════════════════════
studentSchema.pre("save", async function (next) {
  // ── 1a. Hash password if modified ─────────────
  if (this.isModified("password")) {
    console.log(`🔐 [TRIGGER] Hashing password for student: ${this.usn}`);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // ── 1b. Normalize USN to uppercase ────────────
  // Ensures consistent format even if admin
  // accidentally enters lowercase
  if (this.isModified("usn")) {
    this.usn = this.usn.toUpperCase();
    console.log(`🔤 [TRIGGER] USN normalized to: ${this.usn}`);
  }

  next();
});

// ════════════════════════════════════════════════
// TRIGGER 2 — POST SAVE
// Fires AFTER a student document is saved
// Purpose: Log creation of new students
// ════════════════════════════════════════════════
studentSchema.post("save", function (doc) {
  // this.isNew is true only for new documents
  // not for updates
  if (doc.wasNew) {
    console.log(
      `✅ [TRIGGER] New student created: ${doc.name} (${doc.usn}) — Dept: ${doc.department}`
    );
  }
});

// ════════════════════════════════════════════════
// TRIGGER 3 — PRE findOneAndUpdate
// Fires BEFORE every findOneAndUpdate call
// Purpose:
//   - Prevent USN from being changed
//   - Hash password if it's being updated
//   - Normalize email to lowercase
// ════════════════════════════════════════════════
studentSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  // ── 3a. Block USN modification ─────────────────
  // USN is the primary identifier — it must never
  // change after account creation
  if (update.usn || (update.$set && update.$set.usn)) {
    const err = new Error("USN cannot be modified after account creation");
    err.statusCode = 400;
    return next(err);
  }

  // ── 3b. Hash password if being updated ─────────
  const newPassword = update.password || update?.$set?.password;
  if (newPassword) {
    console.log(`🔐 [TRIGGER] Re-hashing updated password`);
    const salt = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    if (update.$set) {
      update.$set.password = hashed;
    } else {
      update.password = hashed;
    }
  }

  // ── 3c. Normalize email to lowercase ───────────
  const newEmail = update.email || update?.$set?.email;
  if (newEmail) {
    const normalized = newEmail.toLowerCase().trim();
    if (update.$set) update.$set.email = normalized;
    else update.email = normalized;
    console.log(`🔤 [TRIGGER] Email normalized to: ${normalized}`);
  }

  next();
});

// ════════════════════════════════════════════════
// TRIGGER 4 — PRE findOneAndDelete
// Fires BEFORE a student is deleted
// Purpose: Cascade delete all certificates
//          and their Cloudinary files
// ════════════════════════════════════════════════
studentSchema.pre("findOneAndDelete", async function (next) {
  try {
    // ── Get the student being deleted ─────────────
    const student = await this.model.findOne(this.getFilter());

    if (student) {
      console.log(
        `🗑️  [TRIGGER] Student deletion detected: ${student.name} (${student.usn})`
      );

      // ── Lazy require to avoid circular dependency ──
      const Certificate = mongoose.model("Certificate");
      const cloudinary  = require("../config/cloudinary");

      // ── Find all certificates of this student ─────
      const certificates = await Certificate.find({
        student: student._id,
      });

      if (certificates.length > 0) {
        console.log(
          `🗑️  [TRIGGER] Cascade deleting ${certificates.length} certificates from Cloudinary...`
        );

        // ── Delete files from Cloudinary ─────────────
        await Promise.all(
          certificates.map(async (cert) => {
            try {
              await cloudinary.uploader.destroy(cert.publicId, {
                resource_type: "auto",
              });
              console.log(
                `☁️  [TRIGGER] Cloudinary file deleted: ${cert.publicId}`
              );
            } catch (err) {
              console.error(
                `⚠️  [TRIGGER] Cloudinary delete failed for ${cert.publicId}:`,
                err.message
              );
            }
          })
        );

        // ── Delete certificate records from MongoDB ───
        const result = await Certificate.deleteMany({
          student: student._id,
        });

        console.log(
          `🗑️  [TRIGGER] Deleted ${result.deletedCount} certificate records from DB`
        );
      }
    }

    next();
  } catch (error) {
    console.error("❌ [TRIGGER] Pre-delete trigger failed:", error);
    next(error);
  }
});

// ════════════════════════════════════════════════
// TRIGGER 5 — POST findOneAndDelete
// Fires AFTER a student is deleted
// Purpose: Log the deletion event
// ════════════════════════════════════════════════
studentSchema.post("findOneAndDelete", function (doc) {
  if (doc) {
    console.log(
      `✅ [TRIGGER] Student permanently deleted: ${doc.name} (${doc.usn})`
    );
  }
});

// ════════════════════════════════════════════════
// INSTANCE METHOD — matchPassword
// ════════════════════════════════════════════════
studentSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Student", studentSchema);
