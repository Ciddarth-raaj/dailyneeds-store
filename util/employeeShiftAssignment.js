/**
 * Employee Shift Assignment — the rules, away from the screen.
 *
 * The label format, the confirmation sentence and the payload shape are here
 * rather than inline in the page for the same reason `util/workShiftForm.js`
 * exists: they are the parts with actual decisions in them, and a decision
 * inside JSX cannot be tested in this repo.
 *
 * NOT the legacy shift. Nothing in this module reads `shift_id`, `shift_code`
 * on an employee, or anything from `shift_master`. The only shift it knows
 * about is the work shift the backend returns as `work_shift_code` /
 * `work_shift_name`.
 */

/** The three assignment-status choices, matching what the backend accepts. */
const ASSIGNMENT_STATUS = {
  ALL: "ALL",
  ASSIGNED: "ASSIGNED",
  UNASSIGNED: "UNASSIGNED",
};

/**
 * Dropdown options, in the order they are offered.
 *
 * "Unassigned" is deliberately not buried at the bottom of a longer list:
 * during initial setup it is the filter HR works from, and every employee
 * starts there.
 */
const ASSIGNMENT_STATUS_OPTIONS = [
  { value: ASSIGNMENT_STATUS.ALL, label: "All" },
  { value: ASSIGNMENT_STATUS.ASSIGNED, label: "Assigned" },
  { value: ASSIGNMENT_STATUS.UNASSIGNED, label: "Unassigned" },
];

/** What an employee with no work shift reads as, everywhere on this screen. */
const UNASSIGNED_LABEL = "Unassigned";

/**
 * "SHIFT_CODE - Shift Name", the approved dropdown label.
 *
 * `shift_code` is NOT NULL on `work_shift`, so both halves are normally
 * present; the fallbacks are for a row that arrived malformed rather than for
 * a shape the schema allows. Returning "" rather than "undefined - undefined"
 * is what keeps a bad row from looking like a real choice.
 */
function workShiftLabel(shift) {
  if (!shift) return "";

  const code = typeof shift.shift_code === "string" ? shift.shift_code.trim() : "";
  const name = typeof shift.shift_name === "string" ? shift.shift_name.trim() : "";

  if (code && name) return `${code} - ${name}`;
  return code || name || "";
}

/**
 * The Current Work Shift cell.
 *
 * An employee row carries the shift flattened onto it as `work_shift_code` /
 * `work_shift_name`, so this reshapes before delegating - one definition of
 * the label, used by both the dropdown and the table.
 */
function currentWorkShiftLabel(employee) {
  if (!employee || employee.default_work_shift_id == null) return UNASSIGNED_LABEL;

  const label = workShiftLabel({
    shift_code: employee.work_shift_code,
    shift_name: employee.work_shift_name,
  });

  return label || UNASSIGNED_LABEL;
}

/**
 * The confirmation sentence, e.g. "Assign 24 employees to GS1 - 9 TO 9?".
 *
 * The count is stated because the selection can outrun what is on screen -
 * Select All takes the whole filtered list, not the visible page - and
 * "Assign the selected employees?" would not tell anyone they had picked 400.
 */
function confirmationMessage(count, shift) {
  const n = Number(count) || 0;
  const noun = n === 1 ? "employee" : "employees";
  const label = workShiftLabel(shift);

  if (!label) return `Assign ${n} ${noun} to the selected work shift?`;
  return `Assign ${n} ${noun} to ${label}?`;
}

/**
 * The bulk-assign request body.
 *
 * Deduplicated here as well as on the server. The server is what makes it
 * true; doing it here is what makes the number in the confirmation dialog the
 * number the server will report back.
 */
function buildAssignPayload(employees, workShiftId) {
  const ids = (Array.isArray(employees) ? employees : [])
    .map((employee) =>
      employee && typeof employee === "object" ? employee.employee_id : employee
    )
    .filter((id) => id !== null && id !== undefined && id !== "")
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);

  return {
    employee_ids: [...new Set(ids)],
    work_shift_id: Number(workShiftId),
  };
}

/**
 * Drop empty filters instead of sending them.
 *
 * An unset dropdown is "", and `?store_id=` fails the backend's
 * `Joi.number()` - so a screen that sent its blanks would 422 on first load,
 * before the user had touched anything.
 */
function filtersToQuery(filters = {}) {
  const query = {};
  const f = filters || {};

  for (const key of ["store_id", "department_id", "designation_id"]) {
    const value = f[key];
    if (value !== undefined && value !== null && value !== "") {
      query[key] = Number(value);
    }
  }

  if (typeof f.search === "string" && f.search.trim() !== "") {
    query.search = f.search.trim();
  }

  // ALL is the backend's default, so sending it says nothing.
  if (f.assignment_status && f.assignment_status !== ASSIGNMENT_STATUS.ALL) {
    query.assignment_status = f.assignment_status;
  }

  return query;
}

/**
 * Has the filter set changed in a way that should drop the current selection?
 *
 * Any change to outlet, department, designation, search or assignment status
 * changes which people are on screen, and a checkbox the user can no longer
 * see is one they cannot review before pressing Assign. The selection is
 * therefore cleared on any of them rather than being carried across.
 */
function filtersChanged(a = {}, b = {}) {
  const keys = [
    "store_id",
    "department_id",
    "designation_id",
    "search",
    "assignment_status",
  ];
  return keys.some((key) => String((a || {})[key] ?? "") !== String((b || {})[key] ?? ""));
}

module.exports = {
  ASSIGNMENT_STATUS,
  ASSIGNMENT_STATUS_OPTIONS,
  UNASSIGNED_LABEL,
  workShiftLabel,
  currentWorkShiftLabel,
  confirmationMessage,
  buildAssignPayload,
  filtersToQuery,
  filtersChanged,
};
