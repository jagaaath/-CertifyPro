// ============================================
// Navbar Component
// Top navigation bar shown on all dashboard pages
// Shows user info + logout button
// ============================================

import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";

// Role-specific color accents
const ROLE_STYLES = {
  student: { bg: "bg-blue-600",   dot: "bg-blue-300" },
  faculty: { bg: "bg-emerald-600", dot: "bg-emerald-300" },
  admin:   { bg: "bg-purple-600",  dot: "bg-purple-300" },
};

const Navbar = ({ title }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const styles = ROLE_STYLES[role] || ROLE_STYLES.student;

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/", { replace: true });
  };

  return (
    <nav className={`${styles.bg} shadow-lg`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Left — Logo + page title */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-white text-xl">📜</span>
              <span className="text-white font-bold text-lg hidden sm:block">
                CertifyPro
              </span>
            </div>
            {title && (
              <>
                <div className="w-px h-5 bg-white bg-opacity-30" />
                <span className="text-white text-opacity-90 text-sm font-medium">
                  {title}
                </span>
              </>
            )}
          </div>

          {/* Right — User info + logout */}
          <div className="flex items-center gap-4">

            {/* User info */}
            <div className="flex items-center gap-2">
              {/* Online indicator dot */}
              <div className={`w-2 h-2 rounded-full ${styles.dot}
                              animate-pulse`} />
              <div className="hidden sm:block text-right">
                <p className="text-white text-sm font-medium leading-none">
                  {user?.name}
                </p>
                <p className="text-white text-opacity-70 text-xs mt-0.5 capitalize">
                  {role} ·{" "}
                  {role === "student"
                    ? user?.usn
                    : role === "faculty"
                    ? user?.employeeId
                    : user?.email}
                </p>
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white bg-opacity-20
                         hover:bg-opacity-30 text-white text-sm font-medium
                         px-3 py-1.5 rounded-lg transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6
                  4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3
                  3 0 013 3v1" />
              </svg>
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;