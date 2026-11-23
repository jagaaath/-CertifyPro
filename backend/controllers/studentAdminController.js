
const Student = require("../models/Student");

// Escape special characters before using a value in a regex.
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const addStudent = async (req, res) => {
  try {
    const {
      name,
      usn,
      email,
      password,
      department,
      semester,
    } = req.body;

    // Validate required fields.
    if (
      !name ||
      !usn ||
      !email ||
      !password ||
      !department ||
      semester === undefined ||
      semester === ""
    ) {
      return res.status(400).json({
        success: false,
        message: "All student fields are required.",
      });
    }

    // Normalize student information.
    const normalizedName = String(name).trim();
    const normalizedUSN = String(usn).trim().toUpperCase();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedDepartment = String(department).trim().toUpperCase();
    const numericSemester = Number(semester);

    if (
      !normalizedName ||
      !normalizedUSN ||
      !normalizedEmail ||
      !normalizedDepartment
    ) {
      return res.status(400).json({
        success: false,
        message: "Student details cannot be empty.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must contain at least 6 characters.",
      });
    }

    if (
      !Number.isInteger(numericSemester) ||
      numericSemester < 1 ||
      numericSemester > 8
    ) {
      return res.status(400).json({
        success: false,
        message: "Semester must be between 1 and 8.",
      });
    }

    // Check for an existing USN, ignoring letter case.
    const existingUSN = await Student.findOne({
      usn: {
        $regex: `^${escapeRegex(normalizedUSN)}$`,
        $options: "i",
      },
    }).select("_id");

    if (existingUSN) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_USN",
        message: `USN ${normalizedUSN} is already registered.`,
      });
    }

    // Check for an existing email, ignoring letter case.
    const existingEmail = await Student.findOne({
      email: {
        $regex: `^${escapeRegex(normalizedEmail)}$`,
        $options: "i",
      },
    }).select("_id");

    if (existingEmail) {
      return res.status(409).json({
        success: false,
        code: "DUPLICATE_EMAIL",
        message: "This email address is already registered.",
      });
    }

    // Create the student.
    // Student.js automatically hashes the password.
    const student = await Student.create({
      name: normalizedName,
      usn: normalizedUSN,
      email: normalizedEmail,
      password,
      department: normalizedDepartment,
      semester: numericSemester,
    });

    return res.status(201).json({
      success: true,
      message: "Student successfully saved to MongoDB Atlas.",
      student: {
        id: student._id,
        name: student.name,
        usn: student.usn,
        email: student.email,
        department: student.department,
        semester: student.semester,
        isActive: student.isActive,
        createdAt: student.createdAt,
      },
    });
  } catch (error) {
    console.error("Add student error:", error);

    // MongoDB unique indexes provide protection against
    // simultaneous requests attempting duplicate insertion.
    if (error.code === 11000) {
      const duplicateField =
        Object.keys(error.keyPattern || {})[0] ||
        Object.keys(error.keyValue || {})[0];

      if (duplicateField === "usn") {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_USN",
          message: "This USN is already registered.",
        });
      }

      if (duplicateField === "email") {
        return res.status(409).json({
          success: false,
          code: "DUPLICATE_EMAIL",
          message: "This email address is already registered.",
        });
      }

      return res.status(409).json({
        success: false,
        code: "DUPLICATE_STUDENT",
        message: "This student record already exists.",
      });
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map(
        (item) => item.message
      );

      return res.status(400).json({
        success: false,
        message: messages.join(", "),
      });
    }

    return res.status(500).json({
      success: false,
      message: "Server error while saving student.",
    });
  }
};

module.exports = { addStudent };
