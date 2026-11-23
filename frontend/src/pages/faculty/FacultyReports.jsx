import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosInstance from "../../api/axios";
import Navbar from "../../components/Navbar";

const formatDate = () => new Date().toISOString().slice(0, 10);

const FacultyReports = () => {
  const navigate = useNavigate();
  const [downloading, setDownloading] = useState("");

  const downloadReport = async (type) => {
    const isZip = type === "zip";
    const endpoint = isZip
      ? "/faculty/reports/students.zip"
      : "/faculty/reports/students.xlsx";
    const filename = isZip
      ? `CertifyPro_Student_Workbooks_${formatDate()}.zip`
      : `CertifyPro_Student_Report_${formatDate()}.xlsx`;
    const contentType = isZip
      ? "application/zip"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    setDownloading(type);
    try {
      const response = await axiosInstance.get(endpoint, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: contentType }));
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
      toast.success(isZip ? "Student workbooks ZIP downloaded." : "Department Excel report downloaded.");
    } catch (error) {
      let message = "Could not download the report.";
      if (error.response?.data instanceof Blob) {
        try {
          const details = JSON.parse(await error.response.data.text());
          message = details.message || message;
        } catch {
          // Keep the default message if the response is not JSON.
        }
      } else if (error.response?.data?.message) {
        message = error.response.data.message;
      }
      toast.error(message);
    } finally {
      setDownloading("");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Reports & Downloads" />
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/faculty/dashboard")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-800"
        >
          <span aria-hidden="true">←</span> Back to Faculty Dashboard
        </button>

        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">Download Reports</h1>
          <p className="mt-1 text-sm text-gray-500">Choose a format for your department’s student and certificate data.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-2xl">🗂️</div>
            <h2 className="text-lg font-semibold text-gray-900">Individual student workbooks</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">Download one ZIP file containing a separate Excel workbook for every student. Each workbook includes the student’s profile and full certificate details.</p>
            <button
              type="button"
              onClick={() => downloadReport("zip")}
              disabled={Boolean(downloading)}
              className="mt-6 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
            >
              {downloading === "zip" ? "Preparing ZIP…" : "Download ZIP of Student Workbooks"}
            </button>
          </article>

          <article className="flex flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">📊</div>
            <h2 className="text-lg font-semibold text-gray-900">Department-wide Excel report</h2>
            <p className="mt-2 flex-1 text-sm leading-6 text-gray-600">Download one Excel workbook with a student summary and a certificate details sheet covering the whole department.</p>
            <button
              type="button"
              onClick={() => downloadReport("xlsx")}
              disabled={Boolean(downloading)}
              className="mt-6 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-60"
            >
              {downloading === "xlsx" ? "Preparing Excel workbook…" : "Download Department Excel Workbook"}
            </button>
          </article>
        </div>
      </main>
    </div>
  );
};

export default FacultyReports;
