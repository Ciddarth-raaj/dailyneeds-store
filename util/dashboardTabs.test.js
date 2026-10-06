/**
 * The Dashboard's tab rules - order, access, and which tab a URL opens.
 *
 *   node --test util/dashboardTabs.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  DASHBOARD_TABS,
  LEGACY_DASHBOARD_ROUTES,
  dashboardHref,
  permittedTabs,
  resolveDashboardTab,
  tabForAttendanceView,
} = require("./dashboardTabs");

const ALL = { attendance: true, staffing: true, payroll: true, "my-attendance": true };
const keys = (tabs) => tabs.map((t) => t.key);

test("four tabs, in the approved order, with My Attendance last", () => {
  assert.deepEqual(
    DASHBOARD_TABS.map((t) => t.label),
    ["Attendance Today", "Attendance & Staffing", "Payroll", "My Attendance"]
  );
  assert.deepEqual(keys(DASHBOARD_TABS), ["attendance", "staffing", "payroll", "my-attendance"]);
  assert.equal(DASHBOARD_TABS[DASHBOARD_TABS.length - 1].key, "my-attendance");
});

test("Attendance Today and Attendance & Staffing are the By date and Now views of ONE screen", () => {
  const [today, staffing] = DASHBOARD_TABS;
  assert.equal(today.panel, staffing.panel);
  assert.equal(today.view, "HISTORY");
  assert.equal(staffing.view, "NOW");
  assert.equal(tabForAttendanceView("HISTORY"), "attendance");
  assert.equal(tabForAttendanceView("NOW"), "staffing");
});

test("no tab in the URL opens Attendance Today for an authorized admin", () => {
  assert.equal(resolveDashboardTab(undefined, ALL).tab.key, "attendance");
  assert.equal(resolveDashboardTab("", ALL).tab.key, "attendance");
  assert.equal(resolveDashboardTab(undefined, ALL).fellBack, false);
});

test("each tab value opens its tab", () => {
  for (const key of ["attendance", "staffing", "payroll", "my-attendance"]) {
    const r = resolveDashboardTab(key, ALL);
    assert.equal(r.tab.key, key);
    assert.equal(r.fellBack, false);
  }
});

test("a malformed tab falls back to the first permitted tab and says so", () => {
  for (const bad of ["wrong-value", "PAYROLL", "my_attendance", ["payroll", "staffing"], 7, {}]) {
    const r = resolveDashboardTab(bad, ALL);
    assert.equal(r.tab.key, "attendance", `for ${JSON.stringify(bad)}`);
    assert.equal(r.fellBack, true);
  }
});

test("a forbidden tab is refused and the first PERMITTED tab opens instead", () => {
  const noPayroll = { ...ALL, payroll: false };
  const r = resolveDashboardTab("payroll", noPayroll);
  assert.equal(r.tab.key, "attendance");
  assert.equal(r.fellBack, true);
});

test("without attendance access, /dashboard opens Payroll - the first tab this caller has", () => {
  const access = { attendance: false, staffing: false, payroll: true, "my-attendance": true };
  assert.deepEqual(keys(permittedTabs(access)), ["payroll", "my-attendance"]);
  assert.equal(resolveDashboardTab(undefined, access).tab.key, "payroll");
  assert.equal(resolveDashboardTab("staffing", access).tab.key, "payroll");
});

test("a plain employee has only My Attendance", () => {
  const access = { attendance: false, staffing: false, payroll: false, "my-attendance": true };
  assert.deepEqual(keys(permittedTabs(access)), ["my-attendance"]);
  assert.equal(resolveDashboardTab(undefined, access).tab.key, "my-attendance");
});

test("no permitted tab at all resolves to nothing - the no-access state", () => {
  const none = { attendance: false, staffing: false, payroll: false, "my-attendance": false };
  assert.deepEqual(permittedTabs(none), []);
  assert.equal(resolveDashboardTab(undefined, none).tab, null);
  assert.equal(resolveDashboardTab("payroll", none).tab, null);
  assert.deepEqual(permittedTabs(undefined), []);
});

test("dashboardHref sets the tab and carries the rest of the query across", () => {
  assert.equal(dashboardHref("payroll", {}), "/dashboard?tab=payroll");
  assert.equal(dashboardHref("payroll", { tab: "wrong" }), "/dashboard?tab=payroll");
  assert.equal(dashboardHref("staffing", { a: "1", b: ["x", "y"] }), "/dashboard?tab=staffing&a=1&b=x&b=y");
  assert.equal(dashboardHref("my-attendance", undefined), "/dashboard?tab=my-attendance");
});

test("every old dashboard route maps to its tab, and next.config.js redirects each one (temporarily)", () => {
  assert.deepEqual(LEGACY_DASHBOARD_ROUTES, {
    "/attendance/dashboard": "staffing",
    "/payroll/dashboard": "payroll",
    "/attendance/my": "my-attendance",
  });
  const config = require(path.join(__dirname, "..", "next.config.js"));
  return config.redirects().then((rules) => {
    for (const [source, tab] of Object.entries(LEGACY_DASHBOARD_ROUTES)) {
      const rule = rules.find((r) => r.source === source);
      assert.ok(rule, `${source} must redirect`);
      assert.equal(rule.destination, `/dashboard?tab=${tab}`);
      assert.equal(rule.permanent, false, "307 while the consolidation beds in, never a cached 308");
    }
  });
});

test("the old page files still exist, as redirects to their tab", () => {
  const files = {
    "pages/attendance/dashboard/index.jsx": "staffing",
    "pages/payroll/dashboard.jsx": "payroll",
    "pages/attendance/my/index.jsx": "my-attendance",
  };
  for (const [file, tab] of Object.entries(files)) {
    const src = fs.readFileSync(path.join(__dirname, "..", file), "utf8");
    assert.match(src, new RegExp(`<LegacyDashboardRedirect tab="${tab}" />`), file);
  }
});
