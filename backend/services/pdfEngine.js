const PDFDocument = require("pdfkit");
const institution = require("../config/institution");

function drawHeader(doc, title) {
  doc.fontSize(16).font("Helvetica-Bold").text(institution.name, { align: "center" });
  doc.fontSize(9).font("Helvetica").fillColor("#555").text(institution.address, { align: "center" });
  doc.text(institution.contactEmail, { align: "center" });
  doc.moveDown(1);
  doc.fillColor("#000").fontSize(14).font("Helvetica-Bold").text(title, { align: "center" });
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(1);
  doc.fillColor("#000");
}

function drawRow(doc, label, value) {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(10).text(label, 50, y, { width: 180 });
  doc.font("Helvetica").fontSize(10).text(String(value), 240, y, { width: 300 });
  doc.moveDown(0.6);
}

/**
 * Streams a fee challan PDF directly to `res` — never a static mount, same
 * reasoning as Material downloads: this goes out only through an
 * authenticated route, not a world-readable file.
 */
function generateFeeChallanPdf(res, challan, student) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${challan.challanNumber}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, "FEE CHALLAN");
  drawRow(doc, "Challan Number:", challan.challanNumber);
  drawRow(doc, "Issue Date:", challan.createdAt.toDateString());
  drawRow(doc, "Due Date:", challan.dueDate.toDateString());
  drawRow(doc, "Student Name:", student.name);
  drawRow(doc, "Student Email:", student.email);
  drawRow(doc, "Description:", challan.description || "—");
  doc.moveDown(0.5);
  doc.font("Helvetica-Bold").fontSize(12).text(`Amount Due: Rs. ${challan.amount.toLocaleString()}`, 50);
  doc.moveDown(0.3);
  doc
    .font("Helvetica-Bold")
    .fillColor(challan.status === "paid" ? "#27500A" : "#791F1F")
    .text(`Status: ${challan.status.toUpperCase()}`, 50);

  doc.end();
}

/**
 * Streams a salary slip PDF directly to `res`.
 */
function generateSalarySlipPdf(res, slip, employee) {
  const doc = new PDFDocument({ margin: 50 });
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="salary-slip-${slip._id}.pdf"`);
  doc.pipe(res);

  drawHeader(doc, "SALARY SLIP");
  drawRow(doc, "Employee Name:", employee.name);
  drawRow(doc, "Employee Email:", employee.email);
  drawRow(doc, "Role:", employee.role);
  drawRow(doc, "Month:", slip.month);
  doc.moveDown(0.5);
  drawRow(doc, "Basic Salary:", `Rs. ${slip.basicSalary.toLocaleString()}`);
  drawRow(doc, "Allowances:", `Rs. ${slip.allowances.toLocaleString()}`);
  drawRow(doc, "Deductions:", `Rs. ${slip.deductions.toLocaleString()}`);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#ccc").stroke();
  doc.moveDown(0.5);
  const netSalary = slip.basicSalary + slip.allowances - slip.deductions;
  doc.font("Helvetica-Bold").fontSize(12).text(`Net Salary: Rs. ${netSalary.toLocaleString()}`, 50);

  doc.end();
}

module.exports = { generateFeeChallanPdf, generateSalarySlipPdf };
