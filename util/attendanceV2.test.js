/**
 * Attendance v2 screens - the pure rules.
 *
 *   node --test util/attendanceV2.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const {
  LABEL,
  REGULARIZED_PUNCH_LABEL,
  dayIssue,
  canRegularize,
  positionalPunches,
  punchSummary,
  formatMinutes,
  weekday,
  displayDate,
  monthBounds,
  calendarDateFor,
  shiftLabel,
  apiMessage,
  isOk,
} = require("./attendanceV2");

const punches = (...times) => times.map((t, i) => ({ punch_id: i + 1, source: "BIOMAX", io_time: `2026-09-14 ${t}:00` }));
const day = (overrides = {}) => ({
  attendance_date: "2026-09-14",
  status: "FINAL",
  review_reasons: [],
  punch_count: 2,
  effective_punches: punches("09:18", "22:02"),
  ...overrides,
});

/* ================================================== status mapping ==== */

test("backend statuses map to exactly the agreed labels", () => {
  assert.equal(dayIssue(day({ status: "REVIEW_REQUIRED", review_reasons: ["MISSING_PUNCH"], punch_count: 1 })).label, LABEL.MISSING_PUNCH);
  assert.equal(dayIssue(day({ status: "REGULARIZATION_PENDING" })).label, LABEL.REGULARIZATION_PENDING);
  assert.equal(dayIssue(day({ status: "OT_PENDING" })).label, LABEL.OT_PENDING);
  assert.equal(dayIssue(day({ status: "NO_SHIFT_FOR_DATE" })).label, LABEL.NO_SHIFT);
  assert.equal(dayIssue(day({ status: "NO_SCHEDULE_ROW" })).label, LABEL.SHIFT_SETUP);
  assert.equal(dayIssue(day({ status: "ABSENT" })).label, LABEL.ABSENT);
});

test("the labels are the exact agreed wording", () => {
  assert.deepEqual(Object.values(LABEL).sort(), [
    "Absent",
    "Missing Punch",
    "No Shift Assigned",
    "OT Approval Pending",
    "Regularization Pending",
    "Shift Setup Issue",
  ]);
  assert.equal(REGULARIZED_PUNCH_LABEL, "Missed Punch – Regularized");
});

test("a FINAL day has no badge at all", () => {
  assert.equal(dayIssue(day()), null);
  assert.equal(dayIssue(day({ status: "FINAL", candidate_ot_minutes: 30, approved_ot_minutes: 30 })), null);
});

test("REVIEW_REQUIRED from an odd punch count is Missing Punch, never a generic Review Required", () => {
  const odd = day({ status: "REVIEW_REQUIRED", review_reasons: [], punch_count: 3, effective_punches: punches("09:00", "14:00", "15:00") });
  assert.equal(dayIssue(odd).label, "Missing Punch");
  for (const status of ["FINAL", "ABSENT", "REVIEW_REQUIRED", "REGULARIZATION_PENDING", "OT_PENDING", "NO_SHIFT_FOR_DATE", "NO_SCHEDULE_ROW"]) {
    const issue = dayIssue(day({ status, punch_count: 1, review_reasons: ["MISSING_PUNCH"] }));
    assert.ok(!issue || !/review required/i.test(issue.label), status);
  }
});

test("only a Missing Punch day can be regularized; a pending one cannot be regularized again", () => {
  assert.equal(canRegularize(day({ status: "REVIEW_REQUIRED", review_reasons: ["MISSING_PUNCH"], punch_count: 1 })), true);
  assert.equal(canRegularize(day({ status: "REGULARIZATION_PENDING", punch_count: 1 })), false);
  assert.equal(canRegularize(day()), false);
  assert.equal(canRegularize(day({ status: "ABSENT", punch_count: 0, effective_punches: [] })), false);
  assert.equal(canRegularize(day({ status: "OT_PENDING" })), false);
});

/* ================================================= dynamic punches ==== */

test("two punches: IN then OUT", () => {
  const p = positionalPunches(day());
  assert.deepEqual(p.map((x) => [x.position, x.time, x.direction]), [[1, "09:18", "IN"], [2, "22:02", "OUT"]]);
  assert.equal(punchSummary(day()), "09:18 → 22:02");
});

test("four punches: positional IN/OUT, joined with arrows", () => {
  const d = day({ effective_punches: punches("09:18", "14:23", "15:49", "22:02") });
  assert.deepEqual(positionalPunches(d).map((x) => x.direction), ["IN", "OUT", "IN", "OUT"]);
  assert.equal(punchSummary(d), "09:18 → 14:23 → 15:49 → 22:02");
});

test("six and more punches render every one - there are no fixed Clk1-Clk4 slots", () => {
  const six = day({ effective_punches: punches("08:00", "10:00", "10:30", "13:00", "13:45", "18:00") });
  assert.equal(positionalPunches(six).length, 6);
  assert.deepEqual(positionalPunches(six).map((x) => x.direction), ["IN", "OUT", "IN", "OUT", "IN", "OUT"]);
  assert.equal(punchSummary(six), "08:00 → 10:00 → 10:30 → 13:00 → 13:45 → 18:00");

  const nine = day({ effective_punches: punches("08:00", "09:00", "09:10", "10:00", "10:10", "11:00", "11:10", "12:00", "12:10") });
  assert.equal(positionalPunches(nine).length, 9);
  assert.equal(positionalPunches(nine)[8].direction, "IN");
  assert.equal(punchSummary(nine).split(" → ").length, 9);
});

test("no punches renders nothing rather than dashes in fixed slots", () => {
  assert.deepEqual(positionalPunches(day({ effective_punches: [] })), []);
  assert.equal(punchSummary(day({ effective_punches: [] })), "");
  assert.equal(punchSummary({}), "");
});

test("a regularized punch is flagged for the 'Missed Punch – Regularized' note", () => {
  const d = day({
    effective_punches: [
      { punch_id: 1, source: "BIOMAX", io_time: "2026-09-14 09:18:00" },
      { punch_id: null, source: "REGULARIZED", io_time: "2026-09-14 22:05:00" },
    ],
  });
  assert.deepEqual(positionalPunches(d).map((x) => x.regularized), [false, true]);
});

/* ===================================================== formatting ==== */

test("minutes are shown as hours and minutes, never rounded", () => {
  assert.equal(formatMinutes(0), "0m");
  assert.equal(formatMinutes(45), "45m");
  assert.equal(formatMinutes(60), "1h");
  assert.equal(formatMinutes(450), "7h 30m");
  assert.equal(formatMinutes(661), "11h 1m");
  assert.equal(formatMinutes(null), "—");
});

test("weekday and display date are computed with UTC maths", () => {
  assert.equal(weekday("2026-09-13"), "Sun");
  assert.equal(weekday("2026-09-14"), "Mon");
  assert.equal(displayDate("2026-09-14"), "14 Sep 2026");
});

test("a month becomes its first and last date", () => {
  assert.deepEqual(monthBounds("2026-09"), { from_date: "2026-09-01", to_date: "2026-09-30" });
  assert.deepEqual(monthBounds("2028-02"), { from_date: "2028-02-01", to_date: "2028-02-29" });
  assert.equal(monthBounds("2026-13"), null);
  assert.equal(monthBounds(""), null);
});

test("the shift label carries the name and the hours", () => {
  assert.equal(shiftLabel(day({ shift_name: "Late Shift", shift_snapshot: { shift_code: "LATE", in_time: "10:00:00", out_time: "22:00:00" } })), "Late Shift (10:00–22:00)");
  assert.equal(shiftLabel(day({ shift_snapshot: { shift_code: "LATE" } })), "LATE");
  assert.equal(shiftLabel(day({ status: "NO_SHIFT_FOR_DATE", shift_snapshot: null })), "—");
});

/* ======================================= the regularization time ==== */

test("a time before the shift's cutoff is after midnight: next calendar day, same attendance date", () => {
  const late = day({ shift_snapshot: { attendance_day_cutoff: "04:00:00" } });
  assert.equal(calendarDateFor(late, "00:30"), "2026-09-15");
  assert.equal(calendarDateFor(late, "22:05"), "2026-09-14");
  assert.equal(calendarDateFor(late, "04:00"), "2026-09-14");
  assert.equal(calendarDateFor(day({ shift_snapshot: null }), "00:30"), "2026-09-14");
});

/* ============================================== API answers ==== */

test("backend validation and conflict messages are shown as they are", () => {
  assert.equal(apiMessage({ code: 422, msg: "ValidationError: There is already an open request for 2026-09-14 (#480)" }), "There is already an open request for 2026-09-14 (#480)");
  assert.equal(apiMessage({ code: 403, msg: "You do not have permission to perform this action" }), "You do not have permission to perform this action");
  assert.equal(apiMessage(null, "fallback"), "fallback");
  assert.equal(isOk({ code: 200 }), true);
  assert.equal(isOk({ code: 403 }), false);
});
