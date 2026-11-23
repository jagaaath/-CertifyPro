
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import axiosInstance from "../../api/axios";
import Navbar from "../../components/Navbar";
import CertificateCard from "../../components/CertificateCard";
import StatsCard from "../../components/StatsCard";
import Loader from "../../components/Loader";

const TABS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

const NoticeBoard = ({ notices }) => {
  const [selectedNotice, setSelectedNotice] = useState(null);

  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Department Notice Board</h2>
          <p className="mt-1 text-sm text-gray-500">Notices shared by faculty in your department.</p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">{notices.length}</span>
      </div>

      {notices.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 px-4 py-8 text-center text-sm text-gray-500">No notices have been posted yet.</p>
      ) : (
        <div className="flex snap-x gap-4 overflow-x-auto pb-3">
          {notices.map((notice) => (
            <article key={notice._id} className="w-72 flex-none snap-start overflow-hidden rounded-xl border border-gray-200 bg-white">
              <img
                src={notice.previewUrl}
                alt={`Preview of notice: ${notice.description}`}
                className="h-56 w-full bg-gray-100 object-contain"
              />
              <div className="p-4">
                <p className="line-clamp-3 min-h-[3.75rem] text-sm text-gray-700">{notice.description}</p>
                <p className="mt-2 text-xs text-gray-400">{new Date(notice.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                <button type="button" onClick={() => setSelectedNotice(notice)} className="mt-3 w-full rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Open notice</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {selectedNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Notice details" onClick={() => setSelectedNotice(null)}>
          <div className="flex h-[90vh] max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-5">
              <div>
                <h3 className="font-semibold text-gray-900">Notice</h3>
                <p className="mt-1 text-sm text-gray-600">{selectedNotice.description}</p>
              </div>
              <button type="button" onClick={() => setSelectedNotice(null)} className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100" aria-label="Close notice">×</button>
            </div>
            <iframe title="Full notice PDF" src={`${selectedNotice.fileUrl}#toolbar=1&navpanes=0`} className="min-h-0 flex-1 w-full bg-gray-100" />
            <div className="flex justify-end border-t border-gray-200 p-3">
              <a href={selectedNotice.fileUrl} target="_blank" rel="noopener noreferrer" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Open PDF in new tab</a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

// ============================================
// Certificate Activity Item
// ============================================

const ActivityItem = ({ item }) => {
  const statusConfig = {
    pending: {
      icon: "📤",
      color: "text-yellow-600",
      bg: "bg-yellow-50",
    },
    approved: {
      icon: "✅",
      color: "text-green-600",
      bg: "bg-green-50",
    },
    rejected: {
      icon: "❌",
      color: "text-red-600",
      bg: "bg-red-50",
    },
  };

  const config =
    statusConfig[item.status] || statusConfig.pending;

  const formatDate = (date) =>
    new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div
      className={`flex items-start gap-3 p-3 ${config.bg}
                  rounded-xl border border-opacity-30`}
    >
      <span className="text-lg flex-shrink-0">
        {config.icon}
      </span>

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium ${config.color} truncate`}
        >
          {item.certTitle}
        </p>

        <p className="text-xs text-gray-500 mt-0.5">
          {item.note}
        </p>

        <p className="text-xs text-gray-400 mt-0.5">
          {formatDate(item.changedAt)}
        </p>
      </div>

      <span
        className={`text-xs font-semibold px-2 py-0.5 rounded-full
                    capitalize ${config.bg} ${config.color}`}
      >
        {item.status}
      </span>
    </div>
  );
};

// ============================================
// Student Dashboard
// ============================================

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [certificates, setCertificates] = useState([]);
  const [stats, setStats] = useState(null);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activityFeed, setActivityFeed] = useState([]);
  const [notices, setNotices] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showActivity, setShowActivity] = useState(false);
  const [showNoticeBoard, setShowNoticeBoard] = useState(false);

  // ============================================
  // FETCH DASHBOARD DATA
  // ============================================

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [
        certificatesResponse,
        statsResponse,
        profileResponse,
        noticesResponse,
      ] = await Promise.all([
        axiosInstance.get("/certificate/my"),
        axiosInstance.get("/certificate/stats"),
        axiosInstance.get("/student/profile"),
        axiosInstance.get("/student/notices"),
      ]);

      if (certificatesResponse.data.success) {
        setCertificates(
          certificatesResponse.data.certificates || []
        );
      }

      if (statsResponse.data.success) {
        setStats(statsResponse.data.stats || null);
      }

      if (profileResponse.data.success) {
        // Read the count from either supported response location.
        const countValue =
          profileResponse.data.totalStudents ??
          profileResponse.data.student?.totalStudents ??
          0;

        const parsedCount = Number(countValue);

        setTotalStudents(
          Number.isFinite(parsedCount) && parsedCount >= 0
            ? parsedCount
            : 0
        );

        setActivityFeed(
          profileResponse.data.activityFeed || []
        );
      }

      if (noticesResponse.data.success) {
        setNotices(noticesResponse.data.notices || []);
      }
    } catch (error) {
      console.error("Student dashboard fetch error:", error);
      toast.error("Failed to load dashboard.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================
  // DELETE CERTIFICATE
  // ============================================

  const handleDelete = async (certificateId) => {
    try {
      const response = await axiosInstance.delete(
        `/certificate/${certificateId}`
      );

      if (response.data.success) {
        toast.success("Certificate deleted");
        fetchData(true);
      }
    } catch (error) {
      toast.error(
        error.response?.data?.message || "Delete failed."
      );
      throw error;
    }
  };

  // ============================================
  // FILTER CERTIFICATES
  // ============================================

  const filteredCertificates =
    activeTab === "all"
      ? certificates
      : certificates.filter(
          (certificate) => certificate.status === activeTab
        );

  if (loading) {
    return (
      <Loader
        fullPage
        text="Loading your dashboard..."
      />
    );
  }

  // ============================================
  // PAGE UI
  // ============================================

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Student Dashboard" />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Welcome Header */}
        <div
          className="flex flex-col sm:flex-row sm:items-center
                     sm:justify-between gap-4 mb-8"
        >
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome back, {user?.name?.split(" ")[0]}! 👋
            </h1>

            <p className="text-gray-500 text-sm mt-1">
              {user?.department} · Semester {user?.semester} ·{" "}
              <span className="font-medium text-gray-700">
                {user?.usn}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowNoticeBoard((current) => !current)}
              className="flex items-center gap-2 rounded-lg border border-blue-700 bg-blue-600 px-5 py-3.5 text-lg font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              📌 Notice Board
              {notices.length > 0 && <span className="rounded-full bg-blue-100 px-1.5 py-0.5 text-xs font-semibold text-blue-700">{notices.length}</span>}
            </button>
            <button
              onClick={() =>
                setShowActivity((current) => !current)
              }
              className="relative flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-3.5 text-lg font-semibold text-gray-600 transition-colors hover:border-gray-300"
            >
              🔔 Activity

              {activityFeed.length > 0 && (
                <span
                  className="absolute -top-1.5 -right-1.5 w-5 h-5
                             bg-red-500 text-white text-xs rounded-full
                             flex items-center justify-center font-bold"
                >
                  {activityFeed.length > 9
                    ? "9+"
                    : activityFeed.length}
                </span>
              )}
            </button>

            <button
              onClick={() => navigate("/student/upload")}
              className="btn-primary flex items-center gap-2 !px-5 !py-3.5 !text-lg !font-semibold"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>

              Upload Certificate
            </button>
          </div>
        </div>

        {showNoticeBoard && <NoticeBoard notices={notices} />}

        <div className="flex gap-6">

          {/* Main Content */}
          <div className="flex-1 min-w-0">

            {/* Dashboard Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

              <StatsCard
                icon="👥"
                label="Total Students"
                value={totalStudents}
                color="blue"
              />

              <StatsCard
                icon="⏳"
                label="Pending"
                value={stats?.pending ?? 0}
                color="yellow"
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

            {/* Certificate Filter Tabs */}
            <div className="flex items-center justify-between mb-6">
              <div
                className="flex items-center bg-white border
                           border-gray-200 rounded-xl p-1 gap-1"
              >
                {TABS.map((tab) => {
                  const count =
                    tab.key === "all"
                      ? certificates.length
                      : certificates.filter(
                          (certificate) =>
                            certificate.status === tab.key
                        ).length;

                  return (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium
                                  transition-all duration-200 flex items-center
                                  gap-1.5 ${
                                    activeTab === tab.key
                                      ? "bg-primary-600 text-white shadow-sm"
                                      : "text-gray-500 hover:text-gray-700"
                                  }`}
                    >
                      {tab.label}

                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full
                                    font-semibold ${
                                      activeTab === tab.key
                                        ? "bg-white bg-opacity-20 text-white"
                                        : "bg-gray-100 text-gray-600"
                                    }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => fetchData(true)}
                disabled={refreshing}
                className="flex items-center gap-2 px-3 py-2 text-gray-500
                           hover:text-gray-700 hover:bg-white border
                           border-transparent hover:border-gray-200
                           rounded-lg text-sm transition-all"
              >
                <svg
                  className={`w-4 h-4 ${
                    refreshing ? "animate-spin" : ""
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001
                    8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003
                    8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>

                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {/* Certificate Grid */}
            {filteredCertificates.length === 0 ? (
              <div
                className="bg-white rounded-2xl border border-dashed
                           border-gray-300 p-16 text-center"
              >
                <div className="text-6xl mb-4">
                  {activeTab === "all" ? "📂" : "🔍"}
                </div>

                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  {activeTab === "all"
                    ? "No certificates yet"
                    : `No ${activeTab} certificates`}
                </h3>

                {activeTab === "all" && (
                  <button
                    onClick={() => navigate("/student/upload")}
                    className="btn-primary mt-4"
                  >
                    Upload Your First Certificate
                  </button>
                )}
              </div>
            ) : (
              <div
                className="grid grid-cols-1 sm:grid-cols-2
                           lg:grid-cols-3 xl:grid-cols-4 gap-4"
              >
                {filteredCertificates.map((certificate) => (
                  <CertificateCard
                    key={certificate._id}
                    certificate={certificate}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Certificate Activity Sidebar */}
          {showActivity && (
            <div className="w-80 flex-shrink-0">
              <div
                className="bg-white rounded-2xl border border-gray-200
                           shadow-sm sticky top-6"
              >
                <div
                  className="px-5 py-4 border-b border-gray-200 flex
                             items-center justify-between"
                >
                  <h3 className="font-bold text-gray-900 text-sm">
                    📋 Certificate Activity
                  </h3>

                  <button
                    onClick={() => setShowActivity(false)}
                    className="text-gray-400 hover:text-gray-600
                               transition-colors text-lg leading-none"
                    aria-label="Close activity panel"
                  >
                    ✕
                  </button>
                </div>

                <div className="px-5 py-3 bg-blue-50 border-b border-blue-100">
                  <p className="text-xs text-blue-600 leading-relaxed">
                    Recent updates to your certificate status.
                  </p>
                </div>

                <div
                  className="p-4 space-y-3 max-h-96 overflow-y-auto
                             scrollbar-hide"
                >
                  {activityFeed.length === 0 ? (
                    <div className="text-center py-8">
                      <p className="text-3xl mb-2">📭</p>
                      <p className="text-gray-400 text-sm">
                        No activity yet
                      </p>
                    </div>
                  ) : (
                    activityFeed.map((item, index) => (
                      <ActivityItem
                        key={index}
                        item={item}
                      />
                    ))
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
