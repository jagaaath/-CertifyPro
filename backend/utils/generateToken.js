// ============================================
// generateToken Utility
// Creates a signed JWT token containing the
// user's ID and role. Returned to client on
// successful login and sent back on every
// protected request inside the Authorization header.
//
// Token anatomy:
//   Header.Payload.Signature
//   Payload contains → { id, role, iat, exp }
// ============================================

const jwt = require("jsonwebtoken");

// ─────────────────────────────────────────────
// @function  generateToken
// @param     id    {ObjectId}  — MongoDB _id of the user
// @param     role  {String}    — 'student' | 'faculty' | 'admin'
// @returns   {String}          — Signed JWT token string
// ─────────────────────────────────────────────
const generateToken = (id, role) => {
  // jwt.sign(payload, secret, options)
  //
  // payload  → data embedded inside the token
  //            (readable by anyone — don't store passwords here)
  // secret   → used to sign + verify (keep it private in .env)
  // expiresIn → token becomes invalid after this duration
  //             "7d" means 7 days, "1h" = 1 hour, "30m" = 30 mins

  return jwt.sign(
    { id, role },               // Payload: who the user is + their role
    process.env.JWT_SECRET,     // Secret from .env
    { expiresIn: process.env.JWT_EXPIRE || "7d" } // Expiry from .env
  );
};

module.exports = generateToken;