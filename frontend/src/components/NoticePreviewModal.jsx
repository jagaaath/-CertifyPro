import { useEffect, useState } from "react";

const NoticePreviewModal = ({ notice, onClose }) => {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Number(notice?.pageCount) || 1);

  useEffect(() => setPage(1), [notice?._id]);

  if (!notice) return null;

  const pagePreviewUrl = notice.previewUrl?.replace(
    /\/pg_\d+(?:,[^/]+)?\//,
    `/pg_${page},w_1200,c_limit/`
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="dialog" aria-modal="true" aria-label="Notice preview" onClick={onClose}>
      <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 sm:p-5">
          <div>
            <h3 className="font-semibold text-gray-900">Notice</h3>
            <p className="mt-1 text-sm text-gray-600">{notice.description}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg px-3 py-1 text-xl text-gray-500 hover:bg-gray-100" aria-label="Close notice">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto bg-gray-100 p-4 sm:p-6">
          {pagePreviewUrl ? (
            <img src={pagePreviewUrl} alt={`Page ${page} of notice: ${notice.description}`} className="mx-auto max-h-[68vh] max-w-full rounded bg-white object-contain shadow" />
          ) : (
            <p className="rounded-lg bg-white p-6 text-center text-sm text-gray-600">A preview is not available for this notice.</p>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 p-3">
          <p className="text-sm text-gray-600">Page {page} of {pageCount}</p>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50">Previous</button>
            <button type="button" onClick={() => setPage((current) => Math.min(pageCount, current + 1))} disabled={page >= pageCount} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NoticePreviewModal;
