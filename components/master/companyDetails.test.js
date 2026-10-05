/**
 * Master → Company Details and the Payroll Publish gate - wired to the real
 * contract. Checked as SOURCE, the way `components/payroll/
 * payrunCalculationScreens.test.js` checks the payroll screens (there is no
 * React test runner in this repo); the rules themselves are proved in
 * `util/companyDetails.test.js`.
 *
 *   node --test components/master/companyDetails.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const BACKEND = path.join(ROOT, "..", "dailyneeds-store-backend");

const page = codeOf(read("pages/master/company-details.jsx"));
const helper = codeOf(read("helper/company.js"));
const workflow = codeOf(read("components/payroll/calculation/PayrunCalculation.jsx"));
const list = codeOf(read("components/payroll/calculation/CalculationEmployeeList.jsx"));
const payrunPage = codeOf(read("pages/payroll/payrun.jsx"));

test("Company Details is under Master, behind manage_company_details", () => {
  const menus = require("fs").readFileSync(path.join(ROOT, "constants/menus.js"), "utf8");
  assert.match(
    menus,
    /company_details: \{\s*title: "Company Details",\s*permission: "manage_company_details",\s*selected: false,\s*location: "\/master\/company-details",/
  );
  assert.match(page, /permissionKey=\{PERMISSION_KEY\}/);
  assert.match(page, /const PERMISSION_KEY = \[PERMISSION\]/);
  // The old create-only page is gone and its path redirects.
  assert.ok(!fs.existsSync(path.join(ROOT, "pages/company-details.js")));
  assert.match(read("next.config.js"), /source: "\/company-details", destination: "\/master\/company-details"/);
});

test("every /company call is a route the backend declares", { skip: !fs.existsSync(BACKEND) && "backend not checked out" }, () => {
  const routes = fs.readFileSync(path.join(BACKEND, "routes/company.js"), "utf8");
  assert.match(helper, /API\.get\("\/company"\)/);
  assert.match(routes, /this\.router\.get\("\/", guard/);
  assert.match(helper, /API\.post\("\/company", body\)/);
  assert.match(routes, /this\.router\.post\("\/", guard/);
  assert.match(helper, /API\.put\(`\/company\/\$\{companyId\}`, body\)/);
  assert.match(routes, /this\.router\.put\("\/:company_id", guard/);
  assert.match(helper, /API\.post\(`\/company\/\$\{companyId\}\/payslip`, \{\}\)/);
  assert.match(routes, /this\.router\.post\("\/:company_id\/payslip", guard/);
  const payrunRoutes = fs.readFileSync(path.join(BACKEND, "routes/payrun_calculation.js"), "utf8");
  assert.match(payrunRoutes, /"\/payrun\/calculation\/payslip-company"/);
  assert.match(read("helper/payrunCalculation.js"), /"\/payrun\/calculation\/payslip-company"/);
});

test("the form has the General, Statutory and Payslip groups, Save and Edit, and shows the Payslip Company", () => {
  const rules = read("util/companyDetails.js");
  assert.match(rules, /title: "General"/);
  assert.match(rules, /title: "Statutory"/);
  assert.match(page, />\s*Payslip\s*</);
  assert.match(page, /Active for Payslip/);
  assert.match(page, />\s*Save\s*</);
  assert.match(page, />\s*Edit\s*</);
  assert.match(page, /Payslip Company/);
  assert.match(page, /validateCompanyForm\(form\)/);
});

test("Payroll UI disables all three Publish affordances while Company Details is missing", () => {
  assert.match(workflow, /PayrunCalculationHelper\.getPayslipCompany\(\)/);
  assert.match(workflow, /const publishGate = payslipPublishGate\(payslipCompany, \{ canConfigure: mayConfigureCompany \}\)/);
  // Publish All Approved Payslips and Publish Payslips Selected carry the gate
  // as their blocked reason; the toolbar disables any action that has one.
  assert.match(workflow, /const publishBlockedReason = publishGate\.publishDisabled \? publishGate\.message : null;/);
  assert.equal((workflow.match(/blockedReason: publishBlockedReason,/g) || []).length, 2);
  assert.match(workflow, /isDisabled=\{bulkLocked \|\| Boolean\(action\.blockedReason\)\}/);
  assert.match(workflow, /title=\{action\.blockedReason \|\| undefined\}/);
  // Publish Payslip (each row)
  assert.match(workflow, /publishBlockedReason=\{publishGate\.publishDisabled \? publishGate\.message : null\}/);
  // (the row's Publish Payslip lives in the More menu; disabled with the reason)
  assert.match(list, /isDisabled: disabled \|\| Boolean\(publishBlockedReason\),\s*reason: publishBlockedReason \|\| undefined,/);
  // The message, and the shortcut for those who may configure it.
  assert.match(workflow, /\{publishGate\.message\}/);
  assert.match(workflow, /Configure Company Details/);
  assert.match(payrunPage, /mayConfigureCompany=\{mayConfigureCompany\}/);
  assert.match(payrunPage, /const mayConfigureCompany = canManageCompanyDetails\(actor\)/);
});

test("Unpublish and Retry Notification are not gated on Company Details", () => {
  const block = (key) => workflow.slice(workflow.indexOf(`key: "${key}"`), workflow.indexOf("onClick", workflow.indexOf(`key: "${key}"`)));
  assert.ok(!block("unpublish-selected").includes("blockedReason"));
  assert.ok(!block("retry-selected").includes("blockedReason"));
});
