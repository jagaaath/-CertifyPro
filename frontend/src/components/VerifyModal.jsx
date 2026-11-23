// ============================================
// VerifyModal Component
// Modal dialog for approving or rejecting
// a certificate with a reason field
//
// Props:
//   cert        — certificate object
//   onClose     — close the modal
//   onVerify    — called with (certId, action, reason)
//   verifying   — boolean loading state
// ============================================

import { useState } from "react";

const VerifyModal = ({ cert, onClose, onVerify, verifying }) => {
  const [action, setAction]           = useState("approve");
  const [rejectionReason, setReason]  = useState("");
  const [reasonError, setReasonError] = useState("");

  // ── Handle backdrop click ──────────────────────
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };

  // ── Submit verification ────────────────────────
  const handleSubmit = () => {
    // Validate rejection reason is provided
    if (action === "reject" && !rejectionReason.trim()) {
      setReasonError("Please provide a reason for rejection");
      return;
    }
    onVerify(cert._id, action, rejectionReason);
  };

  if (!cert) return null;

  return (
    // ── Modal Backdrop ─────────────────────────────
    <div
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex
                 items-center justify-center p-4 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      {/* Modal box */}
      <div className="bg-white rounded-2xl shadow-2xl w-full
                      max-w-lg overflow-hidden animate-in
                      fade-in slide-in-from-bottom-4 duration-200">

        {/* ── Modal Header ─────────────────────── */}
        <div className="px-6 py-4 border-b border-gray-200 flex
                        items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">
            Verify Certificate
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center
                       rounded-lg hover:bg-gray-100 text-gray-400
                       hover:text-gray-600 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Certificate Info ──────────────────── */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center
                            justify-center text-xl ${
              cert.fileType === "pdf" ? "bg-red-100" : "bg-blue-100"
            }`}>
              {cert.fileType === "pdf" ? "📄" : "🖼️"}
            </div>
            <div>
              <p className="font-semibold text-gray-800 text-sm">
                {cert.title}
              </p>
              <p className="text-xs text-gray-500">
                {cert.student?.name} · {cert.student?.usn} ·{" "}
                ⭐ {cert.creditsEarned} credits
              </p>
            </div>
          </div>

          {/* View file link fixed here */}
          <a 
            href={cert.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 text-xs
                       text-primary-600 hover:text-primary-800
                       font-medium transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 
                002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Open certificate file to review
          </a>
        </div>

        {/* ── Action Selection ──────────────────── */}
        <div className="px-6 py-5 space-y-4">

          <p className="text-sm font-medium text-gray-700">
            Your Decision:
          </p>

          {/* Approve / Reject radio buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Approve option */}
            <label className={`flex items-center gap-3 p-4 rounded-xl
                              border-2 cursor-pointer transition-all
                              duration-200 ${
              action === "approve"
                ? "border-green-500 bg-green-50"
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="action"
                value="approve"
                checked={action === "approve"}
                onChange={() => {
                  setAction("approve");
                  setReason("");
                  setReasonError("");
                }}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex
                              items-center justify-center flex-shrink-0 ${
                action === "approve"
                  ? "border-green-500 bg-green-500"
                  : "border-gray-300"
              }`}>
                {action === "approve" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">
                  ✅ Approve
                </p>
                <p className="text-xs text-gray-400">
                  Certificate is valid
                </p>
              </div>
            </label>

            {/* Reject option */}
            <label className={`flex items-center gap-3 p-4 rounded-xl
                              border-2 cursor-pointer transition-all
                              duration-200 ${
              action === "reject"
                ? "border-red-500 bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}>
              <input
                type="radio"
                name="action"
                value="reject"
                checked={action === "reject"}
                onChange={() => {
                  setAction("reject");
                  setReasonError("");
                }}
                className="sr-only"
              />
              <div className={`w-5 h-5 rounded-full border-2 flex
                              items-center justify-center flex-shrink-0 ${
                action === "reject"
                  ? "border-red-500 bg-red-500"
                  : "border-gray-300"
              }`}>
                {action === "reject" && (
                  <div className="w-2 h-2 rounded-full bg-white" />
                )}
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-800">
                  ❌ Reject
                </p>
                <p className="text-xs text-gray-400">
                  Certificate is invalid
                </p>
              </div>
            </label>
          </div>

          {/* Rejection reason field — shown only when rejecting */}
          {action === "reject" && (
            <div>
              <label className="form-label">
                Reason for Rejection{" "}
                <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectionReason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setReasonError("");
                }}
                placeholder="Explain why this certificate is being rejected. The student will see this message..."
                rows={3}
                className={`input-field resize-none ${
                  reasonError
                    ? "border-red-400 focus:ring-red-400"
                    : ""
                }`}
              />
              {reasonError && (
                <p className="mt-1 text-xs text-red-500">
                  {reasonError}
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ─────────────────────── */}
        <div className="px-6 py-4 border-t border-gray-200 flex
                        items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={verifying}
            className="btn-secondary px-5"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={verifying}
            className={`px-6 py-2 rounded-lg text-white font-medium
                       text-sm transition-colors duration-200
                       disabled:opacity-50 flex items-center gap-2 ${
              action === "approve"
                ? "bg-green-600 hover:bg-green-700"
                : "bg-red-600 hover:bg-red-700"
            }`}
          >
            {verifying ? (
              <>
                <div className="w-4 h-4 border-2 border-white
                                border-t-transparent rounded-full
                                animate-spin" />
                Processing...
              </>
            ) : action === "approve" ? (
              "✅ Confirm Approval"
            ) : (
              "❌ Confirm Rejection"
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyModal;