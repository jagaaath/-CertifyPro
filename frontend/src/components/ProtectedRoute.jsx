// ============================================
// ProtectedRoute Component
// Wraps routes that require authentication
// and optionally restricts to specific roles
//
// Usage:
//   <ProtectedRoute>              ← any logged-in user
//     <Dashboard />
//   </ProtectedRoute>
//
//   <ProtectedRoute role="student">   ← students only
//     <UploadCert />
//   </ProtectedRoute>
//
// Behavior:
//   Not logged in      → redirect to /
//   Wrong role         → redirect to their dashboard
//   Correct role       → render the children
// ============================================

import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ── Role → dashboard path mapping ─────────────
// Where to redirect each role's home screen
const ROLE_DASHBOARDS = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  admin:   "/admin/dashboard",
};

const ProtectedRoute = ({ children, role }) => {
  const { isAuth, role: userRole, loading } = useAuth();

  // ── Show nothing while checking auth ──────────
  // Prevents flash of wrong content during startup
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          {/* Spinning loader */}
          <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // ── Not authenticated → go to home (login) ────
  if (!isAuth) {
    return <Navigate to="/" replace />;
  }

  // ── Wrong role → redirect to their dashboard ──
  // e.g., a student trying to access /faculty/...
  if (role && userRole !== role) {
    const correctPath = ROLE_DASHBOARDS[userRole] || "/";
    return <Navigate to={correctPath} replace />;
  }

  // ── All checks passed → render the page ───────
  return children;
};

export default ProtectedRoute;