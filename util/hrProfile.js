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
 *   POST /employee/updatedata     the older path. It is the ONLY route that
 *                                 writes the statutory and bank columns -
 *                                 they are deliberately absent from
 *                                 `EDITABLE_FIELDS` - and B3 refuses the body
 *                                 outright without `edit_employee_sensitive`.
 *                                 M1 review fix: it demands `add_employees`
 *                                 for the fields Add Employee owns, and NOT
 *                                 for a body of only Payment Details and /
 *                                 or Statutory Details columns, which take
 *                                 their own section keys instead.
 *                                 SALARY IS NOT ON THIS PATH AT ALL - the
 *                                 route's schema no longer accepts it, and
 *                                 the Payroll section is read-only until the
 *                                 dedicated salary system exists.
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
 * Writing them takes `edit_employee_sensitive`, which is what B3's
 * `guardWrite` checks.
 *
 * M1 REVIEW FIX - `add_employees` IS NOT PART OF THIS ANY MORE. It used to
 * be, because /employee/updatedata demanded it for the whole route; the
 * backend now demands it only for the fields Add Employee has always owned,
 * and NOT for a body that writes just Payment Details and / or Statutory
 * Details. Add Employee covers onboarding screens 1-4 and stops at Education;
 * the sections after it are controlled by their own designation rights.
 *
 * Keeping it here would defeat the backend change from the other end: a
 * designation granted Edit Payment Details would still be shown a read-only
 * card, so the permission would remain ungrantable in practice.
 */
function canEditSensitive({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "edit_employee_sensitive");
}

/**
 * M1. Sections 5 and 6 of the employee master each have a key of their own
 * ON TOP OF the sensitive pair: the backend's /employee/updatedata refuses a
 * body naming a payment column without `edit_payment_details`, and one
 * naming a statutory column without `edit_statutory_details`. Neither key
 * alone opens anything - the columns stay sensitive under B3.
 */
function canEditPaymentDetails(actor = {}) {
  if (isAdminUser(actor.isAdmin)) return true;
  return canEditSensitive(actor) && has(actor.permissions, "edit_payment_details");
}

function canEditStatutoryDetails(actor = {}) {
  if (isAdminUser(actor.isAdmin)) return true;
  return canEditSensitive(actor) && has(actor.permissions, "edit_statutory_details");
}

/**
 * Changing a shift from the profile is the SAME act as Employee Shift
 * Assignment's single assign, and takes the same pair: `employee_edit` AND
 * `assign_employee_shift`. `employee_create` is not enough - choosing an
 * initial shift on a new hire is not authority to re-roster an existing one.
 */
function canAssignShift({ permissions = [], isAdmin = false } = {}) {
  if (isAdminUser(isAdmin)) return true;
  return has(permissions, "employee_edit") && has(permissions, "assign_employee_shift");
}

/**
 * M1 - THE ONE EMPLOYEE MASTER ORDER. The profile renders its sections in
 * exactly this sequence and the Add Employee wizard's four stages are its
 * first four entries; `hrProfile.test.js` and `hrScreens.test.js` pin both
 * to this list so Add and Edit cannot drift apart again.
 */
const EMPLOYEE_MASTER_SECTIONS = [
  { key: "aadhaar", title: "Aadhaar Verification" },
  { key: "personal", title: "Personal Details" },
  { key: "employment", title: "Employment Details" },
  { key: "education", title: "Education" },
  { key: "payment", title: "Payment Details" },
  { key: "statutory", title: "Statutory Details" },
  { key: "payroll", title: "Payroll" },
  { key: "documents", title: "Documents" },
];

/* --------------------------------------------------------- payment type */

/**
 * `new_employee.payment_type`, exactly as the legacy screens stored it:
 * 1 Bank, 2 Cash. Reused, not redefined - a third spelling of the same fact
 * would leave every historical row reading as "not recorded".
 */
const PAYMENT_TYPE_OPTIONS = [
  { value: 1, label: "Bank" },
  { value: 2, label: "Cash" },
];

const isBankPayment = (paymentType) => !blank(paymentType) && Number(paymentType) === 1;
const isCashPayment = (paymentType) => !blank(paymentType) && Number(paymentType) === 2;

/** "Bank", "Cash", or null when nobody has said. */
function paymentTypeLabel(paymentType) {
  if (blank(paymentType)) return null;
  const found = PAYMENT_TYPE_OPTIONS.find((o) => o.value === Number(paymentType));
  return found ? found.label : null;
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
  // Whether the employee is in the scheme at all, which is a different fact
  // from whether the number has been typed in yet. Sensitive alongside the
  // numbers they qualify, and written by the same Statutory section.
  pf_applicable: "pf_applicable",
  esi_applicable: "esi_applicable",
  // M2. Whether the employee was already a provident fund member before they
  // joined — a THIRD statutory fact, separate from PF applicable, the UAN and
  // the PF number, and deliberately not the legacy free-text `pf` column. It
  // is the EPF half of the Form 11 declaration.
  previous_pf_member: "previous_pf_member",
  // M2 review fix. The EPS half, asked and stored separately because Form 11
  // asks it separately and the answers differ — somebody can have been in a
  // previous employer's provident fund without ever having been in the pension
  // scheme.
  //
  // It is not decoration: THIS is the answer that decides whether the
  // employer's 12% splits into EPF and EPS or goes wholly to EPF, so an
  // unanswered one is a contribution the backend reports as unresolved rather
  // than guessing at — and it never guesses it from the field above.
  previous_eps_member: "previous_eps_member",
  // M1. Cash or Bank, on the Payment Details section beside the account it
  // qualifies. Sensitive under B3 already; the route takes it as a number.
  payment_type: "payment_type",
  bank_name: "bank_name",
  ifsc: "ifsc",
  account_no: "account_no",
};

const SENSITIVE_FIELDS = Object.keys(SENSITIVE_FIELD_API_KEY);

/**
 * Sent as numbers, not strings, because the backend's Joi schema says so.
 *
 * The two applicability flags are 1 or 0 - and an emptied dropdown becomes
 * null rather than 0, which matters more here than anywhere else on this
 * screen: null means "nobody has said", 0 means "not in the scheme", and
 * collapsing the first into the second would record a statutory decision
 * nobody made.
 */
const NUMERIC_SENSITIVE_FIELDS = [
  "pf_applicable",
  "esi_applicable",
  // M2. Tri-state like the two flags above, and for a sharper reason: the
  // backend treats null as "not recorded" and reports the EPS split as
  // unresolved, so an emptied dropdown must arrive as null. Sending 0 would
  // record "first-time member" — a statutory position nobody took.
  "previous_pf_member",
  // M2 review fix. The same, and it is this one the EPS split actually reads:
  // an emptied dropdown must arrive as null so the backend keeps reporting the
  // pension split as unresolved. Sending 0 would record "never an EPS member"
  // and file a third of the employer contribution on nobody's say-so.
  "previous_eps_member",
  "payment_type",
];

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

/* ------------------------------------------------- PF / ESI applicability */

/**
 * Yes, No, or nothing said yet.
 *
 * Three states, not two, and the third is the honest one for every employee
 * on file today: nobody has ever been asked whether they are in the scheme,
 * so nothing may answer on their behalf. The dropdown's own empty option is
 * what puts a flag back to "not recorded" - see `NUMERIC_SENSITIVE_FIELDS`,
 * which sends it as null rather than 0.
 */
const APPLICABILITY_OPTIONS = [
  { value: 1, label: "Yes" },
  { value: 0, label: "No" },
];

/** True only for an explicit 0. `null` is "not said", which is not "No". */
const isNotApplicable = (flag) => !blank(flag) && Number(flag) === 0;

/** "Yes", "No", or null for a flag nobody has set. */
function applicabilityLabel(flag) {
  if (blank(flag)) return null;
  return Number(flag) === 1 ? "Yes" : "No";
}

/**
 * What a statutory identifier reads as, given the scheme flag beside it.
 *
 * THE DISTINCTION THIS EXISTS FOR: "not recorded" means somebody still has to
 * go and find the number; "Not applicable" means nobody does, because this
 * employee is not in the scheme. Running the two together - which is all the
 * screen could do before the flags existed - turns a finished record into a
 * permanent chase.
 *
 * A number is NEVER required by a Yes. An employee can be in the PF scheme
 * with the UAN still pending, and that reads as "not recorded", which is
 * exactly right: it is outstanding, and saying so is the point.
 */
function statutoryValue(flag, value) {
  if (isNotApplicable(flag)) return "Not applicable";
  return maskIdentifier(value);
}

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
  canEditPaymentDetails,
  canEditStatutoryDetails,
  canAssignShift,
  canEditEmployee,
  canViewDocuments,
  EMPLOYEE_MASTER_SECTIONS,
  PAYMENT_TYPE_OPTIONS,
  isBankPayment,
  isCashPayment,
  paymentTypeLabel,
  HR_EDITABLE_FIELDS,
  NUMERIC_HR_FIELDS,
  SENSITIVE_FIELDS,
  SENSITIVE_FIELD_API_KEY,
  buildHrPatch,
  buildSensitivePayload,
  changesPlacement,
  maskIdentifier,
  orNotRecorded,
  APPLICABILITY_OPTIONS,
  isNotApplicable,
  applicabilityLabel,
  statutoryValue,
  unwrapEmployee,
};
