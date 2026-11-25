/**
 * EMPLOYMENT DETAILS -> ATTENDANCE CALCULATION TYPE - the pure part.
 *
 * MIRRORS `utils/attendance_calculation_mode.js` IN THE BACKEND, which owns
 * the rule. The setting is employee-level and EFFECTIVE-DATED: every change
 * says the date it applies from, and dates before it keep the mode they had.
 *
 *   Shift Based          the default; attendance is calculated against the
 *                        shift exactly as it always has been.
 *   Present/Absent Only  any valid attendance on a date is Present - one
 *                        complete payable day - and none is Absent. No
 *                        shift, late, early, shortage or OT.
 *
 * CommonJS so `node --test util/attendanceCalculationMode.test.js` runs it
 * without a bundler.
 */

const { displayDate } = require("./displayDate");

const ATTENDANCE_MODE = Object.freeze({
  SHIFT_BASED: "SHIFT_BASED",
  PRESENT_ABSENT_ONLY: "PRESENT_ABSENT_ONLY",
});

const ATTENDANCE_MODE_LABEL = Object.freeze({
  SHIFT_BASED: "Shift Based",
  PRESENT_ABSENT_ONLY: "Present/Absent Only",
});

/** `EditField` options, in the order the request lists them. */
const ATTENDANCE_MODE_OPTIONS = [
  { value: ATTENDANCE_MODE.SHIFT_BASED, label: ATTENDANCE_MODE_LABEL.SHIFT_BASED },
  { value: ATTENDANCE_MODE.PRESENT_ABSENT_ONLY, label: ATTENDANCE_MODE_LABEL.PRESENT_ABSENT_ONLY },
];

/** The mode in force today, from the GET answer. No answer is Shift Based. */
function currentAttendanceMode(data) {
  return data && data.current_mode ? data.current_mode : ATTENDANCE_MODE.SHIFT_BASED;
}

/**
 * The read-only line: the mode in force today, where it came from, and any
 * change already scheduled - "Shift Based · Present/Absent Only from
 * 01/10/2026".
 */
function attendanceModeSummary(data) {
  if (!data) return "";
  const mode = currentAttendanceMode(data);
  let text = ATTENDANCE_MODE_LABEL[mode] || mode;
  if (data.current_effective_from) text += ` (since ${displayDate(data.current_effective_from)})`;
  if (data.upcoming && data.upcoming.calculation_mode) {
    const next = ATTENDANCE_MODE_LABEL[data.upcoming.calculation_mode] || data.upcoming.calculation_mode;
    text += ` · ${next} from ${displayDate(data.upcoming.effective_from)}`;
  }
  return text;
}

/**
 * Whether the edit form asks for a change, and the body to send.
 *
 * A change is asked for when an Effective From is entered, or the selected
 * type differs from today's. A different type with no date is refused here,
 * because the server would refuse it too: the mode has to say which date it
 * applies from, and "today" is never assumed.
 *
 * @returns {{changed: boolean, error: string|null, payload: object|null}}
 */
function attendanceModeChange(form, data) {
  const selected = (form && form.attendance_calculation_mode) || currentAttendanceMode(data);
  const effectiveFrom = form && form.attendance_mode_effective_from ? String(form.attendance_mode_effective_from) : "";
  const differs = selected !== currentAttendanceMode(data);
  if (!effectiveFrom && !differs) return { changed: false, error: null, payload: null };
  if (!effectiveFrom) {
    return {
      changed: true,
      error: "Enter the Effective From date for the Attendance Calculation Type.",
      payload: null,
    };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom)) {
    return { changed: true, error: "Effective From must be a date.", payload: null };
  }
  return {
    changed: true,
    error: null,
    payload: { calculation_mode: selected, effective_from: effectiveFrom },
  };
}

module.exports = {
  ATTENDANCE_MODE,
  ATTENDANCE_MODE_LABEL,
  ATTENDANCE_MODE_OPTIONS,
  currentAttendanceMode,
  attendanceModeSummary,
  attendanceModeChange,
};
