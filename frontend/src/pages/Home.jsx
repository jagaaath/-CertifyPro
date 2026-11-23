// ============================================
// Home Page
// Landing page — user selects their role
// to go to the correct login page
//
// If already logged in, redirect to dashboard
// ============================================

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// ── Role dashboard map ─────────────────────────
const DASHBOARDS = {
  student: "/student/dashboard",
  faculty: "/faculty/dashboard",
  admin:   "/admin/dashboard",
};

const Home = () => {
  const { isAuth, role } = useAuth();
  const navigate = useNavigate();

  // ── Redirect if already logged in ─────────────
  useEffect(() => {
    if (isAuth && role) {
      navigate(DASHBOARDS[role], { replace: true });
    }
  }, [isAuth, role, navigate]);

  // ── Role card data ─────────────────────────────
  const roles = [
    {
      role: "student",
      icon: "🎓",
      title: "Student",
      description: "Upload certificates, track verification status and view your earned credits",
      path: "/student/login",
      gradient: "from-blue-500 to-blue-700",
      hoverBorder: "hover:border-blue-400",
      badge: "For Students",
      badgeColor: "bg-blue-100 text-blue-700",
    },
    {
      role: "faculty",
      icon: "👨‍🏫",
      title: "Faculty",
      description: "Review student certificates, approve or reject submissions for your department",
      path: "/faculty/login",
      gradient: "from-emerald-500 to-emerald-700",
      hoverBorder: "hover:border-emerald-400",
      badge: "For Faculty",
      badgeColor: "bg-emerald-100 text-emerald-700",
    },
    {
      role: "admin",
      icon: "⚙️",
      title: "Admin",
      description: "Manage students, faculty accounts and oversee the entire system",
      path: "/admin/login",
      gradient: "from-purple-500 to-purple-700",
      hoverBorder: "hover:border-purple-400",
      badge: "For Admin",
      badgeColor: "bg-purple-100 text-purple-700",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900
                    via-gray-800 to-gray-900 flex flex-col">

      {/* ── Header ─────────────────────────────── */}
      <header className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white bg-opacity-10 rounded-xl
                          flex items-center justify-center text-xl">
            📜
          </div>
          <h1 className="text-white font-bold text-2xl">CertifyPro</h1>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <main className="flex-1 flex flex-col items-center
                       justify-center px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Certificate Management
            <span className="block text-transparent bg-clip-text
                             bg-gradient-to-r from-blue-400 to-emerald-400">
              System
            </span>
          </h2>
          <p className="text-gray-400 text-lg max-w-md mx-auto">
            Select your role to continue to the login portal
          </p>
        </div>

        {/* ── Role Cards ──────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6
                        w-full max-w-4xl">
          {roles.map((item) => (
            <button
              key={item.role}
              onClick={() => navigate(item.path)}
              className={`group relative bg-gray-800 border-2 border-gray-700
                         ${item.hoverBorder} rounded-2xl p-8 text-left
                         transition-all duration-300 hover:transform
                         hover:-translate-y-1 hover:shadow-2xl
                         focus:outline-none focus:ring-2 focus:ring-white
                         focus:ring-opacity-50`}
            >
              {/* Badge */}
              <span className={`inline-block px-3 py-1 rounded-full
                               text-xs font-medium mb-4 ${item.badgeColor}`}>
                {item.badge}
              </span>

              {/* Icon */}
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br
                              ${item.gradient} flex items-center
                              justify-center text-3xl mb-4 shadow-lg`}>
                {item.icon}
              </div>

              {/* Text */}
              <h3 className="text-white font-bold text-xl mb-2">
                {item.title} Login
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {item.description}
              </p>

              {/* Arrow — appears on hover */}
              <div className="mt-4 flex items-center gap-2 text-gray-500
                              group-hover:text-white transition-colors duration-200">
                <span className="text-sm font-medium">Continue</span>
                <svg className="w-4 h-4 transform group-hover:translate-x-1
                                transition-transform duration-200"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* ── System Stats Bar ────────────────── */}
        <div className="mt-16 flex flex-wrap items-center justify-center
                        gap-8 text-center">
          {[
            { label: "Students Enrolled", value: "500+" },
            { label: "Certificates Uploaded", value: "2,000+" },
            { label: "Faculty Members", value: "50+" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-bold text-white">
                {stat.value}
              </div>
              <div className="text-gray-500 text-sm">{stat.label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default Home;