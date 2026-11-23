
const {
  createFacultyExcelReport,
  createStudentExcelReports,
} = require("../utils/facultyExcelReport");
const archiver = require("archiver");

// Generates the latest department report in memory.
// No Excel file is stored on the server.

const downloadFacultyExcelReport = async (req, res) => {
  try {
    const department = req.user?.department;

    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Your faculty account does not have a department assigned.",
      });
    }

    const report = await createFacultyExcelReport(department);

    const safeDepartment = String(department).replace(
      /[^a-z0-9_-]/gi,
      "_"
    );

    const filename = `CertifyPro_${safeDepartment}_Student_Report_${new Date()
      .toISOString()
      .slice(0, 10)}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );

    res.setHeader(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private"
    );

    res.setHeader("Pragma", "no-cache");

    res.setHeader(
      "X-Report-Student-Count",
      String(report.studentCount)
    );

    res.setHeader(
      "X-Report-Certificate-Count",
      String(report.certificateCount)
    );

    return res.status(200).send(report.buffer);
  } catch (error) {
    console.error("Faculty Excel report download failed:", error);

    return res.status(500).json({
      success: false,
      message: "Could not generate the latest student Excel report.",
    });
  }
};

const downloadFacultyStudentZip = async (req, res) => {
  try {
    const department = req.user?.department;
    if (!department) {
      return res.status(403).json({
        success: false,
        message: "Your faculty account does not have a department assigned.",
      });
    }

    const report = await createStudentExcelReports(department);
    const safeDepartment = String(department).replace(/[^a-z0-9_-]/gi, "_");
    const date = new Date().toISOString().slice(0, 10);

    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="CertifyPro_${safeDepartment}_Student_Workbooks_${date}.zip"`
    );
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("X-Report-Student-Count", String(report.studentCount));
    res.setHeader("X-Report-Certificate-Count", String(report.certificateCount));

    const archive = archiver("zip", { zlib: { level: 6 } });
    archive.on("warning", (error) => console.warn("Student workbook ZIP warning:", error.message));
    archive.on("error", (error) => {
      console.error("Student workbook ZIP failed:", error);
      if (res.headersSent) res.destroy(error);
      else res.status(500).json({ success: false, message: "Could not create student workbook ZIP." });
    });
    archive.pipe(res);

    if (!report.reports.length) {
      archive.append("No students were found in this department.\n", { name: "README.txt" });
    } else {
      for (const studentReport of report.reports) {
        archive.append(studentReport.buffer, { name: studentReport.filename });
      }
    }
    archive.finalize();
  } catch (error) {
    console.error("Faculty student ZIP download failed:", error);
    return res.status(500).json({
      success: false,
      message: "Could not generate the student workbook ZIP.",
    });
  }
};

module.exports = {
  downloadFacultyExcelReport,
  downloadFacultyStudentZip,
};
