// ============================================
// Faculty Model — with Mongoose Triggers
//
// Triggers implemented:
//   PRE  save             → Hash password
//   PRE  save             → Normalize employeeId
//   POST save             → Log new faculty creation
//   PRE  findOneAndUpdate → Hash password if updated
//   POST findOneAndUpdate → Log profile updates
// ============================================

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const facultySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Faculty name is required"],
      trim: true,
    },
    employeeId: {
      type: String,
      required: [true, "Employee ID is required"],
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
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
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
    designation: {
      type: String,
      trim: true,
      default: "Assistant Professor",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // ── Trigger-managed ────────────────────────
    totalVerified: {
      type: Number,
      default: 0, // Auto-incremented by cert triggers
    },
  },
  { timestamps: true }
);

// ════════════════════════════════════════════════
// TRIGGER 1 — PRE SAVE
// Hash password + normalize employeeId
// ════════════════════════════════════════════════
facultySchema.pre("save", async function (next) {
  // Hash password if modified
  if (this.isModified("password")) {
    console.log(
      `🔐 [TRIGGER] Hashing password for faculty: ${this.employeeId}`
    );
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Normalize employeeId
  if (this.isModified("employeeId")) {
    this.employeeId = this.employeeId.toUpperCase().trim();
    console.log(
      `🔤 [TRIGGER] EmployeeId normalized: ${this.employeeId}`
    );
  }

  next();
});

// ════════════════════════════════════════════════
// TRIGGER 2 — POST SAVE
// Log when new faculty is created
// ════════════════════════════════════════════════
facultySchema.post("save", function (doc) {
  if (doc.isNew) {
    console.log(
      `✅ [TRIGGER] New faculty created: ${doc.name} (${doc.employeeId}) — Dept: ${doc.department}`
    );
  }
});

// ════════════════════════════════════════════════
// TRIGGER 3 — PRE findOneAndUpdate
// Hash password if it's being updated
// ════════════════════════════════════════════════
facultySchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  // Block employeeId modification
  if (update.employeeId || update?.$set?.employeeId) {
    const err = new Error(
      "Employee ID cannot be modified after account creation"
    );
    err.statusCode = 400;
    return next(err);
  }

  // Re-hash password if being updated
  const newPassword = update.password || update?.$set?.password;
  if (newPassword) {
    console.log(`🔐 [TRIGGER] Re-hashing updated faculty password`);
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    if (update.$set) update.$set.password = hashed;
    else update.password = hashed;
  }

  next();
});

// ════════════════════════════════════════════════
// TRIGGER 4 — POST findOneAndUpdate
// Log faculty profile updates
// ════════════════════════════════════════════════
facultySchema.post("findOneAndUpdate", function (doc) {
  if (doc) {
    console.log(
      `📝 [TRIGGER] Faculty profile updated: ${doc.name} (${doc.employeeId})`
    );
  }
});

// ════════════════════════════════════════════════
// INSTANCE METHOD — matchPassword
// ════════════════════════════════════════════════
facultySchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Faculty", facultySchema);