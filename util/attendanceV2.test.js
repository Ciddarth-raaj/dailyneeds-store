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
  PUNCH_STATUS,
  PUNCH_STATUS_LABEL,
  canVoidPunch,
  dayPunchRows,
  dayIssue,
  otClaim,
  formatOtClock,
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
  assert.equal(dayIssue(day({ status: "NO_SHIFT_FOR_DATE" })).label, LABEL.NO_SHIFT);
  assert.equal(dayIssue(day({ status: "NO_SCHEDULE_ROW" })).label, LABEL.SHIFT_SETUP);
  assert.equal(dayIssue(day({ status: "ABSENT" })).label, LABEL.ABSENT);
});

test("the labels are the exact agreed wording", () => {
  assert.deepEqual(Object.values(LABEL).sort(), [
    "Absent",
    "Missing Punch",
    "No Shift Assigned",
    "Regularization Pending",
    "Shift Setup Issue",
  ]);
  assert.equal(REGULARIZED_PUNCH_LABEL, "Missed Punch – Regularized");
});

test("a FINAL day has no badge at all, and OT is never an attendance issue", () => {
  assert.equal(dayIssue(day()), null);
  assert.equal(dayIssue(day({ status: "FINAL", candidate_ot_minutes: 30, approved_ot_minutes: 30 })), null);
  assert.equal(dayIssue(day({ status: "FINAL", candidate_ot_minutes: 30, ot_claim_state: "AVAILABLE" })), null);
  assert.equal(dayIssue(day({ status: "FINAL", ot_claim_state: "REQUEST_PENDING" })), null);
  // A legacy stored OT_PENDING row is a normal day: no "OT Approval Pending" label exists any more.
  assert.equal(dayIssue(day({ status: "OT_PENDING" })), null);
  assert.equal(LABEL.OT_PENDING, undefined);
});

/* ===================================================== OT claim ==== */

test("1. candidate OT with no request -> OT Available with a Request OT action", () => {
  const ot = otClaim(day({ candidate_ot_minutes: 28, ot_claim_state: "AVAILABLE" }));
  assert.equal(ot.label, "OT Available: 00:28");
  assert.equal(ot.canRequest, true);
  assert.equal(ot.minutes, 28);
});

test("5. a pending request -> OT Request Pending, no Request OT action", () => {
  const ot = otClaim(day({ candidate_ot_minutes: 28, ot_claim_state: "REQUEST_PENDING", ot_requested_minutes: 28, ot_reason: "Stock count" }));
  assert.equal(ot.label, "OT Request Pending: 00:28");
  assert.equal(ot.canRequest, false);
  assert.equal(ot.detail, "Stock count");
});

test("6. approved -> OT Approved with the approved minutes", () => {
  const ot = otClaim(day({ candidate_ot_minutes: 150, approved_ot_minutes: 150, ot_claim_state: "APPROVED" }));
  assert.equal(ot.label, "OT Approved: 02:30");
  assert.equal(ot.canRequest, false);
});

test("7. rejected -> OT Rejected; closed at payroll lock says exactly why", () => {
  assert.equal(otClaim(day({ ot_claim_state: "REJECTED", ot_requested_minutes: 28 })).label, "OT Rejected");
  assert.equal(otClaim(day({ ot_claim_state: "REJECTED" })).canRequest, false);
  const closed = otClaim(day({ ot_claim_state: "CLOSED_AT_PAYROLL_LOCK", ot_closure_reason: "NOT_REQUESTED_BEFORE_PAYROLL_LOCK" }));
  assert.equal(closed.label, "OT Rejected");
  assert.equal(closed.detail, "Rejected – Not Requested Before Payroll Lock");
  assert.equal(closed.canRequest, false);
  const late = otClaim(day({ ot_claim_state: "CLOSED_AT_PAYROLL_LOCK", ot_closure_reason: "NOT_APPROVED_BEFORE_PAYROLL_LOCK" }));
  assert.equal(late.detail, "Rejected – Not Approved Before Payroll Lock");
});

test("8. no OT -> no OT line and no Request OT action", () => {
  assert.equal(otClaim(day({ candidate_ot_minutes: 0, ot_claim_state: "NONE" })), null);
  assert.equal(otClaim(day({ candidate_ot_minutes: 0 })), null);
  assert.equal(otClaim(day({ candidate_ot_minutes: 45, status: "REVIEW_REQUIRED", punch_count: 1, ot_claim_state: "NONE" })), null, "a missing-punch day offers no OT");
});

test("9. the OT minutes shown are the engine's; the claim never takes a client figure", () => {
  // The claim is built from the day's own fields only; there is no input.
  const ot = otClaim(day({ candidate_ot_minutes: 28, ot_claim_state: "AVAILABLE" }));
  assert.equal(ot.minutes, 28);
  assert.equal(formatOtClock(28), "00:28");
  assert.equal(formatOtClock(150), "02:30");
  assert.equal(formatOtClock(null), "00:00");
});

test("REVIEW_REQUIRED from an odd punch count is Missing Punch, never a generic Review Required", () => {
  const odd = day({ status: "REVIEW_REQUIRED", review_reasons: [], punch_count: 3, effective_punches: punches("09:00", "14:00", "15:00") });
  assert.equal(dayIssue(odd).label, "Missing Punch");
  for (const status of ["FINAL", "ABSENT", "REVIEW_REQUIRED", "REGULARIZATION_PENDING", "NO_SHIFT_FOR_DATE", "NO_SCHEDULE_ROW"]) {
    const issue = dayIssue(day({ status, punch_count: 1, review_reasons: ["MISSING_PUNCH"] }));
    assert.ok(!issue || !/review required/i.test(issue.label), status);
  }
});

test("only a Missing Punch day can be regularized; a pending one cannot be regularized again", () => {
  assert.equal(canRegularize(day({ status: "REVIEW_REQUIRED", review_reasons: ["MISSING_PUNCH"], punch_count: 1 })), true);
  assert.equal(canRegularize(day({ status: "REGULARIZATION_PENDING", punch_count: 1 })), false);
  assert.equal(canRegularize(day()), false);
  assert.equal(canRegularize(day({ status: "ABSENT", punch_count: 0, effective_punches: [] })), false);
  assert.equal(canRegularize(day({ status: "FINAL", ot_claim_state: "AVAILABLE", candidate_ot_minutes: 30 })), false, "OT is never regularized");
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


/* ============================================ effective punch status ==== */

test("11/12. the effective statuses carry the exact agreed wording", () => {
  assert.deepEqual(PUNCH_STATUS, { USED: "USED", IGNORED_DUPLICATE: "IGNORED_DUPLICATE", VOIDED: "VOIDED" });
  assert.equal(PUNCH_STATUS_LABEL.USED, "Used");
  assert.equal(PUNCH_STATUS_LABEL.IGNORED_DUPLICATE, "Ignored – Duplicate within 10 min");
  assert.equal(PUNCH_STATUS_LABEL.VOIDED, "Voided");
});

test("3/4/5. only a raw BIOMAX / IMPORT punch that is not already voided may be voided", () => {
  assert.equal(canVoidPunch({ source: "BIOMAX", effective_status: "USED" }), true);
  assert.equal(canVoidPunch({ source: "IMPORT", effective_status: "USED" }), true);
  assert.equal(canVoidPunch({ source: "BIOMAX", effective_status: "IGNORED_DUPLICATE" }), true, "an ignored duplicate is still a raw punch");
  assert.equal(canVoidPunch({ source: "REGULARIZED", effective_status: "USED" }), false, "never a regularized punch");
  assert.equal(canVoidPunch({ source: "BIOMAX", effective_status: "VOIDED" }), false, "never twice");
  assert.equal(canVoidPunch({ source: "BIOMAX", attendance_punch_void_id: 5 }), false, "the audit row's void id counts too");
  assert.equal(canVoidPunch(null), false);
});

test("the Day Detail rows list every punch chronologically: used ones positioned, excluded ones unpositioned with status and reason", () => {
  const d = day({
    effective_punches: [
      { punch_id: 1, source: "BIOMAX", io_time: "2026-09-14 09:00:00", effective_status: "USED" },
      { punch_id: 3, source: "IMPORT", io_time: "2026-09-14 13:00:00", effective_status: "USED" },
      { punch_id: 4, source: "BIOMAX", io_time: "2026-09-14 14:00:00", effective_status: "USED" },
      { punch_id: null, source: "REGULARIZED", io_time: "2026-09-14 21:00:00", effective_status: "USED" },
    ],
    excluded_punches: [
      { punch_id: 2, source: "BIOMAX", io_time: "2026-09-14 09:03:00", effective_status: "IGNORED_DUPLICATE", exclusion_reason: "Duplicate punch within 10 minutes", duplicate_of_punch_id: 1 },
      { punch_id: 5, source: "BIOMAX", io_time: "2026-09-14 16:30:00", effective_status: "VOIDED", exclusion_reason: "Accidental terminal scan", void: { voided_at: "2026-09-15 10:00:00", voided_by_name: "HR" } },
    ],
  });
  const rows = dayPunchRows(d);
  assert.deepEqual(rows.map((r) => r.time), ["09:00", "09:03", "13:00", "14:00", "16:30", "21:00"]);
  assert.deepEqual(rows.map((r) => r.position), [1, null, 2, 3, null, 4]);
  assert.deepEqual(rows.map((r) => r.direction), ["IN", null, "OUT", "IN", null, "OUT"]);
  assert.deepEqual(rows.map((r) => r.effective_status), ["USED", "IGNORED_DUPLICATE", "USED", "USED", "VOIDED", "REGULARIZED"]);
  assert.deepEqual(rows.map((r) => r.excluded), [false, true, false, false, true, false]);
  assert.equal(rows[1].reason, "Duplicate punch within 10 minutes");
  assert.equal(rows[4].reason, "Accidental terminal scan");
  assert.equal(rows[4].void.voided_by_name, "HR");
  // who may be voided: raw and not already voided
  assert.deepEqual(rows.map((r) => r.void_able), [true, true, true, true, false, false]);
  assert.equal(rows[5].regularized, true, "13. the regularized punch keeps its tag");
  // and the positional summary is unchanged by excluded punches
  assert.equal(punchSummary(d), "09:00 → 13:00 → 14:00 → 21:00");
});

test("a day without excluded punches renders exactly as before", () => {
  const d = day();
  assert.deepEqual(dayPunchRows(d).map((r) => [r.position, r.time, r.excluded]), positionalPunches(d).map((p) => [p.position, p.time, false]));
  assert.deepEqual(dayPunchRows({ attendance_date: "2026-09-14" }), []);
});

/* ======================================= hover explanations ==== */

const { shortExplanation, otExplanation } = require("./attendanceV2");

const snap = (o = {}) => ({
  in_time: "09:30:00",
  out_time: "18:30:00",
  shift_span_minutes: 540,
  late_grace_minutes: 10,
  early_exit_grace_minutes: 10,
  late_deduction_interval_minutes: 1,
  late_deduct_minutes: 1,
  early_exit_deduction_interval_minutes: 1,
  early_exit_deduct_minutes: 1,
  overtime_allowed: true,
  overtime_minimum_minutes: 20,
  overtime_rounding_method: "UP",
  overtime_rounding_interval_minutes: 1,
  maximum_ot_minutes_per_day: null,
  pre_shift_overtime_allowed: false,
  ...o,
});

test("Short hover explains the 5 Sep case: late inside grace, nothing short", () => {
  const lines = shortExplanation(
    day({
      shift_snapshot: snap(),
      punch_count: 2,
      nrm_minutes: 510,
      span_minutes: 538,
      break_allowance_minutes: 30,
      break_charged_minutes: 30,
      worked_minutes: 508,
      late_minutes: 2,
      early_exit_minutes: 0,
      grace_forgiven_minutes: 2,
      late_charged_minutes: 0,
      shortage_minutes: 0,
    })
  );
  assert.deepEqual(lines, [
    "Shift 09:30–18:30: 9h minus 30m break = NRM 8h 30m",
    "Punched 8h 58m from first to last punch",
    "Break charged 30m (the shift's allowance)",
    "Worked 8h 28m",
    "Late 2m (grace 10m)",
    "Grace forgave 2m",
    "Nothing short after grace",
  ]);
});

test("Short hover names a long break on a four-punch day", () => {
  const lines = shortExplanation(
    day({
      shift_snapshot: snap(),
      punch_count: 4,
      nrm_minutes: 510,
      span_minutes: 555,
      break_allowance_minutes: 30,
      actual_gap_minutes: 52,
      break_charged_minutes: 52,
      worked_minutes: 503,
      late_minutes: 0,
      early_exit_minutes: 0,
      grace_forgiven_minutes: 0,
      shortage_minutes: 7,
    })
  );
  assert.ok(lines.includes("Lunch 52m against 30m allowed – 22m over"));
  assert.equal(lines[lines.length - 1], "Short 7m");
});

test("Short hover shows the deduction rule only when the shift configures one", () => {
  const lines = shortExplanation(
    day({
      shift_snapshot: snap({ late_deduction_interval_minutes: 15, late_deduct_minutes: 30 }),
      punch_count: 2,
      nrm_minutes: 510, span_minutes: 515, break_allowance_minutes: 30, break_charged_minutes: 30,
      worked_minutes: 485, late_minutes: 25, grace_forgiven_minutes: 10, late_charged_minutes: 30, shortage_minutes: 30,
    })
  );
  assert.ok(lines.includes("Deduction rule: 30m per 15m late → 30m charged"));
});

test("Short hover hides the one-for-one 'rule' (1m per 1m) as it is just the shortage", () => {
  const lines = shortExplanation(
    day({
      shift_snapshot: snap(),
      punch_count: 2,
      nrm_minutes: 510, span_minutes: 247, break_allowance_minutes: 30, break_charged_minutes: 0,
      worked_minutes: 247, late_minutes: 27, early_exit_minutes: 266, grace_forgiven_minutes: 10,
      late_charged_minutes: 17, early_exit_charged_minutes: 236, shortage_minutes: 253,
    })
  );
  assert.ok(!lines.some((l) => /Deduction rule/.test(l)), lines.join(" | "));
  assert.equal(lines[lines.length - 1], "Short 4h 13m");
  const noLunch = shortExplanation(day({ shift_snapshot: snap(), punch_count: 2, nrm_minutes: 510, span_minutes: 247, break_allowance_minutes: 30, worked_minutes: 247, late_minutes: 27, early_exit_minutes: 266, grace_forgiven_minutes: 10, break_credit_withheld: true, shortage_minutes: 283 }));
  assert.ok(noLunch.includes("Left before 15:00: no lunch taken, break not credited"));
  assert.equal(noLunch[noLunch.length - 1], "Short 4h 43m");
});

test("Short and OT hovers say when a punch is missing or the day is absent", () => {
  assert.deepEqual(shortExplanation(day({ shift_snapshot: snap(), punch_count: 0, nrm_minutes: 510, break_allowance_minutes: 30 }))[1], "No punches: absent, nothing owed");
  assert.deepEqual(otExplanation(day({ shift_snapshot: snap(), punch_count: 3 })), ["A punch is missing, so OT is not settled yet"]);
  assert.deepEqual(shortExplanation(null), []);
  assert.deepEqual(otExplanation({ punch_count: 2 }), []);
});

test("OT hover explains the 2 Sep case: 39 minutes after out-time, minimum met", () => {
  const lines = otExplanation(
    day({
      shift_snapshot: snap(),
      punch_count: 2,
      nrm_minutes: 510, worked_minutes: 549,
      pre_shift_minutes: 0, post_shift_minutes: 39,
      raw_ot_minutes: 39, ot_offset_minutes: 0, candidate_ot_minutes: 39, approved_ot_minutes: 0,
    })
  );
  assert.deepEqual(lines, [
    "Worked 9h 9m against NRM 8h 30m: 39m over",
    "After out-time 39m",
    "Minimum OT 20m met",
    "OT 39m",
  ]);
});

test("OT hover explains a day under the minimum, and a shift with OT off", () => {
  const under = otExplanation(
    day({ shift_snapshot: snap(), punch_count: 2, nrm_minutes: 510, worked_minutes: 520, post_shift_minutes: 10, raw_ot_minutes: 10, candidate_ot_minutes: 0 })
  );
  assert.ok(under.includes("Below the 20m minimum: no OT"));
  assert.equal(under[under.length - 1], "OT 0m");
  const off = otExplanation(
    day({ shift_snapshot: snap({ overtime_allowed: false }), punch_count: 2, nrm_minutes: 510, worked_minutes: 600, post_shift_minutes: 60, candidate_ot_minutes: 0 })
  );
  assert.ok(off.includes("OT not allowed on this shift"));
});

test("OT hover shows the excluded minimum arithmetic when the shift excludes it", () => {
  const lines = otExplanation(
    day({
      shift_snapshot: snap({ overtime_minimum_excluded: true }),
      punch_count: 2,
      nrm_minutes: 510, worked_minutes: 549, post_shift_minutes: 39,
      raw_ot_minutes: 39, ot_offset_minutes: 0, candidate_ot_minutes: 19,
    })
  );
  assert.ok(lines.includes("Minimum 20m excluded: 39m − 20m = 19m"), lines.join(" | "));
  assert.equal(lines[lines.length - 1], "OT 19m");
});

test("OT hover walks the engine's chain: surplus, pre-shift dropped, minimum excluded (2 Sep, Saravanan)", () => {
  const lines = otExplanation(
    day({
      shift_snapshot: snap({ overtime_minimum_excluded: true, pre_shift_overtime_allowed: false }),
      punch_count: 4,
      nrm_minutes: 510, worked_minutes: 678,
      actual_gap_minutes: 86, break_allowance_minutes: 90,
      pre_shift_minutes: 12, post_shift_minutes: 152,
      raw_ot_minutes: 168, ot_offset_minutes: 0, candidate_ot_minutes: 136,
    })
  );
  assert.deepEqual(lines, [
    "Worked 11h 18m against NRM 8h 30m: 2h 48m over",
    "Lunch 1h 26m against 1h 30m allowed: 4m under, counted as worked",
    "Before in-time 12m dropped (pre-shift OT off): 2h 36m",
    "After out-time 2h 32m",
    "Minimum 20m excluded: 2h 36m − 20m = 2h 16m",
    "OT 2h 16m",
  ]);
});
