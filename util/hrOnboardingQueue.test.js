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

/**
 * A summary row as the SERVER would actually send it, defaulting to somebody
 * whose onboarding is finished.
 *
 * `hr_onboarding_pending` and `hr_onboarding_missing` are DERIVED from the
 * other fields rather than set by hand, mirroring
 * `EmployeeStatusSummaryUsecase.hrOnboardingState`. That is deliberate: a
 * fixture that could set "Aadhaar pending, HR complete" would let these tests
 * pass against a combination the server cannot produce, which is precisely
 * the inconsistency this module is not allowed to invent. Pass either key
 * explicitly to test what happens when the server omits or contradicts it.
 */
const done = (over = {}) => {
  const row = {
    aadhaar_status: "VERIFIED",
    bank_status: "VERIFIED",
    // Only VERIFIED is payroll ready, and only payroll ready is a finished
    // bank section - see the bank tests below.
    bank_payroll_ready: true,
    pf_status: "COMPLETE",
    esi_status: "COMPLETE",
    ...over,
  };
  if ("hr_onboarding_pending" in row) return row;
  const decided = (v) => v === "COMPLETE" || v === "NOT_APPLICABLE";
  const missing = [];
  if (row.aadhaar_status !== "VERIFIED") missing.push("aadhaar");
  if (!decided(row.pf_status) || !decided(row.esi_status)) missing.push("statutory");
  if (!row.bank_payroll_ready) missing.push("bank");
  return { ...row, hr_onboarding_pending: missing.length > 0, hr_onboarding_missing: missing };
};

/* ------------------------------------------------------------- the row --- */

test("every status is read from the summary, never recomputed", () => {
  const row = queueRow(employee(), done());
  assert.strictEqual(row.aadhaar, COMPLETE);
  assert.strictEqual(row.bank, COMPLETE);
  assert.strictEqual(row.pf, COMPLETE);
  assert.strictEqual(row.esi, COMPLETE);
  assert.strictEqual(row.hr, COMPLETE);
  // Everything done means done.
  assert.strictEqual(row.overall, COMPLETE);
});

test("ANY OUTSTANDING ITEM KEEPS AN EMPLOYEE IN THE QUEUE, AND THE ROW SAYS WHICH", () => {
  const cases = [
    ["aadhaar", { aadhaar_status: "PENDING" }],
    ["bank", { bank_status: "FAILED", bank_payroll_ready: false }],
    ["pf", { pf_status: "PENDING" }],
    ["esi", { esi_status: "PENDING" }],
  ];
  for (const [column, over] of cases) {
    const row = queueRow(employee(), done(over));
    assert.strictEqual(row[column], PENDING, `${column} should be pending`);
    // The server's flag already covers it, so HR and Overall both follow.
    assert.strictEqual(row.hr, PENDING, `${column} alone must make HR pending`);
    assert.strictEqual(row.overall, PENDING, `${column} alone must keep them in the queue`);
    assert.strictEqual(matchesFilter(row, "all_pending"), true, column);
    assert.strictEqual(matchesFilter(row, column), true, column);
  }
});

test("OVERALL IS THE SERVER'S FLAG, NOT A SECOND OPINION", () => {
  // The queue must not compose its own definition of "finished" out of the
  // columns: the employee list renders the same flag, and two definitions is
  // how the two screens start disagreeing about one employee.
  const row = queueRow(employee(), done());
  assert.strictEqual(row.overall, row.hr);
  // Including when the server does not send it at all.
  const unknown = queueRow(employee(), { aadhaar_status: "PENDING" });
  assert.strictEqual(unknown.hr, UNKNOWN);
  assert.strictEqual(unknown.overall, UNKNOWN, "an absent flag is not a Pending one");
});

test("HR IS PENDING EXACTLY WHEN ONE OF THE FOUR ITEMS IS", () => {
  // The agreement between the flag and the columns beside it is pinned, not
  // assumed - they are read from the same summary, and this is what says so.
  for (const aadhaar of [true, false]) {
    for (const ready of [true, false]) {
      for (const pf of [true, false]) {
        for (const esi of [true, false]) {
          const row = queueRow(
            employee(),
            done({
              aadhaar_status: aadhaar ? "VERIFIED" : "PENDING",
              bank_status: ready ? "VERIFIED" : "FAILED",
              bank_payroll_ready: ready,
              pf_status: pf ? "COMPLETE" : "PENDING",
              esi_status: esi ? "COMPLETE" : "PENDING",
            })
          );
          const anyPending = [row.aadhaar, row.bank, row.pf, row.esi].some((v) => v === PENDING);
          const label = `aadhaar=${aadhaar} bank=${ready} pf=${pf} esi=${esi}`;
          assert.strictEqual(row.hr === PENDING, anyPending, label);
          assert.strictEqual(row.overall, row.hr, label);
        }
      }
    }
  }
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

test("AN ACCOUNT THAT HAS NOT PASSED ITS CHECK IS STILL HR WORK", () => {
  // Entering an account number is not finishing the section. Everything that
  // is not payroll ready is an employee who cannot be paid, and all of it is
  // work: no account, an unfinished check, a name mismatch, an outright
  // failure, or a clash with somebody else's account.
  for (const status of [
    "NOT_PROVIDED", "PENDING", "NAME_MISMATCH", "FAILED", "DUPLICATE_ACCOUNT",
  ]) {
    const row = queueRow(employee(), done({ bank_status: status, bank_payroll_ready: false }));
    assert.strictEqual(row.bank, PENDING, status);
    assert.strictEqual(row.hr, PENDING, `${status} is HR work`);
    assert.strictEqual(row.overall, PENDING, `${status} must keep them in the queue`);
    assert.strictEqual(matchesFilter(row, "bank"), true, status);
  }
  // Only a verified account - the one `bank_payroll_ready` is true for - is
  // a finished bank section.
  const ok = queueRow(employee(), done({ bank_status: "VERIFIED", bank_payroll_ready: true }));
  assert.strictEqual(ok.bank, COMPLETE);
  assert.strictEqual(ok.overall, COMPLETE);
});

/* ------------------------------------------------ Not Applicable is done - */

test("NOT APPLICABLE IS NOT OUTSTANDING", () => {
  const row = queueRow(employee(), done({ pf_status: "NOT_APPLICABLE", esi_status: "NOT_APPLICABLE" }));
  assert.strictEqual(row.pf, NOT_APPLICABLE);
  assert.strictEqual(row.esi, NOT_APPLICABLE);
  assert.strictEqual(matchesFilter(row, "pf"), false);
  assert.strictEqual(matchesFilter(row, "esi"), false);
  assert.strictEqual(matchesFilter(row, "all_pending"), false, "and they do not hold up the queue");
  assert.strictEqual(row.overall, COMPLETE);
  assert.strictEqual(statusBadge(row.pf).label, "Not applicable");
});

/* ------------------------------------------------- the queue empties itself */

test("A FINISHED EMPLOYEE LEAVES THE QUEUE", () => {
  const rows = [queueRow(employee(), done())];
  assert.deepStrictEqual(filterQueue(rows, { filter: "all_pending" }), []);
  // And while something is outstanding, they are in it.
  const outstanding = [queueRow(employee(), done({ bank_status: "NOT_PROVIDED", bank_payroll_ready: false }))];
  assert.strictEqual(filterQueue(outstanding, { filter: "all_pending" }).length, 1);
});

test("AADHAAR PENDING IS HR PENDING", () => {
  // The store manager owns the first attempt; HR owns every unresolved case
  // afterwards, whatever left it unresolved. So an employee with everything
  // else done and no verified Aadhaar is HR's work, and the HR column says so
  // - on this queue and on the employee list, because it is one flag.
  const row = queueRow(employee(), done({ aadhaar_status: "PENDING" }));
  assert.strictEqual(row.aadhaar, PENDING);
  assert.strictEqual(row.hr, PENDING);
  assert.strictEqual(row.overall, PENDING);
  assert.deepStrictEqual(row.hr_onboarding_missing, ["aadhaar"], "and names the reason");
  assert.strictEqual(matchesFilter(row, "all_pending"), true);
  assert.strictEqual(matchesFilter(row, "aadhaar"), true);
  assert.strictEqual(matchesFilter(row, "hr"), true);
});

test("VERIFYING THE AADHAAR LATER TAKES THE EMPLOYEE OUT OF THE QUEUE", () => {
  const pending = [queueRow(employee(), done({ aadhaar_status: "PENDING" }))];
  assert.strictEqual(filterQueue(pending, { filter: "all_pending" }).length, 1);
  // Nothing is marked done: the same employee with the identity attached.
  const verified = [queueRow(employee(), done({ aadhaar_status: "VERIFIED" }))];
  assert.deepStrictEqual(filterQueue(verified, { filter: "all_pending" }), []);
  assert.strictEqual(verified[0].hr, COMPLETE);
  assert.strictEqual(verified[0].overall, COMPLETE);
});

/* -------------------------------------------------------------- filtering */

test("resigned employees are never in the queue", () => {
  const rows = [queueRow(employee({ status: 0 }), done({ aadhaar_status: "PENDING" }))];
  assert.deepStrictEqual(filterQueue(rows, { filter: "all_pending" }), []);
  assert.deepStrictEqual(filterQueue(rows, { filter: "all" }), []);
});

test("outlet, department and search narrow the queue", () => {
  const rows = [
    queueRow(employee({ employee_id: 1, employee_name: "Alpha", store_id: 4, department_id: 2 }), done({ aadhaar_status: "PENDING" })),
    queueRow(employee({ employee_id: 2, employee_name: "Beta", store_id: 5, department_id: 3 }), done({ aadhaar_status: "PENDING" })),
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
    queueRow(employee({ employee_id: 3 }), done({ bank_status: "NOT_PROVIDED", bank_payroll_ready: false })),
    queueRow(employee({ employee_id: 4 }), done({ pf_status: "PENDING" })),
    queueRow(employee({ employee_id: 5 }), done({ esi_status: "PENDING" })),
    queueRow(employee({ employee_id: 6, status: 0 }), done({ aadhaar_status: "PENDING" })),
  ];
  const counts = queueCounts(rows);
  assert.strictEqual(counts.active, 5, "the resigned row is not an active employee");
  assert.strictEqual(counts.aadhaar, 1);
  assert.strictEqual(counts.bank, 1);
  assert.strictEqual(counts.pf, 1);
  assert.strictEqual(counts.esi, 1);
  // Four outstanding employees, and HR now covers every one of them.
  assert.strictEqual(counts.hr, 4);
  assert.strictEqual(counts.pending, 4);
  // Every count is exactly the length of the list its filter produces.
  for (const [key, filter] of [["pending", "all_pending"], ["aadhaar", "aadhaar"], ["bank", "bank"], ["pf", "pf"], ["esi", "esi"], ["hr", "hr"]]) {
    assert.strictEqual(counts[key], filterQueue(rows, { filter }).length, `${key} must match its own filter`);
  }
});

test("the counts follow outlet and department, but not the work filter", () => {
  const rows = [
    queueRow(employee({ employee_id: 1, store_id: 4 }), done({ aadhaar_status: "PENDING" })),
    queueRow(employee({ employee_id: 2, store_id: 5 }), done({ aadhaar_status: "PENDING" })),
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
