// ============================================
// Faculty Seed Script — for testing only
// Creates one test faculty member
//
// Usage: node utils/seedFaculty.js
// ============================================

require("dotenv").config();
const connectDB = require("../config/db");
const Faculty = require("../models/Faculty");

const seedFaculty = async () => {
  try {
    const { SEED_FACULTY_NAME, SEED_FACULTY_EMPLOYEE_ID, SEED_FACULTY_EMAIL,
      SEED_FACULTY_PASSWORD, SEED_FACULTY_DEPARTMENT } = process.env;
    if (!SEED_FACULTY_NAME || !SEED_FACULTY_EMPLOYEE_ID || !SEED_FACULTY_EMAIL ||
        !SEED_FACULTY_PASSWORD || !SEED_FACULTY_DEPARTMENT) {
      throw new Error("Set all SEED_FACULTY_* variables before seeding.");
    }
    await connectDB();

    const existing = await Faculty.findOne({ employeeId: SEED_FACULTY_EMPLOYEE_ID });
    if (existing) {
      console.log("⚠️  Test faculty already exists. Skipping.");
      process.exit(0);
    }

    const faculty = await Faculty.create({
      name: SEED_FACULTY_NAME,
      employeeId: SEED_FACULTY_EMPLOYEE_ID,
      email: SEED_FACULTY_EMAIL,
      password: SEED_FACULTY_PASSWORD,
      department: SEED_FACULTY_DEPARTMENT,
      designation: process.env.SEED_FACULTY_DESIGNATION || "Faculty",
    });

    console.log("✅ Test faculty created!");
    console.log("─────────────────────────────────");
    console.log(`   Name       : ${faculty.name}`);
    console.log(`   EmployeeId : ${faculty.employeeId}`);
    console.log(`   Department : ${faculty.department}`);
    console.log("─────────────────────────────────");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1);
  }
};

seedFaculty();
