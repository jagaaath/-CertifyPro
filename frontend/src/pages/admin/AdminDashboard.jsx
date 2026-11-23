// ============================================
// AdminDashboard Page
// Full system management panel for admins
//
// Features:
//   - System-wide stats overview
//   - Department breakdown visualization
//   - Tab navigation: Overview | Students | Faculty
//   - Add/Delete/Toggle students and faculty
//   - Search and filter all users
//   - Modal forms for adding users
// ============================================

import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axios";
import Navbar from "../../components/Navbar";
import StatsCard from "../../components/StatsCard";
import Loader from "../../components/Loader";

// ─────────────────────────────────────────────
// SUB-COMPONENTS (defined inline for single file)
// ─────────────────────────────────────────────

// ── Confirmation Dialog ────────────────────────
const ConfirmDialog = ({ message, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex
                  items-center justify-center p-4 backdrop-blur-sm">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
      <div className="text-center mb-6">
        <div className="text-4xl mb-3">⚠️</div>
        <h3 className="font-bold text-gray-900 text-lg mb-2">
          Are you sure?
        </h3>
        <p className="text-gray-500 text-sm">{message}</p>
      </div>
      <div className="flex gap-3">
        <button
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="btn-danger flex-1 flex items-center
                     justify-center gap-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-white
                            border-t-transparent rounded-full animate-spin" />
          ) : (
            "Delete"
          )}
        </button>
      </div>
    </div>
  </div>
);

// ── Add Student Modal ──────────────────────────
const AddStudentModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "", usn: "", email: "",
    password: "", department: "CSE", semester: "1",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const DEPARTMENTS = [
    "CSE","ISE","ECE","EEE","MECH","CIVIL","AIDS","AIML"
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())     e.name     = "Name is required";
    if (!form.usn.trim())      e.usn      = "USN is required";
    if (!form.email.trim())    e.email    = "Email is required";
    if (!form.password)        e.password = "Password is required";
    else if (form.password.length < 6)
      e.password = "Minimum 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post("/admin/student", {
        ...form,
        usn: form.usn.toUpperCase().trim(),
        email: form.email.toLowerCase().trim(),
        semester: Number(form.semester),
      });
      if (res.data.success) {
        toast.success(res.data.message);
        onSuccess();
        onClose();
      }
    } catch (error) {
      const msg = error.response?.data?.message || "Failed to add student.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex
                    items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full
                      max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex
                        items-center justify-between sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900 text-lg">
            ➕ Add New Student
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
                       rounded-lg hover:bg-gray-100 text-gray-400
                       hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name */}
          <div>
            <label className="form-label">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Rahul Sharma"
              className={`input-field ${errors.name ? "border-red-400" : ""}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* USN + Email */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                USN <span className="text-red-500">*</span>
              </label>
              <input
                name="usn" value={form.usn} onChange={handleChange}
                placeholder="1RV21CS001"
                className={`input-field uppercase ${
                  errors.usn ? "border-red-400" : ""
                }`}
              />
              {errors.usn && (
                <p className="mt-1 text-xs text-red-500">{errors.usn}</p>
              )}
            </div>
            <div>
              <label className="form-label">
                Semester <span className="text-red-500">*</span>
              </label>
              <select
                name="semester" value={form.semester}
                onChange={handleChange} className="input-field"
              >
                {[1,2,3,4,5,6,7,8].map((s) => (
                  <option key={s} value={s}>Semester {s}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="form-label">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange}
              placeholder="rahul@student.com"
              className={`input-field ${
                errors.email ? "border-red-400" : ""
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Department + Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Department <span className="text-red-500">*</span>
              </label>
              <select
                name="department" value={form.department}
                onChange={handleChange} className="input-field"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange}
                placeholder="Min 6 chars"
                className={`input-field ${
                  errors.password ? "border-red-400" : ""
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              disabled={loading} className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="btn-primary flex-1 flex items-center
                         justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white
                                border-t-transparent rounded-full
                                animate-spin" />
              ) : "Add Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ── Add Faculty Modal ──────────────────────────
const AddFacultyModal = ({ onClose, onSuccess }) => {
  const [form, setForm] = useState({
    name: "", employeeId: "", email: "",
    password: "", department: "CSE",
    designation: "Assistant Professor",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const DEPARTMENTS   = ["CSE","ISE","ECE","EEE","MECH","CIVIL","AIDS","AIML"];
  const DESIGNATIONS  = [
    "Assistant Professor","Associate Professor",
    "Professor","HOD","Principal",
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: "" }));
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim())       e.name       = "Name is required";
    if (!form.employeeId.trim()) e.employeeId = "Employee ID is required";
    if (!form.email.trim())      e.email      = "Email is required";
    if (!form.password)          e.password   = "Password is required";
    else if (form.password.length < 6)
      e.password = "Minimum 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await axiosInstance.post("/admin/faculty", {
        ...form,
        employeeId: form.employeeId.toUpperCase().trim(),
        email: form.email.toLowerCase().trim(),
      });
      if (res.data.success) {
        toast.success(res.data.message);
        onSuccess();
        onClose();
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Failed to add faculty.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex
                    items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full
                      max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex
                        items-center justify-between sticky top-0 bg-white">
          <h2 className="font-bold text-gray-900 text-lg">
            ➕ Add New Faculty
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
                       rounded-lg hover:bg-gray-100 text-gray-400
                       hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Name */}
          <div>
            <label className="form-label">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Dr. Priya Nair"
              className={`input-field ${errors.name ? "border-red-400" : ""}`}
            />
            {errors.name && (
              <p className="mt-1 text-xs text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Employee ID + Department */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">
                Employee ID <span className="text-red-500">*</span>
              </label>
              <input
                name="employeeId" value={form.employeeId}
                onChange={handleChange}
                placeholder="FAC001"
                className={`input-field uppercase ${
                  errors.employeeId ? "border-red-400" : ""
                }`}
              />
              {errors.employeeId && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.employeeId}
                </p>
              )}
            </div>
            <div>
              <label className="form-label">Department</label>
              <select
                name="department" value={form.department}
                onChange={handleChange} className="input-field"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="form-label">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email" name="email" value={form.email}
              onChange={handleChange}
              placeholder="priya@faculty.com"
              className={`input-field ${
                errors.email ? "border-red-400" : ""
              }`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Designation + Password */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Designation</label>
              <select
                name="designation" value={form.designation}
                onChange={handleChange} className="input-field"
              >
                {DESIGNATIONS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="form-label">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                type="password" name="password" value={form.password}
                onChange={handleChange}
                placeholder="Min 6 chars"
                className={`input-field ${
                  errors.password ? "border-red-400" : ""
                }`}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.password}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button" onClick={onClose}
              disabled={loading} className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              type="submit" disabled={loading}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-700
                         text-white rounded-lg font-medium text-sm
                         transition-colors flex items-center
                         justify-center gap-2 flex-1"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white
                                border-t-transparent rounded-full
                                animate-spin" />
              ) : "Add Faculty"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────
// MAIN AdminDashboard COMPONENT
// ─────────────────────────────────────────────
const AdminDashboard = () => {
  const { user } = useAuth();

  // ── Data state ─────────────────────────────────
  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents]   = useState([]);
  const [faculty, setFaculty]     = useState([]);
  const [loading, setLoading]     = useState(true);

  // ── UI state ───────────────────────────────────
  const [activeTab, setActiveTab]           = useState("overview");
  const [studentSearch, setStudentSearch]   = useState("");
  const [facultySearch, setFacultySearch]   = useState("");
  const [deptFilter, setDeptFilter]         = useState("all");

  // ── Modal state ────────────────────────────────
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showAddFaculty, setShowAddFaculty] = useState(false);
  const [confirmDelete, setConfirmDelete]   = useState(null);
  // confirmDelete = { type:'student'|'faculty', id, name }
  const [deleting, setDeleting]             = useState(false);
  const [toggling, setToggling]             = useState(null);

  const DEPARTMENTS = [
    "all","CSE","ISE","ECE","EEE","MECH","CIVIL","AIDS","AIML"
  ];

  // ════════════════════════════════════════════════
  // Fetch all dashboard data
  // ════════════════════════════════════════════════
  const fetchData = useCallback(async () => {
    try {
      const [dashRes, studentsRes, facultyRes] = await Promise.all([
        axiosInstance.get("/admin/dashboard"),
        axiosInstance.get("/admin/students"),
        axiosInstance.get("/admin/faculty"),
      ]);

      if (dashRes.data.success)     setDashboard(dashRes.data);
      if (studentsRes.data.success) setStudents(studentsRes.data.students);
      if (facultyRes.data.success)  setFaculty(facultyRes.data.faculty);
    } catch (error) {
      toast.error("Failed to load dashboard.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ════════════════════════════════════════════════
  // Delete user (student or faculty)
  // ════════════════════════════════════════════════
  const handleDelete = async () => {
    if (!confirmDelete) return;
    setDeleting(true);
    try {
      const { type, id } = confirmDelete;
      const res = await axiosInstance.delete(`/admin/${type}/${id}`);
      if (res.data.success) {
        toast.success(res.data.message);
        setConfirmDelete(null);
        fetchData(); // Refresh all data
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Delete failed.";
      toast.error(msg);
    } finally {
      setDeleting(false);
    }
  };

  // ════════════════════════════════════════════════
  // Toggle active/inactive status
  // ════════════════════════════════════════════════
  const handleToggle = async (type, id, name, currentStatus) => {
    setToggling(id);
    try {
      const res = await axiosInstance.put(
        `/admin/${type}/${id}/toggle`
      );
      if (res.data.success) {
        toast.success(
          `${name} ${res.data.isActive ? "activated ✅" : "deactivated ⛔"}`
        );
        // Update local state without full refetch for speed
        if (type === "student") {
          setStudents((prev) =>
            prev.map((s) =>
              s._id === id ? { ...s, isActive: res.data.isActive } : s
            )
          );
        } else {
          setFaculty((prev) =>
            prev.map((f) =>
              f._id === id ? { ...f, isActive: res.data.isActive } : f
            )
          );
        }
      }
    } catch (error) {
      toast.error("Failed to update status.");
    } finally {
      setToggling(null);
    }
  };

  // ── Filter students ────────────────────────────
  const filteredStudents = students.filter((s) => {
    const q = studentSearch.toLowerCase();
    const matchSearch =
      s.name.toLowerCase().includes(q) ||
      s.usn.toLowerCase().includes(q) ||
      s.email.toLowerCase().includes(q);
    const matchDept =
      deptFilter === "all" || s.department === deptFilter;
    return matchSearch && matchDept;
  });

  // ── Filter faculty ─────────────────────────────
  const filteredFaculty = faculty.filter((f) => {
    const q = facultySearch.toLowerCase();
    const matchSearch =
      f.name.toLowerCase().includes(q) ||
      f.employeeId.toLowerCase().includes(q) ||
      f.email.toLowerCase().includes(q);
    const matchDept =
      deptFilter === "all" || f.department === deptFilter;
    return matchSearch && matchDept;
  });

  if (loading) return <Loader fullPage text="Loading admin dashboard..." />;

  const stats = dashboard?.stats;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Admin Dashboard" />

      {/* ── Modals ───────────────────────────────── */}
      {showAddStudent && (
        <AddStudentModal
          onClose={() => setShowAddStudent(false)}
          onSuccess={fetchData}
        />
      )}
      {showAddFaculty && (
        <AddFacultyModal
          onClose={() => setShowAddFaculty(false)}
          onSuccess={fetchData}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          message={`Delete ${confirmDelete.type} "${confirmDelete.name}"? This action cannot be undone and will remove all associated certificates.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={deleting}
        />
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Welcome Header ─────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome, {user?.name} ⚙️
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            System Administrator · {user?.email}
          </p>
        </div>

        {/* ── Top Stats ──────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatsCard
            icon="🎓" label="Total Students"
            value={stats?.students?.total ?? 0} color="blue"
            subtitle={`${stats?.students?.active ?? 0} active`}
          />
          <StatsCard
            icon="👨‍🏫" label="Total Faculty"
            value={stats?.faculty?.total ?? 0} color="green"
            subtitle={`${stats?.faculty?.active ?? 0} active`}
          />
          <StatsCard
            icon="📋" label="Certificates"
            value={stats?.certificates?.total ?? 0} color="purple"
            subtitle={`${stats?.certificates?.pending ?? 0} pending`}
          />
          <StatsCard
            icon="✅" label="Approved"
            value={stats?.certificates?.approved ?? 0} color="green"
            subtitle={`${stats?.certificates?.rejected ?? 0} rejected`}
          />
        </div>

        {/* ── Tab Navigation ─────────────────── */}
        <div className="flex items-center gap-1 mb-6 bg-white border
                        border-gray-200 rounded-xl p-1 w-fit">
          {[
            { key: "overview",  label: "📊 Overview"  },
            { key: "students",  label: "🎓 Students"  },
            { key: "faculty",   label: "👨‍🏫 Faculty"   },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-lg text-sm font-medium
                         transition-all duration-200 ${
                activeTab === tab.key
                  ? "bg-purple-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ════════════════════════════════════════
            TAB 1 — OVERVIEW
        ════════════════════════════════════════ */}
        {activeTab === "overview" && (
          <div className="space-y-6">

            {/* Department breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200
                            shadow-sm p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-6">
                📊 Department Breakdown
              </h2>

              {stats?.departmentBreakdown?.length > 0 ? (
                <div className="space-y-4">
                  {stats.departmentBreakdown.map((dept) => {
                    // Calculate fill percentage relative to largest dept
                    const maxCount = Math.max(
                      ...stats.departmentBreakdown.map((d) => d.studentCount)
                    );
                    const pct = Math.round(
                      (dept.studentCount / maxCount) * 100
                    );

                    return (
                      <div key={dept._id}>
                        <div className="flex items-center
                                        justify-between mb-1.5">
                          <span className="text-sm font-medium
                                           text-gray-700">
                            {dept._id}
                          </span>
                          <span className="text-sm font-bold
                                           text-gray-900">
                            {dept.studentCount}{" "}
                            <span className="text-gray-400 font-normal">
                              student{dept.studentCount !== 1 ? "s" : ""}
                            </span>
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div className="w-full bg-gray-100 rounded-full h-2.5">
                          <div
                            className="bg-gradient-to-r from-purple-500
                                       to-purple-600 h-2.5 rounded-full
                                       transition-all duration-700"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">
                  No student data available yet
                </p>
              )}
            </div>

            {/* Certificate status breakdown */}
            <div className="bg-white rounded-2xl border border-gray-200
                            shadow-sm p-6">
              <h2 className="font-bold text-gray-900 text-lg mb-6">
                📋 Certificate Status Overview
              </h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    label: "Pending",
                    value: stats?.certificates?.pending ?? 0,
                    color: "bg-yellow-400",
                    textColor: "text-yellow-700",
                    bg: "bg-yellow-50",
                  },
                  {
                    label: "Approved",
                    value: stats?.certificates?.approved ?? 0,
                    color: "bg-green-500",
                    textColor: "text-green-700",
                    bg: "bg-green-50",
                  },
                  {
                    label: "Rejected",
                    value: stats?.certificates?.rejected ?? 0,
                    color: "bg-red-500",
                    textColor: "text-red-700",
                    bg: "bg-red-50",
                  },
                ].map((item) => {
                  const total = stats?.certificates?.total || 1;
                  const pct = Math.round((item.value / total) * 100);
                  return (
                    <div
                      key={item.label}
                      className={`${item.bg} rounded-xl p-5 text-center`}
                    >
                      <p className={`text-3xl font-bold ${item.textColor}`}>
                        {item.value}
                      </p>
                      <p className="text-sm text-gray-600 font-medium mt-1">
                        {item.label}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">{pct}%</p>
                      {/* Mini bar */}
                      <div className="mt-3 w-full bg-white bg-opacity-60
                                      rounded-full h-1.5">
                        <div
                          className={`${item.color} h-1.5 rounded-full`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 2 — STUDENTS
        ════════════════════════════════════════ */}
        {activeTab === "students" && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="w-4 h-4 text-gray-400 absolute left-3
                                top-1/2 -translate-y-1/2"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14
                    0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Search students..."
                  className="input-field pl-9"
                />
              </div>

              {/* Dept filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="input-field sm:w-40"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d === "all" ? "All Departments" : d}
                  </option>
                ))}
              </select>

              {/* Add button */}
              <button
                onClick={() => setShowAddStudent(true)}
                className="btn-primary flex items-center gap-2
                           whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Student
              </button>
            </div>

            {/* Count */}
            <p className="text-sm text-gray-500 mb-4">
              Showing{" "}
              <span className="font-semibold text-gray-800">
                {filteredStudents.length}
              </span>{" "}
              of {students.length} students
            </p>

            {/* Students table */}
            {filteredStudents.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed
                              border-gray-300 p-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500 font-medium">
                  No students found
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200
                              shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {[
                          "Student","USN","Department",
                          "Semester","Status","Actions"
                        ].map((h) => (
                          <th key={h}
                            className="px-4 py-3 text-left text-xs
                                       font-semibold text-gray-500
                                       uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((student) => (
                        <tr
                          key={student._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Name + email */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-full
                                              flex items-center justify-center
                                              text-blue-700 font-bold text-sm
                                              flex-shrink-0">
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium
                                               text-gray-900">
                                  {student.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {student.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* USN */}
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono
                                             text-gray-700">
                              {student.usn}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-4">
                            <span className="text-xs px-2 py-1 bg-blue-100
                                             text-blue-700 rounded-full font-medium">
                              {student.department}
                            </span>
                          </td>

                          {/* Semester */}
                          <td className="px-4 py-4 text-sm text-gray-600">
                            Sem {student.semester}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <span className={`text-xs px-2.5 py-1
                                             rounded-full font-medium ${
                              student.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {student.isActive ? "● Active" : "● Inactive"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {/* Toggle active */}
                              <button
                                onClick={() =>
                                  handleToggle(
                                    "student", student._id,
                                    student.name, student.isActive
                                  )
                                }
                                disabled={toggling === student._id}
                                className={`text-xs px-3 py-1.5 rounded-lg
                                           font-medium transition-colors
                                           duration-200 ${
                                  student.isActive
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {toggling === student._id ? (
                                  <div className="w-3 h-3 border-2
                                                  border-current border-t-transparent
                                                  rounded-full animate-spin" />
                                ) : student.isActive ? (
                                  "Deactivate"
                                ) : (
                                  "Activate"
                                )}
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    type: "student",
                                    id: student._id,
                                    name: student.name,
                                  })
                                }
                                className="text-xs px-3 py-1.5 bg-red-100
                                           text-red-700 hover:bg-red-200
                                           rounded-lg font-medium
                                           transition-colors duration-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════
            TAB 3 — FACULTY
        ════════════════════════════════════════ */}
        {activeTab === "faculty" && (
          <div>
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 mb-5">
              {/* Search */}
              <div className="relative flex-1">
                <svg className="w-4 h-4 text-gray-400 absolute left-3
                                top-1/2 -translate-y-1/2"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14
                    0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text" value={facultySearch}
                  onChange={(e) => setFacultySearch(e.target.value)}
                  placeholder="Search faculty..."
                  className="input-field pl-9"
                />
              </div>

              {/* Dept filter */}
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="input-field sm:w-40"
              >
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d === "all" ? "All Departments" : d}
                  </option>
                ))}
              </select>

              {/* Add button */}
              <button
                onClick={() => setShowAddFaculty(true)}
                className="flex items-center gap-2 px-4 py-2
                           bg-purple-600 hover:bg-purple-700 text-white
                           rounded-lg font-medium text-sm transition-colors
                           duration-200 whitespace-nowrap"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Faculty
              </button>
            </div>

            {/* Count */}
            <p className="text-sm text-gray-500 mb-4">
              Showing{" "}
              <span className="font-semibold text-gray-800">
                {filteredFaculty.length}
              </span>{" "}
              of {faculty.length} faculty members
            </p>

            {/* Faculty table */}
            {filteredFaculty.length === 0 ? (
              <div className="bg-white rounded-2xl border border-dashed
                              border-gray-300 p-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <p className="text-gray-500 font-medium">
                  No faculty found
                </p>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200
                              shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        {[
                          "Faculty","Employee ID","Department",
                          "Designation","Status","Actions"
                        ].map((h) => (
                          <th key={h}
                            className="px-4 py-3 text-left text-xs
                                       font-semibold text-gray-500
                                       uppercase tracking-wider">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredFaculty.map((f) => (
                        <tr
                          key={f._id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          {/* Name + email */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-purple-100 rounded-full
                                              flex items-center justify-center
                                              text-purple-700 font-bold text-sm
                                              flex-shrink-0">
                                {f.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="text-sm font-medium
                                               text-gray-900">
                                  {f.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {f.email}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="px-4 py-4">
                            <span className="text-sm font-mono
                                             text-gray-700">
                              {f.employeeId}
                            </span>
                          </td>

                          {/* Department */}
                          <td className="px-4 py-4">
                            <span className="text-xs px-2 py-1 bg-purple-100
                                             text-purple-700 rounded-full
                                             font-medium">
                              {f.department}
                            </span>
                          </td>

                          {/* Designation */}
                          <td className="px-4 py-4 text-sm text-gray-600">
                            {f.designation}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-4">
                            <span className={`text-xs px-2.5 py-1
                                             rounded-full font-medium ${
                              f.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
                            }`}>
                              {f.isActive ? "● Active" : "● Inactive"}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              {/* Toggle active */}
                              <button
                                onClick={() =>
                                  handleToggle(
                                    "faculty", f._id,
                                    f.name, f.isActive
                                  )
                                }
                                disabled={toggling === f._id}
                                className={`text-xs px-3 py-1.5 rounded-lg
                                           font-medium transition-colors
                                           duration-200 ${
                                  f.isActive
                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-200"
                                    : "bg-green-100 text-green-700 hover:bg-green-200"
                                }`}
                              >
                                {toggling === f._id ? (
                                  <div className="w-3 h-3 border-2
                                                  border-current border-t-transparent
                                                  rounded-full animate-spin" />
                                ) : f.isActive ? (
                                  "Deactivate"
                                ) : (
                                  "Activate"
                                )}
                              </button>

                              {/* Delete */}
                              <button
                                onClick={() =>
                                  setConfirmDelete({
                                    type: "faculty",
                                    id: f._id,
                                    name: f.name,
                                  })
                                }
                                className="text-xs px-3 py-1.5 bg-red-100
                                           text-red-700 hover:bg-red-200
                                           rounded-lg font-medium
                                           transition-colors duration-200"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
