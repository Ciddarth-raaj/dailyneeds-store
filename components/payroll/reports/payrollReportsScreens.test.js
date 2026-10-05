/**
 * Payroll Reports - the screens, held to the backend contract.
 *
 *   node --test components/payroll/reports/payrollReportsScreens.test.js
 *
 * Source-text checks in the style of the other payroll screen tests: they
 * pin the API paths to `routes/payroll_report.js`, the wording the product
 * asked for, and the rules that keep the statutory files independent of the
 * visible columns.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const strip = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const helper = strip(read("helper/payrollReport.js"));
const page = strip(read("pages/payroll/reports.jsx"));
const drawer = strip(read("components/payroll/reports/PayrollColumnsDrawer.jsx"));
const templates = strip(read("components/payroll/reports/PayrollTemplateBar.jsx"));
const panel = strip(read("components/payroll/reports/StatutoryValidationPanel.jsx"));

test("the helper calls exactly the /reports/payroll routes the backend defines", () => {
  assert.match(helper, /const BASE = "\/reports\/payroll"/);
  for (const route of [
    "/meta", "/months", "/layout", "/layout/copy-previous", "/templates", "/default-template", "/preview",
    "/export/xlsx", "/export/pdf", "/epf/validation", "/epf/ecr", "/esi/validation", "/esi/contribution-file",
  ]) {
    assert.ok(helper.includes(`\`\${BASE}${route}`) || helper.includes(`"${route}"`), route);
  }
  assert.match(helper, /\/templates\/\$\{templateId\}\/name/);
  assert.match(helper, /\/templates\/\$\{templateId\}\/duplicate/);
});

test("the word Upload is never used for the statutory actions", () => {
  for (const [name, src] of [["page", page], ["panel", panel], ["helper", helper]]) {
    assert.ok(!/upload/i.test(src), `${name} must not say Upload`);
  }
  assert.match(page, /Download ECR File/);
  assert.match(page, /Download Contribution File/);
});

test("the statutory downloads send no column list - only the month, the acknowledgement and ESI reasons", () => {
  const ecr = page.slice(page.indexOf("downloadEcr("), page.indexOf("downloadEcr(") + 200);
  const esic = page.slice(page.indexOf("downloadEsiContribution("), page.indexOf("downloadEsiContribution(") + 250);
  for (const call of [ecr, esic]) {
    assert.ok(!/field_keys/.test(call), call);
    assert.match(call, /acknowledge_blocked: acknowledged/);
  }
});

test("Excel and PDF send the same request the table shows: columns in order, display, month and filters", () => {
  assert.match(page, /PayrollReportHelper\.exportXlsx\(request\(\)\)/);
  assert.match(page, /PayrollReportHelper\.exportPdf\(request\(\)\)/);
  assert.match(page, /PayrollReportHelper\.preview\(\{ \.\.\.request\(\), page \}\)/);
  const req = page.slice(page.indexOf("const request = useCallback"), page.indexOf("const request = useCallback") + 450);
  for (const k of ["report_type", "year", "month", "field_keys: layout.field_keys", "display", "filters"]) assert.ok(req.includes(k), k);
});

test("columns, templates and copies are saved per month; the month is shown as a heading", () => {
  assert.match(page, /const applyColumns = \(keys\) =>\s*saveLayout\(/);
  assert.match(page, /PayrollReportHelper\.saveLayout\(\{[\s\S]*?year: period\.year,[\s\S]*?month: period\.month/);
  assert.match(page, /PayrollReportHelper\.copyPreviousMonth/);
  assert.match(page, /Copy Previous Month/);
  assert.match(page, /data-testid="payroll-month-heading"/);
});

test("the template bar offers every template action", () => {
  for (const label of ["Apply Template", "Save as New Template", "Update Template", "Rename Template", "Duplicate Template", "Delete Template", "Set as Default"]) {
    assert.ok(templates.includes(label), label);
  }
  assert.match(templates, /can\("canEdit"\)/);
  assert.match(templates, /can\("canDelete"\)/);
});

test("the column selector has search, count, Select All, Clear optional, Reset to Default and drag-and-drop", () => {
  for (const s of ["Search columns", "selected-count", "Select All", "Clear optional columns", "Reset to Default", "draggable", "onDrop", "reorder(", "Move up", "Move down"]) {
    assert.ok(drawer.includes(s), s);
  }
  assert.match(drawer, /SOURCE_BADGE\[field\.source\]/, "every field says where its value comes from");
});

test("blocked employees are listed and a partial file needs an explicit acknowledgement", () => {
  assert.match(panel, /Ready: \{summary\.ready\}/);
  assert.match(panel, /Blocked: \{summary\.blocked\}/);
  assert.match(panel, /Why blocked/);
  assert.match(page, /statutoryBlocked > 0 && !acknowledged/);
});

test("exports and statutory files are gated on their own keys", () => {
  assert.match(page, /\{mayExport \? \(/);
  assert.match(page, /statutoryKind && mayStatutory \?/);
});
