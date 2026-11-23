
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axios";
import Navbar from "../../components/Navbar";
import StatsCard from "../../components/StatsCard";
import Loader from "../../components/Loader";
import NoticePreviewModal from "../../components/NoticePreviewModal";
import DownloadFacultyExcelButton from "../../components/DownloadFacultyExcelButton";

// ============================================
// Status badge component
// ============================================

const StatusBadge = ({ status }) => {
  const config = {
    pending: { cls: "badge-pending", label: "Pending" },
    approved: { cls: "badge-approved", label: "Approved" },
    rejected: { cls: "badge-rejected", label: "Rejected" },
  };

  const { cls, label } = config[status] || config.pending;

  return <span className={cls}>{label}</span>;
};

// ============================================
// Faculty Dashboard
// ============================================

const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [students, setStudents] = useState([]);
  const [pending, setPending] = useState([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("pending");
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(null);
  const [notices, setNotices] = useState([]);
  const [selectedNotice, setSelectedNotice] = useState(null);
  const [noticeFile, setNoticeFile] = useState(null);
  const [noticeDescription, setNoticeDescription] = useState("");
  const [publishingNotice, setPublishingNotice] = useState(false);
  const [removingNotice, setRemovingNotice] = useState(null);

  // ============================================
  // FETCH DASHBOARD DATA
  // ============================================

  const fetchData = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
          axiosInstance.get("/faculty/dashboard"),
          axiosInstance.get("/faculty/students"),
          axiosInstance.get("/faculty/pending"),
          axiosInstance.get("/faculty/notices"),
      ]);
      let failedRequests = false;

      const [dashResult, studentsResult, pendingResult, noticesResult] = results;
      if (dashResult.status === "fulfilled" && dashResult.value.data.success) {
        setDashboard(dashResult.value.data);
      } else {
        failedRequests = true;
        if (dashResult.status === "rejected") {
          console.error("Faculty dashboard stats request failed:", dashResult.reason);
        }
      }

      if (
        studentsResult.status === "fulfilled" &&
        studentsResult.value.data.success
      ) {
        setStudents(studentsResult.value.data.students);
      } else {
        failedRequests = true;
        if (studentsResult.status === "rejected") {
          console.error("Faculty student list request failed:", studentsResult.reason);
        }
      }

      if (
        pendingResult.status === "fulfilled" &&
        pendingResult.value.data.success
      ) {
        setPending(pendingResult.value.data.certificates);
      } else {
        failedRequests = true;
        if (pendingResult.status === "rejected") {
          console.error("Faculty pending certificates request failed:", pendingResult.reason);
        }
      }

      if (
        noticesResult.status === "fulfilled" &&
        noticesResult.value.data.success
      ) {
        setNotices(noticesResult.value.data.notices || []);
      } else {
        failedRequests = true;
        if (noticesResult.status === "rejected") {
          console.error("Faculty notice list request failed:", noticesResult.reason);
        }
      }

      if (failedRequests) {
        toast.error("Some dashboard information could not be loaded. Please refresh.");
      }
    } catch (error) {
      toast.error("Failed to load dashboard data.");
      console.error("Dashboard fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handlePublishNotice = async (event) => {
    event.preventDefault();
    if (!noticeFile || !noticeDescription.trim()) {
      toast.error("Choose a PDF and enter a description.");
      return;
    }
    if (noticeFile.size > 10 * 1024 * 1024) {
      toast.error("Notice PDF must be 10MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.append("noticePdf", noticeFile);
    formData.append("description", noticeDescription.trim());
    setPublishingNotice(true);
    try {
      const response = await axiosInstance.post("/faculty/notices", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (response.data.success) {
        setNotices((current) => [response.data.notice, ...current]);
        setNoticeFile(null);
        setNoticeDescription("");
        event.target.reset();
        toast.success("Notice published to your department.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not publish notice.");
    } finally {
      setPublishingNotice(false);
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    setRemovingNotice(noticeId);
    try {
      await axiosInstance.delete(`/faculty/notices/${noticeId}`);
      setNotices((current) => current.filter((notice) => notice._id !== noticeId));
      toast.success("Notice removed.");
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not remove notice.");
    } finally {
      setRemovingNotice(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // APPROVE OR REJECT CERTIFICATES
  // ============================================

  const handleQuickVerify = async (certId, action) => {
    let rejectionReason = "";

    if (action === "reject") {
      rejectionReason = window.prompt(
        "Please enter a reason for rejection:"
      );

      if (rejectionReason === null) return;

      if (!rejectionReason.trim()) {
        toast.error("Rejection reason cannot be empty.");
        return;
      }
    }

    setVerifying(certId);

    try {
      const res = await axiosInstance.put(
        `/faculty/verify/${certId}`,
        { action, rejectionReason }
      );

      if (res.data.success) {
        toast.success(
          `Certificate ${
            action === "approve" ? "approved ✅" : "rejected ❌"
          }`
        );

        fetchData();
      }
    } catch (error) {
      const msg =
        error.response?.data?.message || "Verification failed.";

      toast.error(msg);
    } finally {
      setVerifying(null);
    }
  };

  // ============================================
  // SEARCH FILTER
  // ============================================

  const filteredStudents = students.filter((student) => {
    const query = search.toLowerCase();

    return (
      student.name?.toLowerCase().includes(query) ||
      student.usn?.toLowerCase().includes(query)
    );
  });

  // ============================================
  // DATE FORMATTER
  // ============================================

  const formatDate = (date) =>
    date
      ? new Date(date).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "N/A";

  if (loading) {
    return (
      <Loader
        fullPage
        text="Loading faculty dashboard..."
      />
    );
  }

  const stats = dashboard?.stats;

  // ============================================
  // PAGE UI
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Faculty Dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* WELCOME HEADER + EXCEL DOWNLOAD */}

        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user?.name} 👋
            </h1>

            <p className="text-gray-500 text-sm mt-1">
              {user?.designation} ·{" "}
              <span className="font-medium text-emerald-600">
                {user?.department}
              </span>{" "}
              Department · {user?.employeeId}
            </p>
          </div>

          <DownloadFacultyExcelButton />
        </div>

        {/* DASHBOARD STATISTICS */}

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatsCard
            icon="👥"
            label="Total Students"
            value={stats?.totalStudents ?? 0}
            color="blue"
          />

          <StatsCard
            icon="📋"
            label="Total Certificates"
            value={stats?.totalCertificates ?? 0}
            color="purple"
          />

          <StatsCard
            icon="⏳"
            label="Pending Review"
            value={stats?.pendingVerification ?? 0}
            color="yellow"
            subtitle="Action needed"
          />

          <StatsCard
            icon="✅"
            label="Approved"
            value={stats?.approved ?? 0}
            color="green"
          />

          <StatsCard
            icon="❌"
            label="Rejected"
            value={stats?.rejected ?? 0}
            color="red"
          />
        </div>

        {/* TAB SWITCHER */}

        <div
          className="flex items-center gap-2 mb-6 bg-white
                     border border-gray-200 rounded-xl p-1 w-fit"
        >
          {[
            {
              key: "pending",
              label: "Pending Queue",
              icon: "⏳",
              count: pending.length,
            },
            {
              key: "students",
              label: "All Students",
              icon: "👥",
              count: students.length,
            },
            {
              key: "notices",
              label: "Notice Board",
              icon: "📌",
              count: notices.length,
            },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg
                         text-sm font-medium transition-all duration-200
                         ${
                           activeTab === tab.key
                             ? "bg-emerald-600 text-white shadow-sm"
                             : "text-gray-500 hover:text-gray-700"
                         }`}
            >
              <span>{tab.icon}</span>
              {tab.label}

              <span
                className={`text-xs px-1.5 py-0.5 rounded-full
                            font-semibold ${
                  activeTab === tab.key
                    ? "bg-white bg-opacity-25 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* TAB 1 — PENDING CERTIFICATES */}

        {activeTab === "pending" && (
          <div>
            {pending.length === 0 ? (
              <div
                className="bg-white rounded-2xl border border-dashed
                           border-gray-300 p-16 text-center"
              >
                <div className="text-5xl mb-4">🎉</div>

                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  All caught up!
                </h3>

                <p className="text-gray-400 text-sm">
                  No certificates pending review in your department.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500">
                    {pending.length} certificate
                    {pending.length !== 1 ? "s" : ""} awaiting
                    your review · Oldest first
                  </p>
                </div>

                {pending.map((cert) => (
                  <div
                    key={cert._id}
                    className="bg-white rounded-xl border border-gray-200
                               hover:border-gray-300 hover:shadow-sm
                               transition-all duration-200 p-5"
                  >
                    <div
                      className="flex flex-col sm:flex-row
                                 sm:items-center gap-4"
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex items-center
                                    justify-center text-2xl flex-shrink-0 ${
                          cert.fileType === "pdf"
                            ? "bg-red-50"
                            : "bg-blue-50"
                        }`}
                      >
                        {cert.fileType === "pdf" ? "📄" : "🖼️"}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <h3 className="font-semibold text-gray-900 text-sm">
                            {cert.title}
                          </h3>

                          <span className="badge-pending text-xs">
                            ⏳ Pending
                          </span>
                        </div>

                        <div
                          className="flex flex-wrap gap-x-4 gap-y-1
                                     text-xs text-gray-500"
                        >
                          <span>
                            👤{" "}
                            <span className="font-medium text-gray-700">
                              {cert.student?.name}
                            </span>
                          </span>

                          <span>🎫 {cert.student?.usn}</span>

                          <span>⭐ {cert.creditsEarned} credits</span>

                          <span>📅 {formatDate(cert.createdAt)}</span>
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 flex-shrink-0"
                      >
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
                          <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0
                              002 2h10a2 2 0 002-2v-4M14 4h6m0
                              0v6m0-6L10 14"
                            />
                          </svg>
                          View
                        </a>

                        <button
                          onClick={() =>
                            navigate(
                              `/faculty/student/${cert.student?._id}`
                            )
                          }
                          className="px-3 py-2 text-xs font-medium
                                     text-blue-600 bg-blue-50
                                     hover:bg-blue-100 rounded-lg
                                     transition-colors duration-200"
                        >
                          Profile
                        </button>

                        <button
                          onClick={() =>
                            handleQuickVerify(cert._id, "approve")
                          }
                          disabled={verifying === cert._id}
                          className="px-3 py-2 text-xs font-medium
                                     text-white bg-green-600
                                     hover:bg-green-700 rounded-lg
                                     transition-colors duration-200
                                     disabled:opacity-50 flex items-center
                                     gap-1"
                        >
                          {verifying === cert._id ? (
                            <div
                              className="w-3 h-3 border-2 border-white
                                         border-t-transparent rounded-full
                                         animate-spin"
                            />
                          ) : (
                            "✅ Approve"
                          )}
                        </button>

                        <button
                          onClick={() =>
                            handleQuickVerify(cert._id, "reject")
                          }
                          disabled={verifying === cert._id}
                          className="px-3 py-2 text-xs font-medium
                                     text-white bg-red-600
                                     hover:bg-red-700 rounded-lg
                                     transition-colors duration-200
                                     disabled:opacity-50"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2 — ALL STUDENTS */}

        {activeTab === "students" && (
          <div>
            <div className="relative mb-5">
              <svg
                className="w-4 h-4 text-gray-400 absolute left-3
                           top-1/2 -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14
                  0 7 7 0 0114 0z"
                />
              </svg>

              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or USN..."
                className="input-field pl-9"
              />
            </div>

            {filteredStudents.length === 0 ? (
              <div
                className="bg-white rounded-2xl border border-dashed
                           border-gray-300 p-16 text-center"
              >
                <div className="text-5xl mb-4">🔍</div>

                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  No students found
                </h3>

                <p className="text-gray-400 text-sm">
                  Try a different search term.
                </p>
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2
                           lg:grid-cols-3 gap-4"
              >
                {filteredStudents.map((student) => (
                  <button
                    key={student._id}
                    onClick={() =>
                      navigate(`/faculty/student/${student._id}`)
                    }
                    className="bg-white rounded-xl border border-gray-200
                               hover:border-emerald-300 hover:shadow-md
                               transition-all duration-200 p-5 text-left
                               group"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div
                        className="w-11 h-11 bg-emerald-100 rounded-full
                                   flex items-center justify-center
                                   text-emerald-700 font-bold text-lg
                                   flex-shrink-0"
                      >
                        {student.name
                          ? student.name.charAt(0).toUpperCase()
                          : "?"}
                      </div>

                      <div className="min-w-0">
                        <p
                          className="font-semibold text-gray-900 text-sm
                                     truncate group-hover:text-emerald-700
                                     transition-colors"
                        >
                          {student.name}
                        </p>

                        <p className="text-xs text-gray-500">
                          {student.usn}
                        </p>
                      </div>

                      <svg
                        className="w-4 h-4 text-gray-300
                                   group-hover:text-emerald-500
                                   ml-auto transition-colors flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>

                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <span
                        className="text-xs px-2 py-0.5 bg-gray-100
                                   text-gray-600 rounded-full"
                      >
                        {student.department}
                      </span>

                      <span
                        className="text-xs px-2 py-0.5 bg-gray-100
                                   text-gray-600 rounded-full"
                      >
                        Sem {student.semester}
                      </span>

                      {student.certStats?.pending > 0 && (
                        <span
                          className="text-xs px-2 py-0.5
                                     bg-yellow-100 text-yellow-700
                                     rounded-full font-medium"
                        >
                          ⏳ {student.certStats.pending} pending
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">
                          Total
                        </p>
                        <p className="text-sm font-bold text-gray-800">
                          {student.certStats?.total ?? 0}
                        </p>
                      </div>

                      <div className="bg-green-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">
                          Approved
                        </p>
                        <p className="text-sm font-bold text-green-700">
                          {student.certStats?.approved ?? 0}
                        </p>
                      </div>

                      <div className="bg-purple-50 rounded-lg p-2">
                        <p className="text-xs text-gray-400 mb-0.5">
                          Credits
                        </p>
                        <p className="text-sm font-bold text-purple-700">
                          {student.certStats?.totalCredits ?? 0}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "notices" && (
          <section className="space-y-6">
            <form onSubmit={handlePublishNotice} className="rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900">Publish a Department Notice</h2>
              <p className="mt-1 text-sm text-gray-500">Students in {user?.department} will see the PDF and description on their dashboard.</p>
              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <div>
                  <label htmlFor="notice-pdf" className="mb-1.5 block text-sm font-medium text-gray-700">Notice PDF</label>
                  <input id="notice-pdf" type="file" accept="application/pdf,.pdf" onChange={(event) => setNoticeFile(event.target.files?.[0] || null)} className="block w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-emerald-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-emerald-700" />
                  <p className="mt-1 text-xs text-gray-400">PDF only · Maximum 10MB</p>
                </div>
                <div>
                  <label htmlFor="notice-description" className="mb-1.5 block text-sm font-medium text-gray-700">Description</label>
                  <textarea id="notice-description" value={noticeDescription} onChange={(event) => setNoticeDescription(event.target.value)} maxLength={500} rows={3} placeholder="Add a short description for students" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100" />
                  <p className="mt-1 text-right text-xs text-gray-400">{noticeDescription.length}/500</p>
                </div>
              </div>
              <button type="submit" disabled={publishingNotice} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60">
                {publishingNotice ? "Publishing…" : "Publish Notice"}
              </button>
            </form>

            <div>
              <h2 className="mb-3 text-base font-semibold text-gray-900">Published notices</h2>
              {notices.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">No notices published yet.</div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {notices.map((notice) => (
                    <article key={notice._id} className="rounded-xl border border-gray-200 bg-white p-4">
                      <div className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-800"><span>📄</span><span className="truncate">{notice.originalName}</span></div>
                      <p className="min-h-10 text-sm text-gray-600">{notice.description}</p>
                      <p className="mt-2 text-xs text-gray-400">{new Date(notice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      <div className="mt-4 flex gap-2">
                        <button type="button" onClick={() => setSelectedNotice(notice)} className="flex-1 rounded-lg bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">Open notice</button>
                        <button type="button" onClick={() => handleDeleteNotice(notice._id)} disabled={removingNotice === notice._id} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-50">{removingNotice === notice._id ? "Removing…" : "Remove"}</button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        <NoticePreviewModal
          notice={selectedNotice}
          onClose={() => setSelectedNotice(null)}
        />
      </main>
    </div>
  );
};

export default FacultyDashboard;
