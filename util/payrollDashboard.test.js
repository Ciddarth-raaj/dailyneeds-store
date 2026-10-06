/**
 * Payroll Dashboard - the screen's pure helpers.
 *
 *   node --test util/payrollDashboard.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const U = require("./payrollDashboard");
const { cardForStage } = require("./payrunTabs");

test("compact INR uses lakh and crore", () => {
  assert.equal(U.compactINR("2907375.00"), "₹29.07L");
  assert.equal(U.compactINR(14600000), "₹1.46Cr");
  assert.equal(U.compactINR(45200), "₹45.2K");
  assert.equal(U.compactINR(950), "₹950");
  assert.equal(U.compactINR(100000), "₹1L");
  assert.equal(U.compactINR("-250000"), "-₹2.5L");
  assert.equal(U.compactINR(null), "—");
  assert.equal(U.compactINR("abc"), "—");
});

test("full INR keeps Indian grouping and paise", () => {
  assert.equal(U.formatINR("2907375"), "₹29,07,375.00");
  assert.equal(U.formatINR(null), "—");
});

test("financial year selection runs April to March", () => {
  assert.equal(U.financialYearOf(2026, 3), 2025);
  assert.equal(U.financialYearOf(2026, 4), 2026);
  assert.equal(U.fyLabel(2026), "FY 2026-27");
  assert.deepEqual(U.fyOptions(2026, 2), [2026, 2025, 2024]);
  const months = U.financialYearMonths(2026);
  assert.deepEqual([months[0], months[11]], [{ year: 2026, month: 4 }, { year: 2027, month: 3 }]);
  assert.equal(U.shortMonthLabel(2027, 3), "MAR '27");
});

test("the dashboard opens on the latest started month, else today's, else April", () => {
  const strip = U.financialYearMonths(2026).map((m) => ({ ...m, initialized: m.month >= 4 && m.month <= 8 && m.year === 2026 ? 10 : 0 }));
  assert.deepEqual(U.defaultMonth(strip, 2026, { year: 2026, month: 10 }), { year: 2026, month: 8 });
  const empty = strip.map((m) => ({ ...m, initialized: 0 }));
  assert.deepEqual(U.defaultMonth(empty, 2026, { year: 2026, month: 10 }), { year: 2026, month: 10 }, "not-started payroll: today's month");
  assert.deepEqual(U.defaultMonth(empty, 2024, { year: 2026, month: 10 }), { year: 2024, month: 4 });
  assert.deepEqual(U.defaultMonth(null, 2024, null), { year: 2024, month: 4 });
});

test("comparison choices span two financial years and exclude the selected month", () => {
  const choices = U.comparisonChoices({ year: 2026, month: 8 }, 2026);
  assert.equal(choices.length, 23);
  assert.ok(!choices.some((c) => c.key === "2026-8"));
  assert.equal(choices[0].key, "2027-3");
  assert.deepEqual(U.parseMonthKey("2026-7"), { year: 2026, month: 7 });
  assert.equal(U.parseMonthKey("bad"), null);
  assert.deepEqual(U.previousMonth({ year: 2026, month: 1 }), { year: 2025, month: 12 });
});

test("filters are dependent: location clears department and designation, department clears designation", () => {
  let f = { store_id: "1", department_id: "10", designation_id: "100" };
  f = U.nextFilters(f, "store_id", "2");
  assert.deepEqual(f, { store_id: "2", department_id: "", designation_id: "" });
  f = U.nextFilters({ store_id: "2", department_id: "10", designation_id: "100" }, "department_id", "11");
  assert.deepEqual(f, { store_id: "2", department_id: "11", designation_id: "" });
  f = U.nextFilters(f, "designation_id", 7);
  assert.deepEqual(f, { store_id: "2", department_id: "11", designation_id: "7" });
  assert.equal(U.hasFilters(U.EMPTY_FILTERS), false);
  assert.equal(U.hasFilters(f), true);
});

test("only set filters are sent", () => {
  assert.deepEqual(U.filterParams({ store_id: "2", department_id: "", designation_id: null }), { store_id: "2" });
  assert.deepEqual(U.filterParams(U.EMPTY_FILTERS), {});
});

test("difference direction reads the sign only", () => {
  assert.equal(U.direction("120.00"), "up");
  assert.equal(U.direction("-3"), "down");
  assert.equal(U.direction("0.00"), "flat");
  assert.equal(U.direction(null), "flat");
});

test("Payrun links carry month, stage, card, filters and the employee", () => {
  const href = U.payrunHref({ year: 2026, month: 8, stage: "CALCULATION", card: "ATTENDANCE_NEEDS_ACTION", store_id: "2", department_id: "", search: "77" });
  assert.equal(href, "/payroll/payrun?year=2026&month=8&stage=CALCULATION&card=ATTENDANCE_NEEDS_ACTION&store_id=2&search=77");
  const back = U.parsePayrunLink(Object.fromEntries(new URLSearchParams(href.split("?")[1])));
  assert.deepEqual(
    [back.year, back.month, back.stage, back.card, back.store_id, back.department_id, back.search, back.present],
    [2026, 8, "CALCULATION", "ATTENDANCE_NEEDS_ACTION", "2", "", "77", true]
  );
  assert.equal(U.payrunHref({}), "/payroll/payrun");
  assert.equal(U.payrunHref({ stage: "DROP", card: "a;b" }), "/payroll/payrun");
});

test("a malformed link is dropped, never guessed", () => {
  const l = U.parsePayrunLink({ year: "1999", month: "13", stage: "nope", card: "<script>", store_id: "1 OR 1=1", search: ["a", "b"] });
  assert.deepEqual([l.year, l.month, l.stage, l.card, l.store_id, l.search], [null, null, null, null, "", "a"]);
  assert.equal(U.parsePayrunLink({}).present, false);
});

test("a linked card must be one of that stage's own cards", () => {
  assert.equal(cardForStage("CALCULATION", "READY_FOR_APPROVAL"), "READY_FOR_APPROVAL");
  assert.equal(cardForStage("INITIALIZATION", "BLOCKED"), "BLOCKED");
  assert.equal(cardForStage("ADJUSTMENTS", "NO_ADJUSTMENT_PENDING_CONFIRMATION"), "NO_ADJUSTMENT_PENDING_CONFIRMATION");
  assert.equal(cardForStage("CALCULATION", "BLOCKED"), "ALL", "an Initialization card does not apply to Calculation");
  assert.equal(cardForStage("INITIALIZATION", "ALL"), "ALL");
});

test("the outstanding-actions headline ignores empty and low-severity items", () => {
  const items = [
    { key: "A", severity: "high", count: 2 },
    { key: "B", severity: "high", count: 0 },
    { key: "C", severity: "low", count: 9 },
    { key: "D", severity: "medium", count: 1 },
  ];
  assert.deepEqual(U.outstandingActions(items).map((a) => a.key), ["A", "D"]);
  assert.equal(U.severityTone("high"), "red");
});
