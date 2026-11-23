
// Admin Routes — Full system management
// All routes are restricted to authenticated admins.

const express = require("express");
const router = express.Router();

const {
  getAdminDashboard,
  getAllStudents,
  deleteStudent,
  toggleStudentStatus,
  getAllFaculty,
  addFaculty,
  deleteFaculty,
  toggleFacultyStatus,
} = require("../controllers/adminController");

const {
  addStudent,
} = require("../controllers/studentAdminController");

const {
  protect,
} = require("../middleware/authMiddleware");

const {
  authorizeRoles,
} = require("../middleware/roleMiddleware");

// Protect every route in this router.
router.use(protect);
router.use(authorizeRoles("admin"));

// Dashboard
router.get("/dashboard", getAdminDashboard);

// Student Management
router.get("/students", getAllStudents);
router.post("/student", addStudent);
router.delete("/student/:id", deleteStudent);
router.put("/student/:id/toggle", toggleStudentStatus);

// Faculty Management
router.get("/faculty", getAllFaculty);
router.post("/faculty", addFaculty);
router.delete("/faculty/:id", deleteFaculty);
router.put("/faculty/:id/toggle", toggleFacultyStatus);

module.exports = router;
