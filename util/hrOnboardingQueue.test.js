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
  QUEUE_CARDS,
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
    // The fourth item: a live, costed salary and a recorded way to pay it.
    payroll_pending: false,
    // Paid BY BANK unless a test says otherwise - the route under which the
    // bank section means anything at all. `route` is the fixture's shorthand
    // and never reaches the row; the server sends the two derived keys below,
    // not the payment type itself.
    route: "BANK",
    ...over,
  };
  const decided = (v) => v === "COMPLETE" || v === "NOT_APPLICABLE";
  // PF and ESI as one section, derived the same way the server derives it, so
  // a fixture cannot assert a combination the server could not send.
  if (!("statutory_pending" in row)) {
    row.statutory_pending = !decided(row.pf_status) || !decided(row.esi_status);
  }
  // The route-aware bank section and the cash migration, derived exactly as
  // `bankState` and `cashToBankState` derive them on the server.
  const { route } = row;
  delete row.route;
  if (!("bank_section_status" in row)) {
    row.bank_section_status =
      route === "CASH" ? "NOT_APPLICABLE"
      : route === "BANK" ? (row.bank_payroll_ready ? "COMPLETE" : "PENDING")
      : "UNKNOWN";
  }
  if (!("cash_to_bank_pending" in row) && route) {
    row.cash_to_bank_pending = route === "CASH";
  }
  if ("hr_onboarding_pending" in row) return row;
  const missing = [];
  if (row.aadhaar_status !== "VERIFIED") missing.push("aadhaar");
  if (row.statutory_pending) missing.push("statutory");
  // The route-aware rule, and cash is never one of the reasons.
  if (row.bank_section_status === "PENDING") missing.push("bank");
  if (row.payroll_pending) missing.push("payroll");
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
  // THE DASHBOARD'S DEFINING PROPERTY, over all sixteen combinations:
  // HR pending is the union of Aadhaar, Bank, Statutory and Payroll, and HR
  // complete means all four are complete. The agreement between the flag and
  // the columns beside it is pinned, not assumed - they are read from the
  // same summary, and this is what says so.
  for (const aadhaar of [true, false]) {
    for (const ready of [true, false]) {
      for (const statutory of [true, false]) {
        for (const payroll of [true, false]) {
          const row = queueRow(
            employee(),
            done({
              aadhaar_status: aadhaar ? "VERIFIED" : "PENDING",
              bank_status: ready ? "VERIFIED" : "FAILED",
              bank_payroll_ready: ready,
              pf_status: statutory ? "COMPLETE" : "PENDING",
              esi_status: statutory ? "COMPLETE" : "PENDING",
              payroll_pending: !payroll,
            })
          );
          const four = [row.aadhaar, row.bank, row.statutory, row.payroll];
          const anyPending = four.some((v) => v === PENDING);
          const label = `aadhaar=${aadhaar} bank=${ready} statutory=${statutory} payroll=${payroll}`;
          assert.strictEqual(row.hr === PENDING, anyPending, label);
          assert.strictEqual(
            row.hr === COMPLETE,
            four.every((v) => v === COMPLETE),
            `HR complete means all four complete: ${label}`
          );
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
    active: 0, aadhaar: 0, bank: 0, statutory: 0, payroll: 0, cashToBank: 0, hr: 0,
    pf: 0, esi: 0, pending: 0,
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

/* ------------------------------------------------- the dashboard's cards */

test("THERE ARE SEVEN CARDS, AND EACH ONE SELECTS A REAL FILTER", () => {
  assert.deepStrictEqual(
    QUEUE_CARDS.map((c) => c.filter),
    ["all", "aadhaar", "bank", "statutory", "payroll", "cash_to_bank", "hr"]
  );
  // A card whose filter did not exist would select nothing and silently show
  // the whole list, so the two definitions are checked against each other.
  for (const card of QUEUE_CARDS) {
    assert.ok(QUEUE_FILTER_VALUES.includes(card.filter), `${card.filter} must be a filter`);
    assert.ok(card.count, `${card.filter} must name a count`);
  }
  // PF and ESI are no longer cards. They remain filters - see the comment on
  // QUEUE_FILTERS - but the dashboard counts them as one Statutory section.
  assert.ok(!QUEUE_CARDS.some((c) => c.filter === "pf" || c.filter === "esi"));
});

test("EVERY CARD'S COUNT EQUALS THE NUMBER OF ROWS ITS CLICK SHOWS", () => {
  // The property that makes a card clickable at all: clicking it must show
  // exactly the employees it counted. Checked per card over a mixed
  // population rather than asserted once.
  const rows = [
    queueRow(employee({ employee_id: 1 }), done()),
    queueRow(employee({ employee_id: 2 }), done({ aadhaar_status: "PENDING" })),
    queueRow(employee({ employee_id: 3 }), done({ bank_status: "FAILED", bank_payroll_ready: false })),
    queueRow(employee({ employee_id: 4 }), done({ pf_status: "PENDING" })),
    queueRow(employee({ employee_id: 5 }), done({ payroll_pending: true })),
    queueRow(employee({ employee_id: 6 }), done({ esi_status: "PENDING", payroll_pending: true })),
    // Resigned, and finished - must never be counted or listed by any card.
    queueRow(employee({ employee_id: 7, status: 0 }), done()),
    // A row the summary never arrived for: unknown, so in no pending card.
    queueRow(employee({ employee_id: 8 }), {}),
  ];
  const counts = queueCounts(rows);
  for (const card of QUEUE_CARDS) {
    const visible = filterQueue(rows, { filter: card.filter });
    assert.strictEqual(
      counts[card.count],
      visible.length,
      `the ${card.label} card counts ${counts[card.count]} but its click shows ${visible.length}`
    );
  }
  // And the Active card is the whole active population, resigned excluded.
  assert.strictEqual(counts.active, 7);
});

test("NO COUNT CHANGES BECAUSE ANOTHER CARD IS SELECTED", () => {
  // Every count is evaluated against the full active population, never
  // against the rows the current filter left on screen. `queueCounts` takes
  // no filter at all, which is what makes that true by construction - this
  // pins it against the day somebody adds one.
  const rows = [
    queueRow(employee({ employee_id: 1 }), done({ aadhaar_status: "PENDING" })),
    queueRow(employee({ employee_id: 2 }), done({ payroll_pending: true })),
    queueRow(employee({ employee_id: 3 }), done({ bank_status: "PENDING", bank_payroll_ready: false })),
    queueRow(employee({ employee_id: 4 }), done({ pf_status: "PENDING" })),
  ];
  const baseline = queueCounts(rows);
  for (const card of QUEUE_CARDS) {
    // Whatever is selected, the rows handed to queueCounts are the same ones.
    filterQueue(rows, { filter: card.filter });
    assert.deepStrictEqual(queueCounts(rows), baseline, `selecting ${card.label} moved a count`);
  }
  // Each is measured independently: payroll over all active employees, not
  // over the employees some other card left behind.
  assert.strictEqual(baseline.payroll, 1);
  assert.strictEqual(baseline.aadhaar, 1);
  assert.strictEqual(baseline.statutory, 1);
  assert.strictEqual(baseline.hr, 4, "all four are pending something");
});

test("PAYROLL PENDING NEVER INCLUDES A RESIGNED OR INACTIVE EMPLOYEE", () => {
  const rows = [
    queueRow(employee({ employee_id: 1, status: 1 }), done({ payroll_pending: true })),
    queueRow(employee({ employee_id: 2, status: 0 }), done({ payroll_pending: true })),
    queueRow(employee({ employee_id: 3, status: "0" }), done({ payroll_pending: true })),
    queueRow(employee({ employee_id: 4, status: null }), done({ payroll_pending: true })),
  ];
  assert.strictEqual(queueCounts(rows).payroll, 1, "only the active one counts");
  const visible = filterQueue(rows, { filter: "payroll" });
  assert.deepStrictEqual(visible.map((r) => r.employee_id), [1]);
  // And the same holds for every other card.
  const counts = queueCounts(rows);
  for (const card of QUEUE_CARDS) {
    assert.ok(counts[card.count] <= 1, `${card.label} counted an inactive employee`);
  }
});

test("STATUTORY IS PF OR ESI, AND IS THE SERVER'S ANSWER", () => {
  const cases = [
    [{ pf_status: "COMPLETE", esi_status: "COMPLETE" }, COMPLETE],
    [{ pf_status: "PENDING", esi_status: "COMPLETE" }, PENDING],
    [{ pf_status: "COMPLETE", esi_status: "PENDING" }, PENDING],
    [{ pf_status: "PENDING", esi_status: "PENDING" }, PENDING],
    // Recorded as "not in the scheme" is a decision, so it is finished.
    [{ pf_status: NOT_APPLICABLE, esi_status: NOT_APPLICABLE }, COMPLETE],
  ];
  for (const [over, expected] of cases) {
    const row = queueRow(employee(), done(over));
    assert.strictEqual(row.statutory, expected, JSON.stringify(over));
    // It cannot disagree with the two columns it stands for.
    assert.strictEqual(
      row.statutory === PENDING,
      row.pf === PENDING || row.esi === PENDING,
      JSON.stringify(over)
    );
  }
});

test("PAYROLL IS NOT THE BANK COLUMN UNDER ANOTHER NAME", () => {
  // A verified account and no salary, and a salary with no usable account,
  // are different employees with different outstanding work.
  const noSalary = queueRow(employee(), done({ payroll_pending: true }));
  assert.strictEqual(noSalary.bank, COMPLETE);
  assert.strictEqual(noSalary.payroll, PENDING);
  assert.strictEqual(noSalary.hr, PENDING);

  const noAccount = queueRow(
    employee(),
    done({ bank_status: "NOT_PROVIDED", bank_payroll_ready: false, payroll_pending: false })
  );
  assert.strictEqual(noAccount.bank, PENDING);
  assert.strictEqual(noAccount.payroll, COMPLETE);
  assert.strictEqual(noAccount.hr, PENDING);
});

test("a server that does not derive payroll says so rather than 'complete'", () => {
  const row = queueRow(employee(), { aadhaar_status: "VERIFIED", bank_status: "VERIFIED", bank_payroll_ready: true });
  assert.strictEqual(row.payroll, UNKNOWN);
  assert.strictEqual(row.statutory, UNKNOWN);
  // And an unknown item is counted by nobody.
  assert.strictEqual(queueCounts([row]).payroll, 0);
  assert.strictEqual(queueCounts([row]).statutory, 0);
  assert.strictEqual(matchesFilter(row, "payroll"), false);
});

test("the HR card and the old All Pending filter are the same question", () => {
  // `all_pending` was the previous name for this filter and still resolves,
  // so a bookmark or a saved link does not silently become "everyone".
  const pending = queueRow(employee(), done({ payroll_pending: true }));
  const finished = queueRow(employee(), done());
  assert.strictEqual(matchesFilter(pending, "hr"), matchesFilter(pending, "all_pending"));
  assert.strictEqual(matchesFilter(finished, "hr"), matchesFilter(finished, "all_pending"));
  assert.strictEqual(matchesFilter(finished, "hr"), false);
});

/* ------------------------------------- the payment route: bank vs cash --- */

test("A CASH EMPLOYEE IS NOT BANK PENDING - the chase that could never close", () => {
  const row = queueRow(employee(), done({
    route: "CASH",
    bank_status: "NOT_PROVIDED",
    bank_payroll_ready: false,
  }));
  assert.strictEqual(row.bank, NOT_APPLICABLE, "there is no account to finish");
  assert.strictEqual(matchesFilter(row, "bank"), false, "and they are not on the Bank card");
  assert.strictEqual(row.cashToBank, PENDING, "they are on the cash card instead");
  assert.strictEqual(row.hr, COMPLETE, "and being on cash does not make them HR pending");
});

test("CASH -> BANK IS NOT PART OF HR PENDING, EVER", () => {
  // The specified outcome: HR complete, payroll complete, still on the cash
  // list. A card that contradicted this would put every cash employee
  // permanently in the HR queue.
  const row = queueRow(employee(), done({ route: "CASH" }));
  assert.strictEqual(row.cashToBank, PENDING);
  assert.strictEqual(row.payroll, COMPLETE);
  assert.strictEqual(row.hr, COMPLETE);
  assert.strictEqual(matchesFilter(row, "hr"), false);
  assert.strictEqual(matchesFilter(row, "cash_to_bank"), true);
  // And the cash card is not a subset of the pending queue, unlike the four.
  const counts = queueCounts([row]);
  assert.strictEqual(counts.cashToBank, 1);
  assert.strictEqual(counts.hr, 0);
});

test("AN UNRECORDED PAYMENT ROUTE IS NEITHER BANK PENDING NOR CASH", () => {
  const row = queueRow(employee(), done({ route: null, payroll_pending: true }));
  assert.strictEqual(row.bank, UNKNOWN, "there is no way to say yet");
  assert.strictEqual(row.cashToBank, UNKNOWN, "nobody said cash");
  assert.strictEqual(matchesFilter(row, "bank"), false);
  assert.strictEqual(matchesFilter(row, "cash_to_bank"), false);
  // The thing that IS outstanding is reported once, by payroll.
  assert.strictEqual(row.payroll, PENDING);
  assert.strictEqual(row.hr, PENDING);
});

/* ---------------------------------- the five specified semantic cases --- */

test("THE FIVE SPECIFIED CASES, EXACTLY AS SPECIFIED", () => {
  const cases = [
    {
      name: "1 - bank route, account not verified",
      status: done({ route: "BANK", bank_status: "FAILED", bank_payroll_ready: false, payroll_pending: true }),
      bank: PENDING, cash: COMPLETE, payroll: PENDING, hr: PENDING,
    },
    {
      name: "2 - cash route, everything ready",
      status: done({ route: "CASH", bank_status: "NOT_PROVIDED", bank_payroll_ready: false }),
      bank: NOT_APPLICABLE, cash: PENDING, payroll: COMPLETE, hr: COMPLETE,
    },
    {
      name: "3 - cash route, no salary",
      status: done({ route: "CASH", bank_status: "NOT_PROVIDED", bank_payroll_ready: false, payroll_pending: true }),
      bank: NOT_APPLICABLE, cash: PENDING, payroll: PENDING, hr: PENDING,
    },
    {
      name: "4 - payment type not recorded",
      status: done({ route: null, payroll_pending: true }),
      bank: UNKNOWN, cash: UNKNOWN, payroll: PENDING, hr: PENDING,
    },
    {
      name: "5 - bank route, verified, everything complete",
      status: done({ route: "BANK" }),
      bank: COMPLETE, cash: COMPLETE, payroll: COMPLETE, hr: COMPLETE,
    },
  ];

  for (const c of cases) {
    const row = queueRow(employee(), c.status);
    assert.strictEqual(row.bank, c.bank, `${c.name}: bank`);
    assert.strictEqual(row.cashToBank, c.cash, `${c.name}: cash to bank`);
    assert.strictEqual(row.payroll, c.payroll, `${c.name}: payroll`);
    assert.strictEqual(row.hr, c.hr, `${c.name}: hr`);
    // Each card shows exactly what it counts, for this employee.
    assert.strictEqual(matchesFilter(row, "bank"), c.bank === PENDING, `${c.name}: Bank card`);
    assert.strictEqual(matchesFilter(row, "cash_to_bank"), c.cash === PENDING, `${c.name}: Cash card`);
    assert.strictEqual(matchesFilter(row, "payroll"), c.payroll === PENDING, `${c.name}: Payroll card`);
    assert.strictEqual(matchesFilter(row, "hr"), c.hr === PENDING, `${c.name}: HR card`);
  }
});

test("HR IS THE UNION OF THE FOUR ACROSS EVERY ROUTE, AND CASH IS NOT ONE OF THEM", () => {
  for (const route of ["BANK", "CASH", null]) {
    for (const aadhaar of [true, false]) {
      for (const ready of [true, false]) {
        for (const statutory of [true, false]) {
          for (const payroll of [true, false]) {
            const row = queueRow(
              employee(),
              done({
                route,
                aadhaar_status: aadhaar ? "VERIFIED" : "PENDING",
                bank_status: ready ? "VERIFIED" : "FAILED",
                bank_payroll_ready: ready,
                pf_status: statutory ? "COMPLETE" : "PENDING",
                esi_status: statutory ? "COMPLETE" : "PENDING",
                payroll_pending: !payroll,
              })
            );
            const four = [row.aadhaar, row.bank, row.statutory, row.payroll];
            const label = `route=${route} aadhaar=${aadhaar} bank=${ready} statutory=${statutory} payroll=${payroll}`;
            assert.strictEqual(row.hr === PENDING, four.some((v) => v === PENDING), label);
            // NOT_APPLICABLE and UNKNOWN are both "nothing outstanding here",
            // so HR complete means every one of the four is non-pending.
            assert.strictEqual(row.hr === COMPLETE, four.every((v) => v !== PENDING), label);
            // The cash flag follows the route alone and never the other four.
            assert.strictEqual(
              row.cashToBank,
              route === "CASH" ? PENDING : route === "BANK" ? COMPLETE : UNKNOWN,
              label
            );
          }
        }
      }
    }
  }
});

test("THE CASH CARD COUNTS ALL ACTIVE CASH EMPLOYEES, FINISHED OR NOT", () => {
  const rows = [
    queueRow(employee({ employee_id: 1 }), done({ route: "CASH" })),                        // complete, on cash
    queueRow(employee({ employee_id: 2 }), done({ route: "CASH", payroll_pending: true })), // pending, on cash
    queueRow(employee({ employee_id: 3 }), done({ route: "BANK" })),                        // on bank
    queueRow(employee({ employee_id: 4 }), done({ route: null, payroll_pending: true })),   // unrecorded
    queueRow(employee({ employee_id: 5, status: 0 }), done({ route: "CASH" })),             // resigned
  ];
  const counts = queueCounts(rows);
  assert.strictEqual(counts.cashToBank, 2, "both active cash employees, resigned excluded");
  assert.deepStrictEqual(
    filterQueue(rows, { filter: "cash_to_bank" }).map((r) => r.employee_id),
    [1, 2]
  );
  // Independent of every other card, as all of them are.
  assert.strictEqual(counts.bank, 0, "nobody is a bank employee with a bad account");
  // Employees 2 and 4: the cash employee with no payroll, and the one whose
  // payment route was never recorded. Employee 1 is on cash and HR complete.
  assert.strictEqual(counts.hr, 2, "the two with payroll outstanding");
  assert.strictEqual(counts.active, 4);
});
