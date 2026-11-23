// ============================================
// StudentLogin Page
// Login form for students using USN + password
//
// On success:
//   1. Saves token + user to AuthContext
//   2. Shows success toast
//   3. Redirects to /student/dashboard
// ============================================

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axios";
import AuthLayout from "../../components/AuthLayout";

const StudentLogin = () => {
  const navigate = useNavigate();
  const { login, isAuth, role } = useAuth();

  // ── Form state ─────────────────────────────────
  const [formData, setFormData] = useState({
    usn: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Redirect if already logged in ─────────────
  useEffect(() => {
    if (isAuth && role === "student") {
      navigate("/student/dashboard", { replace: true });
    }
  }, [isAuth, role, navigate]);

  // ── Handle input change ────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ── Client-side validation ─────────────────────
  const validate = () => {
    const newErrors = {};

    if (!formData.usn.trim()) {
      newErrors.usn = "USN is required";
    } else if (formData.usn.trim().length < 5) {
      newErrors.usn = "Please enter a valid USN";
    }

    if (!formData.password) {
      newErrors.password = "Date of birth is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Form submit handler ────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Run validation first
    if (!validate()) return;

    setLoading(true);

    try {
      // ── API call to backend ──────────────────────
      const res = await axiosInstance.post("/auth/student/login", {
        usn: formData.usn.toUpperCase().trim(),
        password: formData.password,
      });

      if (res.data.success) {
        // ── Save auth data to context + localStorage ─
        login(res.data.token, res.data.student, "student");

        // ── Show success notification ────────────────
        toast.success(`Welcome back, ${res.data.student.name}! 🎓`);

        // ── Navigate to student dashboard ────────────
        navigate("/student/dashboard", { replace: true });
      }
    } catch (error) {
      // ── Handle error responses ───────────────────
      const message =
        error.response?.data?.message ||
        "Login failed. Please try again.";
      toast.error(message);

      // Show specific field errors if returned
      if (error.response?.status === 401) {
        setErrors({ usn: " ", password: "Invalid USN or password" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="student">
      {/* ── Form Card ──────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xl p-8">

        {/* Header */}
        <div className="mb-8">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-400
                       hover:text-gray-600 text-sm mb-6 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-100 rounded-xl
                            flex items-center justify-center text-xl">
              🎓
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Student Login
              </h2>
              <p className="text-gray-500 text-sm">
                Sign in with your USN
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* USN Field */}
          <div>
            <label className="form-label">
              University Seat Number (USN)
            </label>
            <input
              type="text"
              name="usn"
              value={formData.usn}
              onChange={handleChange}
              placeholder="e.g. 1RV21CS001"
              className={`input-field uppercase ${
                errors.usn ? "border-red-400 focus:ring-red-400" : ""
              }`}
              autoComplete="username"
              autoFocus
            />
            {errors.usn && errors.usn.trim() && (
              <p className="mt-1 text-xs text-red-500">{errors.usn}</p>
            )}
          </div>

          {/* Date of Birth Field */}
          <div>
            <label className="form-label">Date of Birth</label>
            <input
              type="date"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`input-field ${
                errors.password ? "border-red-400 focus:ring-red-400" : ""
              }`}
              autoComplete="bday"
            />
            <p className="mt-1 text-xs text-gray-500">
              Use your date of birth as your password.
            </p>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 flex items-center
                       justify-center gap-2 text-base"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white
                                border-t-transparent rounded-full animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Sign-in hint */}
        <div className="mt-6 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-500">
            Sign in with your USN and select your date of birth.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default StudentLogin;
