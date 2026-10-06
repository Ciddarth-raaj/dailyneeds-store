/**
 * Payroll Dashboard - the PAGE, mounted in jsdom and clicked.
 *
 *   node --test components/payroll/dashboard/payrollDashboardPageRender.test.js
 *
 * The real page and its real components; only the server
 * (helper/payrollDashboard.js), the router, the signed-in user and the app
 * chrome are stubbed. Every figure on screen is what the fake server said -
 * the page must not compute any of its own.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { mount, unavailable, root } = require("../../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

let helper = null;
let act = null;
let actor = { isAdmin: false, permissions: [] };
const pushed = [];
let server = null;

const FULL = ["view_employees", "view_payroll", "view_salary"].map((permission_key) => ({ permission_key }));

const OPTIONS = {
  locations: [{ id: 1, name: "Moolakulam", count: 3 }, { id: 2, name: "ECR", count: 2 }],
  departments: [{ id: 10, name: "Billing", count: 3 }],
  designations: [{ id: 100, name: "Cashier", count: 3 }],
};

function summaryFor(p) {
  const empty = p.month === 9;
  const total = empty ? 0 : p.store_id ? 2 : 5;
  return {
    code: 200,
    period: { year: p.year, month: p.month, label: `Month ${p.month}`, month_locked: false },
    filters: { applied: {}, options: OPTIONS },
    kpis: { total_employees: total, initialized: empty ? 0 : total - 1, not_initialized: empty ? 0 : 1, payroll_cost: empty ? "0.00" : "2907375.00", total_deductions: "153751.00", net_payable: "2753624.00", costed_employees: 3, uncosted_initialized: 1 },
    headcount: { location: [{ id: "1", name: "Moolakulam", count: 3, initialized: 3 }], department: [], designation: [], employment_type: [] },
    earnings: {
      gross: "2907375.00", net: "2753624.00", deductions: "153751.00", costed_employees: 3,
      breakdown: [
        { key: "PF", label: "PF (employee)", tracked: true, amount: "53020.00", employees: 3, metric: "DED_PF" },
        { key: "PT", label: "Professional Tax", tracked: false, amount: null, employees: null, metric: null },
      ],
    },
    comparison: {
      base: { year: p.year, month: p.month, label: "August 2026" },
      compare: { year: 2026, month: 7, label: "July 2026" },
      metrics: [{ key: "GROSS", label: "Gross Wages", tracked: true, money: true, base: "2907375.00", compare: "2700000.00", difference: "207375.00", percent: 7.7 }],
    },
    movement: [{ key: "JOINED", label: "New Joined", metric: "MOVE_JOINED", count: 16, costed_employees: 16, payroll_cost: "115022.00", deductions: "0.00", net_wages: "115022.00" }],
    actions: empty
      ? []
      : [
          { key: "ATTENDANCE_NEEDS_ACTION", label: "Payroll attendance pending", description: "d", severity: "high", count: 3, metric: "ACTION_ATTENDANCE_NEEDS_ACTION", target: { stage: "CALCULATION", card: "ATTENDANCE_NEEDS_ACTION" } },
          { key: "NEGATIVE_NET_PAY", label: "Negative net pay", description: "d", severity: "high", count: 0, metric: "ACTION_NEGATIVE_NET_PAY", target: { stage: "CALCULATION", card: "ALL" } },
        ],
  };
}

function fakeServer() {
  const s = { calls: [], forbid: false };
  helper.getMonths = async (p) => {
    s.calls.push(["getMonths", p]);
    if (s.forbid) return { code: 403, msg: "You are not authorized for this branch." };
    const months = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m) => {
      const year = m >= 4 ? p.fy : p.fy + 1;
      const started = year === 2026 && m <= 8;
      return { year, month: m, label: `M${m}`, status: started ? "PUBLISHED" : "NOT_STARTED", initialized: started ? 5 : 0, calculated: started ? 5 : 0, approved: started ? 5 : 0, published: 0, approved_gross: started ? "2907375.00" : null };
    });
    return { code: 200, fy: p.fy, label: "FY", months };
  };
  helper.getSummary = async (p) => {
    s.calls.push(["getSummary", p]);
    if (s.forbid) return { code: 403, msg: "You are not authorized for this branch." };
    return summaryFor(p);
  };
  helper.getEmployees = async (p) => {
    s.calls.push(["getEmployees", p]);
    return {
      code: 200, metric: p.metric, total: 1, page: 1, page_size: 50,
      totals: { costed_employees: 0, gross: "0.00", deductions: "0.00", net: "0.00" },
      rows: [{ employee_id: 77, employee_name: "Pending Person", location: "Moolakulam", department: "Billing", designation: "Cashier", initialized: false, status: "BLOCKED", status_label: "Blocked - cannot initialize", reasons: ["Salary not approved"], gross: null, deductions: null, net: null, stage: "INITIALIZATION" }],
    };
  };
  return s;
}

function stubModule(rel, value) {
  const file = require.resolve(path.join(root, rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: { __esModule: true, default: value } };
}

if (!unavailable) {
  const React = require("react");
  helper = require(path.join(root, "helper/payrollDashboard.js")).default;
  ({ act } = require("react-dom/test-utils"));
  const Passthrough = ({ children }) => React.createElement("div", null, children);
  stubModule("components/globalWrapper/globalWrapper", Passthrough);
  stubModule("customHooks/usePayrollActor", () => actor);
  const routerFile = require.resolve("next/router", { paths: [root] });
  const router = { isReady: true, query: {}, push: (href) => pushed.push(href) };
  require.cache[routerFile] = { id: routerFile, filename: routerFile, loaded: true, exports: { __esModule: true, useRouter: () => router, default: router } };
  // recharts measures its container; jsdom has no layout engine.
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

const settle = async () => {
  for (let i = 0; i < 6; i += 1) await act(() => new Promise((r) => setTimeout(r, 0)));
};
const buttons = () => [...document.body.querySelectorAll("button, a")];
const byText = (name) => buttons().find((b) => b.textContent.trim() === name);
const byLabel = (label) => document.body.querySelector(`[aria-label="${label}"]`);
const callsOf = (name) => server.calls.filter((c) => c[0] === name).map((c) => c[1]);
const choose = async (select, value) => {
  await act(async () => {
    select.value = String(value);
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  await settle();
};

let ui = null;
test.afterEach(() => {
  if (ui) ui.unmount();
  ui = null;
  pushed.length = 0;
});

async function open(over = {}) {
  actor = over.actor || { isAdmin: false, permissions: FULL };
  server = fakeServer();
  if (over.forbid) server.forbid = true;
  ui = mount("components/payroll/dashboard/PayrollDashboardView.jsx", {});
  // jsdom has no animation frames; Chakra's Drawer transition asks for one.
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  await settle();
  return ui;
}

test("opens on the latest started month of the financial year and shows the server's figures", skip, async () => {
  await open();
  const summary = callsOf("getSummary");
  assert.ok(summary.length >= 1);
  assert.deepEqual([summary.at(-1).year, summary.at(-1).month], [2026, 8]);
  const text = ui.text().join(" ");
  assert.match(text, /Total Employees/);
  assert.match(text, /₹29\.07L/, "compact INR on the Payroll Cost card");
  assert.match(text, /₹29,07,375\.00/);
  assert.match(text, /Not tracked/, "PT is not tracked, not ₹0");
  assert.equal(document.body.querySelectorAll('[role="tab"]').length, 12, "all twelve months");
  const tabs = [...document.body.querySelectorAll('[role="tab"]')];
  assert.match(tabs[4].textContent, /₹29\.07L/, "AUG shows its approved gross");
  assert.match(tabs[5].textContent, /—/, "an unstarted month shows no amount");
});

test("clicking a month refreshes the whole dashboard for it", skip, async () => {
  await open();
  const before = callsOf("getSummary").length;
  ui.click(document.body.querySelectorAll('[role="tab"]')[3]); // JUL
  await settle();
  const last = callsOf("getSummary").at(-1);
  assert.ok(callsOf("getSummary").length > before);
  assert.deepEqual([last.year, last.month], [2026, 7]);
});

test("a KPI card drills to the exact employees, loaded only when opened", skip, async () => {
  await open();
  assert.equal(callsOf("getEmployees").length, 0, "no drill-down rows until asked");
  ui.click(byLabel("Show employees: Not Initialized"));
  await settle();
  const drill = callsOf("getEmployees");
  assert.equal(drill.length, 1);
  assert.equal(drill[0].metric, "NOT_INITIALIZED");
  assert.deepEqual([drill[0].year, drill[0].month], [2026, 8]);
  assert.match(document.body.textContent, /Pending Person/);
  assert.match(document.body.textContent, /Salary not approved/);
  const openLink = byText("Open");
  assert.equal(openLink.getAttribute("href"), "/payroll/payrun?year=2026&month=8&stage=INITIALIZATION&card=ALL&search=77");
});

test("the filters apply to every read, are dependent, and clear", skip, async () => {
  await open();
  await choose(byLabel("Location"), 2);
  let last = callsOf("getSummary").at(-1);
  assert.equal(last.store_id, "2");
  assert.equal(callsOf("getMonths").at(-1).store_id, "2", "the month strip is filtered too");

  await choose(byLabel("Department"), 10);
  await choose(byLabel("Designation"), 100);
  last = callsOf("getSummary").at(-1);
  assert.deepEqual([last.store_id, last.department_id, last.designation_id], ["2", "10", "100"]);

  ui.click(byLabel("Show employees: Payroll Cost"));
  await settle();
  const drill = callsOf("getEmployees").at(-1);
  assert.deepEqual([drill.metric, drill.store_id, drill.department_id, drill.designation_id], ["COSTED", "2", "10", "100"]);

  await choose(byLabel("Location"), 1);
  last = callsOf("getSummary").at(-1);
  assert.deepEqual([last.store_id, last.department_id, last.designation_id], ["1", undefined, undefined], "a new location clears the department and designation");

  ui.click(byText("Clear Filters"));
  await settle();
  last = callsOf("getSummary").at(-1);
  assert.equal(last.store_id, undefined);
});

test("the comparison month can be changed", skip, async () => {
  await open();
  await choose(byLabel("Compare with month"), "2026-4");
  const last = callsOf("getSummary").at(-1);
  assert.deepEqual([last.compare_year, last.compare_month], [2026, 4]);
});

test("an action item opens its employees and links straight to the Payrun stage", skip, async () => {
  await open();
  assert.match(document.body.textContent, /1 payroll action pending/);
  const fix = buttons().filter((b) => b.textContent.trim() === "Fix in Payrun");
  assert.equal(fix[0].getAttribute("href"), "/payroll/payrun?year=2026&month=8&stage=CALCULATION&card=ATTENDANCE_NEEDS_ACTION");
  ui.click(fix[0]);
  assert.deepEqual(pushed, ["/payroll/payrun?year=2026&month=8&stage=CALCULATION&card=ATTENDANCE_NEEDS_ACTION"]);
});

test("an empty, not-started month says so", skip, async () => {
  await open();
  ui.click(document.body.querySelectorAll('[role="tab"]')[5]); // SEP - not started
  await settle();
  assert.match(document.body.textContent, /No payroll employees for September 2026/);
});

test("no permission: explained, and nothing is read", skip, async () => {
  await open({ actor: { isAdmin: false, permissions: [{ permission_key: "view_employees" }] } });
  assert.match(ui.text().join(" "), /needs the View Employees, View Payroll and View Salary permissions/);
  assert.equal(server.calls.length, 0);
});

test("initialized but not yet costed is visible and drillable, never hidden", skip, async () => {
  await open();
  assert.match(document.body.textContent, /4 initialized · 3 costed into Payroll Cost, Deductions and Net Payable · 1 initialized but not yet costed/);
  ui.click(byText("View 1"));
  await settle();
  assert.equal(callsOf("getEmployees").at(-1).metric, "UNCOSTED");
});

test("Comparison: an empty comparison month says so; PT/TDS read Not tracked, never ₹0", skip, async () => {
  const panel = mount("components/payroll/dashboard/ComparisonPanel.jsx", {
    comparison: {
      base: { year: 2026, month: 8, label: "August 2026" },
      compare: { year: 2026, month: 9, label: "September 2026" },
      metrics: [
        { key: "EMPLOYEE_COUNT", label: "Employee Count", tracked: true, money: false, base: 5, compare: 0, difference: 5, percent: null },
        { key: "PT", label: "Professional Tax", tracked: false, money: true, base: null, compare: null, difference: null, percent: null },
        { key: "IT", label: "Income Tax / TDS", tracked: false, money: true, base: null, compare: null, difference: null, percent: null },
      ],
    },
    choices: [],
    compareKey: "2026-9",
    onCompareChange: () => {},
  });
  const text = panel.text().join(" ");
  assert.match(text, /September 2026 has no payroll for these filters/);
  assert.equal((text.match(/Not tracked/g) || []).length, 2);
  assert.ok(!/₹0\.00/.test(text), "no ₹0 for an untracked deduction");
  panel.unmount();
});

test("Head Count cuts a very long name on the axis but keeps it whole for readers", skip, async () => {
  const long = "Daily Needs Department Store - Moolakulam Main Road Branch";
  const panel = mount("components/payroll/dashboard/HeadCountPanel.jsx", {
    headcount: { location: [{ id: "1", name: long, count: 3, initialized: 3 }], department: [], designation: [], employment_type: [] },
    periodLabel: "August 2026",
    onOpen: () => {},
  });
  assert.match(panel.text().join(" "), new RegExp(`${long}: 3 employees`));
  panel.unmount();
});

test("a server refusal (branch scope) is shown as the server worded it", skip, async () => {
  await open({ forbid: true });
  assert.match(ui.text().join(" "), /You are not authorized for this branch\./);
});

/* ---------------------------------------- the Payrun side of the link */
test("the Payrun screen takes the dashboard's link: month, stage, card, filters and search", () => {
  const fs = require("fs");
  const page = fs.readFileSync(path.join(__dirname, "../../../pages/payroll/payrun.jsx"), "utf8");
  assert.match(page, /parsePayrunLink\(router\.query/);
  assert.match(page, /cardForStage\(stageNow, link\.card\)/, "only a card of that stage is accepted");
  assert.match(page, /initialCard=\{linkedCalcCard\}/);
  assert.match(page, /initialCard=\{linkedAdjustmentCard\}/);
  const calc = fs.readFileSync(path.join(__dirname, "../calculation/PayrunCalculation.jsx"), "utf8");
  assert.match(calc, /useState\(initialCard \|\| DEFAULT_TAB\.CALCULATION\)/);
});
