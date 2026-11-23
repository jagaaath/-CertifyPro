// ============================================
// CertificateCard — Updated
// Now shows statusHistory timeline
// maintained by Mongoose triggers
// ============================================

import { useState } from "react";

const STATUS_CONFIG = {
  pending:  { label: "Pending Review", className: "badge-pending",  icon: "⏳" },
  approved: { label: "Approved",       className: "badge-approved", icon: "✅" },
  rejected: { label: "Rejected",       className: "badge-rejected", icon: "❌" },
};

const AWARD_TYPE_LABELS = {
  elite: "Elite",
  elite_plus_gold: "Elite + Gold",
  elite_plus_silver: "Elite + Silver",
  successfully_completed: "Successfully Completed",
  participation: "Participation",
  not_certified: "Not Certified",
};

const CertificateCard = ({ certificate, onDelete }) => {
  const [deleting, setDeleting]       = useState(false);
  const [showHistory, setShowHistory]     = useState(false);

  const status = STATUS_CONFIG[certificate.status] || STATUS_CONFIG.pending;

  const formatDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric", month: "short", year: "numeric",
        })
      : "N/A";

  const formatDateTime = (d) =>
    d
      ? new Date(d).toLocaleDateString("en-IN", {
          day: "numeric", month: "short",
          hour: "2-digit", minute: "2-digit",
        })
      : "N/A";

  const handleDelete = async () => {
    if (!window.confirm(`Delete "${certificate.title}"?`)) return;
    setDeleting(true);
    try {
      await onDelete(certificate._id);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200
                    hover:border-gray-300 hover:shadow-md
                    transition-all duration-200 overflow-hidden">

      {/* Status color bar */}
      <div className={`h-1 w-full ${
        certificate.status === "approved"
          ? "bg-green-500"
          : certificate.status === "rejected"
          ? "bg-red-500"
          : "bg-yellow-400"
      }`} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className={`w-12 h-12 rounded-xl flex items-center
                          justify-center text-2xl flex-shrink-0 ${
            certificate.fileType === "pdf" ? "bg-red-50" : "bg-blue-50"
          }`}>
            {certificate.fileType === "pdf" ? "📄" : "🖼️"}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm
                           leading-snug truncate mb-1">
              {certificate.title}
            </h3>
            <span className={status.className}>
              {status.icon} {status.label}
            </span>
          </div>
        </div>

        {/* Info grid */}
        {AWARD_TYPE_LABELS[certificate.awardType] && (
          <div className="mb-3 rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
            <p className="text-xs text-amber-700">NPTEL Certificate Type</p>
            <p className="text-sm font-semibold text-amber-900">
              {AWARD_TYPE_LABELS[certificate.awardType]}
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-0.5">Credits</p>
            <p className="text-sm font-bold text-gray-900">
              {certificate.creditsEarned}
            </p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-0.5">Uploaded</p>
            <p className="text-sm font-medium text-gray-900">
              {formatDate(certificate.createdAt)}
            </p>
          </div>
        </div>

        {/* Verified by */}
        {certificate.verifiedBy && (
          <div className="mb-4 px-3 py-2 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              {certificate.status === "approved" ? "✅" : "❌"} By{" "}
              <span className="font-medium text-gray-700">
                {certificate.verifiedBy?.name}
              </span>
              {certificate.verifiedAt && (
                <span className="text-gray-400">
                  {" "}· {formatDate(certificate.verifiedAt)}
                </span>
              )}
            </p>
          </div>
        )}

        {/* Rejection reason */}
        {certificate.status === "rejected" &&
          certificate.rejectionReason && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100
                          rounded-lg">
            <p className="text-xs font-medium text-red-700 mb-1">
              Reason:
            </p>
            <p className="text-xs text-red-600">
              {certificate.rejectionReason}
            </p>
          </div>
        )}

        {/* ── Trigger Status History ─────────────── */}
        {certificate.statusHistory &&
          certificate.statusHistory.length > 0 && (
          <div className="mb-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-2 text-xs font-medium
                         text-purple-600 hover:text-purple-800
                         transition-colors w-full"
            >
              <span>⚡ Trigger History</span>
              <span className="bg-purple-100 text-purple-700 px-1.5
                               py-0.5 rounded-full text-xs font-bold">
                {certificate.statusHistory.length}
              </span>
              <svg
                className={`w-3.5 h-3.5 ml-auto transition-transform
                            duration-200 ${showHistory ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showHistory && (
              <div className="mt-2 space-y-1.5 pl-2 border-l-2
                              border-purple-200">
                {certificate.statusHistory.map((h, idx) => {
                  const cfg = {
                    pending:  { icon: "📤", color: "text-yellow-600" },
                    approved: { icon: "✅", color: "text-green-600"  },
                    rejected: { icon: "❌", color: "text-red-600"    },
                  }[h.status] || { icon: "•", color: "text-gray-500" };

                  return (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="text-xs mt-0.5">{cfg.icon}</span>
                      <div>
                        <p className={`text-xs font-medium ${cfg.color}
                                       capitalize`}>
                          {h.status}
                        </p>
                        <p className="text-xs text-gray-400">{h.note}</p>
                        <p className="text-xs text-gray-300">
                          {formatDateTime(h.changedAt)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          {/* Restored missing anchor opening tag here */}
          <a  
            href={certificate.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1.5
                       px-3 py-2 bg-gray-100 hover:bg-gray-200
                       text-gray-700 text-xs font-medium rounded-lg
                       transition-colors duration-200"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0
                002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View File
          </a>

          {certificate.status !== "approved" && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center justify-center gap-1.5
                         px-3 py-2 bg-red-50 hover:bg-red-100
                         text-red-600 text-xs font-medium rounded-lg
                         transition-colors duration-200 disabled:opacity-50"
            >
              {deleting ? (
                <div className="w-3.5 h-3.5 border-2 border-red-400
                                border-t-transparent rounded-full
                                animate-spin" />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M19 7l-.867 12.142A2 2 0
                    0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5
                    4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1
                    1v3M4 7h16" />
                </svg>
              )}
              Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default CertificateCard;
