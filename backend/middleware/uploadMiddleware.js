// ============================================
// Upload Middleware
// Configures Multer to stream file uploads
// directly to Cloudinary (no local disk storage)
//
// Flow:
//   Client sends file → Multer intercepts →
//   Streams to Cloudinary → Cloudinary returns URL
//   → URL saved in MongoDB by the controller
//
// Supported file types:
//   Images : jpg, jpeg, png, webp
//   Docs   : pdf
// ============================================

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// ════════════════════════════════════════════════
// CLOUDINARY STORAGE ENGINE
// Tells Multer to upload files to Cloudinary
// instead of saving them on the local server disk
// ════════════════════════════════════════════════
const storage = new CloudinaryStorage({
  cloudinary: cloudinary, // The configured cloudinary instance

  params: async (req, file) => {
    // ── Determine resource type ────────────────
    // Cloudinary handles images and PDFs differently
    // PDFs must use resource_type: "raw" or "auto"
    // Images use resource_type: "image"
    const isPdf = file.mimetype === "application/pdf";

    return {
      // ── Folder in Cloudinary ─────────────────
      // Files will be stored under:
      // certificate_management/certificates/
      folder: "certificate_management/certificates",

      // ── Resource Type ─────────────────────────
      // "auto" lets Cloudinary detect image vs pdf
      resource_type: "auto",

      // ── File Format ───────────────────────────
      // For PDFs, keep as pdf
      // For images, allow jpg/png (Cloudinary auto-converts)
      format: isPdf ? "pdf" : undefined,

      // ── Public ID ─────────────────────────────
      // Custom filename in Cloudinary
      // Pattern: cert_<studentId>_<timestamp>
      // This makes it easy to identify whose file it is
      public_id: `cert_${req.user._id}_${Date.now()}`,

      // ── Transformation (images only) ──────────
      // Resize large images to max 1200px width
      // This saves storage and speeds up loading
      // PDFs are not transformed
      transformation: isPdf
        ? undefined
        : [{ width: 1200, crop: "limit", quality: "auto" }],
    };
  },
});

// ════════════════════════════════════════════════
// FILE FILTER
// Validates the file type BEFORE uploading
// Rejects any file that isn't an image or PDF
// ════════════════════════════════════════════════
const fileFilter = (req, file, cb) => {
  // Allowed MIME types
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    // Accept the file — pass null (no error) and true (accept)
    cb(null, true);
  } else {
    // Reject the file — pass an error message
    cb(
      new Error(
        "Invalid file type. Only JPG, PNG, WEBP images and PDF files are allowed."
      ),
      false
    );
  }
};

// ════════════════════════════════════════════════
// MULTER INSTANCE
// Combines storage engine + file filter + size limit
// ════════════════════════════════════════════════
const upload = multer({
  storage: storage,   // Use Cloudinary storage (not disk)
  fileFilter: fileFilter, // Validate file type
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    // 5 * 1024 * 1024 = 5,242,880 bytes = 5MB
  },
});

// ════════════════════════════════════════════════
// EXPORT — uploadSingle
// Middleware that accepts ONE file from a
// form field named "certificate"
//
// Usage in routes:
//   router.post("/upload", protect, uploadSingle, controller)
//
// After this middleware runs, controller can access:
//   req.file.path        → Cloudinary URL
//   req.file.filename    → Cloudinary public_id
//   req.file.mimetype    → file type
// ════════════════════════════════════════════════
const uploadSingle = (req, res, next) => {
  // "certificate" is the field name expected in the form
  const uploadHandler = upload.single("certificate");

  uploadHandler(req, res, (err) => {
    // ── Handle Multer/Cloudinary errors ─────────
    if (err) {
      // MulterError covers size limits and field errors
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "File too large. Maximum size is 5MB.",
        });
      }

      // All other errors (wrong type, Cloudinary issues)
      return res.status(400).json({
        success: false,
        message: err.message || "File upload failed.",
      });
    }

    // ── No file sent ────────────────────────────
    // Some routes require a file — controller will
    // handle this check, but we can catch it here too
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded. Please attach a certificate file.",
      });
    }

    // ── File uploaded successfully ───────────────
    // Pass control to the next middleware/controller
    next();
  });
};

module.exports = { uploadSingle };