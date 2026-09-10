/**
 * Employee Shift Assignment — the parts of the screen that are not JSX.
 *
 * There is no React test runner in this repo, so logic left inside a component
 * is logic that cannot be tested. This file holds the pieces where being wrong
 * is expensive and invisible: which employees a request actually asks for,
 * what the confirmation sentence claims is about to happen, and what happens
 * to a selection when the filters move underneath it.
 *
 * CommonJS on purpose, so `node --test` can require it with no bundler — the
 * same reason `util/workShiftForm.js` is.
 *
 * THE BACKEND IS AUTHORITATIVE. It re-validates every id, refuses an inactive
 * or unknown work shift, and writes `default_work_shift_id` and nothing else.
 * Nothing here is a permission check or a substitute for one.
 */

/** The three the backend accepts, in the order the screen offers them. */
const ASSIGNMENT_STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  // Second, not last: working through the people who still need a shift is
  // the whole reason this screen exists during the initial setup.
  { value: "UNASSIGNED", label: "Unassigned" },
  { value: "ASSIGNED", label: "Assigned" },
];

/** Matches the HR employee list's own control, and its Active default. */
const EMPLOYMENT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Resigned" },
  { value: "ALL", label: "All" },
];

const DEFAULT_FILTERS = {
  store_id: "",
  department_id: "",
  designation_id: "",
  search: "",
  assignment_status: "ALL",
  employment_status: "ACTIVE",
};

/** "GS1 - 9 TO 9", or just the name when a shift has no code. */
function workShiftLabel(shift) {
  if (!shift) return "";
  const code = String(shift.shift_code || "").trim();
  const name = String(shift.shift_name || "").trim();
  if (code && name) return `${code} - ${name}`;
  return code || name;
}

/**
 * What the Current Work Shift column shows.
 *
 * An unassigned employee reads "Unassigned" rather than a blank cell, because
 * blank is indistinguishable from a column that failed to load — and this
 * screen exists to find exactly those people.
 */
function currentWorkShiftLabel(row) {
  if (!row || row.default_work_shift_id === null || row.default_work_shift_id === undefined) {
    return "Unassigned";
  }
  const label = workShiftLabel({
    shift_code: row.work_shift_code,
    shift_name: row.work_shift_name,
  });
  return label || `#${row.default_work_shift_id}`;
}

/** Active work shifts as dropdown options, labelled "CODE - Name". */
function workShiftOptions(workShifts) {
  if (!Array.isArray(workShifts)) return [];
  return workShifts
    // The backend's `active=1` already narrows this; filtering again costs
    // nothing and means a stale or unfiltered response cannot offer a
    // retired shift the server would then refuse.
    .filter((shift) => shift && Number(shift.active) === 1)
    .map((shift) => ({
      value: Number(shift.work_shift_id),
      label: workShiftLabel(shift),
    }));
}

/**
 * The query the list endpoint is called with.
 *
 * Empty filters are omitted rather than sent blank: the backend validates the
 * shape of what it receives, and "" is not an outlet id.
 */
function buildListQuery(filters = {}) {
  const f = { ...DEFAULT_FILTERS, ...filters };
  const query = {
    assignment_status: f.assignment_status || "ALL",
    employment_status: f.employment_status || "ACTIVE",
  };
  if (f.store_id !== "" && f.store_id !== null && f.store_id !== undefined) {
    query.store_ids = String(f.store_id);
  }
  if (f.department_id !== "" && f.department_id !== null && f.department_id !== undefined) {
    query.department_ids = String(f.department_id);
  }
  if (f.designation_id !== "" && f.designation_id !== null && f.designation_id !== undefined) {
    query.designation_ids = String(f.designation_id);
  }
  const search = String(f.search || "").trim();
  if (search) query.search = search;
  return query;
}

/**
 * The sentence shown before anything is written.
 *
 * It names the count and the shift, because those are the two things somebody
 * would want to check: "Assign 24 employees to GS1 - 9 TO 9?".
 */
function confirmationMessage(count, shift) {
  const n = Number(count) || 0;
  const label = workShiftLabel(shift);
  const who = `${n} employee${n === 1 ? "" : "s"}`;
  return label ? `Assign ${who} to ${label}?` : `Assign ${who} to this work shift?`;
}

/**
 * Keep only the ids that are still on screen.
 *
 * A selection is a set of people the user can see and has ticked. When the
 * filters change the list becomes a different set of people, and carrying
 * hidden ids along would let "Assign 24 employees" write to somebody the user
 * is no longer looking at. Narrowing is safe; silently keeping is not.
 */
function reconcileSelection(selectedIds, visibleRows) {
  const visible = new Set(
    (Array.isArray(visibleRows) ? visibleRows : []).map((row) => Number(row.employee_id))
  );
  return (Array.isArray(selectedIds) ? selectedIds : [])
    .map(Number)
    .filter((id) => visible.has(id));
}

/** Tick or untick one row. */
function toggleSelection(selectedIds, employeeId) {
  const id = Number(employeeId);
  const current = Array.isArray(selectedIds) ? selectedIds.map(Number) : [];
  return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
}

/** Select All / Clear over exactly the rows currently listed. */
function selectAll(visibleRows, checked) {
  if (!checked) return [];
  return (Array.isArray(visibleRows) ? visibleRows : []).map((row) => Number(row.employee_id));
}

/** True when every listed row is ticked - and false when there are none. */
function allSelected(selectedIds, visibleRows) {
  const rows = Array.isArray(visibleRows) ? visibleRows : [];
  if (rows.length === 0) return false;
  const chosen = new Set((Array.isArray(selectedIds) ? selectedIds : []).map(Number));
  return rows.every((row) => chosen.has(Number(row.employee_id)));
}

module.exports = {
  ASSIGNMENT_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  DEFAULT_FILTERS,
  workShiftLabel,
  currentWorkShiftLabel,
  workShiftOptions,
  buildListQuery,
  confirmationMessage,
  reconcileSelection,
  toggleSelection,
  selectAll,
  allSelected,
};
