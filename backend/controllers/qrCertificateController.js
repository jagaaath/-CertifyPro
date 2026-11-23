
// CertifyPro NPTEL-only verification controller.
// Flow: receive PDF -> scan QR -> fetch official NPTEL page/PDF ->
// compare the name and course in both documents -> save upload and result.
// MongoDB stores certificate records but is NOT used to decide authenticity.

const { Readable } = require("stream");
const Certificate = require("../models/Certificate");
const cloudinary = require("../config/cloudinary");
const {
  scanQrFromBuffer,
  extractPdfTextFromBuffer,
} = require("../utils/qrScanner");
const normalizeVerificationUrl = require("../utils/normalizeVerificationUrl");

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_NPTEL_RESPONSE_SIZE = 10 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_REDIRECTS = 4;

const ALLOWED_NPTEL_HOSTS = new Set([
  "nptel.ac.in",
  "www.nptel.ac.in",
  "beta.nptel.ac.in",
  "archive.nptel.ac.in",
  "onlinecourses.nptel.ac.in",
  "onlinecourses-archive.nptel.ac.in",
  "elearn.nptel.ac.in",
]);

function uploadBufferToCloudinary(file, studentId) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "certificate_management/certificates",
        resource_type: "auto",
        public_id: `cert_${studentId}_${Date.now()}`,
        format: "pdf",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    Readable.from([file.buffer]).pipe(uploadStream);
  });
}

function normalizeComparableText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function extractCertificatePercentage(pdfText, courseTitle = "") {
  const text = String(pdfText || "");
  const scorePatterns = [
    /\b(?:consolidated|final|total)\s+score(?:\s+of)?\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)/i,
    /\b(\d{1,3}(?:\.\d+)?)\s*%\s*(?:consolidated|final|total)?\s*score/i,
  ];

  for (const pattern of scorePatterns) {
    const match = text.match(pattern);
    if (match) {
      const score = Number(match[1]);
      return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
    }
  }

  // Some PDFs render the score label as vector artwork, leaving its value
  // immediately after the course title in the extractable text layer.
  if (courseTitle) {
    const normalizedText = normalizeComparableText(text);
    const normalizedTitle = normalizeComparableText(courseTitle);
    const titleIndex = normalizedText.indexOf(normalizedTitle);
    if (titleIndex >= 0) {
      const afterTitle = normalizedText.slice(titleIndex + normalizedTitle.length);
      const match = afterTitle.match(/^\s*(\d{1,3}(?:\.\d+)?)(?=\s|$)/);
      if (match) {
        const score = Number(match[1]);
        return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null;
      }
    }
  }

  return null;
}

function detectCertificateAwardType(pdfText, courseTitle = "") {
  const text = String(pdfText || "");
  const explicitTypes = [
    { value: "elite_plus_gold", label: "Elite + Gold", pattern: /\belite\s*(?:(?:\+|plus)\s*)?gold(?:\s*medal)?\b|\bgold\s+medal\b/i },
    { value: "elite_plus_silver", label: "Elite + Silver", pattern: /\belite\s*(?:(?:\+|plus)\s*)?silver(?:\s*medal)?\b/i },
    { value: "successfully_completed", label: "Successfully Completed", pattern: /\bsuccessfully\s+completed(?:\s+the\s+course)?\b/i },
    { value: "participation", label: "Participation", pattern: /\bparticipation\s+certificate\b/i },
  ];

  let explicitElite = false;
  for (const type of explicitTypes) {
    if (type.pattern.test(text)) {
      return { value: type.value, label: type.label, detectionMethod: "printed_label", score: null };
    }
  }
  explicitElite = /\belite\b/i.test(text);

  const score = extractCertificatePercentage(text, courseTitle);

  if (!Number.isFinite(score) || score < 0 || score > 100) {
    if (explicitElite) {
      return { value: "elite", label: "Elite", detectionMethod: "printed_label", score: null };
    }
    return { value: "not_detected", label: "Not detected", detectionMethod: "unavailable", score: null };
  }
  if (score >= 90) {
    return { value: "elite_plus_gold", label: "Elite + Gold", detectionMethod: "score", score };
  }
  if (score >= 60) {
    return { value: "elite", label: "Elite", detectionMethod: explicitElite ? "printed_label_and_score" : "score", score };
  }
  if (score >= 40) {
    return { value: "successfully_completed", label: "Successfully Completed", detectionMethod: "score", score };
  }
  return { value: "not_certified", label: "Not certified", detectionMethod: "score", score };
}

function decodeHtmlEntities(value) {
  const namedEntities = {
    amp: "&",
    apos: "'",
    quot: '"',
    lt: "<",
    gt: ">",
    nbsp: " ",
    middot: "·",
    ndash: "–",
    mdash: "—",
  };

  return String(value || "").replace(
    /&(#x[0-9a-f]+|#\d+|[a-z]+);/gi,
    (entity, code) => {
      if (code[0] === "#") {
        const isHex = code[1].toLowerCase() === "x";
        const numericValue = Number.parseInt(
          code.slice(isHex ? 2 : 1),
          isHex ? 16 : 10
        );

        if (
          Number.isInteger(numericValue) &&
          numericValue >= 0 &&
          numericValue <= 0x10ffff
        ) {
          return String.fromCodePoint(numericValue);
        }

        return " ";
      }

      return namedEntities[code.toLowerCase()] ?? entity;
    }
  );
}

function htmlFragmentToText(html) {
  return decodeHtmlEntities(
    String(html || "")
      .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, " ")
      .replace(/<[^>]*>/g, " ")
  )
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function htmlToLines(html) {
  const visibleText = decodeHtmlEntities(
    String(html || "")
      .replace(/<!--([\s\S]*?)-->/g, " ")
      .replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(
        /<\/(h[1-6]|p|div|li|section|article|tr|td|th|header|footer|main)>/gi,
        "\n"
      )
      .replace(/<[^>]*>/g, " ")
  );

  return visibleText
    .replace(/\u00a0/g, " ")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function validateNptelUrl(value) {
  let url;

  try {
    url = new URL(String(value || "").trim());
  } catch (_error) {
    throw new Error(
      "The QR code does not contain a valid NPTEL verification URL."
    );
  }

  if (!ALLOWED_NPTEL_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      "The QR destination is not on a supported official NPTEL domain."
    );
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("The NPTEL verification URL must use HTTP or HTTPS.");
  }

  if (url.username || url.password) {
    throw new Error(
      "Credentials are not allowed in the NPTEL verification URL."
    );
  }

  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new Error(
      "The NPTEL verification URL uses an unsupported port."
    );
  }

  url.protocol = "https:";
  url.port = "";
  url.hash = "";

  return url;
}

async function readResponseBufferWithLimit(response, maximumBytes) {
  if (!response.body) {
    throw new Error(
      "The NPTEL verification page returned an empty response."
    );
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error(
          "The NPTEL verification response is too large."
        );
      }

      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks);
}

async function fetchNptelResponse(initialUrl) {
  let currentUrl = validateNptelUrl(initialUrl);

  for (
    let redirectCount = 0;
    redirectCount <= MAX_REDIRECTS;
    redirectCount += 1
  ) {
    const response = await fetch(currentUrl.href, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: {
        Accept: "text/html,application/xhtml+xml,application/pdf,*/*;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; CertifyProNPTELVerifier/1.0)",
      },
    });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");

      if (!location || redirectCount === MAX_REDIRECTS) {
        throw new Error(
          "The NPTEL verification link redirected too many times."
        );
      }

      currentUrl = validateNptelUrl(
        new URL(location, currentUrl).href
      );

      continue;
    }

    if (!response.ok) {
      throw new Error(`NPTEL returned HTTP ${response.status}.`);
    }

    const declaredLength = Number(
      response.headers.get("content-length") || 0
    );

    if (declaredLength > MAX_NPTEL_RESPONSE_SIZE) {
      throw new Error(
        "The NPTEL verification response is too large."
      );
    }

    const buffer = await readResponseBufferWithLimit(
      response,
      MAX_NPTEL_RESPONSE_SIZE
    );

    return {
      buffer,
      contentType: response.headers.get("content-type") || "",
      url: currentUrl,
    };
  }

  throw new Error("Could not retrieve the NPTEL verification page.");
}

function extractDetailsFromNptelHtml(html) {
  const h1Match = String(html || "").match(
    /<h1\b[^>]*>([\s\S]*?)<\/h1>/i
  );

  const studentName = h1Match
    ? htmlFragmentToText(h1Match[1])
    : "";

  const lines = htmlToLines(html);

  if (!studentName) {
    throw new Error(
      "The NPTEL page was reached, but its student name could not be extracted."
    );
  }

  const nameIndex = lines.findIndex(
    (line) =>
      normalizeComparableText(line) ===
      normalizeComparableText(studentName)
  );

  const followingLines =
    nameIndex >= 0 ? lines.slice(nameIndex + 1) : lines;

  const courseLine = followingLines.find(
    (line) => /[·•]/u.test(line)
  );

  const courseTitle = courseLine
    ? courseLine.split(/[·•]/u)[0].trim()
    : "";

  if (!courseTitle) {
    throw new Error(
      "The NPTEL page was reached, but its course title could not be extracted."
    );
  }

  const statusIndex = lines.findIndex(
    (line) => normalizeComparableText(line) === "status"
  );

  const status =
    statusIndex >= 0
      ? (lines[statusIndex + 1] || "").trim()
      : "";

  // NPTEL's official page displays Weeks / credits, for example 8 / 3.
  // The second number is the academic credit value.
  const flattenedLines = lines.join(" ");

  let weeksCreditsMatch = flattenedLines.match(
    /weeks\s*\/\s*credits\s*:?\s*(\d+)\s*\/\s*(\d+(?:\.\d+)?)/i
  );

  if (!weeksCreditsMatch) {
    const weeksCreditsIndex = lines.findIndex(
      (line) => normalizeComparableText(line) === "weeks credits"
    );

    if (
      weeksCreditsIndex >= 0 &&
      lines[weeksCreditsIndex + 1]
    ) {
      weeksCreditsMatch = lines[weeksCreditsIndex + 1].match(
        /^(\d+)\s*\/\s*(\d+(?:\.\d+)?)$/
      );
    }
  }

  const weeks = weeksCreditsMatch
    ? Number(weeksCreditsMatch[1])
    : null;

  const creditsEarned = weeksCreditsMatch
    ? Number(weeksCreditsMatch[2])
    : null;

  return {
    studentName,
    courseTitle,
    status,
    weeks,
    creditsEarned,
  };
}

function extractDetailsFromNptelPdfText(text) {
  const compact = String(text || "")
    .replace(/\s+/g, " ")
    .trim();

  const nameMatch = compact.match(
    /(?:this certificate is awarded to|certificate is awarded to|awarded to)\s+(.+?)\s+(?:for successfully completing|for completing)\s+(?:the\s+)?course\b/i
  );

  const courseMatch =
    compact.match(
      /for successfully completing the course\s+(.+?)\s+(?:with\s+(?:a\s+)?consolidated score|total number of candidates|course duration|duration of the course)/i
    ) ||
    compact.match(
      /for completing the course\s+(.+?)\s+(?:with\s+(?:a\s+)?consolidated score|total number of candidates|course duration)/i
    );

  const studentName = nameMatch
    ? nameMatch[1].trim()
    : "";

  const courseTitle = courseMatch
    ? courseMatch[1].trim()
    : "";

  // Only accept an explicitly labelled credit value.
  // Never derive credits from final score or course duration.
  const weeksCreditsMatch = compact.match(
    /weeks\s*\/\s*credits\s*:?\s*(\d+)\s*\/\s*(\d+(?:\.\d+)?)/i
  );

  const explicitCreditsMatch = compact.match(
    /(?:academic\s+)?credits?\s*[:\-]\s*(\d+(?:\.\d+)?)/i
  );

  const weeks = weeksCreditsMatch
    ? Number(weeksCreditsMatch[1])
    : null;

  const creditsEarned = weeksCreditsMatch
    ? Number(weeksCreditsMatch[2])
    : explicitCreditsMatch
      ? Number(explicitCreditsMatch[1])
      : null;

  if (!studentName || !courseTitle) {
    throw new Error(
      "The NPTEL certificate response was a PDF, but its name/course fields could not be extracted."
    );
  }

  return {
    studentName,
    courseTitle,
    status: "",
    weeks,
    creditsEarned,
  };
}

async function getNptelOfficialDetails(qrPayload) {
  const url = validateNptelUrl(qrPayload);
  const response = await fetchNptelResponse(url.href);

  const startsWithPdf = response.buffer
    .subarray(0, 1024)
    .toString("latin1")
    .includes("%PDF-");

  const isPdf =
    startsWithPdf ||
    response.contentType.toLowerCase().includes("application/pdf");

  if (isPdf) {
    const officialPdfText = await extractPdfTextFromBuffer(
      response.buffer
    );

    return extractDetailsFromNptelPdfText(officialPdfText);
  }

  const html = response.buffer.toString("utf8");

  return extractDetailsFromNptelHtml(html);
}

async function verifyNptelCertificate(
  qrPayload,
  uploadedPdfText,
  studentAccountName
) {
  const officialDetails = await getNptelOfficialDetails(qrPayload);
  const awardType = detectCertificateAwardType(
    uploadedPdfText,
    officialDetails.courseTitle
  );
  const percentage = extractCertificatePercentage(
    uploadedPdfText,
    officialDetails.courseTitle
  );

  const normalizedPdf = normalizeComparableText(uploadedPdfText);

  const normalizedOfficialName = normalizeComparableText(
    officialDetails.studentName
  );
  const normalizedAccountName = normalizeComparableText(
    studentAccountName
  );

  const normalizedOfficialCourse = normalizeComparableText(
    officialDetails.courseTitle
  );

  const nameMatches = Boolean(
    normalizedOfficialName &&
    normalizedPdf.includes(normalizedOfficialName)
  );
  const accountNameMatchesOfficial = Boolean(
    normalizedAccountName &&
    normalizedOfficialName &&
    normalizedAccountName === normalizedOfficialName
  );
  const accountNameInPdf = Boolean(
    normalizedAccountName &&
    normalizedPdf.includes(normalizedAccountName)
  );

  const subjectMatches = Boolean(
    normalizedOfficialCourse &&
    normalizedPdf.includes(normalizedOfficialCourse)
  );

  const statusIsValid =
    !officialDetails.status ||
    normalizeComparableText(officialDetails.status) === "live";

  const creditsEarned = Number(officialDetails.creditsEarned);

  const creditsAreValid =
    Number.isFinite(creditsEarned) &&
    creditsEarned >= 0 &&
    creditsEarned <= 20 &&
    Number.isInteger(creditsEarned * 2);

  const reasons = [];

  if (!nameMatches) {
    reasons.push(
      "The student name in the PDF does not match the NPTEL verification record."
    );
  }

  if (!accountNameMatchesOfficial || !accountNameInPdf) {
    reasons.push(
      "The student name does not match the account linked to this USN."
    );
  }

  if (!subjectMatches) {
    reasons.push(
      "The course/subject in the PDF does not match the NPTEL verification record."
    );
  }

  if (!statusIsValid) {
    reasons.push("The NPTEL certificate status is not LIVE.");
  }

  if (!creditsAreValid) {
    reasons.push(
      "The official NPTEL page does not provide a valid credit value."
    );
  }

  const verified =
    nameMatches &&
    accountNameMatchesOfficial &&
    accountNameInPdf &&
    subjectMatches &&
    statusIsValid &&
    creditsAreValid;

  return {
    status: verified ? "verified" : "not_verified",

    message: verified
      ? `VERIFIED — the student name matches the USN account and official NPTEL record, and the PDF course matches. ${creditsEarned} credits detected. Award type: ${awardType.label}.`
      : `NOT VERIFIED — Please upload a valid certificate. ${reasons.join(" ")}`,

    creditsEarned: creditsAreValid ? creditsEarned : null,

    checks: {
      nameMatches,
      accountNameMatchesOfficial,
      accountNameInPdf,
      subjectMatches,
      statusIsValid,
      creditsAreValid,
    },

    officialDetails,
    awardType,
    percentage,
  };
}

const uploadCertificateWithQr = async (req, res) => {
  let cloudinaryResult = null;

  try {
    if (!req.file || !Buffer.isBuffer(req.file.buffer)) {
      return res.status(400).json({
        success: false,
        code: "FILE_REQUIRED",
        message: "Please select a PDF certificate to upload.",
      });
    }

    const validExtension = /\.pdf$/i.test(
      req.file.originalname || ""
    );

    const validMimeType =
      req.file.mimetype === "application/pdf";

    const validPdfSignature = req.file.buffer
      .subarray(0, 1024)
      .toString("latin1")
      .includes("%PDF-");

    if (
      !validExtension ||
      !validMimeType ||
      !validPdfSignature
    ) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PDF",
        message: "Only valid PDF certificate files are allowed.",
      });
    }

    if (req.file.buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        success: false,
        code: "FILE_TOO_LARGE",
        message: "Maximum PDF size is 5MB.",
      });
    }

    const {
      title,
      description,
      issueDate,
      section,
      certificateType,
      proofType,
      issuer,
      department,
      semester,
      subjectCode,
      courseDuration,
    } = req.body;

    if (!title || !String(title).trim()) {
      return res.status(400).json({
        success: false,
        code: "REQUIRED_FIELDS",
        message: "Certificate title is required.",
      });
    }

    let qrPayload;

    try {
      qrPayload = await scanQrFromBuffer(
        req.file.buffer,
        req.file.mimetype
      );
    } catch (scanError) {
      console.error(
        "[CERTIFYPRO] PDF QR scan failed:",
        scanError.message
      );

      return res.status(400).json({
        success: false,
        code: "FILE_UNREADABLE",
        message:
          "Could not read this PDF. Please upload a clear PDF and try again.",
      });
    }

    if (!qrPayload) {
      return res.status(422).json({
        success: false,
        code: "QR_NOT_DETECTED",
        message:
          "QR code not detected. Please upload a PDF containing a clear QR code.",
      });
    }

    console.log(
      "[CERTIFYPRO] Decoded QR destination:",
      qrPayload
    );

    let pdfText;

    try {
      pdfText = await extractPdfTextFromBuffer(
        req.file.buffer
      );
    } catch (pdfError) {
      console.error(
        "[CERTIFYPRO] PDF text extraction failed:",
        pdfError.message
      );

      return res.status(422).json({
        success: false,
        code: "PDF_TEXT_ERROR",
        message:
          "NOT VERIFIED — Please upload a valid certificate. The certificate details could not be read from the PDF.",
      });
    }

    if (!pdfText || !pdfText.trim()) {
      return res.status(422).json({
        success: false,
        code: "PDF_NO_TEXT",
        message:
          "NOT VERIFIED — Please upload a valid certificate.",
      });
    }

    let verification;

    try {
      verification = await verifyNptelCertificate(
        qrPayload,
        pdfText,
        req.user.name
      );
    } catch (verificationError) {
      console.error(
        "[CERTIFYPRO] NPTEL verification failed:",
        verificationError.message
      );

      verification = {
        status: "not_verified",

        message:
          `NOT VERIFIED — Please upload a valid certificate. ${verificationError.message}`,

        creditsEarned: null,

        checks: {
          nameMatches: false,
          accountNameMatchesOfficial: false,
          accountNameInPdf: false,
          subjectMatches: false,
          statusIsValid: false,
          creditsAreValid: false,
        },

        officialDetails: null,
        awardType: {
          value: "not_detected",
          label: "Not detected",
          detectionMethod: "unavailable",
          score: null,
        },
        percentage: null,
      };
    }

    if (
      verification.officialDetails?.studentName &&
      (!verification.checks.accountNameMatchesOfficial ||
        !verification.checks.accountNameInPdf ||
        !verification.checks.nameMatches)
    ) {
      return res.status(422).json({
        success: false,
        code: "STUDENT_NAME_MISMATCH",
        message:
          "The certificate name must match your student profile for this USN and the name shown on the official QR verification page.",
        verificationResult: "not_verified",
        verificationChecks: verification.checks,
      });
    }

    // Credits must come from NPTEL's official Weeks / credits field.
    // Never accept a manually supplied value or guess from the final score.
    if (!Number.isFinite(verification.creditsEarned)) {
      return res.status(422).json({
        success: false,
        code: "NPTEL_CREDITS_NOT_FOUND",
        message:
          "NOT VERIFIED — Please upload a valid certificate.",
        verificationResult: "not_verified",
        verificationMessage:
          "NOT VERIFIED — Please upload a valid certificate.",
        verificationChecks: verification.checks,
      });
    }

    const credits = verification.creditsEarned;

    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      return res.status(503).json({
        success: false,
        code: "CLOUDINARY_NOT_CONFIGURED",
        message:
          "Verification finished, but Cloudinary storage is not configured.",
        verificationResult: verification.status,
        verificationMessage: verification.message,
        creditsEarned: verification.creditsEarned,
        verificationChecks: verification.checks,
      });
    }

    cloudinaryResult = await uploadBufferToCloudinary(
      req.file,
      req.user._id
    );

    const normalizedQrUrl =
      normalizeVerificationUrl(qrPayload);

    const qrVerificationStatus = verification.status;
    const qrVerificationMessage = verification.message;

    // MongoDB only stores the result. It does not determine authenticity.
    const certificate = await Certificate.create({
      student: req.user._id,
      title: String(title).trim(),
      description: description
        ? String(description).trim()
        : "",
      creditsEarned: credits,
      fileUrl: cloudinaryResult.secure_url,
      publicId: cloudinaryResult.public_id,
      fileType: "pdf",
      status: "pending",
      issueDate: issueDate ? new Date(issueDate) : null,
      section: section || "",
      certificateType: certificateType || "",
      proofType: proofType || "",
      issuer: issuer ? String(issuer).trim() : "",
      department: department || "",
      semester: semester ? Number(semester) : null,
      subjectCode: subjectCode || "",
      courseDuration: courseDuration ? Number(courseDuration) : null,
      awardType: verification.awardType?.value || "not_detected",
      percentage: verification.percentage ?? null,
      qrCodeUrl:
        normalizedQrUrl ||
        String(qrPayload).slice(0, 2000),
      qrVerificationStatus,
      qrVerificationMessage,
      qrVerifiedAt:
        qrVerificationStatus === "verified"
          ? new Date()
          : null,
    });

    await certificate.populate(
      "student",
      "name usn department semester"
    );

    return res.status(201).json({
      success: true,
      message: qrVerificationMessage,
      verificationResult: qrVerificationStatus,
      creditsEarned: credits,
      verificationChecks: verification.checks,
      officialNptelDetails: verification.officialDetails,
      awardType: verification.awardType,
      percentage: verification.percentage,
      certificate,
    });
  } catch (error) {
    console.error(
      "[CERTIFYPRO] NPTEL certificate upload error:",
      error
    );

    if (cloudinaryResult?.public_id) {
      try {
        await cloudinary.uploader.destroy(
          cloudinaryResult.public_id,
          {
            resource_type:
              cloudinaryResult.resource_type || "image",
          }
        );
      } catch (cleanupError) {
        console.error(
          "[CERTIFYPRO] Cloudinary cleanup failed:",
          cleanupError.message
        );
      }
    }

    return res.status(500).json({
      success: false,
      code: "NPTEL_UPLOAD_FAILED",
      message: "Certificate upload failed. Please try again.",
    });
  }
};

module.exports = { uploadCertificateWithQr };
