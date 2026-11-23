// Run from the DBMS-main project root with: node apply-qr-patch.js
// The ZIP must be extracted directly into the folder containing backend/ and frontend/.
const fs = require("fs");
const path = require("path");

const root = process.cwd();
const scriptRoot = __dirname;

function requiredFile(relativePath) {
  const filePath = path.join(root, relativePath);
  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing ${relativePath}. Run this script from the DBMS-main project root.`);
  }
  return filePath;
}

if (path.resolve(root) !== path.resolve(scriptRoot)) {
  throw new Error("Extract the ZIP directly into DBMS-main, then run node apply-qr-patch.js from that same folder.");
}

const routePath = requiredFile(path.join("backend", "routes", "certificateRoutes.js"));
const modelPath = requiredFile(path.join("backend", "models", "Certificate.js"));
const pagePath = requiredFile(path.join("frontend", "src", "pages", "student", "UploadCertificate.jsx"));

let routes = fs.readFileSync(routePath, "utf8");
let model = fs.readFileSync(modelPath, "utf8");
let page = fs.readFileSync(pagePath, "utf8");

// Check every expected source anchor before changing anything.
if (!routes.includes("uploadCertificateWithQr")) {
  if (!routes.includes('const { uploadSingle } = require("../middleware/uploadMiddleware");')) {
    throw new Error("The expected upload middleware import was not found in certificateRoutes.js. No existing files were changed.");
  }
  if (!/^([ \t]*)uploadSingle,[^\r\n]*\r?\n[ \t]*uploadCertificate[^\r\n]*$/m.test(routes)) {
    throw new Error("The existing /upload middleware chain was not found in certificateRoutes.js. No existing files were changed.");
  }
}
if (!model.includes("qrVerificationStatus") && !model.includes("    status: {")) {
  throw new Error("The Certificate status field was not found in Certificate.js. No existing files were changed.");
}
const successPattern = /if \(res\.data\.success\) \{\s*toast\.success\("Certificate uploaded! Awaiting faculty verification\. 🎉"\);\s*navigate\("\/student\/dashboard"\);\s*\}/s;
if (!page.includes("VERIFIED — certificate found") && !successPattern.test(page)) {
  throw new Error("The expected upload success handler was not found in UploadCertificate.jsx. No existing files were changed.");
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupRoot = path.join(root, `.qr-patch-backup-${stamp}`);
for (const relativePath of [
  path.join("backend", "routes", "certificateRoutes.js"),
  path.join("backend", "models", "Certificate.js"),
  path.join("frontend", "src", "pages", "student", "UploadCertificate.jsx"),
]) {
  const destination = path.join(backupRoot, relativePath);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(root, relativePath), destination);
}

// Route the existing student upload endpoint through memory upload + QR verification.
if (!routes.includes("uploadCertificateWithQr")) {
  const importAnchor = 'const { uploadSingle } = require("../middleware/uploadMiddleware");';
  routes = routes.replace(
    importAnchor,
    [
      'const { uploadSingleToMemory } = require("../middleware/memoryUploadMiddleware");',
      'const { uploadCertificateWithQr } = require("../controllers/qrCertificateController");',
    ].join("\n")
  );
  routes = routes.replace(/^[ \t]*uploadCertificate,\r?\n/m, "");
  routes = routes.replace(
    /^([ \t]*)uploadSingle,[^\r\n]*\r?\n[ \t]*uploadCertificate[^\r\n]*$/m,
    "$1uploadSingleToMemory, // Receive file in memory before QR scan\n$1uploadCertificateWithQr // Automatically scan, verify and save"
  );
}

// Store QR verification separately from the existing faculty approval status.
if (!model.includes("qrVerificationStatus")) {
  const anchor = "    status: {";
  const qrFields = [
    "    qrCodeUrl: {",
    '      type: String,',
    '      default: "",',
    "      maxlength: 2000,",
    "    },",
    "    qrVerificationStatus: {",
    '      type: String,',
    '      enum: ["verified", "not_verified"],',
    "      default: null,",
    "    },",
    "    qrVerificationMessage: {",
    '      type: String,',
    '      default: "",',
    "      maxlength: 200,",
    "    },",
    "    qrVerifiedAt: {",
    "      type: Date,",
    "      default: null,",
    "    },",
  ].join("\n") + "\n";
  model = model.replace(anchor, qrFields + anchor);
}

// Show the returned QR verification outcome to the student.
if (!page.includes("VERIFIED — certificate found")) {
  const replacement = [
    "if (res.data.success) {",
    "        const qrStatus = res.data.certificate?.qrVerificationStatus;",
    "        if (qrStatus === \"verified\") {",
    '          toast.success("VERIFIED — certificate found in the database.");',
    "        } else {",
    '          toast.error("NOT VERIFIED — certificate not found in the database.");',
    "        }",
    '        navigate("/student/dashboard");',
    "      }",
  ].join("\n");
  page = page.replace(successPattern, replacement);
  page = page.replace("Uploading to Cloudinary...", "Scanning QR and saving certificate...");
}

fs.writeFileSync(routePath, routes, "utf8");
fs.writeFileSync(modelPath, model, "utf8");
fs.writeFileSync(pagePath, page, "utf8");

console.log("✅ QR verification patch applied successfully.");
console.log(`🗂️ Original files backed up at: ${path.relative(root, backupRoot)}`);
console.log("Next command (from backend): node utils/seedTrustedCertificate.js");
