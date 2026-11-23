const {
  getStudentProfile,
  updateStudentProfile,
  syncStudentStats,
} = require("../controllers/studentController");

const { protect }        = require("../middleware/authMiddleware");
const { authorizeRoles } = require("../middleware/roleMiddleware");
const { getNotices } = require("../controllers/noticeController");

const express = require("express");
const router  = express.Router();

router.use(protect);
router.use(authorizeRoles("student"));

router.get("/profile",  getStudentProfile);
router.get("/notices", getNotices);
router.put("/profile",  updateStudentProfile);

// ── Manual sync endpoint ───────────────────────
// Fixes any mismatch between trigger values
// and live calculated values
router.post("/sync", syncStudentStats);

module.exports = router;
