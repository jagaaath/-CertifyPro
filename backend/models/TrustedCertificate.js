const mongoose = require("mongoose");
const normalizeVerificationUrl = require("../utils/normalizeVerificationUrl");

const trustedCertificateSchema = new mongoose.Schema(
  {
    verificationUrl: {
      type: String,
      required: [true, "A verification URL is required"],
      unique: true,
      trim: true,
    },
    certificateNumber: { type: String, trim: true, default: "" },
    issuedTo: { type: String, trim: true, default: "" },
    issuer: { type: String, trim: true, default: "" },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

trustedCertificateSchema.pre("validate", function (next) {
  const normalized = normalizeVerificationUrl(this.verificationUrl);
  if (!normalized) {
    return next(new Error("Trusted certificate URL must be a valid HTTP or HTTPS URL."));
  }
  this.verificationUrl = normalized;
  next();
});

module.exports = mongoose.model("TrustedCertificate", trustedCertificateSchema);
