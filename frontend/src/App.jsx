// ============================================
// App.jsx — Root Component
// Defines all application routes using
// React Router v6
//
// Route Structure:
//   /                    → Home (role selector)
//   /student/login       → Student login
//   /faculty/login       → Faculty login
//   /admin/login         → Admin login
//   /student/dashboard   → Protected (student)
//   /student/upload      → Protected (student)
//   /faculty/dashboard   → Protected (faculty)
//   /faculty/student/:id → Protected (faculty)
//   /admin/dashboard     → Protected (admin)
// ============================================

import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

// ── Auth Pages (built in Phase 9) ─────────────
import Home from "./pages/Home";
import StudentLogin from "./pages/auth/StudentLogin";
import FacultyLogin from "./pages/auth/FacultyLogin";
import AdminLogin from "./pages/auth/AdminLogin";

// ── Student Pages (built in Phase 10) ─────────
import StudentDashboard from "./pages/student/StudentDashboard";
import UploadCertificate from "./pages/student/UploadCertificate";

// ── Faculty Pages (built in Phase 11) ─────────
import FacultyDashboard from "./pages/faculty/FacultyDashboard";
import StudentProfile from "./pages/faculty/StudentProfile";
import FacultyReports from "./pages/faculty/FacultyReports";

// ── Admin Pages (built in Phase 12) ───────────
import AdminDashboard from "./pages/admin/AdminDashboard";

function App() {
  return (
    // ── Wrap everything in AuthProvider ───────────
    // Every component below can use useAuth()
    <AuthProvider>
      <Router>
        {/* ── Toast notification container ──────── */}
        {/* Placed at root so toasts appear everywhere */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "#363636",
              color: "#fff",
              fontSize: "14px",
            },
            success: {
              style: { background: "#166534", color: "#fff" },
              iconTheme: { primary: "#fff", secondary: "#166534" },
            },
            error: {
              style: { background: "#991b1b", color: "#fff" },
              iconTheme: { primary: "#fff", secondary: "#991b1b" },
            },
          }}
        />

        <Routes>
          {/* ══════════════════════════════════════
              PUBLIC ROUTES
              Accessible without login
          ══════════════════════════════════════ */}

          {/* Home — role selection page */}
          <Route path="/" element={<Home />} />

          {/* Login pages */}
          <Route path="/student/login"  element={<StudentLogin />} />
          <Route path="/faculty/login"  element={<FacultyLogin />} />
          <Route path="/admin/login"    element={<AdminLogin />} />

          {/* ══════════════════════════════════════
              STUDENT ROUTES — role: student
          ══════════════════════════════════════ */}

          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute role="student">
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/upload"
            element={
              <ProtectedRoute role="student">
                <UploadCertificate />
              </ProtectedRoute>
            }
          />

          {/* ══════════════════════════════════════
              FACULTY ROUTES — role: faculty
          ══════════════════════════════════════ */}

          <Route
            path="/faculty/dashboard"
            element={
              <ProtectedRoute role="faculty">
                <FacultyDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/student/:studentId"
            element={
              <ProtectedRoute role="faculty">
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/faculty/reports"
            element={
              <ProtectedRoute role="faculty">
                <FacultyReports />
              </ProtectedRoute>
            }
          />

          {/* ══════════════════════════════════════
              ADMIN ROUTES — role: admin
          ══════════════════════════════════════ */}

          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          {/* ── Catch-all: redirect unknown URLs ── */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
