/**
 * Attendance Approver Setup - the pure part. CommonJS so
 * `node --test util/attendanceApproverSetup.test.js` runs it without a
 * bundler; the screens import it through Babel's interop.
 *
 * THREE EXPLICIT LEVELS, ALWAYS. The form has First Level, Second Level and
 * Final Approver whatever an employee needs, so management can always see
 * who the final authority is. First and Second may be blank; Final may not.
 * The same rules the backend enforces are checked here first, so a user
 * sees the problem next to the field rather than in a toast after a round
 * trip - the server remains the authority.
 */

const LEVELS = Object.freeze([
  { key: "first_level_approver_employee_id", level: "FIRST", label: "First Level Approver", required: false },
  { key: "second_level_approver_employee_id", level: "SECOND", label: "Second Level Approver", required: false },
  { key: "final_approver_employee_id", level: "FINAL", label: "Final Approver", required: true },
]);

const LEVEL_LABEL = Object.freeze({ FIRST: "First Level", SECOND: "Second Level", FINAL: "Final Approver" });
const levelLabel = (level) => LEVEL_LABEL[level] || String(level || "—");

const toId = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : NaN;
};

/**
 * Field-level errors for the Set Approvers form, for the employees it is
 * about. `employeeIds` is one id for a single edit and many for a bulk set;
 * the self-approval check names the employee(s) it would affect so a bulk
 * user can untick them.
 *
 * @returns {{ok: boolean, errors: {[fieldKey]: string}, body: object|null}}
 */
function validateApproverForm(values, employeeIds = []) {
  const errors = {};
  const ids = (employeeIds || []).map(Number);
  const body = {};
  LEVELS.forEach(({ key, label, required }) => {
    const id = toId(values ? values[key] : null);
    if (Number.isNaN(id)) {
      errors[key] = `${label} must be an employee`;
      return;
    }
    body[key] = id;
    if (id === null) {
      if (required) errors[key] = "Final Approver is required";
      return;
    }
    if (ids.includes(id)) {
      errors[key] = ids.length === 1
        ? "An employee cannot be their own approver"
        : `Employee ${id} is among the selected employees and cannot be their own approver`;
    }
  });
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, body: ok ? body : null };
}

/** Errors for the Replace Approver form. */
function validateReplaceForm({ current_approver_employee_id, approval_level, new_approver_employee_id }) {
  const errors = {};
  const cur = toId(current_approver_employee_id);
  const next = toId(new_approver_employee_id);
  if (cur === null || Number.isNaN(cur)) errors.current_approver_employee_id = "Choose the current approver";
  if (!["FIRST", "SECOND", "FINAL"].includes(approval_level)) errors.approval_level = "Choose the approval level";
  if (next === null || Number.isNaN(next)) errors.new_approver_employee_id = "Choose the new approver";
  if (cur !== null && next !== null && cur === next) errors.new_approver_employee_id = "The new approver must be a different employee";
  const ok = Object.keys(errors).length === 0;
  return { ok, errors, body: ok ? { current_approver_employee_id: cur, approval_level, new_approver_employee_id: next } : null };
}

/** `1024 — Priya (HR Executive)` for a picker option. */
function approverOptionLabel(e) {
  if (!e) return "";
  const tail = [e.designation_name, e.store_name].filter(Boolean).join(" · ");
  const inactive = e.is_active === false ? " [resigned/inactive]" : "";
  return `${e.employee_id} — ${e.employee_name}${tail ? ` (${tail})` : ""}${inactive}`;
}

/** What a table cell shows for one level: name, or a dash for blank. */
function approverCell(row, key) {
  const id = row ? row[key] : null;
  if (id === null || id === undefined) return "—";
  const name = row[key.replace("_employee_id", "_name")];
  return name ? `${name} (${id})` : String(id);
}

/** Only the filters actually chosen. */
function buildListParams(filters = {}) {
  const params = {};
  ["department_id", "store_id", "designation_id", "employee_id"].forEach((k) => {
    if (filters[k] !== undefined && filters[k] !== null && filters[k] !== "") params[k] = Number(filters[k]);
  });
  if (filters.search && String(filters.search).trim() !== "") params.search = String(filters.search).trim();
  params.limit = filters.limit || 500;
  params.offset = filters.offset || 0;
  return params;
}

/** The sentence under a bulk result: honest about partial failure. */
function bulkResultSummary(res) {
  if (!res) return "";
  const ok = Number(res.success_count) || 0;
  const bad = Number(res.failed_count) || 0;
  if (bad === 0) return `Approvers set for ${ok} employee${ok === 1 ? "" : "s"}.`;
  if (ok === 0) return `No employees were updated. ${bad} failed.`;
  return `Approvers set for ${ok} employee${ok === 1 ? "" : "s"}; ${bad} failed and ${bad === 1 ? "was" : "were"} not changed.`;
}

/** The sentence the Replace confirmation shows, from the server's preview. */
function replacePreviewSummary(p) {
  if (!p) return "";
  const steps = (Number(p.pending_regularization_steps) || 0) + (Number(p.pending_ot_steps) || 0);
  return `Replace ${p.current_approver_name} (${p.current_approver_employee_id}) with ${p.new_approver_name} (${p.new_approver_employee_id}) as ${levelLabel(p.approval_level)} on ${p.setups_matched} employee mapping${p.setups_matched === 1 ? "" : "s"} and ${steps} pending step${steps === 1 ? "" : "s"} (${p.pending_regularization_steps || 0} regularization, ${p.pending_ot_steps || 0} OT). Approved and rejected steps are never changed.`;
}

const isOk = (res) => Boolean(res) && (res.code === 200 || res.code === undefined) && !res.error;
const apiMessage = (res, fallback = "Something went wrong") =>
  (res && (Array.isArray(res.errors) && res.errors.length ? res.errors.join("; ") : res.msg)) || fallback;

module.exports = {
  LEVELS,
  LEVEL_LABEL,
  levelLabel,
  validateApproverForm,
  validateReplaceForm,
  approverOptionLabel,
  approverCell,
  buildListParams,
  bulkResultSummary,
  replacePreviewSummary,
  isOk,
  apiMessage,
};
