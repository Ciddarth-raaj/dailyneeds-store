/**
 * Master → Company Details - who may open it, what the form checks, and what
 * the Payroll screen does while no payslip company is configured.
 *
 * MIRRORS THE BACKEND, NEVER REPLACES IT. The field rules are
 * `dailyneeds-store-backend/utils/company_details.js` restated so the form can
 * say what is wrong before a round trip; the server re-validates every save
 * and is the only one whose answer counts. Whether payslips can be published
 * is never decided here at all: `payslipPublishGate` only reads the server's
 * `GET /payrun/calculation/payslip-company` answer, and Publish itself is
 * refused on the server regardless of what a screen drew.
 *
 * CommonJS, so the rules can be unit-tested with `node --test` without a
 * bundler, exactly as `util/payrunAccess.js` is.
 */

const PERMISSION = "manage_company_details";
const LOCATION = "/master/company-details";
const NOT_CONFIGURED_MESSAGE = "Payslip publishing is unavailable until Company Details is configured.";

const has = (permissions, key) =>
  Array.isArray(permissions) &&
  permissions.some((p) => (p && p.permission_key ? p.permission_key : p) === key);

/** `user_type = 2` bypasses the permission table on the server; honoured here. */
function canManageCompanyDetails({ permissions = [], isAdmin = false } = {}) {
  if (isAdmin === true) return true;
  return has(permissions, PERMISSION);
}

/**
 * The form, in the three groups the screen shows. `column` is the
 * `company_details` column each field is stored in; there is no Email, CIN,
 * State or Pincode because the table has no such column.
 */
const GROUPS = [
  {
    title: "General",
    fields: [
      { key: "company_name", label: "Company Name", required: true, max: 45 },
      { key: "reg_address", label: "Registered / Payroll Address", required: true, max: 500, multiline: true },
      {
        key: "contact_number",
        label: "Phone",
        max: 20,
        pattern: /^\+?[0-9][0-9 \-()]{5,18}$/,
        hint: "digits, spaces, '+', '-' or brackets",
      },
    ],
  },
  {
    title: "Statutory",
    fields: [
      {
        key: "pf_number",
        label: "PF Establishment Code",
        upper: true,
        max: 45,
        pattern: /^[A-Z0-9][A-Z0-9/\- ]{4,44}$/,
        hint: "letters, digits, '/' or '-', e.g. TN/MAS/0012345",
        help: "Needed to publish a payslip for any employee with PF applicable.",
      },
      {
        key: "esi_number",
        label: "ESI Establishment Code",
        max: 45,
        pattern: /^[0-9][0-9\- ]{9,44}$/,
        hint: "digits, e.g. 51000123450001001",
        help: "Needed to publish a payslip for any employee with ESI applicable.",
      },
      {
        key: "gst_number",
        label: "GSTIN",
        upper: true,
        pattern: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
        hint: "15 characters, e.g. 33AAAAA0000A1Z5",
      },
      { key: "pan_number", label: "PAN", upper: true, pattern: /^[A-Z]{5}[0-9]{4}[A-Z]$/, hint: "e.g. AAAAA0000A" },
      { key: "tan_number", label: "TAN", upper: true, pattern: /^[A-Z]{4}[0-9]{5}[A-Z]$/, hint: "e.g. AAAA00000A" },
    ],
  },
];

const FIELDS = GROUPS.flatMap((g) => g.fields);

function emptyForm() {
  const form = { payslip_active: false };
  FIELDS.forEach((f) => {
    form[f.key] = "";
  });
  return form;
}

/** A company row from `GET /company` as form values. */
function formOf(company) {
  const form = emptyForm();
  if (!company) return form;
  FIELDS.forEach((f) => {
    form[f.key] = company[f.key] === null || company[f.key] === undefined ? "" : String(company[f.key]);
  });
  form.payslip_active = company.payslip_active === true;
  return form;
}

const clean = (f, v) => {
  let out = v === null || v === undefined ? "" : String(v);
  out = f.multiline
    ? out.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim()).join("\n").trim()
    : out.trim().replace(/\s+/g, " ");
  return f.upper ? out.toUpperCase() : out;
};

/**
 * @returns {{ values: object, errors: Object<string,string> }} the body to
 *   send, and a message per invalid field (empty when the form may be saved)
 */
function validateCompanyForm(form = {}) {
  const values = { payslip_active: form.payslip_active === true };
  const errors = {};
  FIELDS.forEach((f) => {
    const v = clean(f, form[f.key]);
    values[f.key] = v;
    if (v === "") {
      if (f.required) errors[f.key] = `${f.label} is required`;
      return;
    }
    const max = f.max || 45;
    if (v.length > max) errors[f.key] = `${f.label} must be at most ${max} characters`;
    else if (f.pattern && !f.pattern.test(v)) errors[f.key] = `${f.label} is not valid (${f.hint})`;
  });
  return { values, errors };
}

/**
 * WHAT THE PAYROLL SCREEN DOES WITH THE SERVER'S ANSWER.
 *
 * `status` is `GET /payrun/calculation/payslip-company`, or null while it has
 * not loaded / could not be read; `canConfigure` is
 * `canManageCompanyDetails(actor)`, which decides whether the screen offers
 * the Configure Company Details shortcut. Anything but a positive `configured: true`
 * disables Publish: a screen that cannot tell must not offer a button the
 * server will refuse. Unpublish and Retry Notification are not gated - they
 * act on payslips already published.
 */
function payslipPublishGate(status, { canConfigure = false } = {}) {
  if (status && status.configured === true) {
    return { publishDisabled: false, message: null, configureLink: null, companyName: status.company ? status.company.name : null };
  }
  const message = status && status.message ? status.message : NOT_CONFIGURED_MESSAGE;
  return {
    publishDisabled: true,
    message,
    configureLink: canConfigure === true ? LOCATION : null,
    companyName: null,
  };
}

module.exports = {
  PERMISSION,
  LOCATION,
  NOT_CONFIGURED_MESSAGE,
  GROUPS,
  FIELDS,
  canManageCompanyDetails,
  emptyForm,
  formOf,
  validateCompanyForm,
  payslipPublishGate,
};
