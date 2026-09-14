/**
 * THE EMPLOYEE PROFILE MUST NOT INVENT FACTS FROM A FAILED READ.
 *
 *   node --test util/employeeMasterStatus.test.js
 *
 * Two production defects, both found while testing branch-scoped Store
 * Manager access, both the same shape: a read the caller was not allowed to
 * make was rendered as a statement about the employee.
 *
 *   1. Employment Details said RESIGNED for somebody the list said was
 *      ACTIVE. The card read `lifecycle.status ?? employee.status`; the
 *      lifecycle read is gated on `view_employee_lifecycle`, which a store
 *      manager does not hold, so it fell through to `employee.status` - which
 *      the backend was returning from the joined `shift_master` table because
 *      of a `SELECT *` collision, defaulting to 0.
 *
 *   2. The Aadhaar card said "No Aadhaar on record" whenever its read failed,
 *      because every failure had been flattened to `null` and `null` was
 *      read as PENDING.
 *
 * These are pure-rule tests. The backend half of (1) is pinned by
 * `repository/employee_detail_columns.test.js` in the API repository.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { currentEmploymentStatus, employmentBadge, aadhaarSectionView } = require("./hrStatus");
const { SECTION_STATE, classifyBody, classifyError, loadSection, dataOf } = require("./sectionLoad");

/* ===================================================================== */
/*  CURRENT EMPLOYMENT STATUS                                            */
/* ===================================================================== */

const ACTIVE = { status: 1 };
const INACTIVE = { status: 0 };

test("1 & 2. an ACTIVE employee master reads ACTIVE, list and profile alike", () => {
  // The list renders `employee.status` straight from GET /employee/employees;
  // the profile now resolves to the same field on the same record.
  assert.equal(currentEmploymentStatus(ACTIVE, {}), 1);
  assert.equal(employmentBadge(1).label, "Active");
  assert.equal(employmentBadge(currentEmploymentStatus(ACTIVE, {})).label, "Active");
});

test("3. WITHOUT view_employee_lifecycle, Employment Details still says ACTIVE", () => {
  // Exactly the store-manager case: the lifecycle read was refused, so the
  // page holds `null` for it, and the employee record is all there is.
  for (const noLifecycle of [null, undefined, {}]) {
    assert.equal(
      currentEmploymentStatus(ACTIVE, noLifecycle),
      1,
      "a refused history read must not change who currently works here"
    );
  }
});

test("4. A DENIED LIFECYCLE NEVER PRODUCES 'RESIGNED'", () => {
  const denied = classifyBody({ code: 403, msg: "You do not have permission to perform this action" });
  assert.equal(denied.state, SECTION_STATE.DENIED);

  const status = currentEmploymentStatus(ACTIVE, dataOf(denied));
  assert.equal(status, 1);
  assert.notEqual(employmentBadge(status).label, "Resigned");
});

test("4. and the OLD rule is what would have got it wrong - kept as the counter-example", () => {
  const lifecycle = {}; // refused
  const employee = { status: 0 }; // what the corrupted join used to return
  // The old expression, for the record:
  const old = lifecycle.status ?? employee.status;
  assert.equal(employmentBadge(old).label, "Resigned", "this is the bug that was reported");
  // The new rule reads the same employee master - and when THAT is correct,
  // which the backend fix guarantees, the answer is correct.
  assert.equal(employmentBadge(currentEmploymentStatus(ACTIVE, lifecycle)).label, "Active");
});

test("6. AN INACTIVE EMPLOYEE MASTER STILL READS RESIGNED", () => {
  // The fix must not paper over a genuine resignation.
  assert.equal(currentEmploymentStatus(INACTIVE, {}), 0);
  assert.equal(employmentBadge(currentEmploymentStatus(INACTIVE, {})).label, "Resigned");
  assert.equal(
    employmentBadge(currentEmploymentStatus(INACTIVE, { status: 1 })).label,
    "Resigned",
    "the employee master wins over a stale lifecycle too"
  );
});

test("lifecycle is used ONLY when the employee record itself was unreadable", () => {
  assert.equal(currentEmploymentStatus(null, { status: 1 }), 1);
  assert.equal(currentEmploymentStatus({}, { status: 0 }), 0);
  // and the master wins whenever it is present
  assert.equal(currentEmploymentStatus({ status: 1 }, { status: 0 }), 1);
});

test("NEITHER READ IS 'UNKNOWN', NEVER 'RESIGNED'", () => {
  assert.equal(currentEmploymentStatus(null, null), null);
  assert.equal(currentEmploymentStatus({}, {}), null);
  const badge = employmentBadge(null);
  assert.equal(badge.label, "Status unavailable");
  assert.notEqual(badge.label, "Resigned", "an unknown status must never assert somebody has left");
});

test("a status of 0 is distinguishable from a status that is absent", () => {
  assert.equal(currentEmploymentStatus({ status: 0 }, {}), 0, "0 is a real answer");
  assert.equal(currentEmploymentStatus({ status: null }, {}), null, "null is not");
  assert.equal(currentEmploymentStatus({ status: "" }, {}), null);
  assert.equal(currentEmploymentStatus({ status: "1" }, {}), 1, "a string from JSON still counts");
});

/* ===================================================================== */
/*  SECTION LOAD OUTCOMES                                                */
/* ===================================================================== */

test("every failure reason stays distinct instead of collapsing to null", () => {
  assert.equal(classifyBody({ employee_id: 5 }).state, SECTION_STATE.OK);
  assert.equal(classifyBody({ code: 200, employee_id: 5 }).state, SECTION_STATE.OK);
  assert.equal(classifyBody({ code: 403 }).state, SECTION_STATE.DENIED);
  assert.equal(classifyBody({ code: 401 }).state, SECTION_STATE.DENIED);
  assert.equal(classifyBody({ code: 404 }).state, SECTION_STATE.MISSING);
  assert.equal(classifyBody({ code: 500 }).state, SECTION_STATE.ERROR);
  assert.equal(classifyBody(null).state, SECTION_STATE.ERROR);
  assert.equal(classifyBody("nonsense").state, SECTION_STATE.ERROR);
});

test("the branch-scope refusal is a DENIAL of this read, not a broken session", () => {
  // The shape the employee branch scope actually sends.
  const out = classifyBody({
    code: 403,
    msg: "This employee belongs to a branch you are not authorized for.",
    error: "OUT_OF_BRANCH",
  });
  assert.equal(out.state, SECTION_STATE.DENIED);
  assert.equal(out.denied, true);
  assert.equal(out.data, null);
});

test("an array payload is a successful read, not an object with a code", () => {
  // GET /employee/employee_id answers with `[row]`.
  const out = classifyBody([{ employee_id: 5, status: 1 }]);
  assert.equal(out.state, SECTION_STATE.OK);
  assert.equal(out.data[0].status, 1);
});

test("a thrown failure keeps its reason too", () => {
  assert.equal(classifyError(new Error("socket hang up")).state, SECTION_STATE.ERROR);
  assert.equal(classifyError({ response: { status: 403, data: {} } }).state, SECTION_STATE.DENIED);
  assert.equal(classifyError({ response: { status: 404 } }).state, SECTION_STATE.MISSING);
  assert.equal(classifyError({ response: { status: 502 } }).state, SECTION_STATE.ERROR);
});

test("loadSection never rejects, so one refused section cannot blank the page", async () => {
  const denied = await loadSection(Promise.resolve({ code: 403 }));
  const thrown = await loadSection(Promise.reject(new Error("network")));
  const ok = await loadSection(Promise.resolve({ aadhaar_status: "VERIFIED" }));

  assert.equal(denied.state, SECTION_STATE.DENIED);
  assert.equal(thrown.state, SECTION_STATE.ERROR);
  assert.equal(ok.state, SECTION_STATE.OK);

  // All four settle together; none of them can reject the Promise.all.
  const all = await Promise.all([
    loadSection(Promise.reject(new Error("x"))),
    loadSection(Promise.resolve({ code: 403 })),
  ]);
  assert.equal(all.length, 2);
});

test("dataOf yields a payload ONLY for a successful read", () => {
  assert.equal(dataOf(classifyBody({ code: 403 })), null);
  assert.equal(dataOf(classifyBody({ code: 500 })), null);
  assert.equal(dataOf(null), null);
  assert.deepEqual(dataOf(classifyBody({ a: 1 })), { a: 1 });
});

/* ===================================================================== */
/*  AADHAAR                                                              */
/* ===================================================================== */

const aadhaarOutcomeFor = (body) => classifyBody(body);

test("7. the server SAYS there is no Aadhaar → PENDING, and says so plainly", () => {
  const view = aadhaarSectionView(
    aadhaarOutcomeFor({
      aadhaar_status: "PENDING",
      can_verify_now: true,
      message: "No Aadhaar on record. It can be verified at any time and attached to this employee.",
    })
  );
  assert.equal(view.kind, "PENDING");
  assert.equal(view.badge.label, "Pending");
  assert.match(view.message, /No Aadhaar on record/);
  assert.equal(view.canOfferVerify, true);
  assert.equal(view.showIdentity, false);
});

test("8. VERIFIED shows the identity to a caller who got the payload", () => {
  const view = aadhaarSectionView(
    aadhaarOutcomeFor({ aadhaar_status: "VERIFIED", aadhaar_last4: "4321", name_as_per_aadhaar: "A B" })
  );
  assert.equal(view.kind, "VERIFIED");
  assert.equal(view.badge.label, "Verified");
  assert.equal(view.showIdentity, true);
});

test("9. A 403 IS NOT PENDING, and discloses nothing", () => {
  const view = aadhaarSectionView(aadhaarOutcomeFor({ code: 403, msg: "nope" }));
  assert.notEqual(view.kind, "PENDING");
  assert.equal(view.kind, "DENIED");
  assert.equal(view.badge.label, "Not available");
  assert.equal(view.message, "Aadhaar status not available with your access.");
  assert.equal(view.showIdentity, false);
  assert.equal(view.canOfferVerify, false);
  assert.ok(!/No Aadhaar on record/i.test(view.message), "it must not assert there is none");
});

test("10. A 500 OR A DROPPED CONNECTION IS NOT PENDING EITHER", () => {
  for (const outcome of [
    aadhaarOutcomeFor({ code: 500 }),
    classifyError(new Error("socket hang up")),
    aadhaarOutcomeFor(null),
  ]) {
    const view = aadhaarSectionView(outcome);
    assert.notEqual(view.kind, "PENDING", "an unknown Aadhaar state is not an absent one");
    assert.equal(view.kind, "UNAVAILABLE");
    assert.equal(view.showIdentity, false);
    assert.ok(!/No Aadhaar on record/i.test(view.message));
  }
});

test("a missing section outcome altogether is UNAVAILABLE, never PENDING", () => {
  for (const nothing of [null, undefined]) {
    assert.equal(aadhaarSectionView(nothing).kind, "UNAVAILABLE");
  }
});

test("NO AADHAAR DETAIL LEAKS ON A REFUSAL, checked against the whole view", () => {
  const view = aadhaarSectionView(
    // Even if a payload somehow rode along with a refusal, the view must not
    // carry it: `dataOf`/`classifyBody` drop the body on a non-OK state, and
    // the view is built from the state.
    classifyBody({ code: 403, aadhaar_last4: "4321", name_as_per_aadhaar: "Secret Name" })
  );
  const text = JSON.stringify(view);
  for (const secret of ["4321", "Secret Name"]) {
    assert.ok(!text.includes(secret), `a refusal must not carry ${secret}`);
  }
});
