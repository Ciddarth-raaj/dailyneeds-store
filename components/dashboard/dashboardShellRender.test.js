/**
 * The Dashboard - the SHELL, mounted in jsdom with its four real screens.
 *
 *   node --test components/dashboard/dashboardShellRender.test.js
 *
 * Only the servers (the three helpers), the router, the permission hooks and
 * the app chrome are stubbed; the tab bar and every screen are the real
 * components. What is defended: which tab a URL opens, that a tab the caller
 * may not open is never drawn and never mounted, that only the open tab asks
 * the server for anything, and that Back / Forward and the Now / By date
 * switch move between tabs.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const { mount, unavailable, root } = require("../../test_support/renderJsx");

const skip = unavailable ? { skip: `dependencies not installed: ${unavailable}` } : {};

const ADMIN = { attendance: true, staffing: true, payroll: true, "my-attendance": true };

let act = null;
let tabAccess = { ready: true, access: ADMIN };
const navigations = [];
let router = null;
let calls = [];
let failPayroll = false;

function stubModule(rel, value) {
  const file = require.resolve(path.join(root, rel));
  require.cache[file] = { id: file, filename: file, loaded: true, exports: { __esModule: true, default: value } };
}

/** `?tab=x&a=1` -> `{ tab: "x", a: "1" }` */
function queryOf(href) {
  const q = {};
  new URLSearchParams(href.split("?")[1] || "").forEach((v, k) => {
    q[k] = v;
  });
  return q;
}

/* ---------------------------------------------------------------- servers */
const ok = (body) => Promise.resolve({ code: 200, ...body });

const CARD = (count) => ({ count });
const OVERVIEW = {
  is_open_day: false,
  fetched_at: "2026-10-06 19:17",
  cards: {
    total_employees: CARD(209),
    checked_in: { count: 192, rate: { numerator: 192, denominator: 209, percent: 91.9 } },
    not_yet_checked_in: CARD(17),
    no_record: CARD(0),
    need_action: { count: 1, by_issue: [] },
    ot_requests_pending: { count: 0, minutes: 0, employees: 0 },
  },
  overview: null,
  by_location: [],
  by_shift: [],
  attention: [],
};

const STAFFING = {
  as_of: "2026-10-06 19:18",
  business_date: "2026-10-06",
  expected: 133,
  recorded_in_expected_location: 120,
  gap: 13,
  coverage: [],
  roaming: null,
  attention_preview: [],
  attention_groups: [],
  attention_total: 0,
  gap_preview: [],
  next_hour: null,
  additional: null,
  unknown_expectation_total: 0,
};

function months(fy) {
  return [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3].map((m) => {
    const year = m >= 4 ? fy : fy + 1;
    return { year, month: m, label: `M${m}`, status: "NOT_STARTED", initialized: 0, calculated: 0, approved: 0, published: 0, approved_gross: null };
  });
}

function payrollSummary(p) {
  return {
    code: 200,
    period: { year: p.year, month: p.month, label: "Month", month_locked: false },
    filters: { applied: {}, options: { locations: [], departments: [], designations: [] } },
    kpis: { total_employees: 224, initialized: 223, not_initialized: 1, payroll_cost: "2880702.33", total_deductions: "194491.38", net_payable: "2686207.00", costed_employees: 222, uncosted_initialized: 1 },
    headcount: { location: [], department: [], designation: [], employment_type: [] },
    earnings: { gross: "2880702.33", net: "2686207.00", deductions: "194491.38", costed_employees: 222, breakdown: [] },
    comparison: { base: { year: p.year, month: p.month, label: "A" }, compare: { year: p.year, month: p.month - 1, label: "B" }, metrics: [] },
    movement: [],
    actions: [],
  };
}

function installServers() {
  const record = (name) => (...args) => {
    calls.push(name);
    return args;
  };
  const att = require(path.join(root, "helper/attendanceDashboard.js")).default;
  att.getFilters = () => (record("attendance.getFilters")(), ok({ outlets: [], designations: [], shifts: [], today: "2026-10-06", dashboard_scope: null }));
  att.getOverview = () => (record("attendance.getOverview")(), ok(OVERVIEW));
  att.getRecentPunches = () => (record("attendance.getRecentPunches")(), ok({ rows: [] }));
  att.getTrend = () => (record("attendance.getTrend")(), ok({ days: [] }));
  att.getDrilldown = (p) => (record(`attendance.getDrilldown:${p.bucket}`)(), ok({ rows: [], total: 0, offset: 0, limit: 50 }));
  att.getStaffing = () => (record("staffing.getStaffing")(), ok(STAFFING));
  att.getStaffingDrilldown = () => (record("staffing.getStaffingDrilldown")(), ok({ rows: [], total: 0 }));
  att.getRecurringGaps = () => (record("staffing.getRecurringGaps")(), ok({}));

  const pay = require(path.join(root, "helper/payrollDashboard.js")).default;
  pay.getMonths = (p) => {
    calls.push("payroll.getMonths");
    if (failPayroll) return Promise.resolve({ code: 500, msg: "Payroll is down." });
    return ok({ fy: p.fy, label: "FY", months: months(p.fy) });
  };
  pay.getSummary = (p) => (calls.push("payroll.getSummary"), Promise.resolve(payrollSummary(p)));
  pay.getEmployees = () => (calls.push("payroll.getEmployees"), ok({ rows: [], total: 0, page: 1, page_size: 50 }));

  const v2 = require(path.join(root, "helper/attendanceV2.js")).default;
  v2.getMyAttendance = () => (calls.push("my.getMyAttendance"), ok({ days: [] }));
}

if (!unavailable) {
  const React = require("react");
  ({ act } = require("react-dom/test-utils"));
  const Passthrough = ({ children }) => React.createElement("div", null, children);
  stubModule("components/globalWrapper/globalWrapper", Passthrough);
  stubModule("customHooks/useDashboardTabAccess", () => tabAccess);
  stubModule("customHooks/usePermissions", (keys) => keys.some((k) => k === "view_attendance_dashboard" && tabAccess.access.attendance));
  stubModule("customHooks/usePayrollActor", () => ({ isAdmin: Boolean(tabAccess.access.payroll), permissions: [] }));

  const routerFile = require.resolve("next/router", { paths: [root] });
  router = {
    isReady: true,
    pathname: "/dashboard",
    query: {},
    push: (href) => {
      navigations.push(["push", href]);
      if (href.startsWith("/dashboard")) router.query = queryOf(href);
      return Promise.resolve(true);
    },
    replace: (href) => {
      navigations.push(["replace", href]);
      if (href.startsWith("/dashboard")) router.query = queryOf(href);
      return Promise.resolve(true);
    },
  };
  require.cache[routerFile] = { id: routerFile, filename: routerFile, loaded: true, exports: { __esModule: true, useRouter: () => router, default: router } };
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  installServers();
}

const settle = async () => {
  for (let i = 0; i < 6; i += 1) await act(() => new Promise((r) => setTimeout(r, 0)));
};

let ui = null;
test.afterEach(() => {
  if (ui) ui.unmount();
  ui = null;
});

async function open({ query = {}, access = ADMIN, ready = true } = {}) {
  tabAccess = { ready, access };
  router.query = { ...query };
  router.isReady = true;
  navigations.length = 0;
  calls = [];
  failPayroll = false;
  ui = mount("components/dashboard/DashboardShell.jsx", {});
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 0);
    window.cancelAnimationFrame = (id) => clearTimeout(id);
  }
  await settle();
  return ui;
}

/** Re-render after the router changed - what Next does on a shallow push or Back. */
async function rerender() {
  ui.setProps({});
  await settle();
}

const tabs = () => ui.all('[aria-label="Dashboard views"] [role="tab"]');
const tabLabels = () => tabs().map((t) => t.textContent.trim());
const selectedTab = () => {
  const t = tabs().find((el) => el.getAttribute("aria-selected") === "true");
  return t ? t.textContent.trim() : null;
};
const tabNamed = (label) => tabs().find((t) => t.textContent.trim() === label);
const visiblePanels = () => ui.all('[role="tabpanel"]').filter((p) => !p.hidden).map((p) => p.id);
const mountedPanels = () => ui.all('[role="tabpanel"]').map((p) => p.id);
const text = () => ui.text().join(" ");
const called = (prefix) => calls.filter((c) => c.startsWith(prefix));
const buttonNamed = (name) => [...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === name);

/* ============================================================= navigation */

test("/dashboard opens Attendance Today, and loads ONLY the attendance screen's dated view", skip, async () => {
  await open();
  assert.equal(selectedTab(), "Attendance Today");
  assert.deepEqual(visiblePanels(), ["dashboard-panel-attendance"]);
  assert.match(text(), /Attendance & Staffing Dashboard/);
  assert.match(text(), /Total Employees/);
  assert.ok(called("attendance.getOverview").length >= 1);
  assert.deepEqual(called("payroll."), [], "no Payroll request");
  assert.deepEqual(called("staffing."), [], "no Staffing request");
  assert.deepEqual(called("my."), [], "no My Attendance request");
  assert.deepEqual(navigations, [], "a bare /dashboard is left as it is");
});

test("the four tabs, in order, with My Attendance last, as accessible tabs", skip, async () => {
  await open();
  assert.deepEqual(tabLabels(), ["Attendance Today", "Attendance & Staffing", "Payroll", "My Attendance"]);
  assert.ok(ui.one('[role="tablist"]'));
  const active = tabNamed("Attendance Today");
  assert.equal(active.getAttribute("tabindex"), "0");
  assert.equal(tabNamed("Payroll").getAttribute("tabindex"), "-1", "roving tabindex");
  assert.equal(active.getAttribute("aria-controls"), "dashboard-panel-attendance");
  assert.equal(ui.one("#dashboard-panel-attendance").getAttribute("aria-labelledby"), "dashboard-tab-attendance");
});

test("?tab=attendance opens Attendance Today", skip, async () => {
  await open({ query: { tab: "attendance" } });
  assert.equal(selectedTab(), "Attendance Today");
});

test("?tab=staffing opens Attendance & Staffing - the Now view, and nothing dated", skip, async () => {
  await open({ query: { tab: "staffing" } });
  assert.equal(selectedTab(), "Attendance & Staffing");
  assert.match(text(), /Expected Now|Recorded IN/);
  assert.ok(called("staffing.getStaffing").length >= 1);
  assert.deepEqual(called("attendance.getOverview"), []);
  assert.deepEqual(called("payroll."), []);
  assert.deepEqual(called("my."), []);
});

test("?tab=payroll opens Payroll and asks nothing of the attendance screens", skip, async () => {
  await open({ query: { tab: "payroll" } });
  assert.equal(selectedTab(), "Payroll");
  assert.match(text(), /Payroll Dashboard/);
  assert.ok(called("payroll.getMonths").length >= 1);
  assert.deepEqual(called("attendance."), []);
  assert.deepEqual(called("staffing."), []);
  assert.deepEqual(called("my."), []);
  assert.deepEqual(mountedPanels(), ["dashboard-panel-payroll"]);
});

test("?tab=my-attendance opens My Attendance, the employee's own month only", skip, async () => {
  await open({ query: { tab: "my-attendance" } });
  assert.equal(selectedTab(), "My Attendance");
  assert.match(text(), /My Attendance/);
  assert.match(text(), /Correction Requests/);
  assert.deepEqual(called("my."), ["my.getMyAttendance"]);
  assert.deepEqual(called("payroll."), []);
  assert.deepEqual(called("attendance."), []);
});

test("a malformed tab falls back to the first permitted tab and corrects the URL in place", skip, async () => {
  await open({ query: { tab: "wrong-value", keep: "1" } });
  assert.equal(selectedTab(), "Attendance Today");
  assert.deepEqual(navigations, [["replace", "/dashboard?tab=attendance&keep=1"]]);
  assert.deepEqual(mountedPanels(), ["dashboard-panel-attendance"]);
});

test("a tab click pushes ?tab=, the new tab loads, and the old one stays mounted but idle", skip, async () => {
  await open();
  const overviewBefore = called("attendance.getOverview").length;
  ui.click(tabNamed("Payroll"));
  assert.deepEqual(navigations.at(-1), ["push", "/dashboard?tab=payroll"]);
  await rerender();
  assert.equal(selectedTab(), "Payroll");
  assert.deepEqual(visiblePanels(), ["dashboard-panel-payroll"]);
  assert.ok(called("payroll.getMonths").length >= 1, "Payroll loads when opened");
  assert.equal(called("attendance.getOverview").length, overviewBefore, "the hidden attendance screen asks for nothing");
  assert.deepEqual(called("staffing."), []);
});

test("clicking the tab that is already open does nothing", skip, async () => {
  await open();
  ui.click(tabNamed("Attendance Today"));
  assert.deepEqual(navigations, []);
});

test("Back / Forward move between tabs, and returning keeps the screen without refetching", skip, async () => {
  await open({ query: { tab: "attendance" } });
  const overviews = called("attendance.getOverview").length;
  router.query = { tab: "payroll" }; // Forward
  await rerender();
  assert.equal(selectedTab(), "Payroll");
  const months = called("payroll.getMonths").length;
  router.query = { tab: "attendance" }; // Back
  await rerender();
  assert.equal(selectedTab(), "Attendance Today");
  assert.equal(called("attendance.getOverview").length, overviews, "Attendance was kept, not reloaded");
  assert.equal(called("payroll.getMonths").length, months, "the hidden Payroll screen asks for nothing");
  assert.deepEqual(visiblePanels(), ["dashboard-panel-attendance"]);
});

test("a refresh on a tab reopens that tab", skip, async () => {
  await open({ query: { tab: "payroll" } });
  ui.unmount();
  ui = null;
  await open({ query: { tab: "payroll" } });
  assert.equal(selectedTab(), "Payroll");
});

test("the Now / By date switch moves between the two attendance tabs", skip, async () => {
  await open();
  ui.click(buttonNamed("Now"));
  assert.deepEqual(navigations.at(-1), ["push", "/dashboard?tab=staffing"]);
  await rerender();
  assert.equal(selectedTab(), "Attendance & Staffing");
  assert.ok(called("staffing.getStaffing").length >= 1, "the Now view loads its snapshot");
  assert.equal(ui.one("#dashboard-panel-attendance").getAttribute("aria-labelledby"), "dashboard-tab-staffing");
  ui.click(buttonNamed("By date"));
  assert.deepEqual(navigations.at(-1), ["push", "/dashboard?tab=attendance"]);
});

test("a drill-down still opens from a card inside the tab", skip, async () => {
  await open();
  const card = ui.one('[aria-label="Show Total Employees"]');
  assert.ok(card, "the Total Employees card is clickable");
  ui.click(card);
  await settle();
  assert.deepEqual(called("attendance.getDrilldown"), ["attendance.getDrilldown:TOTAL"]);
});

test("the arrow keys move focus along the tab bar without opening anything", skip, async () => {
  await open();
  const first = tabNamed("Attendance Today");
  first.focus();
  act(() => {
    first.dispatchEvent(new window.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  });
  assert.equal(document.activeElement, tabNamed("Attendance & Staffing"));
  act(() => {
    document.activeElement.dispatchEvent(new window.KeyboardEvent("keydown", { key: "End", bubbles: true }));
  });
  assert.equal(document.activeElement, tabNamed("My Attendance"));
  assert.deepEqual(navigations, [], "focus is not activation");
  assert.deepEqual(called("my."), []);
});

/* ============================================================ permissions */

test("without payroll access the Payroll tab is not drawn", skip, async () => {
  await open({ access: { ...ADMIN, payroll: false } });
  assert.deepEqual(tabLabels(), ["Attendance Today", "Attendance & Staffing", "My Attendance"]);
});

test("without the attendance dashboard key neither attendance tab is drawn, and /dashboard opens Payroll", skip, async () => {
  await open({ access: { attendance: false, staffing: false, payroll: true, "my-attendance": true } });
  assert.deepEqual(tabLabels(), ["Payroll", "My Attendance"]);
  assert.equal(selectedTab(), "Payroll");
  assert.deepEqual(called("attendance."), []);
});

test("a forbidden tab in the URL is refused WITHOUT mounting it or asking its server", skip, async () => {
  await open({ query: { tab: "payroll" }, access: { ...ADMIN, payroll: false } });
  assert.equal(selectedTab(), "Attendance Today");
  assert.deepEqual(called("payroll."), [], "Payroll never mounted");
  assert.ok(!mountedPanels().includes("dashboard-panel-payroll"));
  assert.deepEqual(navigations, [["replace", "/dashboard?tab=attendance"]]);
});

test("a plain employee sees only My Attendance", skip, async () => {
  await open({ access: { attendance: false, staffing: false, payroll: false, "my-attendance": true } });
  assert.deepEqual(tabLabels(), ["My Attendance"]);
  assert.deepEqual(called("my."), ["my.getMyAttendance"]);
});

test("My Attendance is hidden when the access rules deny it", skip, async () => {
  await open({ access: { ...ADMIN, "my-attendance": false } });
  assert.deepEqual(tabLabels(), ["Attendance Today", "Attendance & Staffing", "Payroll"]);
});

test("no permitted tab shows the no-access state and mounts nothing", skip, async () => {
  await open({ access: { attendance: false, staffing: false, payroll: false, "my-attendance": false } });
  assert.match(text(), /You do not have access to any Dashboard views/);
  assert.deepEqual(tabs(), []);
  assert.deepEqual(calls, []);
});

test("until the permissions arrive nothing is decided, drawn or requested", skip, async () => {
  await open({ query: { tab: "payroll" }, ready: false });
  assert.deepEqual(tabs(), []);
  assert.deepEqual(calls, []);
  assert.deepEqual(navigations, [], "the URL is not 'corrected' on a guess");
  tabAccess = { ready: true, access: ADMIN };
  await rerender();
  assert.equal(selectedTab(), "Payroll");
});

/* ======================================================= error isolation */

test("a failing Payroll request stays in the Payroll tab; Attendance still opens", skip, async () => {
  await open({ query: { tab: "payroll" } });
  failPayroll = true;
  ui.unmount();
  ui = null;
  tabAccess = { ready: true, access: ADMIN };
  router.query = { tab: "payroll" };
  calls = [];
  ui = mount("components/dashboard/DashboardShell.jsx", {});
  await settle();
  assert.match(text(), /Payroll is down\./);
  ui.click(tabNamed("Attendance Today"));
  await rerender();
  assert.equal(selectedTab(), "Attendance Today");
  assert.match(text(), /Total Employees/);
});

test("a screen that throws is contained to its own panel", skip, async () => {
  const React = require("react");
  const Boom = () => {
    throw new Error("render failure");
  };
  const original = console.error;
  console.error = () => {};
  try {
    const boundary = mount("components/dashboard/DashboardPanelBoundary.jsx", {
      label: "Payroll",
      children: React.createElement(Boom),
    });
    assert.match(boundary.text().join(" "), /The Payroll view could not be displayed/);
    boundary.unmount();
  } finally {
    console.error = original;
  }
});

/* ===================================================== old route redirects */

for (const [file, tab] of [
  ["pages/attendance/dashboard/index.jsx", "staffing"],
  ["pages/payroll/dashboard.jsx", "payroll"],
  ["pages/attendance/my/index.jsx", "my-attendance"],
]) {
  test(`${file} replaces itself with /dashboard?tab=${tab}, query carried across, nothing loaded`, skip, async () => {
    navigations.length = 0;
    calls = [];
    router.query = { from: "bookmark" };
    const page = mount(file, {});
    await settle();
    assert.deepEqual(navigations, [["replace", `/dashboard?tab=${tab}&from=bookmark`]]);
    assert.deepEqual(calls, [], "the old route renders no screen of its own");
    page.unmount();
  });
}
