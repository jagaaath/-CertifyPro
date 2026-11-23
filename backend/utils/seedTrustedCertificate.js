// Development-only trusted certificate record for testing the QR scanner.
// Its matching QR is included in test-files/sample_verified_certificate.pdf.
require("dotenv").config();
const connectDB = require("../config/db");
const TrustedCertificate = require("../models/TrustedCertificate");
const normalizeVerificationUrl = require("./normalizeVerificationUrl");

const DEMO_URL = "https://certifypro-demo.example/verify/CP-DEMO-001";

async function seedTrustedCertificate() {
  try {
    await connectDB();
    const verificationUrl = normalizeVerificationUrl(DEMO_URL);

    await TrustedCertificate.findOneAndUpdate(
      { verificationUrl },
      {
        $set: {
          certificateNumber: "CP-DEMO-001",
          issuedTo: "Demo Student",
          issuer: "CertifyPro Development Test",
          isActive: true,
        },
      },
      { upsert: true, new: true, runValidators: true }
    );

    console.log("✅ Development trusted certificate is ready.");
    console.log(`   QR URL: ${DEMO_URL}`);
    console.log("   Matching test PDF: test-files/sample_verified_certificate.pdf");
    process.exit(0);
  } catch (error) {
    console.error("❌ Trusted certificate seed failed:", error.message);
    process.exit(1);
  }
}

seedTrustedCertificate();
