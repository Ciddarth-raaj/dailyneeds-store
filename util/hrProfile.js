/**
 * Stage 0C / C3 — the employee profile's field rules.
 *
 * Pure functions, no React, so the decisions that matter can be tested
 * without a renderer: who may see a field, who may change it, which endpoint
 * a change goes to, and exactly what key the backend expects.
 *
 * THERE ARE TWO WRITE PATHS, and that is a fact about the backend rather than
 * a choice made here:
 *
 *   POST /hr/employee/:id/edit    the C2 lifecycle-aware editor. Accepts only
 *                                 `EDITABLE_FIELDS`, needs `employee_edit`,
 *                                 and re-issues authorisation when store or
 *                                 designation changes. Everything ordinary
 *                                 goes here.
 *
 *   POST /employee/updatedata     the older path, needing `add_employees`.
 *                                 It is the ONLY route that writes the
 *                                 statutory, compensation and bank columns -
 *                                 they are deliberately absent from
 *                                 `EDITABLE_FIELDS` - and B3 refuses the body
 *                                 outright without `edit_employee_sensitive`.
 *
 * Sending a field down the wrong path is a 422 at best and a silent no-op at
 * worst, so the split is declared here once rather than remembered in six
 * components.
 */

/* ------------------------------------------------------------ permissions */

const has = (permissions, key) =>
  Array.isArray(permissions) &&
  permissions.some((p) => (p && p.permission_key ? p.permission_key : p) === key);

/** Admins reach everything through the existing `user_type = 2` bypass. */
const isAdminUser = (isAdmin) => isAdmin === true;

/** B3 hides these fields entirely from a caller without the key. */
function canViewSensitive({ permissions = [], isAdmin = false } = {}) {
  return isAdminUser(isAdmin) || has(permissions, "view_employee_sensitive");
}

/**
 * Writing them takes BOTH keys. `edit_employee_sensitive` is what B3's
 * `guardWrite` checks; `add_employees` is what the route itself requires.
 * Offering an Edit button to somebody holding only one produces a refusal
 * they cannot act on.
 */
function canEditSensitive({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "edit_employee_sensitive") && has(permissions, "add_employees");
}

/** The ordinary editor. */
function canEditEmployee({ permissions = [], isAdmin = false } = {}) {
  return isAdminUser(isAdmin) || has(permissions, "employee_edit");
}

function canViewDocuments({ permissions = [], isAdmin = false } = {}) {
  return isAdminUser(isAdmin) || has(permissions, "view_documents");
}

/* ------------------------------------------------------------- the fields */

/**
 * Mirrors the backend's `EDITABLE_FIELDS`. A field NOT in this list cannot be
 * written by the HR editor whatever the UI does, so the list is the contract.
 *
 * Deliberately absent, and each for its own reason:
 *
 *   employee_id        allocated by AUTO_INCREMENT, never chosen
 *   date_of_joining    lifecycle state, owned by create / resign / rejoin
 *   status             ditto - it moves through Resign and Rejoin only
 *   salary, pan_no,    sensitive; they go through the other path below
 *   uan, pf, esi, bank
 */
const HR_EDITABLE_FIELDS = [
  // personal
  "employee_name",
  "father_name",
  "dob",
  "gender",
  "marital_status",
  "marriage_date",
  "spouse_name",
  "primary_contact_number",
  "alternate_contact_number",
  "email_id",
  "blood_group",
  "permanent_address",
  "residential_address",
  // education and experience - plain columns on the employee master, so they
  // need no separate API and carry none of the ambiguity family records do
  "qualification",
  "additional_course",
  "previous_experience",
  // employment placement. Changing these NEVER creates a second employee:
  // they are columns on the one permanent record.
  "store_id",
  "department_id",
  "designation_id",
  "shift_id",
];

/** Sent as integers; "" means "no change", not zero. */
const NUMERIC_HR_FIELDS = ["store_id", "department_id", "designation_id", "shift_id"];

/**
 * The sensitive columns, and the key each one has in the `/employee/updatedata`
 * Joi schema. The schema rejects unknown keys, and it spells UAN in capitals
 * while the database column is lower case - so this map is not decoration, it
 * is the difference between a saved record and a 422.
 */
const SENSITIVE_FIELD_API_KEY = {
  pan_no: "pan_no",
  uan: "UAN",
  pf_number: "pf_number",
  esi_number: "esi_number",
  salary: "salary",
  payment_type: "payment_type",
  bank_name: "bank_name",
  ifsc: "ifsc",
  account_no: "account_no",
};

const SENSITIVE_FIELDS = Object.keys(SENSITIVE_FIELD_API_KEY);

/** `salary` and `payment_type` are `Joi.number()` on the backend. */
const NUMERIC_SENSITIVE_FIELDS = ["salary", "payment_type"];

/* --------------------------------------------------------------- patching */

const blank = (v) => v === undefined || v === null || String(v).trim() === "";

/** Two values that both mean "nothing recorded" are not a change. */
const changed = (before, after) => {
  if (blank(before) && blank(after)) return false;
  return String(before === undefined || before === null ? "" : before).trim() !== String(after).trim();
};

/**
 * What actually changed, for the HR editor. Only listed fields, only real
 * differences - the backend refuses a body with nothing to change, and
 * resending unchanged values would rewrite `updated_at` and the audit trail
 * for edits nobody made.
 */
function buildHrPatch(original = {}, form = {}) {
  const patch = {};
  for (const field of HR_EDITABLE_FIELDS) {
    if (!(field in form)) continue;
    const value = form[field];
    if (!changed(original[field], value)) continue;

    if (NUMERIC_HR_FIELDS.includes(field)) {
      // An emptied dropdown clears the placement rather than setting 0.
      patch[field] = blank(value) ? null : Number(value);
      continue;
    }
    patch[field] = blank(value) ? "" : String(value).trim();
  }
  return patch;
}

/**
 * The `/employee/updatedata` body for the sensitive sections, or null when
 * nothing changed.
 *
 * Null matters: that endpoint ends in `UPDATE new_employee SET ?`, and an
 * empty object there is invalid SQL rather than a harmless no-op.
 */
function buildSensitivePayload(employeeId, original = {}, form = {}) {
  const details = {};
  for (const field of SENSITIVE_FIELDS) {
    if (!(field in form)) continue;
    const value = form[field];
    if (!changed(original[field], value)) continue;

    const key = SENSITIVE_FIELD_API_KEY[field];
    if (NUMERIC_SENSITIVE_FIELDS.includes(field)) {
      details[key] = blank(value) ? null : Number(value);
      continue;
    }
    details[key] = blank(value) ? "" : String(value).trim();
  }

  if (Object.keys(details).length === 0) return null;
  return { employee_id: Number(employeeId), employee_details: details };
}

/** True when a patch would change where an employee works or what they are. */
function changesPlacement(patch = {}) {
  return NUMERIC_HR_FIELDS.some((f) => f in patch);
}

/* ---------------------------------------------------------------- display */

/**
 * Show that an identifier is on file without reprinting it. A PAN is a
 * government identifier on a screen somebody else can see; "on record" plus
 * the last characters is enough for HR to know it is there.
 */
function maskIdentifier(value, visible = 4) {
  if (blank(value)) return null;
  const raw = String(value).trim();
  if (raw.length <= visible) return "•".repeat(raw.length);
  return "•".repeat(raw.length - visible) + raw.slice(-visible);
}

/** "not recorded" is a fact worth stating; an empty cell is ambiguous. */
const orNotRecorded = (value) => (blank(value) ? "not recorded" : String(value));

/**
 * The employee row as the profile reads it. `getEmployeeByID` returns an
 * array, and B3 has already removed whatever the caller may not see - so a
 * missing sensitive key means "not permitted", not "empty".
 */
function unwrapEmployee(response) {
  if (Array.isArray(response)) return response[0] || null;
  if (response && typeof response === "object" && !response.code) return response;
  return null;
}

module.exports = {
  has,
  canViewSensitive,
  canEditSensitive,
  canEditEmployee,
  canViewDocuments,
  HR_EDITABLE_FIELDS,
  NUMERIC_HR_FIELDS,
  SENSITIVE_FIELDS,
  SENSITIVE_FIELD_API_KEY,
  buildHrPatch,
  buildSensitivePayload,
  changesPlacement,
  maskIdentifier,
  orNotRecorded,
  unwrapEmployee,
};
