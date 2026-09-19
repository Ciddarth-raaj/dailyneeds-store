/**
 * The outlet pickers get their list from the directory endpoint.
 *
 *   node --test customHooks/useOutlets.test.js
 *
 * The regression: B2 gated `GET /outlet` on `view_stores`, which is right -
 * that route returns the whole outlet record, IP policy included. But every
 * outlet dropdown was reading it, so Accounts Executive (designation 15, which
 * holds `view_purchases` but not `view_stores`) got an empty selector on
 * /purchase and could not scope purchases to any branch.
 *
 * The fix is a narrower endpoint, and what these tests protect is that the
 * pickers actually use it: a change that quietly reinstated the default
 * `useOutlets()` would restore the bug without failing anything else. They
 * also pin that the default is UNCHANGED, so the many other consumers keep the
 * full record and the permission that guards it.
 *
 * There is no React test runner in this repo, so the components and the hook
 * are checked as source, and the plain logic - the refusal handling - is run.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const hook = read("customHooks/useOutlets.js");
const helper = read("helper/outlets.js");
const fromTo = read("components/DateOutletPicker/FromToDateOutletPicker.jsx");
const picker = read("components/DateOutletPicker/index.jsx");
const purchasePage = read("pages/purchase/index.jsx");
const unwrapList = require("../util/apiList");

test("the helper calls the directory endpoint, and it is the two-column one", () => {
  assert.match(helper, /getOutletDirectory/);
  assert.match(helper, /API\.get\("\/outlet\/directory"\)/);
});

test("both outlet pickers ask for the directory", () => {
  for (const [name, src] of [
    ["FromToDateOutletPicker", fromTo],
    ["DateOutletPicker", picker],
  ]) {
    assert.match(src, /useOutlets\(\{ directory: true \}\)/, `${name} must use the directory`);
    assert.ok(
      !/useOutlets\(\)/.test(src),
      `${name} must not call the default useOutlets() - that is the view_stores route`
    );
  }
});

test("the purchase page renders the picker that was fixed", () => {
  // If the page ever stops using this picker, these tests would keep passing
  // while /purchase broke again.
  assert.match(purchasePage, /FromToDateOutletPicker/);
});

test("the pickers only ever needed an id and a name", () => {
  // Which is why returning less is a fix and not a compromise.
  for (const src of [fromTo, picker]) {
    const list = src.slice(src.indexOf("OUTLETS_LIST"), src.indexOf("return ("));
    const fields = [...list.matchAll(/item\.(\w+)/g)].map((m) => m[1]);
    assert.deepEqual([...new Set(fields)].sort(), ["outlet_id", "outlet_name"]);
  }
});

test("the default is unchanged, so other consumers keep the full record", () => {
  assert.match(hook, /directory = false/, "directory must be opt-in");
  // The full-record call is still there for callers that need it.
  assert.match(hook, /BranchHelper\.getOutlet\(\)/);
  assert.match(hook, /BranchHelper\.getOutletDirectory\(\)/);
});

test("no other consumer was switched to the directory", () => {
  // The opt-in list is explicit, so nothing can start using the directory - or
  // stop using it - without this test saying so. Everything not listed still
  // gets the full, permission-gated record.
  //
  //   the two pickers          the /purchase outlet hotfix
  //   the HR screens           C3: the outlet filter and the Outlet dropdown
  //                            on the employee list, the employee profile and
  //                            the Onboarding / Pending HR queue - all of
  //                            which need only an id and a name, and must
  //                            work for HR without `view_stores`
  const roots = ["pages", "components", "customHooks"];
  const optedIn = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(__dirname, "..", dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (
        /\.(js|jsx)$/.test(entry.name) &&
        !entry.name.endsWith(".test.js") &&
        // The hook itself documents the option; it is not a consumer of it.
        rel.replace(/\\/g, "/") !== "customHooks/useOutlets.js"
      ) {
        if (/useOutlets\(\{[^)]*directory: true/.test(read(rel))) {
          optedIn.push(rel.replace(/\\/g, "/"));
        }
      }
    }
  };
  roots.forEach(walk);
  assert.deepEqual(optedIn.sort(), [
    "components/DateOutletPicker/FromToDateOutletPicker.jsx",
    "components/DateOutletPicker/index.jsx",
    // Attendance: the Outlet filter on the searchable employee picker for
    // Employee Attendance - an id and a name, on a screen reached on
    // `view_calculated_attendance` and never on `view_stores`.
    "components/attendance/SearchableEmployeePicker.jsx",
    // Phase 3A: the Outlet selector in Add Mapping. An id and a name, on a
    // screen reached on `manage_telegram_groups` - somebody registering
    // Telegram groups has no reason to hold `view_stores`, and without the
    // directory the dropdown would be empty for them and the mapping type
    // simply unusable.
    // Stock Checker: all four callers. Listed in sorted position rather than
    // grouped together, because the assertion compares a sorted array.
    //
    // The branch-wise table, the listing's branch count, the assigned-products
    // rows and the item drawer's dropdown each use an outlet id and name and
    // nothing else. `view_stores` means administering branches and was never a
    // prerequisite for CHECKING STOCK in one, so a user holding
    // `view_stock_checker` without it saw an empty list rather than a refusal.
    "components/stock-checker/StockCheckerItemDrawer.jsx",
    // Reports: the outlet filter, which needs only an id and a name and must
    // work for HR without `view_stores`. It moved out of the page and into
    // the shared catalogue hook when the Reports screens were split up.
    "customHooks/useReportCatalogue.js",
    "pages/attendance/approver-setup/index.jsx",
    "pages/attendance/devices/[id].jsx",
    "pages/attendance/devices/new.jsx",
    "pages/attendance/list/index.jsx",
    // Missing Attendance Report: the Outlet filter - an id and a name, for a
    // screen reached on `view_missing_attendance_report` and not on
    // `view_stores`. Same shape as the attendance screens above it, and
    // scoped by the ATTENDANCE scope (`utils/dashboard_scope.js`) rather than
    // by the employee branch scope: the report's rows are narrowed on the
    // server and this picker can only narrow further.
    //
    // It was missing from this list rather than from the page, so the guard
    // had been red since the report shipped. Added as test maintenance - the
    // page is deliberately unchanged.
    "pages/attendance/missing-attendance/index.jsx",
    // Recalculate Attendance: the Store filter - an id and a name, for a
    // screen reached on `recalculate_attendance` and not on `view_stores`.
    "pages/attendance/recalculate/index.jsx",
    // NO `pages/hr/*` ENTRY REMAINS, AND THAT IS THE POINT.
    // The Onboarding / Pending HR queue is branch-scoped - a store manager
    // holding `view_hr_onboarding_dashboard` sees their own branch - and this
    // directory is company-wide, so reading it sent that manager the id and
    // name of every outlet in the company and the screen hid the surplus in
    // React. A filter is not an authorization boundary: the names had
    // already crossed the wire. It now reads `GET /hr/employees/outlets`,
    // which applies the server's `employee_branch_scope`, through
    // `customHooks/useEmployeeOutlets.js`.
    //
    // EMPLOYEE MASTER WENT THE SAME WAY, for the same reason and with more at
    // stake than a filter: the Outlet field on New Employee IS the branch the
    // employee is created into, and on the profile it is a BRANCH TRANSFER.
    // Offering a branch-scoped user an outlet the server would refuse is a
    // form that fails on submit, and sending them the name proves the branch
    // exists. All three now read `GET /hr/employees/outlets`.
    //
    // THE SERVER REMAINS THE BOUNDARY EITHER WAY: `checkTargetBranch` refuses
    // a create or an edit naming a branch outside the caller's scope, so the
    // dropdown is UX and the refusal does not depend on it.
    //
    // WHAT MAY STILL USE THE COMPANY-WIDE DIRECTORY, and why it is not this
    // problem: every entry above is a PICKER on a screen scoped by something
    // OTHER than `employee_branch_scope` - purchases, attendance
    // (`dashboard_scope`), stock, telegram, the report catalogue, and the
    // company-wide salary approval queue - where naming every branch is the
    // documented intent of the endpoint behind it.
    //
    // THE RULE THIS LIST NOW ENFORCES: no screen whose data is narrowed by
    // `employee_branch_scope` may read the company-wide directory. Employee
    // Master, New Employee, the employee profile, Shift Assignment, the
    // Onboarding queue, Payrun Initialization and the payroll employee picker
    // were all such screens and all now read `GET /hr/employees/outlets`.
    // If a new screen is added here, check which scope its ROWS come from
    // before adding it.
    // Telegram Group Registry: the OPTIONAL Outlet on the add/edit form - an
    // id and a name, on a screen reached on `manage_telegram_groups` and
    // never on `view_stores`. The registry stores the outlet_id only and
    // joins the name back on read, so it needs no more of the record.
    "pages/master/telegram-groups/[mode].jsx",
    // Telegram Group Registry list: the Outlet FILTER - an id and a name,
    // behind `view_telegram_groups` and never `view_stores`.
    "pages/master/telegram-groups/index.jsx",
    // SALARY APPROVAL IS THE ONE PAYROLL SCREEN THAT STAYS, and it stays on
    // the evidence rather than for convenience. Its queue is
    // `GET /hr/salary/pending`, which is INTENTIONALLY COMPANY-WIDE: the
    // route documents itself as "the pending approval queue, ACROSS ALL
    // EMPLOYEES", takes no branch scope at all, and is gated instead on three
    // keys together - `view_employees` + `view_salary` +
    // `approve_salary_revision`. Its actor is used only to flag a proposal
    // the approver raised themselves.
    //
    // So its rows genuinely span every outlet, and narrowing the dropdown to
    // the caller's own branch would build a filter that cannot select most of
    // what is on screen. That would be a bug, not a fix. A picker must match
    // the scope of the data beside it, and here that scope is the company.
    //
    // (The wider question of whether a company-wide salary queue is the right
    // design is a payroll decision and is untouched here - this change does
    // not alter salary logic, approval rules or who may approve.)
    "pages/payroll/salary-approval.jsx",
    "pages/stock-checker/[mode].jsx",
    "pages/stock-checker/assigned-products.jsx",
    "pages/stock-checker/index.jsx",
  ]);
});

test("a permission refusal is still surfaced, not shown as an empty list", () => {
  // The directory needs no permission, so this should not happen any more -
  // but the hook must keep telling the difference if it ever does.
  const denied = unwrapList({
    code: 403,
    msg: "You do not have permission to perform this action",
  });
  assert.deepEqual(denied.items, []);
  assert.strictEqual(denied.accessDenied, true);
  assert.strictEqual(denied.error, false);

  const ok = unwrapList([{ outlet_id: 1, outlet_name: "One" }]);
  assert.strictEqual(ok.accessDenied, false);
  assert.strictEqual(ok.items.length, 1);
});

test("the hook re-fetches if the mode changes, rather than serving a stale list", () => {
  assert.match(hook, /\}, \[directory\]\);/);
});
