/**
 * ONBOARDING / PENDING HR — ACCESS IS RIGHTS BASED, DATA IS BRANCH BASED.
 *
 *   node --test util/hrOnboardingAccess.test.js
 *
 * The regression this file exists for: the screen used to be refused to
 * anybody who was not HR or an administrator, on the reasoning that it was a
 * company-wide work queue. That answered a SCOPE question with an ACCESS
 * rule. A store manager granted the dashboard right must get the screen,
 * narrowed by the employee branch scope to their own store - and must never
 * be told, through the outlet dropdown or a count, about a store they are not
 * authorised for.
 *
 * Two halves, tested as two:
 *
 *   ACCESS   `util/hrProfile.js#canViewOnboardingQueue` - one right, or the
 *            administrator bypass. No designation, no user type, no HR check.
 *   DATA     `util/hrOnboardingQueue.js` - what the screen may draw over rows
 *            the SERVER already narrowed. The branch scope itself lives on
 *            the backend and is tested there; this is the browser half, which
 *            must not widen what it was given.
 */
const { test } = require("node:test");
const assert = require("node:assert/strict");

const { canViewOnboardingQueue, canViewSensitive } = require("./hrProfile");
const {
  queueCounts,
  queueOutlets,
  filterQueue,
  queueCards,
  queueRow,
} = require("./hrOnboardingQueue");

const DASHBOARD = "view_hr_onboarding_dashboard";
const SCOPE_ALL = "employee_scope_all_branches";
const SENSITIVE = "view_employee_sensitive";

/** Permission rows arrive from the session in the shape the API sends. */
const perms = (...keys) => keys.map((permission_key) => ({ permission_key }));

/**
 * A branch-scoped user is served ONLY their own store's employees, because
 * that is what `GET /employee/employees` returns them. These fixtures stand
 * for what each caller's response actually contains - the backend narrowing
 * is not re-implemented here, it is asserted there.
 */
const employee = (id, store_id, store_name, over = {}) => ({
  employee_id: id,
  employee_name: `Employee ${id}`,
  store_id,
  store_name,
  department_id: 3,
  status: 1,
  ...over,
});

const KATHIRKAMAM = [employee(1, 2, "Kathirkamam"), employee(2, 2, "Kathirkamam")];
const MOOLAKULAM = [employee(3, 5, "Moolakulam")];
const COMPANY = [...KATHIRKAMAM, ...MOOLAKULAM];

/* ============================== ACCESS: THE RIGHT, NOT THE DESIGNATION == */

test("A STORE MANAGER WITH THE DASHBOARD RIGHT IS ALLOWED IN", () => {
  // The exact case the old rule refused: not HR, not an administrator, no
  // company-wide employee scope - just the right, granted on the rights
  // screen like every other right in this application.
  const storeManager = { permissions: perms(DASHBOARD, "view_employees"), isAdmin: false };
  assert.equal(canViewOnboardingQueue(storeManager), true);
});

test("A STORE MANAGER WITHOUT THE DASHBOARD RIGHT IS DENIED", () => {
  // Holding the employee list's own rights is not permission to open HR's
  // work queue, and neither is being a store manager.
  const manager = {
    permissions: perms("view_employees", "employee_edit", "employee_create"),
    isAdmin: false,
  };
  assert.equal(canViewOnboardingQueue(manager), false);
});

test("THE SCOPE KEY IS NOT THE ACCESS KEY, IN EITHER DIRECTION", () => {
  // Company-wide employee reach does not hand somebody the work queue...
  assert.equal(
    canViewOnboardingQueue({ permissions: perms(SCOPE_ALL, "view_employees") }),
    false
  );
  // ...and the work queue does not hand somebody company-wide reach. The
  // screen opens; the branch scope still decides what is in it.
  assert.equal(canViewOnboardingQueue({ permissions: perms(DASHBOARD) }), true);
});

test("AN ADMINISTRATOR IS ALLOWED IN THROUGH THE user_type BYPASS", () => {
  assert.equal(canViewOnboardingQueue({ permissions: [], isAdmin: true }), true);
});

/* ============================== DATA: THE BRANCH SCOPE ================== */

test("A BRANCH-SCOPED USER'S QUEUE, COUNTS AND OUTLETS ARE THEIR STORE ONLY", () => {
  // What the server returned this caller - one store's employees.
  const queue = KATHIRKAMAM.map((e) => queueRow(e, {}));

  assert.deepEqual(
    filterQueue(queue, { filter: "all" }).map((r) => r.employee_id),
    [1, 2]
  );
  // The count card totals that same population and nothing else. A count is
  // a disclosure too: "3 active employees" would have named the size of a
  // store this caller may not see.
  assert.equal(queueCounts(queue).active, 2);

  // AND THE DROPDOWN NAMES ONLY THEIR OWN OUTLET, even though the outlet
  // directory knows every branch in the company. Offering "Moolakulam" to a
  // Kathirkamam manager discloses the store's existence and its name.
  const directory = [
    { outlet_id: 2, outlet_name: "Kathirkamam" },
    { outlet_id: 5, outlet_name: "Moolakulam" },
    { outlet_id: 9, outlet_name: "Villianur" },
  ];
  assert.deepEqual(queueOutlets(queue, directory), [
    { outlet_id: 2, outlet_name: "Kathirkamam" },
  ]);
});

test("A STATUS SUMMARY THAT NAMES ANOTHER STORE'S EMPLOYEE CANNOT ADD THEM", () => {
  // THE REGRESSION IN ITS MOST DIRECT FORM. The second request this screen
  // makes is the status summary, and it is branch-scoped on the server
  // exactly as the list is. This asserts the browser half: even handed a
  // summary row for employee 3 - Moolakulam, outside this caller's scope -
  // the screen cannot produce a row, a count or an outlet for them, because
  // the summary only ever ANNOTATES the employees the list returned.
  const summaries = {
    "1": { hr_onboarding_pending: 1 },
    "3": { hr_onboarding_pending: 1 },
  };
  const queue = KATHIRKAMAM.map((e) => queueRow(e, summaries[String(e.employee_id)] || {}));

  const ids = queue.map((r) => r.employee_id);
  assert.ok(!ids.includes(3), "an out-of-scope summary row is not an employee");
  assert.equal(queueCounts(queue).active, 2);
  assert.deepEqual(queueOutlets(queue, [{ outlet_id: 5, outlet_name: "Moolakulam" }]), [
    { outlet_id: 2, outlet_name: "Kathirkamam" },
  ]);
});

test("AN ALL-BRANCH USER WITH THE DASHBOARD RIGHT SEES EVERY AUTHORISED BRANCH", () => {
  const hr = { permissions: perms(DASHBOARD, "view_employees", SCOPE_ALL), isAdmin: false };
  assert.equal(canViewOnboardingQueue(hr), true);

  // Their list response carries every branch, so their screen does too.
  const queue = COMPANY.map((e) => queueRow(e, {}));
  assert.equal(queueCounts(queue).active, 3);
  assert.deepEqual(
    queueOutlets(queue, [
      { outlet_id: 2, outlet_name: "Kathirkamam" },
      { outlet_id: 5, outlet_name: "Moolakulam" },
    ]).map((o) => o.outlet_name),
    ["Kathirkamam", "Moolakulam"]
  );
});

test("AN ADMINISTRATOR SEES EVERY BRANCH", () => {
  assert.equal(canViewOnboardingQueue({ permissions: [], isAdmin: true }), true);
  const queue = COMPANY.map((e) => queueRow(e, {}));
  assert.equal(queueCounts(queue).active, 3);
  assert.equal(queueOutlets(queue, []).length, 2);
});

test("THE OUTLET FILTER NARROWS WITHIN SCOPE AND CANNOT REACH OUTSIDE IT", () => {
  const queue = KATHIRKAMAM.map((e) => queueRow(e, {}));
  // Selecting an outlet that is not in scope - which the dropdown never
  // offers - is an empty result, never a widened one.
  assert.equal(filterQueue(queue, { filter: "all", outlet: 5 }).length, 0);
  assert.equal(queueCounts(queue, { outlet: 5 }).active, 0);
  assert.equal(filterQueue(queue, { filter: "all", outlet: 2 }).length, 2);
});

test("AN OUTLET IN THE ROWS BUT MISSING FROM THE DIRECTORY IS STILL OFFERED", () => {
  // Losing a filter for employees that ARE on screen is the opposite
  // mistake, so the row's own name is used, then the id.
  const queue = [employee(7, 4, "Reddiarpalayam"), employee(8, 6, null)].map((e) =>
    queueRow(e, {})
  );
  assert.deepEqual(queueOutlets(queue, []), [
    { outlet_id: 6, outlet_name: "Outlet 6" },
    { outlet_id: 4, outlet_name: "Reddiarpalayam" },
  ]);
});

test("RESIGNED EMPLOYEES CONTRIBUTE NO OUTLET AND NO COUNT", () => {
  const queue = [employee(9, 8, "Lawspet", { status: 0 })].map((e) => queueRow(e, {}));
  assert.deepEqual(queueOutlets(queue, [{ outlet_id: 8, outlet_name: "Lawspet" }]), []);
  assert.equal(queueCounts(queue).active, 0);
});

/* ============================== SENSITIVE STAYS INDEPENDENT ============= */

test("SENSITIVE PAYMENT DATA IS A SEPARATE RIGHT FROM OPENING THE SCREEN", () => {
  // Opening the queue and being told how somebody is paid are two questions.
  const dashboardOnly = { permissions: perms(DASHBOARD, "view_employees"), isAdmin: false };
  assert.equal(canViewOnboardingQueue(dashboardOnly), true);
  assert.equal(canViewSensitive(dashboardOnly), false);

  // So the Cash -> Bank card is ABSENT for them rather than reading zero - a
  // zero would state, as a fact, that nobody is on cash.
  const withoutSensitive = queueCards({ canSeePaymentRoute: false }).map((c) => c.filter);
  const withSensitive = queueCards({ canSeePaymentRoute: true }).map((c) => c.filter);
  assert.ok(!withoutSensitive.includes("cash_to_bank"));
  assert.ok(withSensitive.includes("cash_to_bank"));

  // And the sensitive right on its own still does not open the screen.
  assert.equal(canViewOnboardingQueue({ permissions: perms(SENSITIVE, "view_employees") }), false);
});
