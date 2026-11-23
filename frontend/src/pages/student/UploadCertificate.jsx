// ============================================
// UploadCertificate Page
// Form for students to upload a certificate
//
// Features:
//   - Drag and drop file zone
//   - Click to browse
//   - PDF file selection and preview indicator before submit
//   - Title, description and optional issue date fields
//   - Credits are extracted automatically from the official NPTEL record
//   - Client-side validation
//   - Upload progress feedback
//   - Redirect to dashboard on success
// ============================================

import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import axiosInstance from "../../api/axios";
import Navbar from "../../components/Navbar";
import { useAuth } from "../../context/AuthContext";

// ── Max file size: 5MB in bytes ─────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024;
// Check the extension and, when provided by the browser, the MIME type.
// The backend must independently validate the uploaded PDF content.
const isPdfFile = (selectedFile) => {
  const hasPdfExtension = /\.pdf$/i.test(selectedFile?.name || "");
  const hasValidMimeType =
    !selectedFile?.type || selectedFile.type === "application/pdf";

  return hasPdfExtension && hasValidMimeType;
};

const ProfileField = ({ label, value, required = false }) => (
  <div>
    <label className="form-label">
      {label}{required && <span className="text-red-500"> *</span>}
    </label>
    <input
      type="text"
      value={value || ""}
      readOnly
      className="input-field bg-gray-50 text-gray-600"
      aria-label={label}
    />
  </div>
);

const DEPARTMENTS = ["CSE", "AI/ML", "MECH", "CIVIL", "EEE", "ECE"];
const getDepartmentValue = (department = "") => {
  const normalized = department.trim().toUpperCase();
  if (normalized === "AIML" || normalized === "AIDS" || normalized === "AI/ML") return "AI/ML";
  return DEPARTMENTS.includes(normalized) ? normalized : "";
};

const UploadCertificate = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  // ── Form state ─────────────────────────────────
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    issueDate: "",
    section: "",
    certificateType: "",
    proofType: "",
    issuer: "",
    department: getDepartmentValue(user?.department),
    semester: user?.semester ? String(user.semester) : "",
    subjectCode: "",
    courseDuration: "",
  });

  useEffect(() => {
    if (!user) return;
    setFormData((current) => ({
      ...current,
      department: current.department || getDepartmentValue(user.department),
      semester: current.semester || (user.semester ? String(user.semester) : ""),
    }));
  }, [user]);

  // ── File state ─────────────────────────────────
  const [file, setFile] = useState(null);                   // Selected PDF file
  const [isDragging, setIsDragging] = useState(false);      // Drag state

  // ── UI state ───────────────────────────────────
  const [errors, setErrors]         = useState({});
  const [uploading, setUploading]   = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ════════════════════════════════════════════════
  // FILE HANDLING
  // ════════════════════════════════════════════════

  // ── Process a selected/dropped file ───────────
  const processFile = (selectedFile) => {
    if (!isPdfFile(selectedFile)) {
      toast.error("Invalid file type. Only PDF files are allowed.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum size is 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Store the selected PDF
    setFile(selectedFile);

    // Clear any previous file error
    setErrors((prev) => ({ ...prev, file: "" }));
  };

  // ── File input change handler ──────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) processFile(selected);
  };

  // ── Drag and drop handlers ─────────────────────
  const handleDragOver = useCallback((e) => {
    e.preventDefault(); // Allow drop
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) processFile(dropped);
  }, []);

  // ── Remove selected file ───────────────────────
  const removeFile = () => {
    setFile(null);
    // Reset the hidden file input so same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // ════════════════════════════════════════════════
  // FORM HANDLING
  // ════════════════════════════════════════════════

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  // ── Client-side validation ─────────────────────
  const validate = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = "Certificate title is required";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Title must be at least 3 characters";
    }

    if (!formData.certificateType) newErrors.certificateType = "Select a certificate type";

    if (!formData.proofType) newErrors.proofType = "Select a proof type";
    if (!formData.issuer.trim()) newErrors.issuer = "Issuing organization is required";
    if (!formData.department) newErrors.department = "Select a department";
    if (!formData.semester) newErrors.semester = "Select a semester";
    if (!formData.subjectCode) newErrors.subjectCode = "Select a subject code";


    if (!file) {
      newErrors.file = "Please select a PDF certificate to upload";
    } else if (!isPdfFile(file)) {
      newErrors.file = "Only PDF files are allowed";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit handler ─────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fix the errors before submitting");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // ── Build FormData ───────────────────────────
      // Must use FormData (not JSON) for file uploads
      // The key 'certificate' must match backend's multer field name
      const data = new FormData();
      data.append("certificate", file);          // File field
      data.append("title", formData.title.trim());
      data.append("description", formData.description.trim());
      if (formData.issueDate) data.append("issueDate", formData.issueDate);
      data.append("section", formData.section);
      data.append("certificateType", formData.certificateType);
      data.append("proofType", formData.proofType);
      data.append("issuer", formData.issuer.trim());
      data.append("department", formData.department);
      data.append("semester", formData.semester);
      data.append("subjectCode", formData.subjectCode);
      data.append("courseDuration", formData.courseDuration);

      // ── Upload with progress tracking ───────────
      const res = await axiosInstance.post("/certificate/upload", data, {
        headers: {
          // Override Content-Type so Axios sets the
          // correct multipart/form-data boundary automatically
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          // Calculate percentage for progress bar
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percent);
        },
      });

      if (res.data.success) {
        // The backend compares the PDF name/course with the official NPTEL page.
        // MongoDB stores the upload; it is not used to decide authenticity.
        const qrStatus =
          res.data.verificationResult ||
          res.data.certificate?.qrVerificationStatus;

        const verificationMessage =
          res.data.message ||
          res.data.certificate?.qrVerificationMessage ||
          (qrStatus === "verified"
            ? "VERIFIED — the PDF details match the official NPTEL certificate."
            : "NOT VERIFIED — the PDF details could not be matched with the official NPTEL certificate.");

        if (qrStatus === "verified") {
          toast.success(verificationMessage);
        } else {
          toast.error(verificationMessage);
        }

        navigate("/student/dashboard");
      }
    } catch (error) {
      const msg =
        error.response?.data?.message ||
        "Upload failed. Please try again.";
      toast.error(msg);
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // ── Format file size ───────────────────────────
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar title="Upload Certificate" />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* ── Page Header ────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate("/student/dashboard")}
            className="flex items-center gap-2 text-gray-500
                       hover:text-gray-700 transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24"
              stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round"
                strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border
                        border-gray-200 overflow-hidden">

          {/* Card header */}
          <div className="border-b border-gray-100 px-6 py-5 sm:px-8">
            <h1 className="text-xl font-semibold text-gray-900">Upload Certificate</h1>
            <p className="text-sm text-gray-500 mt-1">Add your certificate file and provide the details below. The certificate name must match your USN profile and the name on the official QR verification page.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-6">

            {/* ── File Upload Zone ──────────── */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certificate File{" "}
                <span className="text-red-500">*</span>
              </label>

              {!file ? (
                // Drop zone — shown when no file selected
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-10
                             text-center cursor-pointer transition-all
                             duration-200 ${
                    isDragging
                      ? "border-primary-400 bg-primary-50 scale-[1.01]"
                      : errors.file
                      ? "border-red-300 bg-red-50 hover:border-red-400"
                      : "border-gray-300 bg-gray-50 hover:border-primary-400 hover:bg-primary-50"
                  }`}
                >
                  <div className="text-4xl mb-3">
                    {isDragging ? "📂" : "☁️"}
                  </div>
                  <p className="text-gray-600 font-medium text-sm mb-1">
                    {isDragging
                      ? "Drop your file here!"
                      : "Drag & drop your certificate here"}
                  </p>
                  <p className="text-gray-400 text-xs mb-3">
                    or click to browse files
                  </p>
                  <span className="inline-block px-3 py-1 bg-white
                                   border border-gray-300 text-gray-500
                                   text-xs rounded-full">
                    PDF only · Max 5MB
                  </span>
                </div>
              ) : (
                // Selected PDF information
                <div className="border border-gray-200 rounded-xl
                                overflow-hidden">
                  <div className="bg-red-50 flex items-center
                                  justify-center p-8">
                    <div className="text-center">
                      <div className="text-5xl mb-2">📄</div>
                      <p className="text-red-500 text-sm font-medium">
                        PDF Document
                      </p>
                    </div>
                  </div>

                  {/* File info row */}
                  <div className="flex items-center justify-between
                                  px-4 py-3 bg-white">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg">📄</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800
                                      truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatFileSize(file.size)}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={removeFile}
                      className="text-red-500 hover:text-red-700 p-1
                                 hover:bg-red-50 rounded-lg transition-colors ml-2"
                    >
                      <svg className="w-4 h-4" fill="none"
                        viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,.pdf"
                onChange={handleFileChange}
                className="hidden"
              />

              {errors.file && (
                <p className="mt-1 text-xs text-red-500">{errors.file}</p>
              )}
            </div>

            <section className="rounded-xl border border-gray-200 p-5 sm:p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-5">Certificate Details</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                <ProfileField label="Student Name" value={user?.name} required />
                <ProfileField label="USN" value={user?.usn} required />
                <div>
                  <label className="form-label">Department <span className="text-red-500">*</span></label>
                  <select name="department" value={formData.department} onChange={handleChange} className={`input-field ${errors.department ? "border-red-400" : ""}`}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((department) => <option key={department} value={department}>{department}</option>)}
                  </select>
                  {errors.department && <p className="mt-1 text-xs text-red-500">{errors.department}</p>}
                </div>
                <div>
                  <label className="form-label">Section</label>
                  <select name="section" value={formData.section} onChange={handleChange} className="input-field">
                    <option value="">Select section</option>
                    {["A", "B", "C"].map((section) => <option key={section} value={section}>{section}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Semester <span className="text-red-500">*</span></label>
                  <select name="semester" value={formData.semester} onChange={handleChange} className={`input-field ${errors.semester ? "border-red-400" : ""}`}>
                    <option value="">Select semester</option>
                    {Array.from({ length: 8 }, (_, index) => index + 1).map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                  </select>
                  {errors.semester && <p className="mt-1 text-xs text-red-500">{errors.semester}</p>}
                </div>
                <div>
                  <label className="form-label">Subject Code <span className="text-red-500">*</span></label>
                  <select name="subjectCode" value={formData.subjectCode} onChange={handleChange} className={`input-field ${errors.subjectCode ? "border-red-400" : ""}`}>
                    <option value="">Select subject code</option>
                    {["1", "2", "3", "4"].map((code) => <option key={code} value={code}>{code}</option>)}
                  </select>
                  {errors.subjectCode && <p className="mt-1 text-xs text-red-500">{errors.subjectCode}</p>}
                </div>
                <div>
                  <label className="form-label">Certificate Type <span className="text-red-500">*</span></label>
                  <select name="certificateType" value={formData.certificateType} onChange={handleChange} className={`input-field ${errors.certificateType ? "border-red-400" : ""}`}>
                    <option value="">Select certificate type</option>
                    <option value="open-elective">Open Elective</option>
                    <option value="professional-elective">Professional Elective</option>
                  </select>
                  {errors.certificateType && <p className="mt-1 text-xs text-red-500">{errors.certificateType}</p>}
                </div>
                <div>
                  <label className="form-label">Course Duration</label>
                  <select name="courseDuration" value={formData.courseDuration} onChange={handleChange} className="input-field">
                    <option value="">Select course duration</option>
                    {[4, 8, 12, 16].map((weeks) => <option key={weeks} value={weeks}>{weeks} weeks</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Certificate Name <span className="text-red-500">*</span></label>
                  <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g. Introduction to Python" className={`input-field ${errors.title ? "border-red-400" : ""}`} />
                  {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
                </div>
                <div>
                  <label className="form-label">Proof of Certificate <span className="text-red-500">*</span></label>
                  <select name="proofType" value={formData.proofType} onChange={handleChange} className={`input-field ${errors.proofType ? "border-red-400" : ""}`}>
                    <option value="">Select Proof Type</option>
                    <option value="course-certificate">Course Certificate</option>
                    <option value="participation-certificate">Participation Certificate</option>
                    <option value="completion-certificate">Completion Certificate</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.proofType && <p className="mt-1 text-xs text-red-500">{errors.proofType}</p>}
                </div>
                <div>
                  <label className="form-label">Issue Date <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="date" name="issueDate" value={formData.issueDate} onChange={handleChange} max={new Date().toISOString().split("T")[0]} className={`input-field ${errors.issueDate ? "border-red-400" : ""}`} />
                </div>
                <div>
                  <label className="form-label">Issued By <span className="text-red-500">*</span></label>
                  <input type="text" name="issuer" value={formData.issuer} onChange={handleChange} placeholder="Organization name" className={`input-field ${errors.issuer ? "border-red-400" : ""}`} />
                  {errors.issuer && <p className="mt-1 text-xs text-red-500">{errors.issuer}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="form-label">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleChange} placeholder="Brief description of the certificate..." rows={3} maxLength={500} className="input-field resize-none" />
                  <p className="mt-1 text-xs text-gray-400 text-right">{formData.description.length}/500</p>
                </div>
              </div>
            </section>

            {/* Credits are read automatically from the official NPTEL record */}
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="text-sm font-semibold text-blue-800">
                Credits are detected automatically
              </p>
              <p className="mt-1 text-xs text-blue-600 leading-relaxed">
                CertifyPro reads the official NPTEL "Weeks / credits" value
                from the QR verification page. You do not need to enter credits.
              </p>
            </div>

            {/* ── Upload Progress Bar ───────── */}
            {uploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 font-medium">
                    Scanning NPTEL certificate and detecting credits...
                  </span>
                  <span className="text-primary-600 font-bold">
                    {uploadProgress}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full
                               transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Please don't close this page...
                </p>
              </div>
            )}

            {/* ── Submit + Cancel buttons ───── */}
            <div className="flex items-center gap-4 pt-2">
              <button
                type="submit"
                disabled={uploading}
                className="btn-primary flex-1 py-3 flex items-center
                           justify-center gap-2 text-base"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white
                                    border-t-transparent rounded-full
                                    animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5
                        5 0 1115.9 6L16 6a5 5 0 011 9.9M15
                        13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Upload Certificate
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate("/student/dashboard")}
                disabled={uploading}
                className="btn-secondary px-6 py-3"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>

        {/* ── Help note ──────────────────────── */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border
                        border-blue-100">
          <h4 className="text-sm font-semibold text-blue-800 mb-1">
            📋 What happens next?
          </h4>
          <p className="text-xs text-blue-600 leading-relaxed">
            After uploading, your certificate will be reviewed by a
            faculty member from your department. You'll be able to see
            the status (Pending → Approved/Rejected) on your dashboard.
            Approved certificates count towards your total credits.
          </p>
        </div>
      </main>
    </div>
  );
};

export default UploadCertificate;
