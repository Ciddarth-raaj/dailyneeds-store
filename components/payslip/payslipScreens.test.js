/**
 * PAYSLIP SCREENS - the Mini App's My Payslips, the shared payslip detail and
 * payroll's Publish Payslip / Retry Notification / View Payslip.
 *
 *   node --test components/payslip/payslipScreens.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const view = require("../../util/payslipView");
const calc = require("../../util/payrunCalculation");

/* ----------------------------------------------------------- the util */

const SNAPSHOT = {
  period: { year: 2026, month: 9, label: "September 2026" },
  employee: {
    employee_id: 101, employee_name: "C. Saravanan", designation_name: "Billing", store_name: "Moolakulam",
    department_name: "Grocery", date_of_joining: "2018-04-01", pay_type: "BANK",
    bank_name: "State Bank", bank_account_masked: "XXXXXX9012", pan_masked: "XXXXXX234F",
  },
  attendance: {
    salary_days: 26, monthly_gross: "26013.37", daily_rate: "1000.51", nrm_hours: 8, missing_hours: 1.5,
    missing_hours_deduction: "187.60", extra_days: 1, extra_day_amount: "1000.51",
    approved_ot_hours: 2.5, ot_hourly_rate: "125.06", ot_amount: "312.65",
  },
  earnings: {
    lines: [
      { key: "basic", label: "Basic", amount: "13006.13", optional: false },
      { key: "bonus", label: "Bonus", amount: "0.00", optional: true },
      { key: "incentive", label: "Incentive", amount: "500.00", optional: true },
    ],
    total: "27826.42",
  },
  deductions: { lines: [{ key: "employee_pf", label: "Employee PF", amount: "1560.74", optional: true }], total: "2992.03" },
  statutory: { pf_applicable: true, uan_masked: "XXXXXXXX0400", pf_number_masked: "XXXXXXXX/101", esi_applicable: false, esi_number_masked: null },
  company: { name: "Daily Needs Departmental Store", pf_establishment_code: "TN/MAS/0012345", esi_establishment_code: "510001" },
  final: { net_pay_before_rounding: "24834.39", net_pay_rounding: "-0.39", net_pay: "24834.00" },
};

test("rupees: Indian grouping from the snapshot's text, no float arithmetic", () => {
  assert.equal(view.formatRupees("24834.00"), "₹24,834.00");
  assert.equal(view.formatRupees("1234567.5"), "₹12,34,567.50");
  assert.equal(view.formatRupees("-0.39"), "-₹0.39");
  assert.equal(view.formatRupees(null), "—");
});

test("lines: non-optional always, optional only when non-zero (the PDF's rule)", () => {
  assert.deepEqual(view.printableLines(SNAPSHOT.earnings.lines).map((l) => l.key), ["basic", "incentive"]);
});

test("the facts read straight from the snapshot - masked identifiers only, the rounded Net Pay exactly", () => {
  const employee = Object.fromEntries(view.employeeFacts(SNAPSHOT));
  assert.equal(employee["Bank Account"], "XXXXXX9012");
  assert.equal(employee.PAN, "XXXXXX234F");
  assert.equal(employee["Payment Type"], "Bank");
  const final = Object.fromEntries(view.finalFacts(SNAPSHOT));
  assert.equal(final["Final Net Pay"], "₹24,834.00");
  assert.equal(final["Net Pay Rounding"], "-₹0.39");
  const attendance = Object.fromEntries(view.attendanceFacts(SNAPSHOT));
  assert.equal(attendance["OT Rate"], "₹125.06 / hour");
  const statutory = Object.fromEntries(view.statutoryFacts(SNAPSHOT));
  assert.equal(statutory.UAN, "XXXXXXXX0400", "masked, as frozen");
  assert.equal(statutory["PF Number"], "XXXXXXXX/101");
  assert.equal(statutory["ESI Number"], undefined, "not applicable is not shown");
  assert.equal(statutory["PF Establishment Code"], "TN/MAS/0012345");
  assert.equal(statutory["ESI Establishment Code"], undefined, "ESI not applicable");
  assert.equal(attendance["Standard Working Hours / Day"], 8);
  assert.ok(!view.attendanceFacts(SNAPSHOT).some(([k]) => /NRM/.test(k)));
});

/* ------------------------------------------- payroll screen predicates */

const published = (payslip) => ({ status: "PUBLISHED", payslip });

test("badges: Telegram Queued / Sending / Sent / Failed / No Telegram Link / Not Notified; Not Viewed / Viewed on <date>", () => {
  assert.equal(calc.notificationBadge({ notification_status: "QUEUED" }).label, "Telegram Queued");
  assert.equal(calc.notificationBadge({ notification_status: "SENDING" }).label, "Telegram Sending");
  assert.equal(calc.notificationBadge({ notification_status: "SENT" }).label, "Telegram Sent");
  assert.equal(calc.notificationBadge({ notification_status: "FAILED" }).label, "Telegram Failed");
  assert.equal(calc.notificationBadge({ notification_status: "NO_TELEGRAM_LINK" }).label, "No Telegram Link");
  assert.equal(calc.notificationBadge({ notification_status: "NOT_ATTEMPTED" }).label, "Not Notified");
  assert.equal(calc.notificationBadge(null), null);
  assert.equal(calc.viewBadge({ viewed: false }).label, "Not Viewed");
  assert.equal(calc.viewBadge({ viewed: true, first_viewed_at: "2026-10-04 09:42:10" }).label, "Viewed on 4 Oct 2026, 09:42");
});

test("Retry Notification is offered only for a published payslip whose employee was not reached", () => {
  assert.equal(calc.isNotificationRetryable(published({ notification_status: "FAILED" })), true);
  assert.equal(calc.isNotificationRetryable(published({ notification_status: "NO_TELEGRAM_LINK" })), true);
  assert.equal(calc.isNotificationRetryable(published({ notification_status: "NOT_ATTEMPTED" })), true);
  assert.equal(calc.isNotificationRetryable(published({ notification_status: "SENT" })), false);
  assert.equal(calc.isNotificationRetryable(published({ notification_status: "QUEUED" })), false, "not while queued");
  assert.equal(calc.isNotificationRetryable(published({ notification_status: "SENDING" })), false, "not while sending");
  assert.equal(calc.isNotificationPending(published({ notification_status: "QUEUED" })), true);
  assert.equal(calc.isNotificationPending(published({ notification_status: "FAILED" })), false);
  assert.equal(calc.isNotificationRetryable({ status: "APPROVED_LOCKED", payslip: null }), false);
  assert.equal(calc.hasPayslip(published({})), true);
  assert.equal(calc.hasPayslip({ status: "APPROVED_LOCKED" }), false);
});

test("publish returns before Telegram: the outcome says the notifications are queued, and that is not a refusal", () => {
  const result = { action: "PUBLISH", results: [{ result: "PUBLISHED", notification_status: "QUEUED" }, { result: "PUBLISHED", notification_status: "QUEUED" }] };
  assert.equal(calc.lifecycleOutcomeMessage(result), "2 payslips published, Telegram notification queued.");
  assert.equal(calc.lifecycleHasRefusals(result), false);
  assert.equal(calc.retryHasRefusals({ results: [{ result: "QUEUED" }] }), false);
  assert.equal(calc.retryHasRefusals({ results: [{ result: "SKIPPED" }] }), true);
});

test("the payroll screen re-reads the month while notifications are pending - bounded", () => {
  const src = code(read("components/payroll/calculation/PayrunCalculation.jsx"));
  assert.match(src, /rows\.some\(isNotificationPending\)/);
  assert.match(src, /pendingPolls >= 12/);
});

test("the publish outcome counts by notification: published and notified / failed / no link / skipped", () => {
  const msg = calc.lifecycleOutcomeMessage({
    action: "PUBLISH",
    results: [
      ...Array.from({ length: 198 }, () => ({ result: "PUBLISHED", notification_status: "SENT" })),
      ...Array.from({ length: 8 }, () => ({ result: "PUBLISHED", notification_status: "FAILED" })),
      ...Array.from({ length: 12 }, () => ({ result: "PUBLISHED", notification_status: "NO_TELEGRAM_LINK" })),
      ...Array.from({ length: 5 }, () => ({ result: "SKIPPED", message: "Skipped — not approved & locked." })),
    ],
  });
  assert.equal(
    msg,
    "198 payslips published and notified, 8 payslips published, Telegram notification failed, " +
      "12 payslips published, no Telegram link, 5 skipped — not approved & locked."
  );
  assert.equal(calc.lifecycleHasRefusals({ action: "PUBLISH", results: [{ result: "PUBLISHED", notification_status: "FAILED" }] }), true);
  assert.equal(calc.lifecycleHasRefusals({ action: "PUBLISH", results: [{ result: "PUBLISHED", notification_status: "SENT" }] }), false);
});

/* ------------------------------------------------------ the Mini App */

const miniApp = read("components/telegram/TelegramPayslips.jsx");
const helper = read("helper/telegramAttendance.js");
const detail = read("components/payslip/PayslipDetail.jsx");

test("My Payslips names no employee and no chat id anywhere - the session decides", () => {
  for (const src of [code(miniApp), code(helper.slice(helper.indexOf("listPayslips")))]) {
    assert.ok(!/employee_id/.test(src));
    assert.ok(!/chat_id|chatId/.test(src));
  }
  const calls = [...helper.matchAll(/client\s*\.\s*(get|post)\(\s*"(\/telegram\/payslips[^"]*)"/g)].map((m) => `${m[1]} ${m[2]}`);
  assert.deepEqual(calls.sort(), [
    "get /telegram/payslips",
    "get /telegram/payslips/detail",
    "get /telegram/payslips/pdf",
    "post /telegram/payslips/pdf-link",
  ]);
  assert.match(helper.slice(helper.indexOf("listPayslips")), /headers: authHeaders\(\)/);
});

test("the list opens a month by its ref; the detail is the shared PayslipDetail with Download PDF", () => {
  assert.match(code(miniApp), /view\(p\.payslip_ref\)/);
  assert.match(code(miniApp), /<PayslipDetail snapshot=\{open\.payslip\.snapshot\} \/>/);
  assert.match(miniApp, /Download PDF/);
  assert.match(code(miniApp), /isVersionAtLeast\("8\.0"\)/);
  assert.match(code(miniApp), /payslipPdfLink\(open\.ref\)/);
});

test("download: the authenticated header path is the normal one; the link is the iOS-only fallback", () => {
  const src = code(miniApp);
  assert.match(src, /webApp\.platform === "ios"/);
  const dl = src.slice(src.indexOf("const download = async"));
  assert.ok(dl.indexOf("needsLinkDownload(webApp)") < dl.indexOf("payslipPdfLink"));
  assert.match(dl, /TelegramAttendanceHelper\.payslipPdf\(open\.ref\)/);
  const helperPdf = helper.slice(helper.indexOf("payslipPdf:"), helper.indexOf("absoluteUrl:"));
  assert.match(helperPdf, /headers: authHeaders\(\)/);
  assert.match(helperPdf, /params: \{ ref \}/);
});

test("the detail puts Final Net Pay first, then the sections; nothing reads as acceptance", () => {
  const body = code(detail);
  assert.ok(body.indexOf("Final Net Pay") < body.indexOf('title="Employee"'));
  for (const section of ["Employee", "Attendance / Salary Basis", "Earnings", "Deductions", "Statutory Information", "Net Pay"]) {
    assert.ok(body.includes(`title="${section}"`), section);
  }
  for (const src of [miniApp, detail]) assert.ok(!/accept|agree|approve/i.test(code(src)), "no acceptance control");
});

test("the Mini App page carries a My Payslips tab, in SECTION_ORDER position", () => {
  const page = read("pages/telegram/attendance/index.jsx");
  const { SECTION_ORDER, SECTION } = require("../../util/telegramAttendance");
  assert.equal(SECTION_ORDER.indexOf(SECTION.PAYSLIPS), 3);
  const panels = code(page).slice(code(page).indexOf("<TabPanels>"));
  assert.ok(panels.indexOf("<TelegramPayslips />") < panels.indexOf("<TelegramHelp />"));
  assert.ok(panels.indexOf("otRequestRows(days)") < panels.indexOf("<TelegramPayslips />"));
});

/* ------------------------------------------------- the payroll screen */

const workflow = read("components/payroll/calculation/PayrunCalculation.jsx");
const list = read("components/payroll/calculation/CalculationEmployeeList.jsx");
const modal = read("components/payroll/calculation/LifecycleActionModal.jsx");
const adminView = read("components/payroll/calculation/PayslipViewModal.jsx");
const payrollHelper = read("helper/payrunCalculation.js");

test("the actions are named for the payslip", () => {
  for (const label of ["Publish Payslip", "Unpublish Payslip", "View Payslip", "Retry Notification"]) {
    assert.ok(list.includes(`>\n          ${label}\n`) || list.includes(label), label);
  }
  for (const label of ["Publish Payslips Selected (", "Unpublish Payslips Selected (", "Publish All Approved Payslips (", "Retry Notification Selected ("]) {
    assert.ok(workflow.includes(label), label);
  }
  assert.match(modal, /title: "Publish Payslip"/);
  assert.match(modal, /title: "Unpublish Payslip"/);
  assert.match(modal, /carries no salary figure/);
});

test("Publish All sends the month and the list's filters only; Retry sends ids only - never a chat id", () => {
  const publishAll = payrollHelper.slice(payrollHelper.indexOf("publishAll:"), payrollHelper.indexOf("retryNotification:"));
  assert.match(publishAll, /"\/payrun\/calculation\/publish-all", \{ year, month, \.\.\.listFilters\(filters\) \}/);
  assert.ok(!/chat|employee_ids/i.test(code(publishAll)), "publish-all carries no ids and no chat id");
  const retry = payrollHelper.slice(payrollHelper.indexOf("retryNotification:"), payrollHelper.indexOf("getPayslip:"));
  assert.match(retry, /\{ year, month, employee_ids \}/);
  assert.ok(!/chat/i.test(code(retry)));
  assert.ok(code(workflow).includes("eligibleWithin(rows, selectedIds, isNotificationRetryable)"));
  assert.ok(code(list).includes("isNotificationRetryable(row) && canPublish"));
});

test("View Payslip reads the admin payslip endpoint and renders the same PayslipDetail", () => {
  assert.match(code(adminView), /PayrunCalculationHelper\.getPayslip\(\{ year, month, employee_id: target\.employee_id \}\)/);
  assert.match(code(adminView), /<PayslipDetail snapshot=\{payslip\.snapshot\} \/>/);
  assert.match(code(list), /hasPayslip\(row\) && onViewPayslip/);
  assert.match(code(list), /<PayslipBadges row=\{row\} \/>/);
});
