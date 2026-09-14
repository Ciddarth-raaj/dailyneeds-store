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
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const {
  currentEmploymentStatus,
  currentPlacement,
  employmentBadge,
  aadhaarSectionView,
} = require("./hrStatus");
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

/* ===================================================================== */
/*  CURRENT PLACEMENT - the same rule as the status badge                */
/* ===================================================================== */

/**
 * The status badge was made master-first; the four fields beside it were not.
 * Which value they displayed therefore depended on whether the viewer held
 * `view_employee_lifecycle`, and for two of them the two sides are not even
 * the same fact.
 */
describe("current placement", () => {
  // The master carries BOTH outlet spellings; lifecycle carries only the
  // nickname, and its joining date is the CURRENT PERIOD's start.
  const MASTER = {
    date_of_joining: "2013-06-08",
    outlet_nickname: "KTM",
    outlet_name: "Kathirkamam",
    department_name: "Operations",
    designation_name: "Cashier",
  };
  const LIFECYCLE = {
    current: {
      date_of_joining: "2021-04-01",
      outlet_nickname: "KTM",
      department_name: "Operations",
      designation_name: "Cashier",
    },
  };

  it("6. HR AND A STORE MANAGER SEE THE SAME PLACEMENT", () => {
    // The whole defect in one assertion: the answer must not move with the
    // reader's permissions.
    assert.deepEqual(
      currentPlacement(MASTER, LIFECYCLE),   // HR: lifecycle loaded
      currentPlacement(MASTER, {})           // store manager: lifecycle refused
    );
  });

  it("6. THE BRANCH LABEL IS THE FULL NAME, for everybody", () => {
    // HR used to see the nickname and a store manager the full name. They
    // agree now - and they agree on the FULL NAME, because consistency must
    // not be bought by changing what the larger audience already reads.
    // Resolving the nickname first would have turned "Kathirkamam" into "KTM"
    // for every store manager the moment this shipped.
    assert.equal(currentPlacement(MASTER, LIFECYCLE).outlet, "Kathirkamam");
    assert.equal(currentPlacement(MASTER, {}).outlet, "Kathirkamam");
  });

  it("6. the nickname is the FALLBACK, not the preference", () => {
    // Only where no full name is recorded on the master.
    const noFullName = { ...MASTER, outlet_name: null };
    assert.equal(currentPlacement(noFullName, LIFECYCLE).outlet, "KTM");
    assert.equal(currentPlacement(noFullName, {}).outlet, "KTM");
    // And the lifecycle's nickname only where the master had neither.
    assert.equal(currentPlacement({}, LIFECYCLE).outlet, "KTM");
  });

  it("6. THE JOINING DATE IS THE MASTER'S, not the current period's", () => {
    // These genuinely differ for anybody who resigned and rejoined, so the
    // date used to move with the reader.
    assert.equal(currentPlacement(MASTER, LIFECYCLE).date_of_joining, "2013-06-08");
    assert.equal(currentPlacement(MASTER, {}).date_of_joining, "2013-06-08");
  });

  it("6. department and designation come from the master", () => {
    const drifted = {
      current: { department_name: "Stale Dept", designation_name: "Stale Desig" },
    };
    const p = currentPlacement(MASTER, drifted);
    assert.equal(p.department_name, "Operations");
    assert.equal(p.designation_name, "Cashier");
  });

  it("lifecycle is used ONLY where the master has nothing", () => {
    const p = currentPlacement({}, LIFECYCLE);
    assert.equal(p.outlet, "KTM", "the lifecycle carries only the nickname");
    assert.equal(p.department_name, "Operations");
    assert.equal(p.date_of_joining, "2021-04-01");
  });

  it("2 & 3. A DENIED OR FAILED LIFECYCLE CHANGES NOTHING", () => {
    for (const outcome of [
      classifyBody({ code: 403 }),                 // denied
      classifyBody({ code: 500 }),                 // server error
      classifyError(new Error("socket hang up")),  // network
    ]) {
      const lifecycle = dataOf(outcome);
      assert.deepEqual(currentPlacement(MASTER, lifecycle), currentPlacement(MASTER, LIFECYCLE));
      // and the status beside it is still ACTIVE, not Resigned
      assert.equal(employmentBadge(currentEmploymentStatus({ status: 1 }, lifecycle)).label, "Active");
    }
  });

  it("neither read is blank rather than wrong", () => {
    assert.deepEqual(currentPlacement(null, null), {
      date_of_joining: "",
      outlet: null,
      department_name: null,
      designation_name: null,
    });
  });

  it("an empty string in the master is not an answer", () => {
    const blank = { ...MASTER, department_name: "   " };
    assert.equal(currentPlacement(blank, LIFECYCLE).department_name, "Operations");
  });
});
