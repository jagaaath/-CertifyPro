// ============================================
// Student Seed Script — for testing only
// Creates one test student to verify
// the certificate upload API works
//
// Usage: node utils/seedStudent.js
// ============================================

require("dotenv").config();
const connectDB = require("../config/db");
const Student = require("../models/Student");

const seedStudent = async () => {
  try {
    const { SEED_STUDENT_NAME, SEED_STUDENT_USN, SEED_STUDENT_EMAIL,
      SEED_STUDENT_PASSWORD, SEED_STUDENT_DEPARTMENT, SEED_STUDENT_SEMESTER } = process.env;
    if (!SEED_STUDENT_NAME || !SEED_STUDENT_USN || !SEED_STUDENT_EMAIL ||
        !SEED_STUDENT_PASSWORD || !SEED_STUDENT_DEPARTMENT || !SEED_STUDENT_SEMESTER) {
      throw new Error("Set all SEED_STUDENT_* variables before seeding.");
    }
    await connectDB();

    // Check if test student already exists
    const existing = await Student.findOne({ usn: SEED_STUDENT_USN });
    if (existing) {
      console.log("⚠️  Test student already exists. Skipping.");
      process.exit(0);
    }

    // Create test student
    // Password will be hashed automatically by pre-save hook
    const student = await Student.create({
      name: SEED_STUDENT_NAME,
      usn: SEED_STUDENT_USN,
      email: SEED_STUDENT_EMAIL,
      password: SEED_STUDENT_PASSWORD,
      department: SEED_STUDENT_DEPARTMENT,
      semester: Number(SEED_STUDENT_SEMESTER),
    });

    console.log("✅ Test student created!");
    console.log("─────────────────────────────────");
    console.log(`   Name : ${student.name}`);
    console.log(`   USN  : ${student.usn}`);
    console.log("─────────────────────────────────");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedStudent();
