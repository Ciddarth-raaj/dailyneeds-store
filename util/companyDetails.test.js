/**
 * Master → Company Details - the browser's rules.
 *
 *   node --test util/companyDetails.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  canManageCompanyDetails,
  validateCompanyForm,
  formOf,
  emptyForm,
  payslipPublishGate,
  NOT_CONFIGURED_MESSAGE,
  LOCATION,
  FIELDS,
} = require("./companyDetails");

const rows = (...keys) => keys.map((permission_key) => ({ permission_key }));

test("only administrators and holders of manage_company_details may manage it", () => {
  assert.strictEqual(canManageCompanyDetails({ isAdmin: true, permissions: [] }), true);
  assert.strictEqual(canManageCompanyDetails({ permissions: rows("manage_company_details") }), true);
  // An ordinary employee, and even a payroll publisher, may not.
  assert.strictEqual(canManageCompanyDetails({ permissions: rows("view_employees") }), false);
  assert.strictEqual(
    canManageCompanyDetails({ permissions: rows("view_employees", "view_payroll", "publish_payrun") }),
    false
  );
  assert.strictEqual(canManageCompanyDetails({ isAdmin: "true", permissions: [] }), false);
  assert.strictEqual(canManageCompanyDetails(), false);
});

test("Company Name and Address are required; the rest are optional", () => {
  const { errors } = validateCompanyForm(emptyForm());
  assert.deepStrictEqual(Object.keys(errors), ["company_name", "reg_address"]);
  const ok = validateCompanyForm({ ...emptyForm(), company_name: "DNDS", reg_address: "Puducherry" });
  assert.deepStrictEqual(ok.errors, {});
  assert.strictEqual(ok.values.pf_number, "");
});

test("lengths and formats match the backend, and codes are upper-cased", () => {
  const { values, errors } = validateCompanyForm({
    ...emptyForm(),
    company_name: "x".repeat(46),
    reg_address: "Addr",
    gst_number: "34aabcd1234e1z5",
    pf_number: "tn/mas/0012345",
    esi_number: "ESI",
    contact_number: "phone",
  });
  assert.deepStrictEqual(Object.keys(errors).sort(), ["company_name", "contact_number", "esi_number"]);
  assert.strictEqual(values.gst_number, "34AABCD1234E1Z5");
  assert.strictEqual(values.pf_number, "TN/MAS/0012345");
});

test("the form offers only the columns company_details has", () => {
  assert.deepStrictEqual(
    FIELDS.map((f) => f.key).sort(),
    ["company_name", "contact_number", "esi_number", "gst_number", "pan_number", "pf_number", "reg_address", "tan_number"]
  );
});

test("an existing company opens as its values, Active for Payslip included", () => {
  const form = formOf({ company_id: 1, company_name: "DNDS", reg_address: "X", pf_number: null, payslip_active: true });
  assert.strictEqual(form.company_name, "DNDS");
  assert.strictEqual(form.pf_number, "");
  assert.strictEqual(form.payslip_active, true);
  assert.strictEqual(formOf(null).payslip_active, false);
});

test("Payroll UI disables Publish when Company Details is missing, with the message", () => {
  for (const status of [null, undefined, { configured: false, reason: "NONE", message: NOT_CONFIGURED_MESSAGE }]) {
    const gate = payslipPublishGate(status);
    assert.strictEqual(gate.publishDisabled, true);
    assert.strictEqual(gate.message, "Payslip publishing is unavailable until Company Details is configured.");
    assert.strictEqual(gate.configureLink, null, "no shortcut for somebody who cannot configure it");
  }
  const multiple = payslipPublishGate({ configured: false, reason: "MULTIPLE", message: "More than one company" });
  assert.deepStrictEqual([multiple.publishDisabled, multiple.message], [true, "More than one company"]);
});

test("administrators get the Configure Company Details shortcut", () => {
  const gate = payslipPublishGate({ configured: false, message: NOT_CONFIGURED_MESSAGE }, { canConfigure: true });
  assert.strictEqual(gate.configureLink, LOCATION);
  assert.strictEqual(LOCATION, "/master/company-details");
});

test("Payroll UI enables Publish once a company is configured", () => {
  const gate = payslipPublishGate({ configured: true, company: { name: "Daily Needs Departmental Store" } }, { canConfigure: true });
  assert.deepStrictEqual(gate, {
    publishDisabled: false,
    message: null,
    configureLink: null,
    companyName: "Daily Needs Departmental Store",
  });
});
