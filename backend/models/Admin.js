// ============================================
// Admin Model — with Mongoose Triggers
//
// Triggers implemented:
//   PRE  save             → Hash password
//   PRE  save             → Normalize email
//   POST save             → Log admin creation
//   PRE  findOneAndUpdate → Hash password if updated
// ============================================

const mongoose = require("mongoose");
const bcrypt   = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Admin name is required"],
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
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    // ── Trigger-managed ────────────────────────
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// ════════════════════════════════════════════════
// TRIGGER 1 — PRE SAVE
// Hash password + normalize email
// ════════════════════════════════════════════════
adminSchema.pre("save", async function (next) {
  // Hash password
  if (this.isModified("password")) {
    console.log(`🔐 [TRIGGER] Hashing admin password: ${this.email}`);
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Normalize email
  if (this.isModified("email")) {
    this.email = this.email.toLowerCase().trim();
    console.log(`🔤 [TRIGGER] Admin email normalized: ${this.email}`);
  }

  next();
});

// ════════════════════════════════════════════════
// TRIGGER 2 — POST SAVE
// Log when new admin account is created
// ════════════════════════════════════════════════
adminSchema.post("save", function (doc) {
  if (doc.isNew) {
    console.log(
      `✅ [TRIGGER] New admin created: ${doc.name} (${doc.email}) — SuperAdmin: ${doc.isSuperAdmin}`
    );
  }
});

// ════════════════════════════════════════════════
// TRIGGER 3 — PRE findOneAndUpdate
// Hash password if it is being updated
// ════════════════════════════════════════════════
adminSchema.pre("findOneAndUpdate", async function (next) {
  const update = this.getUpdate();

  const newPassword = update.password || update?.$set?.password;
  if (newPassword) {
    console.log(`🔐 [TRIGGER] Re-hashing updated admin password`);
    const salt   = await bcrypt.genSalt(10);
    const hashed = await bcrypt.hash(newPassword, salt);
    if (update.$set) update.$set.password = hashed;
    else update.password = hashed;
  }

  next();
});

// ════════════════════════════════════════════════
// INSTANCE METHOD — matchPassword
// ════════════════════════════════════════════════
adminSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("Admin", adminSchema);