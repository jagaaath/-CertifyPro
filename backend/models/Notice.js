const mongoose = require("mongoose");

const noticeSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: [true, "Notice description is required"],
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    department: {
      type: String,
      required: true,
      trim: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    previewUrl: {
      type: String,
      required: true,
    },
    pageCount: {
      type: Number,
      min: 1,
    },
    publicId: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Faculty",
      required: true,
    },
  },
  { timestamps: true }
);

noticeSchema.index({ department: 1, createdAt: -1 });

module.exports = mongoose.model("Notice", noticeSchema);
