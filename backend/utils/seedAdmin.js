// ============================================
// Admin Seed Script
// Creates the first Admin account in MongoDB
// Run this ONCE manually to set up the system
//
// Usage:
//   cd backend
//   node utils/seedAdmin.js
//
// Configure SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_NAME
// in backend/.env before running. Never use a default production password.
// ============================================
// ✅ Point explicitly to the backend .env
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const mongoose = require("mongoose");
const Admin = require("../models/Admin");
const connectDB = require("../config/db");

const seedAdmin = async () => {
  try {
    const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
    const password = process.env.SEED_ADMIN_PASSWORD;
    const name = process.env.SEED_ADMIN_NAME?.trim();
    if (!email || !password || !name) {
      throw new Error("Set SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD, and SEED_ADMIN_NAME before seeding.");
    }

    // ── Connect to MongoDB ───────────────────────
    await connectDB();
    console.log("🔌 Connected to MongoDB for seeding...");

    // ── Check if admin already exists ───────────
    // Prevent creating duplicate admin accounts
    const existingAdmin = await Admin.findOne({
      email,
    });

    if (existingAdmin) {
      console.log("⚠️  Admin already exists. Skipping seed.");
      process.exit(0); // Exit cleanly
    }

    // ── Create the admin document ────────────────
    // The pre-save hook in Admin.js will
    // automatically hash the password before saving
    const admin = await Admin.create({
      name,
      email,
      password, // Will be hashed automatically
      isSuperAdmin: true,
    });

    console.log("✅ Admin seeded successfully!");
    console.log("─────────────────────────────────");
    console.log(`   Name  : ${admin.name}`);
    console.log(`   Email : ${admin.email}`);
    console.log("─────────────────────────────────");

    process.exit(0); // Exit cleanly after success
  } catch (error) {
    console.error("❌ Seed failed:", error.message);
    process.exit(1); // Exit with failure code
  }
};

// Run the seed function
seedAdmin();
