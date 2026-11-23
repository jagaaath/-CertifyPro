
const ExcelJS = require("exceljs");
const Student = require("../models/Student");
const Certificate = require("../models/Certificate");

function safeDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function styleHeader(row) {
  row.height = 24;

  row.eachCell((cell) => {
    cell.font = {
      bold: true,
      color: { argb: "FFFFFFFF" },
    };

    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF047857" },
    };

    cell.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: true,
    };

    cell.border = {
      bottom: {
        style: "thin",
        color: { argb: "FF065F46" },
      },
    };
  });
}

function addTableFormatting(worksheet, headerRowNumber = 1) {
  styleHeader(worksheet.getRow(headerRowNumber));

  worksheet.views = [
    {
      state: "frozen",
      ySplit: headerRowNumber,
    },
  ];

  worksheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: {
      row: Math.max(headerRowNumber, worksheet.rowCount),
      column: worksheet.columnCount,
    },
  };

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber > headerRowNumber) {
      row.alignment = {
        vertical: "middle",
        wrapText: true,
      };
    }
  });
}

const AWARD_TYPE_LABELS = {
  elite: "Elite",
  elite_plus_gold: "Elite + Gold",
  elite_plus_silver: "Elite + Silver",
  successfully_completed: "Successfully Completed",
  participation: "Participation",
  not_certified: "Not Certified",
  not_detected: "Not detected",
};

const PROOF_TYPE_LABELS = {
  "course-certificate": "Course Certificate",
  "participation-certificate": "Participation Certificate",
  "completion-certificate": "Completion Certificate",
  other: "Other",
};

function certificateColumns() {
  return [
    { header: "Student Name", key: "studentName", width: 28 },
    { header: "USN", key: "usn", width: 18 },
    { header: "Email", key: "email", width: 32 },
    { header: "Student Account Status", key: "accountStatus", width: 22 },
    { header: "Department", key: "department", width: 16 },
    { header: "Semester", key: "semester", width: 12 },
    { header: "Section", key: "section", width: 12 },
    { header: "Certificate Name", key: "title", width: 38 },
    { header: "NPTEL Award Type", key: "awardType", width: 24 },
    { header: "Certificate Type", key: "certificateType", width: 22 },
    { header: "Proof Type", key: "proofType", width: 26 },
    { header: "Subject Code", key: "subjectCode", width: 16 },
    { header: "Course Duration (Weeks)", key: "courseDuration", width: 24 },
    { header: "Credits", key: "credits", width: 12 },
    { header: "Percentage (%)", key: "percentage", width: 16 },
    { header: "Faculty Approval", key: "approvalStatus", width: 18 },
    { header: "Reviewed By", key: "reviewedBy", width: 24 },
  ];
}

function certificateRow(student, certificate) {
  const reviewer = certificate.verifiedBy;
  return {
    studentName: student.name || "",
    usn: student.usn || "",
    email: student.email || "",
    accountStatus: student.isActive === false ? "Inactive" : "Active",
    department: certificate.department || student.department || "",
    semester: certificate.semester ?? student.semester ?? "",
    section: certificate.section || "",
    title: certificate.title || "",
    awardType: AWARD_TYPE_LABELS[certificate.awardType] || "",
    certificateType: certificate.certificateType || "",
    proofType: PROOF_TYPE_LABELS[certificate.proofType] || certificate.proofType || "",
    subjectCode: certificate.subjectCode || "",
    courseDuration: certificate.courseDuration ?? "",
    credits: Number(certificate.creditsEarned) || 0,
    percentage: Number.isFinite(certificate.percentage) ? certificate.percentage : "",
    approvalStatus: certificate.status || "Unknown",
    reviewedBy: reviewer
      ? `${reviewer.name || ""}${reviewer.employeeId ? ` (${reviewer.employeeId})` : ""}`
      : "",
  };
}

function formatCertificateSheet(worksheet) {
  worksheet.getColumn("credits").numFmt = "0.0";
  worksheet.getColumn("percentage").numFmt = "0.##";
  addTableFormatting(worksheet);
}

function addStudentInfoSheet(workbook, student, certificateCount) {
  const sheet = workbook.addWorksheet("Student Info");
  sheet.columns = [
    { header: "Student Field", key: "field", width: 28 },
    { header: "Value", key: "value", width: 48 },
  ];
  sheet.addRows([
    { field: "Student Name", value: student.name || "" },
    { field: "USN", value: student.usn || "" },
    { field: "Email", value: student.email || "" },
    { field: "Department", value: student.department || "" },
    { field: "Semester", value: student.semester ?? "" },
    { field: "Account Status", value: student.isActive === false ? "Inactive" : "Active" },
    { field: "Certificates Uploaded", value: certificateCount },
    { field: "Approved Credits", value: Number(student.totalCreditsEarned) || 0 },
    { field: "Registered On", value: safeDate(student.createdAt) },
  ]);
  sheet.getCell("A1").font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getCell("B1").font = { bold: true, color: { argb: "FFFFFFFF" } };
  sheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF047857" } };
  sheet.getColumn(2).eachCell((cell, rowNumber) => {
    if (rowNumber > 1 && cell.value instanceof Date) cell.numFmt = "dd-mmm-yyyy";
  });
  sheet.getCell("B9").numFmt = "0.0";
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  return sheet;
}

async function createFacultyExcelReport(department) {
  if (!department || !String(department).trim()) {
    throw new Error("Faculty department is required.");
  }

  const normalizedDepartment = String(department)
    .trim()
    .toUpperCase();

  // Fetch students belonging to this faculty department.
  // Password is never included.
  const students = await Student.find({
    department: normalizedDepartment,
  })
    .select(
      "name usn email department semester isActive totalCertificates totalCreditsEarned createdAt"
    )
    .sort({ name: 1, usn: 1 })
    .lean();

  const studentIds = students.map((student) => student._id);

  // Fetch certificates belonging only to those students.
  const certificates = studentIds.length
    ? await Certificate.find({
        student: { $in: studentIds },
      })
        .populate("verifiedBy", "name employeeId")
        .sort({ createdAt: -1 })
        .lean()
    : [];

  // Group certificates by student.
  const certificatesByStudent = new Map();

  for (const certificate of certificates) {
    const studentId = String(certificate.student);

    if (!certificatesByStudent.has(studentId)) {
      certificatesByStudent.set(studentId, []);
    }

    certificatesByStudent
      .get(studentId)
      .push(certificate);
  }

  // Create workbook in memory.
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "CertifyPro";
  workbook.lastModifiedBy = "CertifyPro";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = `Student Report - ${normalizedDepartment}`;
  workbook.title = `CertifyPro ${normalizedDepartment} Student Report`;
  workbook.company = "CertifyPro";

  // ============================================
  // SHEET 1: STUDENT SUMMARY
  // ============================================

  const summarySheet = workbook.addWorksheet("Student Summary");

  summarySheet.columns = [
    { header: "Student Name", key: "name", width: 28 },
    { header: "USN", key: "usn", width: 18 },
    { header: "Email", key: "email", width: 32 },
    { header: "Department", key: "department", width: 16 },
    { header: "Semester", key: "semester", width: 12 },
    { header: "Certificates", key: "certificateCount", width: 16 },
    { header: "Approved Credits", key: "approvedCredits", width: 18 },
  ];

  for (const student of students) {
    const studentCertificates =
      certificatesByStudent.get(String(student._id)) || [];

    const approvedCertificates = studentCertificates.filter(
      (item) => item.status === "approved"
    );

    const approvedCredits = approvedCertificates.reduce(
      (total, item) =>
        total + (Number(item.creditsEarned) || 0),
      0
    );

    summarySheet.addRow({
      name: student.name || "",
      usn: student.usn || "",
      email: student.email || "",
      department: student.department || normalizedDepartment,
      semester: student.semester ?? "",
      certificateCount: studentCertificates.length,
      approvedCredits,
    });
  }

  summarySheet.getColumn("approvedCredits").numFmt = "0.0";

  addTableFormatting(summarySheet);

  // ============================================
  // SHEET 2: CERTIFICATE DETAILS
  // ============================================

  const detailSheet = workbook.addWorksheet("Certificate Details");

  detailSheet.columns = certificateColumns();

  const studentsById = new Map(
    students.map((student) => [
      String(student._id),
      student,
    ])
  );

  for (const certificate of certificates) {
    const student = studentsById.get(
      String(certificate.student)
    );

    if (!student) continue;

    detailSheet.addRow(certificateRow(student, certificate));
  }

  formatCertificateSheet(detailSheet);

  // ============================================
  // SHEET 3: REPORT INFORMATION
  // ============================================

  const infoSheet = workbook.addWorksheet("Report Info");

  infoSheet.addRows([
    ["Report", "CertifyPro Faculty Student Report"],
    ["Department", normalizedDepartment],
    ["Generated At", new Date()],
    ["Students Included", students.length],
    ["Certificates Included", certificates.length],
    [
      "Scope",
      "Students and certificates in the authenticated faculty member's department",
    ],
  ]);

  infoSheet.getColumn(1).width = 24;
  infoSheet.getColumn(2).width = 90;

  infoSheet.getRow(1).font = {
    bold: true,
    size: 14,
    color: { argb: "FF047857" },
  };

  infoSheet.getCell("B3").numFmt = "dd-mmm-yyyy hh:mm";

  // Generate Excel buffer without saving a file on the server.
  const output = await workbook.xlsx.writeBuffer();

  const buffer = Buffer.isBuffer(output)
    ? output
    : Buffer.from(output);

  return {
    buffer,
    studentCount: students.length,
    certificateCount: certificates.length,
  };
}

async function createStudentExcelReports(department) {
  if (!department || !String(department).trim()) {
    throw new Error("Faculty department is required.");
  }
  const normalizedDepartment = String(department).trim().toUpperCase();
  const students = await Student.find({ department: normalizedDepartment })
    .select("name usn email department semester isActive totalCertificates totalCreditsEarned createdAt")
    .sort({ name: 1, usn: 1 })
    .lean();
  const studentIds = students.map((student) => student._id);
  const certificates = studentIds.length
    ? await Certificate.find({ student: { $in: studentIds } })
        .populate("verifiedBy", "name employeeId")
        .sort({ createdAt: -1 })
        .lean()
    : [];
  const certificatesByStudent = new Map();
  for (const certificate of certificates) {
    const id = String(certificate.student);
    if (!certificatesByStudent.has(id)) certificatesByStudent.set(id, []);
    certificatesByStudent.get(id).push(certificate);
  }

  const reports = [];
  for (const student of students) {
    const studentCertificates = certificatesByStudent.get(String(student._id)) || [];
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "CertifyPro";
    workbook.subject = `Student Certificate Report - ${student.usn}`;
    workbook.title = `CertifyPro ${student.usn} Student Report`;
    addStudentInfoSheet(workbook, student, studentCertificates.length);

    const detailSheet = workbook.addWorksheet("Certificates");
    detailSheet.columns = certificateColumns();
    if (studentCertificates.length) {
      for (const certificate of studentCertificates) {
        detailSheet.addRow(certificateRow(student, certificate));
      }
    } else {
      detailSheet.addRow({ studentName: student.name || "", usn: student.usn || "", title: "No certificates uploaded" });
    }
    formatCertificateSheet(detailSheet);

    const output = await workbook.xlsx.writeBuffer();
    const safeUsn = String(student.usn || student._id).replace(/[^a-z0-9_-]/gi, "_");
    reports.push({ filename: `${safeUsn}.xlsx`, buffer: Buffer.isBuffer(output) ? output : Buffer.from(output) });
  }
  return { reports, studentCount: students.length, certificateCount: certificates.length };
}

module.exports = {
  createFacultyExcelReport,
  createStudentExcelReports,
};
