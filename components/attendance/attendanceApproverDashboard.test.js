/**
 * The Approver Setup dashboard: the three cards, what they filter, and what
 * they must never be computed from.
 *
 *   node --test components/attendance/attendanceApproverDashboard.test.js
 *
 * Source-read assertions like the sibling file's - this repository has no
 * renderer in test - plus the pure card model from the util.
 *
 * THE ONE THAT MATTERS MOST: the counts are the server's, over the whole
 * filtered population. Deriving them from `rows` would be wrong for any
 * population bigger than one page, and wrong in the direction that looks
 * plausible on a small dataset, so there is an explicit test that the page
 * does not do it.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/approver-setup/index.jsx"));
const summary = strip(read("components/attendance/approver-setup/ApproverSetupSummary.jsx"));
const {
  SETUP_STATUS,
  summaryCards,
  summaryIsConsistent,
  buildListParams,
} = require("../../util/attendanceApproverSetup");

const SUMMARY = { attendance_required: 200, completed: 185, missing: 15 };

test("the three cards are named as approved", () => {
  const cards = summaryCards(SUMMARY);
  assert.deepStrictEqual(
    cards.map((c) => c.label),
    ["Attendance Required Employees", "Approver Setup Completed", "Without Approver Setup"]
  );
  assert.deepStrictEqual(cards.map((c) => c.value), [200, 185, 15]);
});

test("the missing card is never called just 'Without Approver'", () => {
  // An employee with no employee-level setup still has the existing fallback
  // chain - they are not unapprovable, only unconfigured here.
  const [, , missing] = summaryCards(SUMMARY);
  assert.strictEqual(missing.label, "Without Approver Setup");
  assert.match(missing.help, /fallback/i);
});

test("completed + missing = attendance required", () => {
  assert.strictEqual(summaryIsConsistent(SUMMARY), true);
  assert.strictEqual(summaryIsConsistent({ attendance_required: 200, completed: 185, missing: 14 }), false);
  assert.strictEqual(summaryIsConsistent(null), false);
});

test("the worked example: 212 active, 12 exempt, 200 required", () => {
  const cards = summaryCards({ attendance_required: 200, completed: 185, missing: 15 });
  assert.strictEqual(cards[0].value, 200, "the 12 exempt employees are not counted");
  assert.strictEqual(cards[1].value + cards[2].value, 200, "and never appear as missing");
});

test("a missing summary reads as zeros, not NaN", () => {
  for (const input of [null, undefined, {}, { attendance_required: "x" }]) {
    const cards = summaryCards(input);
    cards.forEach((c) => assert.strictEqual(Number.isFinite(c.value), true, JSON.stringify(input)));
  }
});

test("the two status cards carry the filter they apply; the total card clears it", () => {
  const [required, completed, missing] = summaryCards(SUMMARY);
  assert.strictEqual(required.status, null);
  assert.strictEqual(completed.status, SETUP_STATUS.COMPLETED);
  assert.strictEqual(missing.status, SETUP_STATUS.MISSING);
});

test("the selected card is the one whose status is active", () => {
  const none = summaryCards(SUMMARY, null);
  assert.deepStrictEqual(none.map((c) => c.selected), [true, false, false]);

  const onMissing = summaryCards(SUMMARY, SETUP_STATUS.MISSING);
  assert.deepStrictEqual(onMissing.map((c) => c.selected), [false, false, true]);

  const onCompleted = summaryCards(SUMMARY, SETUP_STATUS.COMPLETED);
  assert.deepStrictEqual(onCompleted.map((c) => c.selected), [false, true, false]);
});

test("setup_status reaches the API only when it names a real state", () => {
  assert.strictEqual(buildListParams({ setup_status: "missing" }).setup_status, "missing");
  assert.strictEqual(buildListParams({ setup_status: "completed" }).setup_status, "completed");
  assert.strictEqual(buildListParams({}).setup_status, undefined);
  assert.strictEqual(buildListParams({ setup_status: null }).setup_status, undefined);
  assert.strictEqual(buildListParams({ setup_status: "nonsense" }).setup_status, undefined);
});

test("setup status combines with every other filter", () => {
  const params = buildListParams({
    department_id: 2, store_id: 3, designation_id: 5, employee_id: 7, search: " raj ", setup_status: "missing",
  });
  assert.deepStrictEqual(params, {
    department_id: 2, store_id: 3, designation_id: 5, employee_id: 7, search: "raj",
    setup_status: "missing", limit: 500, offset: 0,
  });
});

test("the page takes the counts from the response, never from the rows", () => {
  assert.match(page, /setSummary\(res\.summary/, "the server's summary is what is stored");
  // The failure mode this guards: summary numbers derived from the page of
  // rows in hand, which are right only until the list is paged.
  assert.ok(!/rows\.filter\([^)]*setup_completed/.test(page), "counts must not be recomputed from rows");
  assert.ok(!/summaryCards\(\s*rows/.test(page), "cards must not be built from rows");
});

test("the page renders the cards and hands them the applied status", () => {
  assert.match(page, /<ApproverSetupSummary/);
  assert.match(page, /activeStatus=\{applied\.setup_status\}/);
  assert.match(page, /onSelect=\{selectStatus\}/);
});

test("the old 'Employees: X' header badge is gone", () => {
  assert.ok(!/Text fontSize="sm" color="gray.600">Employees:/.test(page));
});

test("Reset clears the setup status too", () => {
  assert.match(page, /const EMPTY = \{[^}]*setup_status: null/);
  assert.match(page, /const reset = \(\) => \{ setFilters\(EMPTY\); setSelectedIds\(\[\]\); setApplied\(EMPTY\); \};/);
});

test("clicking the selected card clears the filter", () => {
  assert.match(page, /applied\.setup_status === status \? null : status/);
});

test("the cards show a selected state and are keyboard reachable", () => {
  assert.match(summary, /data-selected=/);
  assert.match(summary, /aria-pressed=/);
  assert.match(summary, /onKeyDown=/);
  assert.match(summary, /borderWidth=\{card\.selected/);
});

test("a card with nothing behind it is not clickable", () => {
  assert.match(summary, /card\.status === null \|\| card\.value > 0/);
});
