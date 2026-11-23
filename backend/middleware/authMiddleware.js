// ============================================
// Auth Middleware — protect
// Verifies the JWT token sent in the request
// header. If valid, attaches user info to
// req.user so controllers can identify who
// is making the request.
//
// How the client sends the token:
//   Header: Authorization: Bearer <token>
//
// Flow:
//   Request → Extract token → Verify → Attach user → Next
//   Request → No token / Invalid → 401 Unauthorized
// ============================================

const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Faculty = require("../models/Faculty");
const Admin = require("../models/Admin");

// ─────────────────────────────────────────────
// @middleware  protect
// @desc        Verifies JWT and attaches
//              req.user + req.role to request
// @usage       router.get("/route", protect, controller)
// ─────────────────────────────────────────────
const protect = async (req, res, next) => {
  let token;

  // ── Step 1: Extract token from header ───────
  // Standard format: "Authorization: Bearer eyJhbGci..."
  // We check the header exists and starts with "Bearer"
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    // Split "Bearer <token>" and grab the token part
    token = req.headers.authorization.split(" ")[1];
  }

  // ── Step 2: Check if token exists ───────────
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Access denied. No token provided. Please log in.",
    });
  }

  try {
    // ── Step 3: Verify and decode the token ─────
    // jwt.verify throws an error if:
    //   - Token is invalid (tampered)
    //   - Token has expired
    // If valid, returns the decoded payload: { id, role, iat, exp }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // ── Step 4: Find the user in the correct collection ──
    // Based on the role stored in the token, we look up
    // the user in the appropriate MongoDB collection.
    // We select +password: false is already default,
    // so we get the user without their password hash.
    let user;

    if (decoded.role === "student") {
      user = await Student.findById(decoded.id);
    } else if (decoded.role === "faculty") {
      user = await Faculty.findById(decoded.id);
    } else if (decoded.role === "admin") {
      user = await Admin.findById(decoded.id);
    }

    // ── Step 5: Check if user still exists ──────
    // The user may have been deleted after the token was issued
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User no longer exists. Please log in again.",
      });
    }

    // ── Step 6: Check if user account is active ─
    // Only Student and Faculty have isActive field
    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact admin.",
      });
    }

    // ── Step 7: Attach user info to request ─────
    // Controllers can now access:
    //   req.user  → full user document from DB
    //   req.role  → 'student' | 'faculty' | 'admin'
    req.user = user;
    req.role = decoded.role;

    // ── Step 8: Pass control to next handler ────
    next();
  } catch (error) {
    // jwt.verify threw an error — token is invalid or expired
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token. Please log in again.",
    });
  }
};

module.exports = { protect };