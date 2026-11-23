// ============================================
// AuthLayout Component
// Shared wrapper for all login pages
// Provides the split-screen design:
//   Left  → Branding / illustration panel
//   Right → Login form
// ============================================

const AuthLayout = ({ children, role }) => {

  // ── Role-specific theme config ────────────────
  const themes = {
    student: {
      gradient: "from-blue-600 to-blue-800",
      icon: "🎓",
      title: "Student Portal",
      tagline: "Upload and track your certificates",
      features: [
        "Upload certificates easily",
        "Track verification status",
        "View total credits earned",
        "Download your records",
      ],
    },
    faculty: {
      gradient: "from-emerald-600 to-emerald-800",
      icon: "👨‍🏫",
      title: "Faculty Portal",
      tagline: "Review and verify student certificates",
      features: [
        "View student submissions",
        "Approve or reject certificates",
        "Monitor department progress",
        "Track verification history",
      ],
    },
    admin: {
      gradient: "from-purple-600 to-purple-800",
      icon: "⚙️",
      title: "Admin Portal",
      tagline: "Manage the entire system",
      features: [
        "Add and manage students",
        "Add and manage faculty",
        "View system-wide stats",
        "Full control over accounts",
      ],
    },
  };

  const theme = themes[role] || themes.student;

  return (
    <div className="min-h-screen flex">

      {/* ── Left Panel — Branding ────────────────── */}
      <div
        className={`hidden lg:flex lg:w-1/2 bg-gradient-to-br
                    ${theme.gradient} flex-col justify-between p-12`}
      >
        {/* Top — Logo + title */}
        <div>
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-xl
                            flex items-center justify-center text-xl">
              📜
            </div>
            <span className="text-white font-bold text-xl">CertifyPro</span>
          </div>

          {/* Role icon + title */}
          <div className="mb-8">
            <div className="text-6xl mb-4">{theme.icon}</div>
            <h1 className="text-4xl font-bold text-white mb-3">
              {theme.title}
            </h1>
            <p className="text-white text-opacity-80 text-lg">
              {theme.tagline}
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-3">
            {theme.features.map((feature, index) => (
              <li key={index} className="flex items-center gap-3 text-white">
                <div className="w-5 h-5 rounded-full bg-white bg-opacity-20
                                flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor"
                    viewBox="0 0 20 20">
                    <path fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414
                         0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1
                         1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-white text-opacity-90">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom — footer note */}
        <p className="text-white text-opacity-60 text-sm">
          © 2024 CertifyPro · Certificate Management System
        </p>
      </div>

      {/* ── Right Panel — Form ───────────────────── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center
                      p-8 bg-gray-50">
        <div className="w-full max-w-md">
          {children}
        </div>
      </div>

    </div>
  );
};

export default AuthLayout;