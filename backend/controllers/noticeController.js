const multer = require("multer");
const { Readable } = require("stream");
const Notice = require("../models/Notice");
const cloudinary = require("../config/cloudinary");

const MAX_NOTICE_SIZE = 10 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_NOTICE_SIZE },
  fileFilter: (req, file, callback) => {
    const isPdf = file.mimetype === "application/pdf" && /\.pdf$/i.test(file.originalname || "");
    callback(isPdf ? null : new Error("Not a PDF"), isPdf);
  },
}).single("noticePdf");

const uploadNoticePdf = (req, res, next) => {
  upload(req, res, (error) => {
    if (error) {
      const tooLarge = error.code === "LIMIT_FILE_SIZE";
      return res.status(400).json({
        success: false,
        message: tooLarge ? "Notice PDF must be 10MB or smaller." : "Please upload a PDF file.",
      });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a PDF notice." });
    }

    if (!req.file.buffer.subarray(0, 1024).toString("latin1").includes("%PDF-")) {
      return res.status(400).json({ success: false, message: "The uploaded file is not a valid PDF." });
    }

    next();
  });
};

const uploadToCloudinary = (file, facultyId) => new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "certificate_management/notices",
      resource_type: "image",
      public_id: `notice_${facultyId}_${Date.now()}`,
      format: "pdf",
    },
    (error, result) => error ? reject(error) : resolve(result)
  );
  Readable.from([file.buffer]).pipe(stream);
});

const createNotice = async (req, res) => {
  let uploadedFile;
  try {
    const description = String(req.body.description || "").trim();
    if (!description) {
      return res.status(400).json({ success: false, message: "Please add a description for this notice." });
    }
    if (description.length > 500) {
      return res.status(400).json({ success: false, message: "Description cannot exceed 500 characters." });
    }

    uploadedFile = await uploadToCloudinary(req.file, req.user._id);
    const notice = await Notice.create({
      description,
      department: req.user.department,
      fileUrl: uploadedFile.secure_url,
      previewUrl: uploadedFile.secure_url
        .replace("/upload/", "/upload/pg_1,w_480,c_limit/")
        .replace(/\.pdf(?:\?.*)?$/i, ".jpg"),
      publicId: uploadedFile.public_id,
      originalName: req.file.originalname,
      createdBy: req.user._id,
    });

    return res.status(201).json({ success: true, notice });
  } catch (error) {
    if (uploadedFile?.public_id) {
      try {
        await cloudinary.uploader.destroy(uploadedFile.public_id, { resource_type: "image" });
      } catch (cleanupError) {
        console.error("Notice file cleanup failed:", cleanupError.message);
      }
    }
    console.error("Create notice error:", error);
    return res.status(500).json({ success: false, message: "Could not publish notice. Please try again." });
  }
};

const getNotices = async (req, res) => {
  try {
    const notices = await Notice.find({ department: req.user.department })
      .populate("createdBy", "name")
      .sort({ createdAt: -1 });
    return res.status(200).json({ success: true, notices });
  } catch (error) {
    console.error("Get notices error:", error);
    return res.status(500).json({ success: false, message: "Could not load notices." });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findOne({
      _id: req.params.noticeId,
      department: req.user.department,
      createdBy: req.user._id,
    });
    if (!notice) {
      return res.status(404).json({ success: false, message: "Notice not found or you cannot remove it." });
    }

    await Notice.findByIdAndDelete(notice._id);
    try {
      await cloudinary.uploader.destroy(notice.publicId, { resource_type: "image" });
    } catch (error) {
      console.error("Notice file delete failed:", error.message);
    }
    return res.status(200).json({ success: true, message: "Notice removed." });
  } catch (error) {
    console.error("Delete notice error:", error);
    return res.status(500).json({ success: false, message: "Could not remove notice." });
  }
};

module.exports = { uploadNoticePdf, createNotice, getNotices, deleteNotice };
