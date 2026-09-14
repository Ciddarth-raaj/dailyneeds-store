/**
 * The Onboarding / Pending HR queue's rules.
 *
 *   node --test util/hrOnboardingQueue.test.js
 *
 * What is defended here is the behaviour somebody would notice going wrong:
 * a finished employee still in the queue, a Not Applicable scheme counted as
 * work, a failed request presented as "Pending", or a count that disagrees
 * with the list under it.
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  COMPLETE,
  NOT_APPLICABLE,
  PENDING,
  UNKNOWN,
  QUEUE_FILTER_VALUES,
  filterQueue,
  matchesFilter,
  queueCounts,
  queueRow,
  statusBadge,
} = require("./hrOnboardingQueue");

const employee = (over = {}) => ({
  employee_id: 101,
  employee_name: "A Person",
  store_id: 4,
  store_name: "DN1",
  department_id: 2,
  department_name: "Grocery",
  designation_id: 7,
  status: 1,
  ...over,
});

/** A summary entry for somebody HR has finished with. */
const done = (over = {}) => ({
  aadhaar_status: "VERIFIED",
  bank_status: "VERIFIED",
  pf_status: "COMPLETE",
  esi_status: "COMPLETE",
  hr_onboarding_pending: false,
  hr_onboarding_missing: [],
  ...over,
});

/* ------------------------------------------------------------- the row --- */

test("every status is read from the summary, never recomputed", () => {
  const row = queueRow(employee(), done());
  assert.strictEqual(row.aadhaar, COMPLETE);
  assert.strictEqual(row.bank, COMPLETE);
  assert.strictEqual(row.pf, COMPLETE);
  assert.strictEqual(row.esi, COMPLETE);
  assert.strictEqual(row.hr, COMPLETE);
  // The overall answer IS the HR flag, not a second opinion about it.
  assert.strictEqual(row.overall, row.hr);
});

test("the row carries what the screen shows and nothing sensitive", () => {
  const row = queueRow(employee({ employee_image: "https://x/y.jpg" }), done());
  for (const key of ["employee_id", "employee_name", "employee_image", "store_name", "department_name"]) {
    assert.ok(key in row, `the row must carry ${key}`);
  }
  const text = JSON.stringify(row);
  for (const forbidden of ["account_no", "ifsc", "aadhaar_number", "pan_no", "uan", "salary", "pf_applicable"]) {
    assert.ok(!text.includes(forbidden), `the row must not carry ${forbidden}`);
  }
});

test("A MISSING SUMMARY IS UNKNOWN, NEVER PENDING", () => {
  const row = queueRow(employee(), {});
  for (const value of [row.aadhaar, row.bank, row.pf, row.esi, row.hr, row.overall]) {
    assert.strictEqual(value, UNKNOWN);
  }
  // And an unknown row is in no work filter at all - nobody is chased
  // because a request failed.
  for (const filter of QUEUE_FILTER_VALUES.filter((f) => f !== "all")) {
    assert.strictEqual(matchesFilter(row, filter), false, `${filter} must not match an unknown row`);
  }
});

test("a server that does not derive PF/ESI says so rather than 'complete'", () => {
  const row = queueRow(employee(), { aadhaar_status: "PENDING", bank_status: "NOT_PROVIDED" });
  assert.strictEqual(row.pf, UNKNOWN);
  assert.strictEqual(row.esi, UNKNOWN);
  assert.strictEqual(row.aadhaar, PENDING);
  assert.strictEqual(row.bank, PENDING);
});

test("a bank account on file but unverified is not this queue's work", () => {
  // NOT_PROVIDED is outstanding; a stored account that failed its check is a
  // different job, shown by the bank badge, and must not be counted twice.
  assert.strictEqual(queueRow(employee(), done({ bank_status: "NOT_PROVIDED" })).bank, PENDING);
  for (const status of ["VERIFIED", "PENDING_VERIFICATION", "NAME_MISMATCH", "FAILED"]) {
    assert.strictEqual(queueRow(employee(), done({ bank_status: status })).bank, COMPLETE, status);
  }
});

/* ------------------------------------------------ Not Applicable is done - */

test("NOT APPLICABLE IS NOT OUTSTANDING", () => {
  const row = queueRow(employee(), done({ pf_status: "NOT_APPLICABLE", esi_status: "NOT_APPLICABLE" }));
  assert.strictEqual(row.pf, NOT_APPLICABLE);
  assert.strictEqual(row.esi, NOT_APPLICABLE);
  assert.strictEqual(matchesFilter(row, "pf"), false);
  assert.strictEqual(matchesFilter(row, "esi"), false);
  assert.strictEqual(matchesFilter(row, "all_pending"), false, "and they do not hold up the queue");
  assert.strictEqual(statusBadge(row.pf).label, "Not applicable");
});

/* ------------------------------------------------- the queue empties itself */

test("A FINISHED EMPLOYEE LEAVES THE QUEUE", () => {
  const rows = [queueRow(employee(), done())];
  assert.deepStrictEqual(filterQueue(rows, { filter: "all_pending" }), []);
  // And while something is outstanding, they are in it.
  const outstanding = [queueRow(employee(), done({ hr_onboarding_pending: true, hr_onboarding_missing: ["bank"], bank_status: "NOT_PROVIDED" }))];
  assert.strictEqual(filterQueue(outstanding, { filter: "all_pending" }).length, 1);
});

test("Aadhaar does not decide whether somebody is done - and is still chaseable", () => {
  // The existing backend flag deliberately excludes Aadhaar; this screen does
  // not add it. But it has its own filter, so the work is not lost.
  const row = queueRow(employee(), done({ aadhaar_status: "PENDING" }));
  assert.strictEqual(matchesFilter(row, "all_pending"), false);
  assert.strictEqual(matchesFilter(row, "aadhaar"), true);
});

/* -------------------------------------------------------------- filtering */

test("resigned employees are never in the queue", () => {
  const rows = [queueRow(employee({ status: 0 }), done({ hr_onboarding_pending: true }))];
  assert.deepStrictEqual(filterQueue(rows, { filter: "all_pending" }), []);
  assert.deepStrictEqual(filterQueue(rows, { filter: "all" }), []);
});

test("outlet, department and search narrow the queue", () => {
  const rows = [
    queueRow(employee({ employee_id: 1, employee_name: "Alpha", store_id: 4, department_id: 2 }), done({ hr_onboarding_pending: true })),
    queueRow(employee({ employee_id: 2, employee_name: "Beta", store_id: 5, department_id: 3 }), done({ hr_onboarding_pending: true })),
  ];
  assert.deepStrictEqual(filterQueue(rows, { outlet: 4 }).map((r) => r.employee_id), [1]);
  assert.deepStrictEqual(filterQueue(rows, { department: 3 }).map((r) => r.employee_id), [2]);
  assert.deepStrictEqual(filterQueue(rows, { search: "beta" }).map((r) => r.employee_id), [2]);
  assert.deepStrictEqual(filterQueue(rows, { search: "1" }).map((r) => r.employee_id), [1]);
});

/* ----------------------------------------------------------------- counts */

test("THE COUNTS ARE DERIVED, AND AGREE WITH THE LIST", () => {
  const rows = [
    queueRow(employee({ employee_id: 1 }), done()),
    queueRow(employee({ employee_id: 2 }), done({ aadhaar_status: "PENDING" })),
    queueRow(employee({ employee_id: 3 }), done({ bank_status: "NOT_PROVIDED", hr_onboarding_pending: true, hr_onboarding_missing: ["bank"] })),
    queueRow(employee({ employee_id: 4 }), done({ pf_status: "PENDING", hr_onboarding_pending: true, hr_onboarding_missing: ["statutory"] })),
    queueRow(employee({ employee_id: 5 }), done({ esi_status: "PENDING", hr_onboarding_pending: true, hr_onboarding_missing: ["statutory"] })),
    queueRow(employee({ employee_id: 6, status: 0 }), done({ hr_onboarding_pending: true })),
  ];
  const counts = queueCounts(rows);
  assert.strictEqual(counts.active, 5, "the resigned row is not an active employee");
  assert.strictEqual(counts.aadhaar, 1);
  assert.strictEqual(counts.bank, 1);
  assert.strictEqual(counts.pf, 1);
  assert.strictEqual(counts.esi, 1);
  assert.strictEqual(counts.hr, 3);
  assert.strictEqual(counts.pending, 3);
  // Every count is exactly the length of the list its filter produces.
  for (const [key, filter] of [["pending", "all_pending"], ["aadhaar", "aadhaar"], ["bank", "bank"], ["pf", "pf"], ["esi", "esi"], ["hr", "hr"]]) {
    assert.strictEqual(counts[key], filterQueue(rows, { filter }).length, `${key} must match its own filter`);
  }
});

test("the counts follow outlet and department, but not the work filter", () => {
  const rows = [
    queueRow(employee({ employee_id: 1, store_id: 4 }), done({ hr_onboarding_pending: true })),
    queueRow(employee({ employee_id: 2, store_id: 5 }), done({ hr_onboarding_pending: true })),
  ];
  assert.strictEqual(queueCounts(rows).pending, 2);
  assert.strictEqual(queueCounts(rows, { outlet: 4 }).pending, 1);
  assert.strictEqual(queueCounts(rows, { outlet: 4 }).active, 1);
});

test("no count is ever a hardcoded example", () => {
  assert.deepStrictEqual(queueCounts([]), {
    active: 0, pending: 0, aadhaar: 0, bank: 0, pf: 0, esi: 0, hr: 0,
  });
});

/* ----------------------------------------------------------------- badges */

test("a badge never says Pending for something unknown", () => {
  assert.strictEqual(statusBadge(UNKNOWN).label, "—");
  assert.strictEqual(statusBadge(UNKNOWN).unknown, true);
  assert.strictEqual(statusBadge(PENDING).label, "Pending");
  assert.strictEqual(statusBadge(COMPLETE).label, "Complete");
  assert.strictEqual(statusBadge(COMPLETE, { completeLabel: "Verified" }).label, "Verified");
});
