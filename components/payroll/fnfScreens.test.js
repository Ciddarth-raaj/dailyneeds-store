/**
 * F&F SETTLEMENT, EXIT INTERVIEW AND REHIRE - the screens' rules.
 *
 *   node --test components/payroll/fnfScreens.test.js
 *
 * The access rules mirror routes/employee_exit.js exactly; the payslip view
 * shows an F&F statement from the frozen snapshot only; the confidential
 * screens are never reachable through a payroll key; and no screen sends a
 * figure the server computes.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const access = require("../../util/fnfAccess");
const view = require("../../util/payslipView");

const keys = (...k) => k.map((permission_key) => ({ permission_key }));

/* ------------------------------------------------------------ access */

test("F&F list: view_employees + view_salary + view_fnf_settlement, all three", () => {
  assert.equal(access.canViewFnf({ permissions: keys("view_employees", "view_salary", "view_fnf_settlement") }), true);
  assert.equal(access.canViewFnf({ permissions: keys("view_employees", "view_payroll", "view_salary") }), false);
  assert.equal(access.canViewFnf({ permissions: keys("view_fnf_settlement") }), false);
  assert.equal(access.canViewFnf({ isAdmin: true }), true);
});

test("the confidential exit record is never reachable through a payroll or F&F key", () => {
  const payrollEverything = keys(
    "view_employees", "view_payroll", "view_salary", "process_payroll", "approve_payrun", "publish_payrun",
    "view_fnf_settlement", "manage_fnf_settlement"
  );
  assert.equal(access.canViewExitInterview({ permissions: payrollEverything }), false);
  assert.equal(access.canManageExitInterview({ permissions: payrollEverything }), false);
  assert.equal(access.canOverrideRehire({ permissions: payrollEverything }), false);
  assert.equal(access.canViewExitInterview({ permissions: keys("view_employees", "view_exit_interview") }), true);
});

test("row actions follow the stage: items before approval, settle once published, reopen once settled", () => {
  const manager = { permissions: keys("view_employees", "manage_fnf_settlement") };
  const at = (stage, initialized = true) => access.rowActions({ stage, initialized }, manager);
  assert.deepEqual(at("IN_PAYROLL"), { editItems: true, settle: false, reopen: false, exitInterview: false });
  assert.equal(at("APPROVED").editItems, false);
  assert.equal(at("PUBLISHED").settle, true);
  assert.equal(at("SETTLED").settle, false);
  assert.equal(at("SETTLED").reopen, true);
  assert.equal(at("NOT_IN_PAYROLL", false).editItems, false);
  const viewer = { permissions: keys("view_employees", "view_salary", "view_fnf_settlement") };
  assert.deepEqual(access.rowActions({ stage: "PUBLISHED", initialized: true }, viewer), {
    editItems: false, settle: false, reopen: false, exitInterview: false,
  });
});

test("a negative F&F is shown as recoverable, never as a negative payment", () => {
  assert.equal(access.netLabel(-969), "Recoverable ₹969.00");
  assert.equal(access.netLabel(5031), "₹5,031.00");
  assert.equal(access.netLabel(null), "—");
});

/* ------------------------------------------------- the payslip view */

const FNF = {
  document_type: "FNF",
  period: { year: 2026, month: 8, label: "August 2026" },
  employee: { employee_id: 2095, employee_name: "PREETHA .S" },
  final: { net_pay: "-969.00", net_pay_before_rounding: "-968.79", net_pay_rounding: "-0.21" },
  fnf: {
    last_working_day: "2026-08-16", date_of_joining: "2026-02-02", lop_days: 3, actual_working_days: 13,
    lateness_amount: "1.44", additions_total: "1500.00", deductions_total: "0.00",
    net_payable_label: "Total Recoverable from Employee", recoverable: true,
    net_payable_words: "Nine Hundred Sixty Nine Rupees Only", declaration: "I, the undersigned...",
  },
};

test("an F&F snapshot shows its exit facts and the net as payable / recoverable, in words", () => {
  assert.equal(view.isFnf(FNF), true);
  assert.deepEqual(view.fnfFacts(FNF), [
    ["Last Working Day", "2026-08-16"],
    ["Date of Joining", "2026-02-02"],
    ["LOP Days", 3],
    ["Actual Working Days", 13],
    ["Lateness Amount", "₹1.44"],
    ["F&F Earnings", "₹1,500.00"],
  ]);
  assert.deepEqual(view.fnfNetLine(FNF), {
    label: "Total Recoverable from Employee", amount: "₹969.00", words: "Nine Hundred Sixty Nine Rupees Only", recoverable: true,
  });
});

test("an ordinary payslip has no F&F section", () => {
  const slip = { ...FNF, document_type: "PAYSLIP", fnf: null };
  assert.equal(view.isFnf(slip), false);
  assert.deepEqual(view.fnfFacts(slip), []);
  assert.equal(view.fnfNetLine(slip), null);
  assert.equal(view.isFnf({ ...FNF, document_type: undefined }), false, "a schema-3 snapshot is a payslip");
});

/* ------------------------------------------- the screens, from source */

test("the F&F menu entry asks for exactly what GET /payrun/fnf/month requires", () => {
  const menus = read("constants/menus.js");
  assert.match(menus, /fnf_settlement: \{\s*title: "F&F Settlement",\s*permission: \["view_employees", "view_salary", "view_fnf_settlement"\]/);
  assert.match(menus, /location: "\/payroll\/fnf"/);
});

test("the helper calls exactly the backend's endpoints and sends no computed figure", () => {
  const helper = code(read("helper/employeeExit.js"));
  for (const url of ["/payrun/fnf/month", "/payrun/fnf/items", "/payrun/fnf/settle", "/payrun/fnf/reopen", "/hr/exit/employee/"]) {
    assert.ok(helper.includes(url), url);
  }
  for (const forbidden of ["net_pay", "settled_net_amount", "calculation_hash", "total_earnings", "status:"]) {
    assert.ok(!helper.includes(forbidden), forbidden);
  }
});

test("the confidential page states it, and the payslip detail never renders interview or rehire data", () => {
  const page = read("pages/hr/exit/[id].jsx");
  assert.match(page, /Confidential HR record/);
  assert.match(page, /canViewExitInterview/);
  const detail = code(read("components/payslip/PayslipDetail.jsx"));
  for (const forbidden of ["rehire", "interview", "primary_reason", "eligibility"]) {
    assert.ok(!detail.toLowerCase().includes(forbidden), forbidden);
  }
});

test("the calculation list badges an F&F month and the breakup lists its items", () => {
  assert.match(read("components/payroll/calculation/CalculationEmployeeList.jsx"), /row\.is_fnf/);
  assert.match(read("components/payroll/calculation/CalculationBreakup.jsx"), /breakup\.fnf/);
});

test("rejoin shows the previous exit's rehire assessment to confidential readers only, and does not block", () => {
  const modal = code(read("components/hr/LifecycleActionModals.jsx"));
  assert.match(modal, /canViewExitInterview\(actor\)/);
  assert.match(modal, /<RehireStanding employeeId=\{employee\.employee_id\} isOpen=\{isOpen\} \/>/);
  assert.ok(!/rehire[\s\S]{0,80}isDisabled/.test(modal), "the Rejoin button is not disabled by the assessment");
});
