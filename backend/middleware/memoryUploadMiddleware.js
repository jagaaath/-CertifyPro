
const multer = require("multer");

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: MAX_FILE_SIZE,
  },

  fileFilter: (req, file, cb) => {
    const hasPdfExtension = /\.pdf$/i.test(
      file.originalname || ""
    );

    const hasPdfMimeType =
      file.mimetype === "application/pdf";

    if (!hasPdfExtension || !hasPdfMimeType) {
      return cb(
        new Error(
          "Invalid file type. Only PDF files are allowed."
        ),
        false
      );
    }

    cb(null, true);
  },
});

const uploadSingleToMemory = (req, res, next) => {
  upload.single("certificate")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          code: "FILE_TOO_LARGE",
          message: "File too large. Maximum size is 5MB.",
        });
      }

      return res.status(400).json({
        success: false,
        code: "INVALID_UPLOAD",
        message:
          error.message || "File upload failed.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: "FILE_REQUIRED",
        message: "Please select a PDF certificate to upload.",
      });
    }

    // Validate the actual file content, not just its extension.
    const fileBuffer = req.file.buffer;

    const hasPdfSignature =
      Buffer.isBuffer(fileBuffer) &&
      fileBuffer
        .subarray(0, 1024)
        .toString("latin1")
        .includes("%PDF-");

    if (!hasPdfSignature) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PDF",
        message: "Invalid PDF file. Please upload a valid PDF.",
      });
    }

    next();
  });
};

module.exports = { uploadSingleToMemory };
