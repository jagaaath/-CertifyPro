
require("dotenv").config();

const mongoose = require("mongoose");

// Prevent automatic index creation before checking old records.
mongoose.set("autoIndex", false);

const connectDB = require("../config/db");
const Student = require("../models/Student");

async function findDuplicates(field) {
  const trimmedValue = {
    $trim: {
      input: {
        $ifNull: [`$${field}`, ""],
      },
    },
  };

  const normalizedValue =
    field === "usn"
      ? { $toUpper: trimmedValue }
      : { $toLower: trimmedValue };

  return Student.aggregate([
    {
      $match: {
        [field]: { $type: "string" },
      },
    },
    {
      $project: {
        normalized: normalizedValue,
        student: {
          _id: "$_id",
          name: "$name",
          usn: "$usn",
          email: "$email",
          department: "$department",
        },
      },
    },
    {
      $match: {
        normalized: { $ne: "" },
      },
    },
    {
      $group: {
        _id: "$normalized",
        count: { $sum: 1 },
        students: { $push: "$student" },
      },
    },
    {
      $match: {
        count: { $gt: 1 },
      },
    },
  ]);
}

async function ensureStudentIndexes() {
  let connected = false;

  try {
    await connectDB();
    connected = true;

    console.log("\nChecking student records in MongoDB Atlas...\n");

    const duplicateUSNs = await findDuplicates("usn");
    const duplicateEmails = await findDuplicates("email");

    if (duplicateUSNs.length > 0 || duplicateEmails.length > 0) {
      console.error("Duplicate records were found.");

      if (duplicateUSNs.length > 0) {
        console.error("\nDuplicate USNs:");
        console.dir(duplicateUSNs, { depth: null });
      }

      if (duplicateEmails.length > 0) {
        console.error("\nDuplicate emails:");
        console.dir(duplicateEmails, { depth: null });
      }

      console.error(
        "\nResolve the duplicates manually before creating unique indexes."
      );

      process.exitCode = 1;
      return;
    }

    console.log("No duplicate USNs or emails found.");
    console.log("Creating unique indexes...\n");

    // Student.js already declares unique:true on USN and email.
    await Student.createIndexes();

    const indexes = await Student.collection.indexes();

    const usnIndexExists = indexes.some(
      (index) =>
        index.key?.usn === 1 &&
        index.unique === true
    );

    const emailIndexExists = indexes.some(
      (index) =>
        index.key?.email === 1 &&
        index.unique === true
    );

    if (!usnIndexExists || !emailIndexExists) {
      throw new Error(
        "Could not confirm both unique MongoDB indexes."
      );
    }

    console.log("SUCCESS!");
    console.log("USN unique index: active");
    console.log("Email unique index: active");
    console.log("Duplicate student insertion is protected.");
  } catch (error) {
    console.error("Index setup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (connected) {
      await mongoose.disconnect();
    }
  }
}

ensureStudentIndexes();
