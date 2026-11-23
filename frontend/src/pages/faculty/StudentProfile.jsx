// ============================================
// StudentProfile Page (Faculty View)
// Full profile of a single student viewed
// by faculty — includes all certificates and
// the verify modal for approving/rejecting
//
// Route: /faculty/student/:studentId
// ============================================

import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosInstance from "../../api/axios";
import Navbar from "../../components/Navbar";
import StatsCard from "../../components/StatsCard";
import VerifyModal from "../../components/VerifyModal";
import Loader from "../../components/Loader";

// ── Status badge component ─────────────────────
const StatusBadge = ({ status }) => {
  const map = {
    pending:  "badge-pending",
    approved: "badge-approved",
    rejected: "badge-rejected",
  };
  const labels = {
    pending: "⏳ Pending",
    approved: "✅ Approved",
    rejected: "❌ Rejected",
  };
  return (
    <span className={map[status] || "badge-pending"}>
      {labels[status] || status}
    </span>
  );
};

const StudentProfile = () => {
  const { studentId } = useParams();
  const navigate      = useNavigate();

  // ── State ──────────────────────────────────────
  const [student, setStudent]           = useState(null);
  const [certificates, setCertificates] = useState([]);
  const [stats, setStats]               = useState(null);
  const [loading, setLoading]           = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");

  // ── Verify modal state ─────────────────────────
  const [selectedCert, setSelectedCert] = useState(null); // cert to verify
  const [verifying, setVerifying]       = useState(false);

  // ════════════════════════════════════════════════
  // Fetch student data from backend
  // ════════════════════════════════════════════════
  const fetchStudentData = useCallback(async () => {
    try {
      const res = await axiosInstance.get(
        `/faculty/student/${studentId}`
      );

      if (res.data.success) {
        setStudent(res.data.student);
        setCertificates(res.data.certificates);
        setStats(res.data.stats);
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Failed to load student profile.";
      toast.error(msg);

      // If forbidden or not found, go back
      if (
        error.response?.status === 403 ||
        error.response?.status === 404
      ) {
        navigate("/faculty/dashboard");
      }
    } finally {
      setLoading(false);
    }
  }, [studentId, navigate]);

  useEffect(() => { fetchStudentData(); }, [fetchStudentData]);

  // ════════════════════════════════════════════════
  // Handle certificate verification
  // Called from VerifyModal on confirm
  // ════════════════════════════════════════════════
  const handleVerify = async (certId, action, rejectionReason) => {
    setVerifying(true);
    try {
      const res = await axiosInstance.put(
        `/faculty/verify/${certId}`,
        { action, rejectionReason }
      );

      if (res.data.success) {
        toast.success(
          `Certificate ${
            action === "approve" ? "approved ✅" : "rejected ❌"
          } successfully`
        );
        setSelectedCert(null); // Close modal
        fetchStudentData();    // Refresh data
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Verification failed.";
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  // ── Filter certificates ────────────────────────
  const filteredCerts =
    activeFilter === "all"
      ? certificates
      : certificates.filter((c) => c.status === activeFilter);

  // ── Format date ────────────────────────────────
  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "N/A";

  if (loading) return <Loader fullPage text="Loading student profile..." />;
  if (!student) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Student Profile" />

      {/* ── Verify Modal ─────────────────────── */}
      {selectedCert && (
        <VerifyModal
          cert={selectedCert}
          onClose={() => setSelectedCert(null)}
          onVerify={handleVerify}
          verifying={verifying}
        />
      )}

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Back button ──────────────────────── */}
        <button
          onClick={() => navigate("/faculty/dashboard")}
          className="flex items-center gap-2 text-gray-500
                     hover:text-gray-700 transition-colors text-sm mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
            stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round"
              strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </button>

        {/* ── Student Profile Card ──────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200
                        shadow-sm overflow-hidden mb-8">

          {/* Green header banner */}
          <div className="bg-gradient-to-r from-emerald-600
                          to-emerald-700 px-8 py-6">
            <div className="flex items-center gap-5">

              {/* Avatar */}
              <div className="w-16 h-16 bg-white bg-opacity-20
                              rounded-2xl flex items-center justify-center
                              text-white font-bold text-2xl flex-shrink-0">
                {student.name.charAt(0).toUpperCase()}
              </div>

              {/* Name + details */}
              <div>
                <h1 className="text-2xl font-bold text-white">
                  {student.name}
                </h1>
                <div className="flex flex-wrap gap-x-4 gap-y-1
                                mt-1 text-emerald-100 text-sm">
                  <span>🎫 {student.usn}</span>
                  <span>📧 {student.email}</span>
                  <span>🏛️ {student.department}</span>
                  <span>📚 Semester {student.semester}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5
                          divide-x divide-gray-100 border-t
                          border-gray-100">
            {[
              { label: "Total",    value: stats?.total ?? 0,    color: "text-gray-800" },
              { label: "Pending",  value: stats?.pending ?? 0,  color: "text-yellow-600" },
              { label: "Approved", value: stats?.approved ?? 0, color: "text-green-600" },
              { label: "Rejected", value: stats?.rejected ?? 0, color: "text-red-600" },
              { label: "Credits",  value: stats?.totalCreditsEarned ?? 0,
                color: "text-purple-600" },
            ].map((s) => (
              <div key={s.label} className="px-6 py-4 text-center">
                <p className={`text-xl font-bold ${s.color}`}>
                  {s.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Certificates Section ─────────────── */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-bold text-gray-900">
              Certificates ({certificates.length})
            </h2>

            {/* Filter pills */}
            <div className="flex items-center gap-1 bg-white border
                            border-gray-200 rounded-xl p-1">
              {["all", "pending", "approved", "rejected"].map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium
                             capitalize transition-all duration-200 ${
                    activeFilter === f
                      ? "bg-emerald-600 text-white"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {filteredCerts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-dashed
                            border-gray-300 p-12 text-center">
              <div className="text-4xl mb-3">📂</div>
              <p className="text-gray-500 font-medium">
                No {activeFilter !== "all" ? activeFilter : ""}{" "}
                certificates found
              </p>
            </div>
          ) : (
            /* Certificate rows */
            <div className="space-y-4">
              {filteredCerts.map((cert) => (
                <div
                  key={cert._id}
                  className="bg-white rounded-xl border border-gray-200
                             hover:border-gray-300 hover:shadow-sm
                             transition-all duration-200 overflow-hidden"
                >
                  {/* Status color bar */}
                  <div className={`h-1 ${
                    cert.status === "approved"
                      ? "bg-green-500"
                      : cert.status === "rejected"
                      ? "bg-red-500"
                      : "bg-yellow-400"
                  }`} />

                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row
                                    sm:items-start gap-4">

                      {/* File icon */}
                      <div className={`w-12 h-12 rounded-xl flex
                                      items-center justify-center
                                      text-2xl flex-shrink-0 ${
                        cert.fileType === "pdf"
                          ? "bg-red-50" : "bg-blue-50"
                      }`}>
                        {cert.fileType === "pdf" ? "📄" : "🖼️"}
                      </div>

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        {/* Title + badge */}
                        <div className="flex flex-wrap items-center
                                        gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">
                            {cert.title}
                          </h3>
                          <StatusBadge status={cert.status} />
                        </div>

                        {/* Meta info */}
                        <div className="flex flex-wrap gap-x-4 gap-y-1
                                        text-xs text-gray-500 mb-3">
                          <span>⭐ {cert.creditsEarned} credits</span>
                          <span>📅 {formatDate(cert.createdAt)}</span>
                          {cert.verifiedAt && (
                            <span>
                              🔍 Verified {formatDate(cert.verifiedAt)}
                              {cert.verifiedBy?.name &&
                                ` by ${cert.verifiedBy.name}`}
                            </span>
                          )}
                        </div>

                        {/* Description */}
                        {cert.description && (
                          <p className="text-xs text-gray-400 mb-3">
                            {cert.description}
                          </p>
                        )}

                        {/* Rejection reason */}
                        {cert.status === "rejected" &&
                          cert.rejectionReason && (
                          <div className="p-3 bg-red-50 border
                                          border-red-100 rounded-lg mb-3">
                            <p className="text-xs text-red-600">
                              <span className="font-medium">
                                Rejection reason:
                              </span>{" "}
                              {cert.rejectionReason}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2
                                      flex-shrink-0">
                        {/* View file tag fixed here */}
                        <a  
                          href={cert.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 text-xs font-medium
                                     text-gray-600 bg-gray-100
                                     hover:bg-gray-200 rounded-lg
                                     transition-colors duration-200
                                     flex items-center gap-1"
                        >
                          <svg className="w-3.5 h-3.5" fill="none"
                            viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round"
                              strokeLinejoin="round" strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002
                              2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10
                              14" />
                          </svg>
                          View
                        </a>

                        {/* Verify button — only for pending */}
                        {cert.status === "pending" && (
                          <button
                            onClick={() => setSelectedCert(cert)}
                            className="px-4 py-2 text-xs font-medium
                                       text-white bg-emerald-600
                                       hover:bg-emerald-700 rounded-lg
                                       transition-colors duration-200"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentProfile;