/**
 * Work Shift Master — the form's arithmetic and its payload shapes.
 *
 * Everything here is pure, and it is separate from the screens for the reason
 * `util/hrStatus.js` gives: there is no React test runner in this repo, so
 * logic left inside a component is logic that cannot be tested. The parts that
 * most need testing are exactly the parts that would otherwise hide in JSX —
 * the overnight duration, the HH:MM ↔ minutes conversions, and which keys the
 * backend is actually sent.
 *
 * THE BACKEND IS AUTHORITATIVE, and this file is written to stay out of its
 * way. Two consequences worth stating outright:
 *
 *   `normal_work_minutes` IS NEVER SENT. `utils/workShift.js` recomputes it
 *   from in/out/break and REJECTS a payload whose figure disagrees, so the
 *   column on screen is a display of what the backend will store, not an
 *   input. Sending our arithmetic could only ever turn a rounding difference
 *   into a failed save.
 *
 *   `copy_day` IS NOT A FIELD. Copy Day fills other rows in the browser and
 *   leaves no trace in the payload — `copyDayInto` returns rows, and the rows
 *   are what get sent.
 *
 * The validation below mirrors `utils/workShift.js` deliberately, so the user
 * hears about a blank In time before a round trip rather than after one. It
 * does not replace that validation: the backend still refuses whatever it
 * refuses, and its message is shown when it does.
 */

const MINUTES_PER_DAY = 1440;

/** 0=Sunday..6=Saturday — the backend's `day_of_week` numbering. */
const DAY_LABELS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/** The only OT multipliers the business uses; the backend enforces the same set. */
const OT_RATE_OPTIONS = [
  { value: 0, label: "0x" },
  { value: 1, label: "1x" },
  { value: 1.5, label: "1.5x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
];

const ROUNDING_METHOD_OPTIONS = [
  { value: "NONE", label: "None" },
  { value: "UP", label: "Up" },
  { value: "DOWN", label: "Down" },
  { value: "NEAREST", label: "Nearest" },
];

const MISSED_CLOCK_IN_TREATMENT_OPTIONS = [
  { value: "FULL_DAY", label: "Full Day" },
  { value: "HALF_DAY", label: "Half Day" },
  { value: "LEAVE", label: "Leave" },
];

const SHIFT_CODE_MAX_LENGTH = 20;
const SHIFT_NAME_MAX_LENGTH = 150;

/** The exact wording the two explained fields were approved with. */
const ATTENDANCE_DAY_CUTOFF_TOOLTIP =
  "Day Change is the cutoff time until which an employee can keep clocking against the same day. Clockings before it count as the prior day; after it, as the next day. Recommended: less than 2 hours after Time In and after Time Out.";

const REQUIRE_EXISTING_PUNCH_TOOLTIP =
  "If enabled, employees can submit an attendance request only when at least one clock-in or clock-out record already exists for the selected date.";

const isBlank = (value) =>
  value === undefined || value === null || String(value).trim() === "";

/* --------------------------------------------------------- conversions -- */

/**
 * A time of day — "HH:MM" or MySQL's "HH:MM:SS" — as minutes since midnight.
 *
 * Whole minutes only, and a non-zero seconds component is rejected rather than
 * truncated, matching `utils/workShift.js`: truncating would quietly change a
 * duration the backend then disagrees with.
 */
function parseTimeOfDay(value) {
  if (isBlank(value)) return null;

  const match = /^(\d{1,2}):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value).trim());
  if (!match) return null;

  const hours = Number(match[1]);
  const seconds = match[3] === undefined ? 0 : Number(match[3]);
  if (hours > 23 || seconds !== 0) return null;

  return hours * 60 + Number(match[2]);
}

/**
 * MySQL's "HH:MM:SS" (or anything `parseTimeOfDay` accepts) as the "HH:MM" an
 * `<input type="time">` needs. Blank and unparseable both become "", because
 * a time input showing garbage is worse than one showing nothing.
 */
function toTimeInputValue(value) {
  const minutes = parseTimeOfDay(value);
  return minutes === null ? "" : formatMinutesAsHoursMinutes(minutes);
}

/**
 * A DURATION written "HH:MM" as a number of minutes.
 *
 * Deliberately not `parseTimeOfDay`: a break is a length, not a clock reading,
 * so hours beyond 23 are arithmetic rather than a typo. A bare number is read
 * as minutes ("45" is 45 minutes), which is what people type when the value is
 * under an hour.
 */
function parseHoursMinutes(value) {
  if (isBlank(value)) return null;
  const text = String(value).trim();

  if (/^\d+$/.test(text)) return Number(text);

  const match = /^(\d{1,3}):([0-5]\d)$/.exec(text);
  if (!match) return null;

  return Number(match[1]) * 60 + Number(match[2]);
}

/**
 * Minutes as "HH:MM". Nothing, negative and non-numeric all give "" — never
 * "-1:-30", and never a 00:00 conjured out of a null, which in this form
 * would read as a real "no break" rather than as an absent value.
 */
function formatMinutesAsHoursMinutes(minutes) {
  if (isBlank(minutes)) return "";
  const total = Number(minutes);
  if (!Number.isFinite(total) || total < 0) return "";
  const hh = String(Math.floor(total / 60)).padStart(2, "0");
  const mm = String(Math.round(total % 60)).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Clock-to-clock length of a shift in minutes, break included.
 *
 * An Out earlier than the In is the next morning: 22:00 → 06:00 is 480
 * minutes, not −960. Equal times are 0, which callers reject for a working day
 * rather than reading as a 24-hour shift.
 */
function shiftSpanMinutes(inMinutes, outMinutes) {
  if (inMinutes === null || outMinutes === null) return null;
  if (outMinutes === inMinutes) return 0;
  return outMinutes > inMinutes
    ? outMinutes - inMinutes
    : outMinutes + MINUTES_PER_DAY - inMinutes;
}

/**
 * Out − In − Break for one row, in minutes, or null when it cannot be worked
 * out yet. Negative is returned as-is so the caller can show the row as
 * invalid instead of pretending the break fits.
 */
function normalWorkMinutes(row) {
  if (!row) return null;
  const span = shiftSpanMinutes(parseTimeOfDay(row.in_time), parseTimeOfDay(row.out_time));
  if (span === null) return null;

  const breakMinutes = isBlank(row.break_hours) ? 0 : parseHoursMinutes(row.break_hours);
  if (breakMinutes === null) return null;

  return span - breakMinutes;
}

/**
 * The read-only Normal Working Hours cell: "07:30", or "" when the row has
 * nothing to compute from, or "—" when the break swallows the shift.
 */
function normalWorkDisplay(row) {
  if (!row || !row.is_working_day) return "";
  const minutes = normalWorkMinutes(row);
  if (minutes === null) return "";
  if (minutes < 0) return "—";
  return formatMinutesAsHoursMinutes(minutes);
}

/* -------------------------------------------------------- form defaults -- */

/** One weekly row as a new shift starts: a working day with nothing filled in. */
function emptyScheduleRow(day) {
  return {
    day_of_week: day,
    is_working_day: true,
    in_time: "",
    out_time: "",
    attendance_day_cutoff: "",
    break_hours: "",
    ot_rate: 1,
  };
}

/** Always seven rows, Sunday first — a partly defined week is never a state. */
function emptyWeeklySchedule() {
  return DAY_LABELS.map((_, day) => emptyScheduleRow(day));
}

/**
 * A new Work Shift's starting values.
 *
 * The two regularization guards default ON, as approved: a new shift requires
 * an existing punch and requires approval until somebody decides otherwise.
 * Everything else starts at the column defaults in the migration, so creating
 * a shift and saving it unchanged stores what the backend would have stored.
 */
function newWorkShiftForm() {
  return {
    work_shift_id: null,
    shift_code: "",
    shift_name: "",
    active: true,

    late_grace_minutes: "0",
    late_deduction_interval_minutes: "0",
    late_deduct_minutes: "0",
    late_exclude_grace_from_deduction: false,
    late_offset_against_overtime: false,

    early_exit_grace_minutes: "0",
    early_exit_deduction_interval_minutes: "0",
    early_exit_deduct_minutes: "0",
    early_exit_offset_against_overtime: false,

    overtime_allowed: false,
    overtime_minimum_minutes: "0",
    overtime_rounding_method: "NONE",
    overtime_rounding_interval_minutes: "0",
    overtime_minimum_threshold_only: false,
    maximum_ot_minutes_per_day: "",

    pre_shift_overtime_allowed: false,
    pre_shift_overtime_minimum_minutes: "0",
    pre_shift_overtime_rounding_method: "NONE",
    pre_shift_overtime_rounding_interval_minutes: "0",

    missed_clock_in_rule_enabled: false,
    missed_clock_in_treatment: "HALF_DAY",
    minimum_hours_rule_enabled: false,
    minimum_half_day_hours: "",
    minimum_full_day_hours: "",

    regularization_allowed: false,
    regularization_control_enabled: false,
    regularization_limit_per_month: "",
    regularization_require_existing_punch: true,
    regularization_requires_approval: true,

    weekly_schedule: emptyWeeklySchedule(),
  };
}

const toBool = (value) => value === true || value === 1 || value === "1";
const toText = (value) => (value === null || value === undefined ? "" : String(value));

/**
 * A `/work-shift/details` response as form state.
 *
 * Missing weekday rows are filled in rather than dropped, so the editor always
 * renders seven days even for a shift whose schedule somehow arrived short.
 * The backend would refuse to save six days, and a screen that showed six
 * would make that refusal look arbitrary.
 */
function fromApiWorkShift(data) {
  const form = newWorkShiftForm();
  if (!data || typeof data !== "object") return form;

  const byDay = new Map();
  (Array.isArray(data.weekly_schedule) ? data.weekly_schedule : []).forEach((row) => {
    if (!row) return;
    const day = Number(row.day_of_week);
    if (!Number.isInteger(day) || day < 0 || day > 6 || byDay.has(day)) return;
    byDay.set(day, {
      day_of_week: day,
      is_working_day: toBool(row.is_working_day),
      in_time: toTimeInputValue(row.in_time),
      out_time: toTimeInputValue(row.out_time),
      attendance_day_cutoff: toTimeInputValue(row.attendance_day_cutoff),
      break_hours: formatMinutesAsHoursMinutes(row.break_minutes || 0),
      ot_rate: Number(row.ot_rate),
    });
  });

  return {
    ...form,
    work_shift_id: data.work_shift_id ?? null,
    shift_code: toText(data.shift_code),
    shift_name: toText(data.shift_name),
    active: toBool(data.active),

    late_grace_minutes: toText(data.late_grace_minutes),
    late_deduction_interval_minutes: toText(data.late_deduction_interval_minutes),
    late_deduct_minutes: toText(data.late_deduct_minutes),
    late_exclude_grace_from_deduction: toBool(data.late_exclude_grace_from_deduction),
    late_offset_against_overtime: toBool(data.late_offset_against_overtime),

    early_exit_grace_minutes: toText(data.early_exit_grace_minutes),
    early_exit_deduction_interval_minutes: toText(
      data.early_exit_deduction_interval_minutes
    ),
    early_exit_deduct_minutes: toText(data.early_exit_deduct_minutes),
    early_exit_offset_against_overtime: toBool(data.early_exit_offset_against_overtime),

    overtime_allowed: toBool(data.overtime_allowed),
    overtime_minimum_minutes: toText(data.overtime_minimum_minutes),
    overtime_rounding_method: toText(data.overtime_rounding_method) || "NONE",
    overtime_rounding_interval_minutes: toText(data.overtime_rounding_interval_minutes),
    overtime_minimum_threshold_only: toBool(data.overtime_minimum_threshold_only),
    // NULL is "no cap" and must stay an empty box, not a 0 that would cap the
    // day at nothing the moment somebody saves the form untouched.
    maximum_ot_minutes_per_day: toText(data.maximum_ot_minutes_per_day),

    pre_shift_overtime_allowed: toBool(data.pre_shift_overtime_allowed),
    pre_shift_overtime_minimum_minutes: toText(data.pre_shift_overtime_minimum_minutes),
    pre_shift_overtime_rounding_method:
      toText(data.pre_shift_overtime_rounding_method) || "NONE",
    pre_shift_overtime_rounding_interval_minutes: toText(
      data.pre_shift_overtime_rounding_interval_minutes
    ),

    missed_clock_in_rule_enabled: toBool(data.missed_clock_in_rule_enabled),
    missed_clock_in_treatment: toText(data.missed_clock_in_treatment) || "HALF_DAY",
    minimum_hours_rule_enabled: toBool(data.minimum_hours_rule_enabled),
    minimum_half_day_hours: formatMinutesAsHoursMinutes(data.minimum_half_day_minutes || 0),
    minimum_full_day_hours: formatMinutesAsHoursMinutes(data.minimum_full_day_minutes || 0),

    regularization_allowed: toBool(data.regularization_allowed),
    regularization_control_enabled: toBool(data.regularization_control_enabled),
    regularization_limit_per_month: toText(data.regularization_limit_per_month),
    regularization_require_existing_punch: toBool(data.regularization_require_existing_punch),
    regularization_requires_approval: toBool(data.regularization_requires_approval),

    weekly_schedule: DAY_LABELS.map((_, day) => byDay.get(day) || emptyScheduleRow(day)),
  };
}

/* ------------------------------------------------------------- payloads -- */

const flag = (value) => (toBool(value) ? 1 : 0);
const minutes = (value) => (isBlank(value) ? 0 : Number(String(value).trim()));
/** An empty box means NULL — "no cap", "no limit" — never 0. */
const nullableMinutes = (value) => (isBlank(value) ? null : Number(String(value).trim()));

/** The `work_shift` columns, exactly as `WORK_SHIFT_CONFIG_FIELDS` names them. */
function toConfigPayload(form) {
  return {
    shift_code: String(form.shift_code || "").trim(),
    shift_name: String(form.shift_name || "").trim(),
    active: flag(form.active),

    late_grace_minutes: minutes(form.late_grace_minutes),
    late_deduction_interval_minutes: minutes(form.late_deduction_interval_minutes),
    late_deduct_minutes: minutes(form.late_deduct_minutes),
    late_exclude_grace_from_deduction: flag(form.late_exclude_grace_from_deduction),
    late_offset_against_overtime: flag(form.late_offset_against_overtime),

    early_exit_grace_minutes: minutes(form.early_exit_grace_minutes),
    early_exit_deduction_interval_minutes: minutes(
      form.early_exit_deduction_interval_minutes
    ),
    early_exit_deduct_minutes: minutes(form.early_exit_deduct_minutes),
    early_exit_offset_against_overtime: flag(form.early_exit_offset_against_overtime),

    overtime_allowed: flag(form.overtime_allowed),
    overtime_minimum_minutes: minutes(form.overtime_minimum_minutes),
    overtime_rounding_method: form.overtime_rounding_method || "NONE",
    overtime_rounding_interval_minutes: minutes(form.overtime_rounding_interval_minutes),
    overtime_minimum_threshold_only: flag(form.overtime_minimum_threshold_only),
    maximum_ot_minutes_per_day: nullableMinutes(form.maximum_ot_minutes_per_day),

    pre_shift_overtime_allowed: flag(form.pre_shift_overtime_allowed),
    pre_shift_overtime_minimum_minutes: minutes(form.pre_shift_overtime_minimum_minutes),
    pre_shift_overtime_rounding_method: form.pre_shift_overtime_rounding_method || "NONE",
    pre_shift_overtime_rounding_interval_minutes: minutes(
      form.pre_shift_overtime_rounding_interval_minutes
    ),

    missed_clock_in_rule_enabled: flag(form.missed_clock_in_rule_enabled),
    missed_clock_in_treatment: form.missed_clock_in_treatment || "HALF_DAY",
    minimum_hours_rule_enabled: flag(form.minimum_hours_rule_enabled),
    // Typed as HH:MM, stored as minutes.
    minimum_half_day_minutes: parseHoursMinutes(form.minimum_half_day_hours) || 0,
    minimum_full_day_minutes: parseHoursMinutes(form.minimum_full_day_hours) || 0,

    regularization_allowed: flag(form.regularization_allowed),
    regularization_control_enabled: flag(form.regularization_control_enabled),
    regularization_limit_per_month: nullableMinutes(form.regularization_limit_per_month),
    regularization_require_existing_punch: flag(form.regularization_require_existing_punch),
    regularization_requires_approval: flag(form.regularization_requires_approval),
  };
}

/**
 * The seven `work_shift_weekly_schedule` rows.
 *
 * A rest day still carries whatever times were typed: the backend accepts them
 * and stores 0 working minutes, which is what lets a day be switched off and
 * back on without retyping it.
 */
function toSchedulePayload(rows) {
  return (rows || []).map((row) => ({
    day_of_week: Number(row.day_of_week),
    is_working_day: flag(row.is_working_day),
    in_time: isBlank(row.in_time) ? null : row.in_time,
    out_time: isBlank(row.out_time) ? null : row.out_time,
    attendance_day_cutoff: isBlank(row.attendance_day_cutoff)
      ? null
      : row.attendance_day_cutoff,
    break_minutes: parseHoursMinutes(row.break_hours) || 0,
    ot_rate: Number(row.ot_rate),
  }));
}

/** POST /work-shift/create — configuration flat, schedule alongside it. */
function toCreatePayload(form) {
  return {
    ...toConfigPayload(form),
    weekly_schedule: toSchedulePayload(form.weekly_schedule),
  };
}

/** POST /work-shift/update — configuration nested, both halves in one call. */
function toUpdatePayload(workShiftId, form) {
  return {
    work_shift_id: Number(workShiftId),
    work_shift_details: toConfigPayload(form),
    weekly_schedule: toSchedulePayload(form.weekly_schedule),
  };
}

/* ----------------------------------------------------------- validation -- */

const isNonNegativeInteger = (value) =>
  !isBlank(value) && /^\d+$/.test(String(value).trim());

/**
 * What the form can tell the user before it asks the server.
 *
 * @returns {{fields: object, rows: object, messages: string[]}} `fields` and
 *   `rows` are keyed for rendering beside the control that is wrong; `messages`
 *   is the same set flattened, for a summary.
 */
function validateWorkShiftForm(form) {
  const fields = {};
  const rows = {};

  const code = String(form.shift_code || "").trim();
  if (code === "") {
    fields.shift_code = "Shift Code is required";
  } else if (code.length > SHIFT_CODE_MAX_LENGTH) {
    fields.shift_code = `Shift Code must be ${SHIFT_CODE_MAX_LENGTH} characters or fewer`;
  }

  const name = String(form.shift_name || "").trim();
  if (name === "") {
    fields.shift_name = "Shift Name is required";
  } else if (name.length > SHIFT_NAME_MAX_LENGTH) {
    fields.shift_name = `Shift Name must be ${SHIFT_NAME_MAX_LENGTH} characters or fewer`;
  }

  [
    ["late_grace_minutes", "Lateness Grace Minutes"],
    ["late_deduction_interval_minutes", "Late Deduction Interval Minutes"],
    ["late_deduct_minutes", "Late Deduct Minutes"],
    ["early_exit_grace_minutes", "Early-Out Grace Minutes"],
    ["early_exit_deduction_interval_minutes", "Early-Out Deduction Interval Minutes"],
    ["early_exit_deduct_minutes", "Early-Out Deduct Minutes"],
    ["overtime_minimum_minutes", "Minimum OT Minutes"],
    ["overtime_rounding_interval_minutes", "Rounding Interval Minutes"],
    ["pre_shift_overtime_minimum_minutes", "Pre-Shift Minimum OT Minutes"],
    ["pre_shift_overtime_rounding_interval_minutes", "Pre-Shift Rounding Interval Minutes"],
  ].forEach(([key, label]) => {
    const value = form[key];
    if (isBlank(value)) return;
    if (!isNonNegativeInteger(value)) {
      fields[key] = `${label} must be a whole number of 0 or more`;
    }
  });

  [
    ["maximum_ot_minutes_per_day", "Maximum OT Minutes / Day"],
    ["regularization_limit_per_month", "Regularization Limit per Month"],
  ].forEach(([key, label]) => {
    const value = form[key];
    if (isBlank(value)) return;
    if (!isNonNegativeInteger(value)) {
      fields[key] = `${label} must be a whole number of 0 or more, or left empty`;
    }
  });

  if (toBool(form.minimum_hours_rule_enabled)) {
    [
      ["minimum_half_day_hours", "Half-Day Minimum Hours"],
      ["minimum_full_day_hours", "Full-Day Minimum Hours"],
    ].forEach(([key, label]) => {
      if (isBlank(form[key])) return;
      if (parseHoursMinutes(form[key]) === null) {
        fields[key] = `${label} must be written as HH:MM`;
      }
    });
  }

  // The backend's own cross-field rule: control on without a limit is the one
  // combination it refuses outright.
  if (toBool(form.regularization_control_enabled)) {
    const limit = form.regularization_limit_per_month;
    if (!isNonNegativeInteger(limit) || Number(limit) < 1) {
      fields.regularization_limit_per_month =
        "Enter how many times per month an employee may regularize (at least 1)";
    }
  }

  const schedule = Array.isArray(form.weekly_schedule) ? form.weekly_schedule : [];
  if (schedule.length !== 7) {
    fields.weekly_schedule = "The weekly schedule must have all 7 days";
  }

  schedule.forEach((row) => {
    if (!row) return;
    const day = Number(row.day_of_week);
    const rowErrors = {};

    const breakMinutes = isBlank(row.break_hours) ? 0 : parseHoursMinutes(row.break_hours);
    if (breakMinutes === null) {
      rowErrors.break_hours = "Break Hours must be written as HH:MM";
    }

    if (!OT_RATE_OPTIONS.some((option) => option.value === Number(row.ot_rate))) {
      rowErrors.ot_rate = "Choose one of the allowed OT rates";
    }

    if (!isBlank(row.attendance_day_cutoff) && parseTimeOfDay(row.attendance_day_cutoff) === null) {
      rowErrors.attendance_day_cutoff = "Enter the cutoff as a time of day";
    }

    if (toBool(row.is_working_day)) {
      const inMinutes = parseTimeOfDay(row.in_time);
      const outMinutes = parseTimeOfDay(row.out_time);

      if (inMinutes === null) rowErrors.in_time = "In is required on a working day";
      if (outMinutes === null) rowErrors.out_time = "Out is required on a working day";

      if (inMinutes !== null && outMinutes !== null) {
        const span = shiftSpanMinutes(inMinutes, outMinutes);
        if (span === 0) {
          rowErrors.out_time = "In and Out are the same, so the shift is 0 minutes long";
        } else if (breakMinutes !== null && span - breakMinutes < 0) {
          rowErrors.break_hours = `Break Hours is longer than the ${formatMinutesAsHoursMinutes(span)} shift`;
        }
      }
    }

    if (Object.keys(rowErrors).length > 0) rows[day] = rowErrors;
  });

  const messages = [
    ...Object.values(fields),
    ...Object.keys(rows).flatMap((day) =>
      Object.values(rows[day]).map((message) => `${DAY_LABELS[day]}: ${message}`)
    ),
  ];

  return { fields, rows, messages };
}

/* ------------------------------------------------------------- copy day -- */

/**
 * Copy one day's timing onto others. UI ONLY — it returns rows, and rows are
 * all that reach the backend; there is no `copy_day` field anywhere.
 *
 * `day_of_week` is never copied, for the obvious reason, and neither is
 * anything outside the six approved columns.
 */
function copyDayInto(rows, sourceDay, targetDays) {
  const source = (rows || []).find((row) => Number(row.day_of_week) === Number(sourceDay));
  if (!source) return rows;

  const targets = new Set((targetDays || []).map(Number));
  targets.delete(Number(sourceDay));
  if (targets.size === 0) return rows;

  return rows.map((row) =>
    targets.has(Number(row.day_of_week))
      ? {
          ...row,
          is_working_day: source.is_working_day,
          in_time: source.in_time,
          out_time: source.out_time,
          attendance_day_cutoff: source.attendance_day_cutoff,
          break_hours: source.break_hours,
          ot_rate: source.ot_rate,
        }
      : row
  );
}

/* ------------------------------------------------------------ list view -- */

/** The Status column, in the shape AgGrid's `badge-column` renders. */
function activeBadge(active) {
  return toBool(active)
    ? { label: "Active", colorScheme: "green" }
    : { label: "Inactive", colorScheme: "red" };
}

/** Simple search across the two columns the list shows by name. */
function matchesWorkShiftSearch(shift, search) {
  const term = String(search || "").trim().toLowerCase();
  if (term === "") return true;
  if (!shift) return false;
  return (
    String(shift.shift_code || "").toLowerCase().includes(term) ||
    String(shift.shift_name || "").toLowerCase().includes(term)
  );
}

module.exports = {
  MINUTES_PER_DAY,
  DAY_LABELS,
  OT_RATE_OPTIONS,
  ROUNDING_METHOD_OPTIONS,
  MISSED_CLOCK_IN_TREATMENT_OPTIONS,
  SHIFT_CODE_MAX_LENGTH,
  SHIFT_NAME_MAX_LENGTH,
  ATTENDANCE_DAY_CUTOFF_TOOLTIP,
  REQUIRE_EXISTING_PUNCH_TOOLTIP,
  parseTimeOfDay,
  toTimeInputValue,
  parseHoursMinutes,
  formatMinutesAsHoursMinutes,
  shiftSpanMinutes,
  normalWorkMinutes,
  normalWorkDisplay,
  emptyScheduleRow,
  emptyWeeklySchedule,
  newWorkShiftForm,
  fromApiWorkShift,
  toConfigPayload,
  toSchedulePayload,
  toCreatePayload,
  toUpdatePayload,
  validateWorkShiftForm,
  copyDayInto,
  activeBadge,
  matchesWorkShiftSearch,
};
