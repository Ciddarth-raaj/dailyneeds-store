/**
 * Work Shift Master — the form's arithmetic and its payload shapes.
 *
 *   node --test util/workShiftForm.test.js
 *
 * These are the parts that would be untestable if they lived in JSX, and they
 * are also the parts where being wrong is expensive: a duration that is wrong
 * across midnight, an HH:MM that reaches the backend as the wrong number of
 * minutes, or a payload key that does not exist on `work_shift`.
 *
 * `util/workShiftForm.js` is CommonJS for exactly this reason — it can be
 * required by `node --test` with no bundler, the way util/handle403.js is.
 */
const test = require("node:test");
const assert = require("node:assert");

const form = require("./workShiftForm");

const {
  DAY_LABELS,
  OT_RATE_OPTIONS,
  copyDayInto,
  formatMinutesAsHoursMinutes,
  fromApiWorkShift,
  newWorkShiftForm,
  normalWorkDisplay,
  normalWorkMinutes,
  parseHoursMinutes,
  parseTimeOfDay,
  shiftSpanMinutes,
  toCreatePayload,
  toSchedulePayload,
  toUpdatePayload,
  validateWorkShiftForm,
  activeBadge,
  matchesWorkShiftSearch,
} = form;

/** A form that passes validation, so a test can break one thing at a time. */
function validForm(overrides = {}) {
  return {
    ...newWorkShiftForm(),
    shift_code: "GEN-A",
    shift_name: "General Shift A",
    weekly_schedule: DAY_LABELS.map((_, day) => ({
      day_of_week: day,
      is_working_day: true,
      in_time: "09:00",
      out_time: "18:00",
      // Mandatory since A1; a following-morning time before the next In.
      attendance_day_cutoff: "04:00",
      break_hours: "01:00",
      ot_rate: 1,
    })),
    ...overrides,
  };
}

/* ================================================== times and durations == */

test("a time of day parses as minutes, in both the shapes the backend uses", () => {
  assert.strictEqual(parseTimeOfDay("09:30"), 570);
  // MySQL hands a TIME column back with seconds.
  assert.strictEqual(parseTimeOfDay("09:30:00"), 570);
  assert.strictEqual(parseTimeOfDay("00:00"), 0);
  assert.strictEqual(parseTimeOfDay("23:59"), 1439);
});

test("a time of day that is not one comes back null rather than as a guess", () => {
  for (const bad of ["", null, undefined, "24:00", "9:70", "half nine", "09:30:30"]) {
    assert.strictEqual(parseTimeOfDay(bad), null, `${JSON.stringify(bad)} is not a time`);
  }
});

test("a DURATION is not a time of day: HH:MM, or a bare number of minutes", () => {
  assert.strictEqual(parseHoursMinutes("01:00"), 60);
  assert.strictEqual(parseHoursMinutes("00:30"), 30);
  assert.strictEqual(parseHoursMinutes("08:15"), 495);
  // A break under an hour is usually typed as a plain number.
  assert.strictEqual(parseHoursMinutes("45"), 45);
  // And a length may exceed 23 hours, where a clock reading may not.
  assert.strictEqual(parseHoursMinutes("30:00"), 1800);
  assert.strictEqual(parseHoursMinutes("nonsense"), null);
  assert.strictEqual(parseHoursMinutes(""), null);
});

test("minutes format back to HH:MM, and never to something negative", () => {
  assert.strictEqual(formatMinutesAsHoursMinutes(450), "07:30");
  assert.strictEqual(formatMinutesAsHoursMinutes(0), "00:00");
  assert.strictEqual(formatMinutesAsHoursMinutes(60), "01:00");
  assert.strictEqual(formatMinutesAsHoursMinutes(-30), "");
  assert.strictEqual(formatMinutesAsHoursMinutes(null), "");
});

test("HH:MM survives a round trip through minutes", () => {
  for (const text of ["00:30", "01:00", "07:30", "08:00", "12:45"]) {
    assert.strictEqual(formatMinutesAsHoursMinutes(parseHoursMinutes(text)), text);
  }
});

/* ============================================== the overnight shift ===== */

test("AN OVERNIGHT SHIFT IS NOT A NEGATIVE ONE", () => {
  // 22:00 -> 06:00 is eight hours into the next morning, not minus sixteen.
  assert.strictEqual(shiftSpanMinutes(22 * 60, 6 * 60), 480);
  assert.strictEqual(shiftSpanMinutes(9 * 60, 18 * 60), 540);
  // Equal times are zero; callers reject that rather than read it as 24 hours.
  assert.strictEqual(shiftSpanMinutes(9 * 60, 9 * 60), 0);
});

test("the approved example: 22:00 to 06:00 with a 00:30 break is 07:30", () => {
  const row = {
    is_working_day: true,
    in_time: "22:00",
    out_time: "06:00",
    break_hours: "00:30",
  };
  assert.strictEqual(normalWorkMinutes(row), 450);
  assert.strictEqual(normalWorkDisplay(row), "07:30");
});

test("normal working hours are blank until there is something to compute", () => {
  assert.strictEqual(normalWorkDisplay({ is_working_day: true, in_time: "09:00" }), "");
  // A rest day has no working hours at all, whatever times it still carries.
  assert.strictEqual(
    normalWorkDisplay({ is_working_day: false, in_time: "09:00", out_time: "18:00" }),
    ""
  );
});

test("a break longer than the shift shows as invalid, not as negative hours", () => {
  const row = { is_working_day: true, in_time: "09:00", out_time: "12:00", break_hours: "04:00" };
  assert.strictEqual(normalWorkMinutes(row), -60);
  assert.strictEqual(normalWorkDisplay(row), "—");
});

/* ==================================================== the seven days ==== */

test("a new work shift starts with all seven days, Sunday first", () => {
  const rows = newWorkShiftForm().weekly_schedule;
  assert.strictEqual(rows.length, 7);
  assert.deepStrictEqual(
    rows.map((r) => r.day_of_week),
    [0, 1, 2, 3, 4, 5, 6]
  );
});

test("A SHORT SCHEDULE FROM THE SERVER IS FILLED IN, NOT RENDERED SHORT", () => {
  // The backend refuses to save six days. A screen showing six would make
  // that refusal look arbitrary, so the missing days are added as rows.
  const loaded = fromApiWorkShift({
    work_shift_id: 4,
    shift_code: "N",
    shift_name: "Night",
    weekly_schedule: [
      { day_of_week: 1, is_working_day: 1, in_time: "22:00:00", out_time: "06:00:00", break_minutes: 30, ot_rate: "1.5" },
    ],
  });
  assert.strictEqual(loaded.weekly_schedule.length, 7);
  assert.deepStrictEqual(loaded.weekly_schedule.map((r) => r.day_of_week), [0, 1, 2, 3, 4, 5, 6]);

  const monday = loaded.weekly_schedule[1];
  // MySQL's "HH:MM:SS" becomes what an <input type="time"> can hold.
  assert.strictEqual(monday.in_time, "22:00");
  assert.strictEqual(monday.out_time, "06:00");
  // Minutes become the HH:MM the break column is typed in.
  assert.strictEqual(monday.break_hours, "00:30");
  // DECIMAL arrives as a string and must not stay one, or the dropdown loses it.
  assert.strictEqual(monday.ot_rate, 1.5);
});

test("a NULL cap loads as an empty box, never as a 0 that would cap the day", () => {
  const loaded = fromApiWorkShift({
    shift_code: "A",
    shift_name: "A",
    maximum_ot_minutes_per_day: null,
    regularization_limit_per_month: null,
  });
  assert.strictEqual(loaded.maximum_ot_minutes_per_day, "");
  assert.strictEqual(loaded.regularization_limit_per_month, "");
  assert.strictEqual(toCreatePayload(loaded).maximum_ot_minutes_per_day, null);
  assert.strictEqual(toCreatePayload(loaded).regularization_limit_per_month, null);
});

test("the two regularization guards default ON for a new shift", () => {
  const fresh = newWorkShiftForm();
  assert.strictEqual(fresh.regularization_require_existing_punch, true);
  assert.strictEqual(fresh.regularization_requires_approval, true);
});

/* ======================================================== the payload === */

test("NORMAL_WORK_MINUTES IS NEVER SENT", () => {
  // utils/workShift.js recomputes it and REJECTS a payload that disagrees, so
  // sending our arithmetic could only ever turn a difference into a failure.
  const rows = toSchedulePayload(validForm().weekly_schedule);
  rows.forEach((row) => {
    assert.ok(!("normal_work_minutes" in row), "the backend computes this column");
  });
});

test("COPY_DAY IS NOT A FIELD", () => {
  const payload = toCreatePayload(validForm());
  assert.ok(!("copy_day" in payload));
  payload.weekly_schedule.forEach((row) => assert.ok(!("copy_day" in row)));
});

test("a schedule row carries exactly the columns the schedule table has", () => {
  const [sunday] = toSchedulePayload([
    {
      day_of_week: 0,
      is_working_day: true,
      in_time: "09:00",
      out_time: "18:00",
      attendance_day_cutoff: "04:00",
      break_hours: "01:00",
      ot_rate: 2,
    },
  ]);
  assert.deepStrictEqual(sunday, {
    day_of_week: 0,
    is_working_day: 1,
    in_time: "09:00",
    out_time: "18:00",
    attendance_day_cutoff: "04:00",
    break_minutes: 60,
    ot_rate: 2,
  });
});

test("an empty time is sent as NULL, not as an empty string", () => {
  const [rest] = toSchedulePayload([
    {
      day_of_week: 0,
      is_working_day: false,
      in_time: "",
      out_time: "",
      attendance_day_cutoff: "",
      break_hours: "",
      ot_rate: 1,
    },
  ]);
  assert.strictEqual(rest.in_time, null);
  assert.strictEqual(rest.out_time, null);
  assert.strictEqual(rest.attendance_day_cutoff, null);
  assert.strictEqual(rest.break_minutes, 0);
  assert.strictEqual(rest.is_working_day, 0);
});

test("half and full-day minimums are typed as hours and sent as minutes", () => {
  const payload = toCreatePayload(
    validForm({
      minimum_hours_rule_enabled: true,
      minimum_half_day_hours: "04:00",
      minimum_full_day_hours: "08:30",
    })
  );
  assert.strictEqual(payload.minimum_half_day_minutes, 240);
  assert.strictEqual(payload.minimum_full_day_minutes, 510);
  // And the HH:MM strings themselves are not sent under any name.
  assert.ok(!("minimum_half_day_hours" in payload));
  assert.ok(!("minimum_full_day_hours" in payload));
});

test("every config key the payload sends is one work_shift actually has", () => {
  // The column list, read off migrations/.../20260909200000-work-shift-phase1.
  // A key that is not here is a key `validateWorkShiftConfig` silently drops.
  const COLUMNS = new Set([
    "shift_code",
    "shift_name",
    "active",
    "late_grace_minutes",
    "late_deduction_interval_minutes",
    "late_deduct_minutes",
    "late_exclude_grace_from_deduction",
    "late_offset_against_overtime",
    "early_exit_grace_minutes",
    "early_exit_deduction_interval_minutes",
    "early_exit_deduct_minutes",
    "early_exit_offset_against_overtime",
    "overtime_allowed",
    "overtime_minimum_minutes",
    "overtime_rounding_method",
    "overtime_rounding_interval_minutes",
    "overtime_minimum_threshold_only",
    "maximum_ot_minutes_per_day",
    "pre_shift_overtime_allowed",
    "pre_shift_overtime_minimum_minutes",
    "pre_shift_overtime_rounding_method",
    "pre_shift_overtime_rounding_interval_minutes",
    "missed_clock_in_rule_enabled",
    "missed_clock_in_treatment",
    "minimum_hours_rule_enabled",
    "minimum_half_day_minutes",
    "minimum_full_day_minutes",
    "regularization_allowed",
    "regularization_control_enabled",
    "regularization_limit_per_month",
    "regularization_require_existing_punch",
    "regularization_requires_approval",
  ]);

  const payload = toCreatePayload(validForm());
  Object.keys(payload).forEach((key) => {
    if (key === "weekly_schedule") return;
    assert.ok(COLUMNS.has(key), `${key} is not a work_shift column`);
  });
  // And nothing the shift needs is missing either.
  COLUMNS.forEach((column) => assert.ok(column in payload, `${column} must be sent`));
});

test("create sends the config flat; update nests it and names the shift", () => {
  const created = toCreatePayload(validForm());
  assert.strictEqual(created.shift_code, "GEN-A");
  assert.strictEqual(created.weekly_schedule.length, 7);
  assert.ok(!("work_shift_details" in created));

  const updated = toUpdatePayload("12", validForm());
  assert.strictEqual(updated.work_shift_id, 12);
  assert.strictEqual(updated.work_shift_details.shift_code, "GEN-A");
  assert.strictEqual(updated.weekly_schedule.length, 7);
});

test("toggles are sent as the 1 and 0 the TINYINT columns hold", () => {
  const payload = toCreatePayload(validForm({ active: false, overtime_allowed: true }));
  assert.strictEqual(payload.active, 0);
  assert.strictEqual(payload.overtime_allowed, 1);
});

/* ===================================================== validation ======= */

test("Shift Code and Shift Name are the two mandatory fields", () => {
  const { fields } = validateWorkShiftForm(validForm({ shift_code: "", shift_name: "  " }));
  assert.match(fields.shift_code, /required/i);
  assert.match(fields.shift_name, /required/i);
});

test("a valid form has nothing to report", () => {
  assert.deepStrictEqual(validateWorkShiftForm(validForm()).messages, []);
});

test("a working day needs an In and an Out; a rest day does not", () => {
  const rows = validForm().weekly_schedule.map((row) =>
    row.day_of_week === 3 ? { ...row, in_time: "", out_time: "" } : row
  );
  const withBlankWednesday = validateWorkShiftForm(validForm({ weekly_schedule: rows }));
  assert.match(withBlankWednesday.rows[3].in_time, /required/i);
  assert.match(withBlankWednesday.rows[3].out_time, /required/i);

  const asRest = rows.map((row) =>
    row.day_of_week === 3 ? { ...row, is_working_day: false } : row
  );
  assert.deepStrictEqual(validateWorkShiftForm(validForm({ weekly_schedule: asRest })).messages, []);
});

test("a break longer than the shift is refused before the server sees it", () => {
  const rows = validForm().weekly_schedule.map((row) =>
    row.day_of_week === 2 ? { ...row, break_hours: "10:00" } : row
  );
  const result = validateWorkShiftForm(validForm({ weekly_schedule: rows }));
  assert.match(result.rows[2].break_hours, /longer than/i);
  assert.ok(result.messages.some((m) => m.startsWith("Tuesday:")), "the day is named");
});

test("an In equal to the Out is a zero-length shift, not a 24-hour one", () => {
  const rows = validForm().weekly_schedule.map((row) =>
    row.day_of_week === 5 ? { ...row, out_time: row.in_time } : row
  );
  assert.match(
    validateWorkShiftForm(validForm({ weekly_schedule: rows })).rows[5].out_time,
    /0 minutes/
  );
});

test("REGULARIZATION CONTROL WITHOUT A LIMIT IS THE COMBINATION THE BACKEND REFUSES", () => {
  const on = validForm({
    regularization_allowed: true,
    regularization_control_enabled: true,
    regularization_limit_per_month: "",
  });
  assert.match(validateWorkShiftForm(on).fields.regularization_limit_per_month, /at least 1/);

  // Zero is not a limit either - it would mean "never", which is the toggle.
  const zero = { ...on, regularization_limit_per_month: "0" };
  assert.ok(validateWorkShiftForm(zero).fields.regularization_limit_per_month);

  const three = { ...on, regularization_limit_per_month: "3" };
  assert.deepStrictEqual(validateWorkShiftForm(three).messages, []);
});

test("only the five approved OT rates pass", () => {
  assert.deepStrictEqual(OT_RATE_OPTIONS.map((o) => o.value), [0, 1, 1.5, 2, 3]);
  assert.deepStrictEqual(OT_RATE_OPTIONS.map((o) => o.label), ["0x", "1x", "1.5x", "2x", "3x"]);

  const rows = validForm().weekly_schedule.map((row) =>
    row.day_of_week === 0 ? { ...row, ot_rate: 2.5 } : row
  );
  assert.ok(validateWorkShiftForm(validForm({ weekly_schedule: rows })).rows[0].ot_rate);
});

test("a minutes field will not accept something that is not a whole number", () => {
  const { fields } = validateWorkShiftForm(validForm({ late_grace_minutes: "ten" }));
  assert.match(fields.late_grace_minutes, /whole number/i);
});

/* ======================================================= copy day ======= */

test("Copy Day copies the six timing columns onto the days chosen", () => {
  const rows = newWorkShiftForm().weekly_schedule.map((row) =>
    row.day_of_week === 1
      ? {
          ...row,
          is_working_day: true,
          in_time: "22:00",
          out_time: "06:00",
          attendance_day_cutoff: "04:00",
          break_hours: "00:30",
          ot_rate: 1.5,
        }
      : row
  );

  const copied = copyDayInto(rows, 1, [2, 3]);
  [2, 3].forEach((day) => {
    assert.strictEqual(copied[day].in_time, "22:00");
    assert.strictEqual(copied[day].out_time, "06:00");
    assert.strictEqual(copied[day].attendance_day_cutoff, "04:00");
    assert.strictEqual(copied[day].break_hours, "00:30");
    assert.strictEqual(copied[day].ot_rate, 1.5);
    assert.strictEqual(copied[day].is_working_day, true);
    // The one thing that is never copied, for the obvious reason.
    assert.strictEqual(copied[day].day_of_week, day);
  });

  // Untouched days really are untouched.
  assert.strictEqual(copied[4].in_time, "");
  assert.strictEqual(copied[0].in_time, "");
});

test("Copy Day onto nothing, or onto itself, changes nothing", () => {
  const rows = validForm().weekly_schedule;
  assert.strictEqual(copyDayInto(rows, 1, []), rows);
  assert.strictEqual(copyDayInto(rows, 1, [1]), rows);
  assert.strictEqual(copyDayInto(rows, 99, [1]), rows);
});

test("a rest day copied onto a working day makes it a rest day", () => {
  const rows = validForm().weekly_schedule.map((row) =>
    row.day_of_week === 0 ? { ...row, is_working_day: false } : row
  );
  const copied = copyDayInto(rows, 0, [6]);
  assert.strictEqual(copied[6].is_working_day, false);
});

/* ========================================================= the list ===== */

test("the status column reads Active or Inactive, never 1 or 0", () => {
  assert.deepStrictEqual(activeBadge(1), { label: "Active", colorScheme: "green" });
  assert.deepStrictEqual(activeBadge(0), { label: "Inactive", colorScheme: "red" });
});

test("search matches on shift code or shift name, either case", () => {
  const shift = { shift_code: "GEN-A", shift_name: "General Shift A" };
  assert.ok(matchesWorkShiftSearch(shift, ""));
  assert.ok(matchesWorkShiftSearch(shift, "gen-a"));
  assert.ok(matchesWorkShiftSearch(shift, "GENERAL"));
  assert.ok(matchesWorkShiftSearch(shift, " shift "));
  assert.ok(!matchesWorkShiftSearch(shift, "night"));
});

/* ============================================ attendance day cutoff (A1/A2) */

test("a working day without an Attendance Day Cutoff cannot be saved", () => {
  const f = validForm();
  f.weekly_schedule[2].attendance_day_cutoff = "";
  const { rows, messages } = validateWorkShiftForm(f);
  assert.strictEqual(rows[2].attendance_day_cutoff, "Attendance Day Cutoff is required on a working day");
  assert.ok(messages.some((m) => m.startsWith("Tuesday:")));
});

test("a rest day needs no cutoff", () => {
  const f = validForm();
  f.weekly_schedule[0] = { day_of_week: 0, is_working_day: false, attendance_day_cutoff: "", ot_rate: 1 };
  assert.deepStrictEqual(validateWorkShiftForm(f).messages, []);
});

test("the cutoff must be before the next working day's In time, skipping rest days and wrapping the week", () => {
  const f = validForm();
  // Every day works 09:00-18:00; a 09:00 cutoff collides with the next In.
  f.weekly_schedule[1].attendance_day_cutoff = "09:00";
  let { rows } = validateWorkShiftForm(f);
  assert.match(rows[1].attendance_day_cutoff, /before Tuesday's In time 09:00/);

  // Sunday rest: Saturday's next working day is Monday.
  f.weekly_schedule[1].attendance_day_cutoff = "04:00";
  f.weekly_schedule[0] = { day_of_week: 0, is_working_day: false, ot_rate: 1 };
  f.weekly_schedule[6].attendance_day_cutoff = "10:00";
  ({ rows } = validateWorkShiftForm(f));
  assert.match(rows[6].attendance_day_cutoff, /before Monday's In time 09:00/);

  f.weekly_schedule[6].attendance_day_cutoff = "08:59";
  assert.deepStrictEqual(validateWorkShiftForm(f).messages, []);
});

test("the tooltip says the cutoff is a following-morning time and is required", () => {
  assert.match(form.ATTENDANCE_DAY_CUTOFF_TOOLTIP, /following morning/);
  assert.match(form.ATTENDANCE_DAY_CUTOFF_TOOLTIP, /Required on every working day/);
});
