// ============================================
// One-time resync script
// Fixes all existing students whose trigger
// fields are out of sync with actual data
//
// Run: node utils/resyncAllStudents.js
// ============================================

require("dotenv").config();
const mongoose    = require("mongoose");
const connectDB   = require("../config/db");
const Student     = require("../models/Student");
const Certificate = require("../models/Certificate");

const resyncAll = async () => {
  try {
    await connectDB();
    console.log("🔌 Connected. Starting resync...\n");

    // Get all students
    const students = await Student.find({});
    console.log(`📋 Found ${students.length} students to resync\n`);

    let fixed = 0;

    for (const student of students) {
      // Count actual certificates
      const totalCertificates = await Certificate.countDocuments({
        student: student._id,
      });

      // Sum approved credits
      const result = await Certificate.aggregate([
        {
          $match: {
            student: student._id,
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
        result.length > 0 ? result[0].total : 0;

      // Check if out of sync
      const isOutOfSync =
        student.totalCertificates !== totalCertificates ||
        student.totalCreditsEarned !== totalCreditsEarned;

      if (isOutOfSync) {
        await Student.findByIdAndUpdate(student._id, {
          $set: { totalCertificates, totalCreditsEarned },
        });

        console.log(`✅ Fixed: ${student.name} (${student.usn})`);
        console.log(
          `   Certs:   ${student.totalCertificates} → ${totalCertificates}`
        );
        console.log(
          `   Credits: ${student.totalCreditsEarned} → ${totalCreditsEarned}\n`
        );
        fixed++;
      } else {
        console.log(
          `✓  In sync: ${student.name} — ${totalCertificates} certs, ${totalCreditsEarned} credits`
        );
      }
    }

    console.log(`\n🎉 Resync complete! Fixed ${fixed}/${students.length} students.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Resync failed:", error);
    process.exit(1);
  }
};

resyncAll();