// ============================================
// Role Middleware — authorizeRoles
// A factory function that returns a middleware
// which checks if the logged-in user's role
// matches the allowed roles for a route.
//
// Must be used AFTER the protect middleware
// because it relies on req.role being set.
//
// Usage example:
//   router.post(
//     "/upload",
//     protect,
//     authorizeRoles("student"),  ← only students allowed
//     uploadCertificate
//   );
//
//   router.get(
//     "/verify/:id",
//     protect,
//     authorizeRoles("faculty", "admin"),  ← both allowed
//     verifyCertificate
//   );
// ============================================

// ─────────────────────────────────────────────
// @function  authorizeRoles
// @param     ...roles  {String[]} — allowed roles
// @returns   middleware function
// ─────────────────────────────────────────────
const authorizeRoles = (...roles) => {
  // Return an actual middleware function
  // This closure has access to the 'roles' array
  return (req, res, next) => {
    // req.role was attached by protect middleware
    // Check if current user's role is in the allowed list
    if (!roles.includes(req.role)) {
      // Role not allowed — send 403 Forbidden
      // (403 = authenticated but not authorized)
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.role}' is not authorized to access this route.`,
      });
    }

    // Role is allowed — proceed to the controller
    next();
  };
};

module.exports = { authorizeRoles };