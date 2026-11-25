/**
 * DOWNLOAD PDF - one employee's published payslip (or F&F statement) saved
 * as a .pdf, through the existing permission-checked payslip export.
 *
 *   node --test components/payroll/payslipPdfDownload.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const { singlePayslipPdf } = require("../../util/payslipExport");

const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("the file of a batch of one is taken as it is", () => {
  const res = { code: 200, files: [{ employee_id: 7, file_name: "FnF_Settlement_Sep-2026_7_X.pdf", pdf_base64: "JVBERi0=" }], skipped: [] };
  assert.deepEqual(singlePayslipPdf(res), { fileName: "FnF_Settlement_Sep-2026_7_X.pdf", base64: "JVBERi0=" });
});

test("not published / outside the branch / a refusal: a plain reason, never a file", () => {
  assert.match(singlePayslipPdf({ code: 200, files: [], skipped: [{ employee_id: 7, reason: "NOT_EXPORTABLE" }] }).error, /No published payslip/);
  assert.equal(singlePayslipPdf({ code: 403, msg: "Access Denied" }).error, "Access Denied");
  assert.ok(singlePayslipPdf(null).error);
});

test("the helper uses the existing export endpoint for exactly one employee", () => {
  const helper = read("helper/payrunCalculation.js");
  const fn = helper.slice(helper.indexOf("downloadPayslipPdf:"), helper.indexOf("downloadPayslipPdf:") + 900);
  assert.match(fn, /"\/payrun\/calculation\/payslips\/export"/);
  assert.match(fn, /employee_ids: \[employee_id\]/);
  assert.match(fn, /application\/pdf/);
});

test("View Payslip and the F&F list offer Download PDF only to those who may export payslips", () => {
  const modal = read("components/payroll/calculation/PayslipViewModal.jsx");
  assert.match(modal, /payslip && canExportPayslips\(actor\)/);
  assert.match(modal, /Download PDF/);
  const fnf = read("pages/payroll/fnf.jsx");
  assert.match(fnf, /\(row\.stage === "PUBLISHED" \|\| row\.stage === "SETTLED"\) && canExportPayslips\(actor\)/);
  assert.match(fnf, /Download PDF/);
});
