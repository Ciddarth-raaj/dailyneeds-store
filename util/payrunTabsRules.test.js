/**
 * Payrun - the workflow tabs, the close confirmation, and the attendance
 * vocabulary, proved without a browser.
 *
 *   node --test util/payrunTabsRules.test.js
 *
 * WHAT IS PROVED HERE is which tab asks which question, what the counts mean,
 * where an unresolved item is actually fixed, and what somebody is told before
 * they accept a month's worth of attendance gaps. There is no payroll formula
 * in the module and no test for one here: every figure and every status is the
 * server's.
 */
const test = require("node:test");
const assert = require("node:assert");

const tabs = require("./payrunTabs");
const {
  ALL,
  ATTENDANCE_STATUS,
  INITIALIZATION_TABS,
  ADJUSTMENT_TABS,
  CALCULATION_TABS,
  DEFAULT_TAB,
} = tabs;

/* ------------------------------------------------------------- the tabs */

test("Initialization offers exactly the five working queues", () => {
  assert.deepEqual(
    INITIALIZATION_TABS.map((t) => t.key),
    [ALL, "ATTENDANCE_PENDING", "READY", "INITIALIZED", "EXITED"]
  );
});

test("Adjustments offers exactly its four", () => {
  assert.deepEqual(
    ADJUSTMENT_TABS.map((t) => t.key),
    [ALL, "HAS_ADJUSTMENT", "NO_ADJUSTMENT_PENDING_CONFIRMATION", "NO_ADJUSTMENT_CONFIRMED"]
  );
});

test("Calculation & Review offers exactly its five", () => {
  assert.deepEqual(
    CALCULATION_TABS.map((t) => t.key),
    [ALL, "ATTENDANCE_PENDING", "RECALCULATION_REQUIRED", "READY_FOR_APPROVAL", "APPROVED_LOCKED"]
  );
});

test("every stage keeps ALL, and it is always first", () => {
  [INITIALIZATION_TABS, ADJUSTMENT_TABS, CALCULATION_TABS].forEach((list) => {
    assert.equal(list[0].key, ALL, "ALL must never be hidden");
  });
});

/**
 * THE DEFAULT IS THE WORK, NOT THE ARCHIVE. Opening on ALL means scrolling
 * past two hundred finished employees to find the ten that need something.
 */
test("each stage opens on an actionable queue, never on ALL", () => {
  Object.entries(DEFAULT_TAB).forEach(([stage, key]) => {
    assert.notEqual(key, ALL, `${stage} defaults to ALL`);
  });
  assert.equal(DEFAULT_TAB.INITIALIZATION, "ATTENDANCE_PENDING");
  assert.equal(DEFAULT_TAB.CALCULATION, "ATTENDANCE_PENDING");
});

test("finished work is never a default tab", () => {
  assert.notEqual(DEFAULT_TAB.CALCULATION, "APPROVED_LOCKED");
  assert.notEqual(DEFAULT_TAB.ADJUSTMENTS, "NO_ADJUSTMENT_CONFIRMED");
});

/* -------------------------------------------------------- what a tab asks */

test("a tab narrows exactly one dimension, and ALL narrows none", () => {
  assert.deepEqual(tabs.tabFilters(INITIALIZATION_TABS, ALL), {});
  assert.deepEqual(tabs.tabFilters(INITIALIZATION_TABS, "ATTENDANCE_PENDING"), {
    attendance_status: "PENDING",
  });
  assert.deepEqual(tabs.tabFilters(INITIALIZATION_TABS, "READY"), { status: "READY" });
  assert.deepEqual(tabs.tabFilters(INITIALIZATION_TABS, "EXITED"), { lifecycle: "EXITED" });
  assert.deepEqual(tabs.tabFilters(CALCULATION_TABS, "APPROVED_LOCKED"), {
    status: "APPROVED_LOCKED",
  });
  assert.deepEqual(tabs.tabFilters(ADJUSTMENT_TABS, "HAS_ADJUSTMENT"), {
    state: "HAS_ADJUSTMENT",
  });
});

test("an unknown tab narrows nothing rather than inventing a filter", () => {
  assert.deepEqual(tabs.tabFilters(INITIALIZATION_TABS, "NONSENSE"), {});
});

/* ----------------------------------------------------------- the counts */

test("the counts come from the server's summary, by the names it sends", () => {
  const summary = {
    total_eligible: 200, ready: 165, initialized: 30, attendance_pending: 18,
  };
  assert.equal(tabs.tabCount("INITIALIZATION", ALL, summary), 200);
  assert.equal(tabs.tabCount("INITIALIZATION", "ATTENDANCE_PENDING", summary), 18);
  assert.equal(tabs.tabCount("INITIALIZATION", "READY", summary), 165);
  assert.equal(tabs.tabCount("INITIALIZATION", "INITIALIZED", summary), 30);

  assert.equal(
    tabs.tabCount("ADJUSTMENTS", "NO_ADJUSTMENT_PENDING_CONFIRMATION", {
      pending_adjustment_confirmation_count: 7,
    }),
    7
  );
  assert.equal(
    tabs.tabCount("CALCULATION", "READY_FOR_APPROVAL", { ready_for_approval: 12 }),
    12
  );
});

/**
 * "(0)" SAYS THERE IS NOTHING TO DO. Saying that when nobody counted is worse
 * than showing no number, so an absent count is undefined and the strip prints
 * no badge at all.
 */
test("an uncounted tab shows no number rather than a zero", () => {
  assert.equal(tabs.tabCount("INITIALIZATION", "EXITED", { total_eligible: 200 }), undefined);
  assert.equal(tabs.tabCount("CALCULATION", "READY_FOR_APPROVAL", {}), undefined);
  assert.equal(tabs.tabCount("CALCULATION", "READY_FOR_APPROVAL", undefined), undefined);
  /* But a real zero is a real answer and is shown. */
  assert.equal(tabs.tabCount("CALCULATION", "READY_FOR_APPROVAL", { ready_for_approval: 0 }), 0);
});

/* --------------------------------------------- closed is not the same as ready */

test("closed for payroll is visibly distinct from genuinely ready", () => {
  const ready = ATTENDANCE_STATUS.READY;
  const closed = ATTENDANCE_STATUS.CLOSED_FOR_PAYROLL;

  assert.notEqual(tabs.ATTENDANCE_STATUS_LABEL[ready], tabs.ATTENDANCE_STATUS_LABEL[closed]);
  assert.notEqual(tabs.ATTENDANCE_STATUS_SCHEME[ready], tabs.ATTENDANCE_STATUS_SCHEME[closed]);
  assert.notEqual(
    tabs.ATTENDANCE_STATUS_SCHEME[closed],
    tabs.ATTENDANCE_STATUS_SCHEME[ATTENDANCE_STATUS.PENDING]
  );
  assert.match(tabs.ATTENDANCE_STATUS_LABEL[closed], /closed/i);
});

/* ------------------------------------------------- where each item is fixed */

test("an unresolved item links to the screen that settles it", () => {
  assert.equal(
    tabs.unresolvedLink({ code: "PENDING_REGULARIZATION" }, { employee_id: 1952 }),
    "/attendance/approval"
  );
  assert.equal(
    tabs.unresolvedLink({ code: "PENDING_OT" }, { employee_id: 1952 }),
    "/attendance/ot-approval"
  );
});

test("a held date deep-links to that employee and that date", () => {
  const link = tabs.unresolvedLink(
    { code: "ATTENDANCE_NOT_FINAL", dates: ["2026-09-03"] },
    { employee_id: 1952 }
  );
  assert.equal(link, "/attendance/calculated?employee_id=1952&date=2026-09-03");
  assert.equal(
    tabs.heldDateLink(1952, "2026-09-11"),
    "/attendance/calculated?employee_id=1952&date=2026-09-11"
  );
});

test("a month with no attendance at all still lands somewhere useful", () => {
  assert.equal(
    tabs.unresolvedLink({ code: "NO_ATTENDANCE_MONTH", dates: [] }, { employee_id: 1952 }),
    "/attendance/calculated?employee_id=1952"
  );
});

/* ------------------------------------------------------ the bulk close */

const row = (id, over = {}) => ({
  employee_id: id,
  attendance_closeable: true,
  attendance_unresolved: [],
  ...over,
});

test("the confirmation counts only the rows a close would change", () => {
  const rows = [
    row(1, { attendance_unresolved: [{ code: "PENDING_OT", count: 1 }] }),
    /* Already settled: selecting them changes nothing and they are not counted. */
    row(2, { attendance_closeable: false, attendance_unresolved: [] }),
    row(3, { attendance_unresolved: [{ code: "ATTENDANCE_NOT_FINAL", count: 2 }] }),
  ];
  const summary = tabs.closeSelectionSummary(rows, [1, 2, 3]);
  assert.equal(summary.employees, 2);
  assert.deepEqual(summary.employee_ids, [1, 3]);
  assert.equal(summary.unresolved_items, 3);
  assert.equal(summary.breakdown.pending_ot, 1);
  assert.equal(summary.breakdown.attendance_not_final, 2);
});

test("the breakdown separates the kinds of unresolved item", () => {
  const rows = [
    row(1, {
      attendance_unresolved: [
        { code: "ATTENDANCE_NOT_FINAL", count: 2 },
        { code: "PENDING_REGULARIZATION", count: 3 },
        { code: "PENDING_OT", count: 1 },
      ],
    }),
  ];
  const { breakdown, unresolved_items } = tabs.closeSelectionSummary(rows, [1]);
  assert.equal(unresolved_items, 6);
  assert.equal(breakdown.attendance_not_final, 2);
  assert.equal(breakdown.pending_regularizations, 3);
  assert.equal(breakdown.pending_ot, 1);
});

/**
 * THE WORDS MATTER MORE THAN THE COUNT. Somebody accepting thirty-two people's
 * attendance gaps must read that the requests stay open and that this is not
 * an approval of any of them.
 */
test("the confirmation says what is accepted and what is NOT approved", () => {
  const rows = [
    row(1, { attendance_unresolved: [{ code: "PENDING_OT", count: 1 }] }),
    row(2, { attendance_unresolved: [{ code: "PENDING_REGULARIZATION", count: 2 }] }),
  ];
  const message = tabs.closeMessage(tabs.closeSelectionSummary(rows, [1, 2]));

  assert.match(message, /2 employees/);
  assert.match(message, /3 unresolved attendance items/);
  assert.match(message, /pending regularization/i);
  assert.match(message, /pending OT/i);
  assert.match(message, /does NOT approve or reject/i);
  assert.match(message, /stay open/i);
  assert.match(message, /recorded/i);
});

test("an empty selection is told so rather than offered a confirmation", () => {
  assert.match(tabs.closeMessage(tabs.closeSelectionSummary([], [])), /Nothing in this selection/);
});

test("closeable ids are the server's verdict, never the browser's", () => {
  const rows = [row(1), row(2, { attendance_closeable: false }), row(3)];
  assert.deepEqual(tabs.closeableEmployeeIds(rows), [1, 3]);
});
