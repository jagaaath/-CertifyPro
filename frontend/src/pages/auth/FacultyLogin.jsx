// ============================================
// FacultyLogin Page
// Login form for faculty using email + password
// ============================================

import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axios";
import AuthLayout from "../../components/AuthLayout";

const FacultyLogin = () => {
  const navigate = useNavigate();
  const { login, isAuth, role } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Redirect if already logged in ─────────────
  useEffect(() => {
    if (isAuth && role === "faculty") {
      navigate("/faculty/dashboard", { replace: true });
    }
  }, [isAuth, role, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    }
    if (!formData.password) {
      newErrors.password = "Password is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);

    try {
      const res = await axiosInstance.post("/auth/faculty/login", {
        email: formData.email.trim().toLowerCase(),
        password: formData.password,
      });

      if (res.data.success) {
        login(res.data.token, res.data.faculty, "faculty");
        toast.success(`Welcome, ${res.data.faculty.name}! 👨‍🏫`);
        navigate("/faculty/dashboard", { replace: true });
      }
    } catch (error) {
      const message =
        error.response?.data?.message || "Login failed. Please try again.";
      toast.error(message);
      if (error.response?.status === 401) {
        setErrors({
          email: " ",
          password: "Invalid email or password",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout role="faculty">
      <div className="bg-white rounded-2xl shadow-xl p-8">

        {/* Header */}
        <div className="mb-8">
          <Link to="/"
            className="flex items-center gap-2 text-gray-400
                       hover:text-gray-600 text-sm mb-6 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>

          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl
                            flex items-center justify-center text-xl">
              👨‍🏫
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Faculty Login
              </h2>
              <p className="text-gray-500 text-sm">
                Sign in with your email
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="e.g. faculty@college.edu"
              className={`input-field ${
                errors.email
                  ? "border-red-400 focus:ring-red-400"
                  : ""
              }`}
              autoComplete="username"
              autoFocus
            />
            {errors.email && errors.email.trim() && (
              <p className="mt-1 text-xs text-red-500">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="form-label">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
                className={`input-field pr-10 ${
                  errors.password
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2
                           text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2}
                    d={showPassword
                      ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      : "M15 12a3 3 0 11-6 0 3 3 0 016 0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    }
                  />
                </svg>
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500">{errors.password}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700
                       text-white rounded-lg font-medium transition-colors
                       duration-200 disabled:opacity-50 flex items-center
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
        <div className="mt-6 p-3 bg-emerald-50 rounded-lg
                        border border-emerald-100">
          <p className="text-xs text-emerald-500">
            Sign in with your faculty email and password.
          </p>
        </div>
      </div>
    </AuthLayout>
  );
};

export default FacultyLogin;
