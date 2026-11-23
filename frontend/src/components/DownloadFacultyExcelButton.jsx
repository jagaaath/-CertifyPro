import { useNavigate } from "react-router-dom";

const DownloadFacultyExcelButton = () => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate("/faculty/reports")}
      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
    >
      <span>⬇️</span>
      Reports &amp; Downloads
    </button>
  );
};

export default DownloadFacultyExcelButton;
