/**
 * The Telegram Attendance Mini App - the pure rules.
 *
 *   node --test util/telegramAttendance.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  DATE_STATE,
  navigationHint,
  dateCard,
  stateColor,
  buildSubmission,
  calendarDateFor,
} = require("./telegramAttendance");
const attendanceV2 = require("./attendanceV2");

test("the ?date= parameter is a navigation hint and is validated as one", () => {
  assert.equal(navigationHint("?date=2026-09-18"), "2026-09-18");
  assert.equal(navigationHint("?foo=1&date=2026-09-18&bar=2"), "2026-09-18");
  // Anything that is not a plain date is simply not a hint.
  assert.equal(navigationHint("?date=yesterday"), null);
  assert.equal(navigationHint("?date="), null);
  assert.equal(navigationHint("?employee_id=78"), null);
  assert.equal(navigationHint(""), null);
  assert.equal(navigationHint(undefined), null);
});

/**
 * THE POINT OF THE HINT: it carries a date and can carry nothing else. Even
 * if a Telegram message were ever built with an employee id in the URL, this
 * is the only thing the page reads out of it.
 */
test("nothing but a date can be read out of the URL", () => {
  assert.equal(navigationHint("?employee_id=78&date=2026-09-18"), "2026-09-18");
  const fns = require("./telegramAttendance");
  assert.ok(!Object.keys(fns).some((k) => /employee/i.test(k)));
});

test("a card carries the date, its label and the SERVER's can_submit", () => {
  const card = dateCard({
    attendance_date: "2026-09-18",
    state: DATE_STATE.ACTIONABLE,
    state_label: "Missing Attendance",
    can_submit: true,
  });
  assert.equal(card.title, "18 Sep 2026");
  assert.equal(card.label, "Missing Attendance");
  assert.equal(card.can_submit, true);
  assert.equal(card.state, DATE_STATE.ACTIONABLE);
});

test("a pending date is shown as pending and is not submittable", () => {
  const card = dateCard({
    attendance_date: "2026-09-15",
    state: DATE_STATE.PENDING,
    state_label: "Regularisation Pending",
    can_submit: false,
  });
  assert.equal(card.label, "Regularisation Pending");
  assert.equal(card.can_submit, false);
  assert.notEqual(stateColor(DATE_STATE.PENDING), stateColor(DATE_STATE.ACTIONABLE));
});

test("a card never carries a punch count, whatever the row holds", () => {
  const card = dateCard({
    attendance_date: "2026-09-18",
    state: DATE_STATE.ACTIONABLE,
    state_label: "Missing Attendance",
    can_submit: true,
    punch_count: 3,
    punch_times: ["10:00"],
  });
  assert.ok(!Object.keys(card).some((k) => /punch/i.test(k)), Object.keys(card).join(","));
});

test("both a time and a reason are required", () => {
  const day = { attendance_date: "2026-09-17" };
  assert.match(buildSubmission(day, "", "Forgot to punch out").error, /time/i);
  assert.match(buildSubmission(day, "25-00", "Forgot to punch out").error, /time/i);
  assert.match(buildSubmission(day, "19:30", "").error, /reason/i);
  assert.match(buildSubmission(day, "19:30", "  ok ").error, /reason/i);
  assert.equal(buildSubmission(null, "19:30", "Forgot to punch out").body, undefined);
});

test("a submission is EXACTLY a date, a punch time and a reason", () => {
  const { body } = buildSubmission({ attendance_date: "2026-09-17" }, "19:30", " Forgot to punch out ");
  assert.deepEqual(Object.keys(body).sort(), ["attendance_date", "punch_time", "reason"]);
  assert.equal(body.reason, "Forgot to punch out");
  assert.ok(!/employee/i.test(JSON.stringify(body)));
  assert.ok(!/punch_id/.test(JSON.stringify(body)));
});

/**
 * THERE IS ONE DEFINITION OF HOW A PUNCH TIME IS BUILT, and it is the web
 * screen's. A 00:30 finish on a shift whose attendance-day cutoff is 04:00
 * belongs to attendance date 17 Sep but calendar date 18 Sep, and both
 * screens must say so identically - so this asserts the Mini App's helper IS
 * `util/attendanceV2.js#calendarDateFor`, not a copy that agrees today.
 */
test("the punch timestamp is built by the SAME function the web form uses", () => {
  assert.equal(calendarDateFor, attendanceV2.calendarDateFor);

  const nightShift = {
    attendance_date: "2026-09-17",
    shift_snapshot: { attendance_day_cutoff: "04:00:00" },
  };
  const { body } = buildSubmission(nightShift, "00:30", "Forgot to punch out");
  assert.equal(body.attendance_date, "2026-09-17");
  assert.equal(body.punch_time, "2026-09-18 00:30:00");

  const daytime = buildSubmission(nightShift, "19:30", "Forgot to punch out");
  assert.equal(daytime.body.punch_time, "2026-09-17 19:30:00");
});

/* ============================================ month navigation ==== */

test("month arithmetic crosses year boundaries in both directions", () => {
  const { previousMonth, nextMonth } = require("./telegramAttendance");
  assert.equal(previousMonth("2026-01"), "2025-12");
  assert.equal(nextMonth("2026-12"), "2027-01");
  assert.equal(previousMonth("2026-09"), "2026-08");
  assert.equal(nextMonth("2026-09"), "2026-10");
  // Not a month: handed back rather than turned into a guess.
  assert.equal(nextMonth("nonsense"), "nonsense");
});

test("forward navigation stops at the current month - never the future", () => {
  const { canGoNext } = require("./telegramAttendance");
  const now = new Date("2026-09-19T00:00:00Z");
  assert.equal(canGoNext("2026-07", now), true);
  assert.equal(canGoNext("2026-08", now), true);
  // Standing on September, October is not offered.
  assert.equal(canGoNext("2026-09", now), false);
  assert.equal(canGoNext("2026-10", now), false);
  // Backwards is never limited - an employee may read any past month.
  assert.equal(canGoNext("2024-01", now), true);
});

test("the month label is human, and the default section is My Attendance", () => {
  const { monthLabel, SECTION, DEFAULT_SECTION } = require("./telegramAttendance");
  assert.equal(monthLabel("2026-09"), "Sep 2026");
  assert.equal(monthLabel("2026-01"), "Jan 2026");
  assert.equal(DEFAULT_SECTION, SECTION.ATTENDANCE);
});

test("every correction state has its own label colour", () => {
  const { DATE_STATE, stateColor } = require("./telegramAttendance");
  const colors = [
    DATE_STATE.ACTIONABLE,
    DATE_STATE.PENDING,
    DATE_STATE.APPROVED,
    DATE_STATE.REJECTED,
  ].map(stateColor);
  assert.equal(new Set(colors).size, 4, `distinct colours, got ${colors.join(",")}`);
});

test("an approved or rejected card carries the server's verdict, not a guess", () => {
  const { dateCard, DATE_STATE } = require("./telegramAttendance");
  const approved = dateCard({
    attendance_date: "2026-09-12",
    state: DATE_STATE.APPROVED,
    state_label: "Regularised",
    can_submit: false,
  });
  assert.equal(approved.label, "Regularised");
  assert.equal(approved.can_submit, false);

  // A rejection leaves the date submittable again - the backend's rule.
  const rejected = dateCard({
    attendance_date: "2026-09-12",
    state: DATE_STATE.REJECTED,
    state_label: "Regularisation Rejected",
    can_submit: true,
  });
  assert.equal(rejected.can_submit, true);
});
