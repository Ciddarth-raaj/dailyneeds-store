/**
 * Stage 0C / C3 — the employee profile's field rules.
 *
 *   node --test util/hrProfile.test.js
 *
 * The three things that would be wrong silently, and are therefore tested
 * hardest:
 *
 *   a sensitive field sent down the ordinary edit path (rejected, or worse,
 *     accepted and ignored)
 *   a key the backend's Joi schema does not recognise - it rejects unknown
 *     keys, and it spells UAN in capitals
 *   an empty update body, which that endpoint turns into invalid SQL
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  canViewSensitive,
  canEditSensitive,
  canEditEmployee,
  canViewDocuments,
  HR_EDITABLE_FIELDS,
  SENSITIVE_FIELDS,
  SENSITIVE_FIELD_API_KEY,
  buildHrPatch,
  buildSensitivePayload,
  changesPlacement,
  maskIdentifier,
  orNotRecorded,
  unwrapEmployee,
} = require("./hrProfile");

const perms = (...keys) => keys.map((permission_key) => ({ permission_key }));

/* ============================================================ permissions */
test("seeing sensitive fields takes the key, or admin", () => {
  assert.strictEqual(canViewSensitive({ permissions: perms("view_employee_sensitive") }), true);
  assert.strictEqual(canViewSensitive({ permissions: perms("view_employees") }), false);
  assert.strictEqual(canViewSensitive({ permissions: [], isAdmin: true }), true);
  assert.strictEqual(canViewSensitive(), false);
});

test("EDITING SENSITIVE FIELDS TAKES BOTH KEYS", () => {
  // `edit_employee_sensitive` is what B3's guardWrite checks; `add_employees`
  // is what the route itself requires. Offering Edit to somebody holding one
  // produces a refusal they cannot act on.
  assert.strictEqual(
    canEditSensitive({ permissions: perms("edit_employee_sensitive") }),
    false,
    "the route permission is missing"
  );
  assert.strictEqual(
    canEditSensitive({ permissions: perms("add_employees") }),
    false,
    "B3 would refuse the body"
  );
  assert.strictEqual(
    canEditSensitive({ permissions: perms("edit_employee_sensitive", "add_employees") }),
    true
  );
  assert.strictEqual(canEditSensitive({ permissions: [], isAdmin: true }), true);
});

test("viewing does not imply editing", () => {
  const viewer = { permissions: perms("view_employee_sensitive") };
  assert.strictEqual(canViewSensitive(viewer), true);
  assert.strictEqual(canEditSensitive(viewer), false);
});

test("the ordinary editor and documents have their own keys", () => {
  assert.strictEqual(canEditEmployee({ permissions: perms("employee_edit") }), true);
  assert.strictEqual(canEditEmployee({ permissions: perms("view_employees") }), false);
  assert.strictEqual(canViewDocuments({ permissions: perms("view_documents") }), true);
  assert.strictEqual(canViewDocuments({ permissions: perms("view_employees") }), false);
});

/* ======================================================= the two contracts */
test("THE TWO FIELD SETS DO NOT OVERLAP", () => {
  // A field in both lists could be sent down either path, and the wrong one
  // is a 422 or a silent no-op.
  for (const field of SENSITIVE_FIELDS) {
    assert.ok(
      !HR_EDITABLE_FIELDS.includes(field),
      `${field} is sensitive and must not be in the ordinary editor`
    );
  }
});

test("the HR list matches the backend's EDITABLE_FIELDS, and excludes lifecycle state", () => {
  for (const mustHave of [
    "employee_name", "dob", "gender", "permanent_address", "residential_address",
    "primary_contact_number", "alternate_contact_number", "email_id",
    "qualification", "additional_course", "previous_experience",
    "store_id", "department_id", "designation_id", "shift_id",
  ]) {
    assert.ok(HR_EDITABLE_FIELDS.includes(mustHave), `${mustHave} must be editable`);
  }
  // Owned by create / resign / rejoin, and by AUTO_INCREMENT.
  for (const mustNotHave of ["employee_id", "date_of_joining", "status", "resignation_date"]) {
    assert.ok(!HR_EDITABLE_FIELDS.includes(mustNotHave), `${mustNotHave} is lifecycle state`);
  }
});

test("EVERY SENSITIVE FIELD MAPS TO THE KEY THE BACKEND ACTUALLY DECLARES", () => {
  // The Joi schema rejects unknown keys. `uan` would be refused; `UAN` is
  // what it names, and MySQL resolves it to the lower-case column.
  assert.strictEqual(SENSITIVE_FIELD_API_KEY.uan, "UAN");
  for (const field of SENSITIVE_FIELDS) {
    assert.ok(SENSITIVE_FIELD_API_KEY[field], `${field} needs an API key`);
  }
  for (const expected of ["pan_no", "pf_number", "esi_number", "pf_applicable", "esi_applicable",
                          "bank_name", "ifsc", "account_no", "payment_type"]) {
    assert.ok(SENSITIVE_FIELDS.includes(expected), `${expected} must be handled`);
  }
  // Salary left this screen with the Salary Master card. Payroll owns the
  // figure; a second editor for it on the employee profile is exactly the
  // quiet second place a pay change could be made from. PAYMENT TYPE IS NOT
  // SALARY: Cash/Bank is Payment Details (M1), and it stays.
  assert.ok(!SENSITIVE_FIELDS.includes("salary"), "salary belongs to Payroll, not this profile");
});

/* ============================================ M1: the eight sections == */
test("THE EMPLOYEE MASTER IS ONE ORDER, FOR ADD AND EDIT ALIKE", () => {
  const { EMPLOYEE_MASTER_SECTIONS } = require("./hrProfile");
  assert.deepStrictEqual(
    EMPLOYEE_MASTER_SECTIONS.map((s) => s.key),
    ["aadhaar", "personal", "employment", "education", "payment", "statutory", "payroll", "documents"]
  );
  assert.strictEqual(EMPLOYEE_MASTER_SECTIONS[4].title, "Payment Details");
  assert.strictEqual(EMPLOYEE_MASTER_SECTIONS[7].key, "documents", "Documents is LAST");
});

test("M1: payment and statutory sections have their own keys ON TOP OF the sensitive pair", () => {
  const { canEditPaymentDetails, canEditStatutoryDetails } = require("./hrProfile");
  const pair = ["edit_employee_sensitive", "add_employees"];
  // The pair alone opens neither section any more.
  assert.strictEqual(canEditPaymentDetails({ permissions: pair }), false);
  assert.strictEqual(canEditStatutoryDetails({ permissions: pair }), false);
  // The section key alone opens nothing either: the columns stay sensitive.
  assert.strictEqual(canEditPaymentDetails({ permissions: ["edit_payment_details"] }), false);
  assert.strictEqual(canEditStatutoryDetails({ permissions: ["edit_statutory_details"] }), false);
  // Pair + section key.
  assert.strictEqual(canEditPaymentDetails({ permissions: [...pair, "edit_payment_details"] }), true);
  assert.strictEqual(canEditStatutoryDetails({ permissions: [...pair, "edit_payment_details"] }), false);
  assert.strictEqual(canEditStatutoryDetails({ permissions: [...pair, "edit_statutory_details"] }), true);
  // Admin bypass, as everywhere.
  assert.strictEqual(canEditPaymentDetails({ isAdmin: true }), true);
  // `employee_create` - the onboarding key - opens neither.
  assert.strictEqual(canEditPaymentDetails({ permissions: ["employee_create", "employee_edit"] }), false);
  assert.strictEqual(canEditStatutoryDetails({ permissions: ["employee_create", "employee_edit"] }), false);
});

test("M1: changing a shift from the profile takes the assignment pair, and employee_create is not it", () => {
  const { canAssignShift } = require("./hrProfile");
  assert.strictEqual(canAssignShift({ permissions: ["employee_edit", "assign_employee_shift"] }), true);
  assert.strictEqual(canAssignShift({ permissions: ["employee_edit"] }), false);
  assert.strictEqual(canAssignShift({ permissions: ["assign_employee_shift"] }), false);
  assert.strictEqual(canAssignShift({ permissions: ["employee_create", "assign_employee_shift"] }), false);
  assert.strictEqual(canAssignShift({ isAdmin: true }), true);
});

test("M1: payment type reuses the legacy values - 1 Bank, 2 Cash - and is sent as a number", () => {
  const { PAYMENT_TYPE_OPTIONS, paymentTypeLabel, isBankPayment, isCashPayment } = require("./hrProfile");
  assert.deepStrictEqual(PAYMENT_TYPE_OPTIONS.map((o) => [o.value, o.label]), [[1, "Bank"], [2, "Cash"]]);
  assert.strictEqual(paymentTypeLabel("1"), "Bank");
  assert.strictEqual(paymentTypeLabel(2), "Cash");
  assert.strictEqual(paymentTypeLabel(null), null);
  assert.strictEqual(paymentTypeLabel(""), null);
  assert.ok(isBankPayment("1") && !isBankPayment(2) && isCashPayment(2) && !isCashPayment(null));
  assert.deepStrictEqual(buildSensitivePayload(9, { payment_type: 1 }, { payment_type: "2" }), {
    employee_id: 9,
    employee_details: { payment_type: 2 },
  });
  // Clearing sends null, as the applicability flags do.
  assert.deepStrictEqual(buildSensitivePayload(9, { payment_type: 1 }, { payment_type: "" }), {
    employee_id: 9,
    employee_details: { payment_type: null },
  });
});

/* ================================================== the ordinary edit path */
test("only changed fields are sent", () => {
  const before = { employee_name: "Ramesh", dob: "1990-02-01", gender: "M" };
  const patch = buildHrPatch(before, { employee_name: "Ramesh Kumar", dob: "1990-02-01" });
  assert.deepStrictEqual(patch, { employee_name: "Ramesh Kumar" });
});

test("nothing changed produces an empty patch, which the caller must not send", () => {
  // The backend answers "nothing to change"; sending it anyway would rewrite
  // updated_at and log an edit nobody made.
  assert.deepStrictEqual(buildHrPatch({ employee_name: "A" }, { employee_name: "A" }), {});
  assert.deepStrictEqual(buildHrPatch({}, {}), {});
});

test("whitespace-only differences are not changes", () => {
  assert.deepStrictEqual(buildHrPatch({ employee_name: "Ramesh" }, { employee_name: "  Ramesh  " }), {});
});

test("two ways of saying 'nothing recorded' are not a change", () => {
  for (const before of [null, undefined, ""]) {
    assert.deepStrictEqual(buildHrPatch({ email_id: before }, { email_id: "" }), {});
  }
});

test("a field the profile does not offer is never invented", () => {
  const patch = buildHrPatch({}, { employee_name: "New", salary: "50000", employee_id: 9 });
  assert.deepStrictEqual(patch, { employee_name: "New" }, "only listed fields travel");
});

test("placement ids are sent as numbers, and clearing one sends null not zero", () => {
  assert.deepStrictEqual(buildHrPatch({ store_id: 2 }, { store_id: "5" }), { store_id: 5 });
  assert.deepStrictEqual(buildHrPatch({ designation_id: 7 }, { designation_id: "" }), {
    designation_id: null,
  });
  // "2" and 2 are the same placement; a dropdown re-render is not an edit.
  assert.deepStrictEqual(buildHrPatch({ store_id: 2 }, { store_id: "2" }), {});
});

test("a placement change is recognised, because it re-issues authorisation", () => {
  assert.strictEqual(changesPlacement({ store_id: 3 }), true);
  assert.strictEqual(changesPlacement({ designation_id: 3 }), true);
  assert.strictEqual(changesPlacement({ employee_name: "x" }), false);
});

/* ===================================================== the sensitive path */
test("the payload carries the backend's key names, not the UI's", () => {
  const payload = buildSensitivePayload(631, {}, { uan: "100200300400", pan_no: "ABCDE1234F" });
  assert.deepStrictEqual(payload, {
    employee_id: 631,
    employee_details: { UAN: "100200300400", pan_no: "ABCDE1234F" },
  });
  assert.ok(!("uan" in payload.employee_details), "the lower-case key would be rejected");
});

test("AN UNCHANGED SECTION PRODUCES NULL, NEVER AN EMPTY BODY", () => {
  // `UPDATE new_employee SET ?` with {} is invalid SQL, not a no-op.
  assert.strictEqual(buildSensitivePayload(1, { pan_no: "ABCDE1234F" }, { pan_no: "ABCDE1234F" }), null);
  assert.strictEqual(buildSensitivePayload(1, {}, {}), null);
});

test("the applicability flags are sent as numbers", () => {
  const payload = buildSensitivePayload(1, {}, { pf_applicable: "1", esi_applicable: "0" });
  assert.strictEqual(payload.employee_details.pf_applicable, 1);
  assert.strictEqual(payload.employee_details.esi_applicable, 0);
});

test("CLEARING AN APPLICABILITY FLAG SENDS NULL, NEVER ZERO", () => {
  // The distinction the flags exist for. null is "nobody has said"; 0 is "not
  // in the scheme", which is a statutory decision. Emptying the dropdown must
  // not quietly record the second.
  const payload = buildSensitivePayload(1, { pf_applicable: 1 }, { pf_applicable: "" });
  assert.strictEqual(payload.employee_details.pf_applicable, null);
});

test("salary can no longer be sent from this screen at all", () => {
  // Not merely absent from the UI: the mapping refuses to carry it, so a
  // stale form or a future component cannot reopen the path by accident.
  assert.strictEqual(buildSensitivePayload(1, {}, { salary: "50000" }), null);
});

test("bank details travel this path too, which is what makes verification possible", () => {
  // Without an account number on the employee, C2 has nothing to verify - so
  // entering one is part of the bank section, behind the sensitive key.
  const payload = buildSensitivePayload(631, {}, {
    account_no: "123456789012",
    ifsc: "HDFC0001234",
    bank_name: "HDFC",
  });
  assert.deepStrictEqual(payload.employee_details, {
    account_no: "123456789012",
    ifsc: "HDFC0001234",
    bank_name: "HDFC",
  });
});

test("an ordinary field never leaks into the sensitive payload", () => {
  const payload = buildSensitivePayload(1, {}, { pan_no: "ABCDE1234F", employee_name: "Ramesh" });
  assert.deepStrictEqual(Object.keys(payload.employee_details), ["pan_no"]);
});

/* ================================================================ display */
test("identifiers are shown as present, not reprinted in full", () => {
  assert.strictEqual(maskIdentifier("ABCDE1234F"), "••••••234F");
  assert.strictEqual(maskIdentifier("100200300400"), "••••••••0400");
  assert.strictEqual(maskIdentifier(""), null);
  assert.strictEqual(maskIdentifier(null), null);
  // Nothing shorter than the visible tail is revealed whole.
  assert.strictEqual(maskIdentifier("123"), "•••");
});

test("not recorded is said, not left blank", () => {
  assert.strictEqual(orNotRecorded(""), "not recorded");
  assert.strictEqual(orNotRecorded(null), "not recorded");
  assert.strictEqual(orNotRecorded("ABCDE1234F"), "ABCDE1234F");
});

test("the employee read is unwrapped, and a refusal is not mistaken for a record", () => {
  assert.deepStrictEqual(unwrapEmployee([{ employee_id: 1 }]), { employee_id: 1 });
  assert.strictEqual(unwrapEmployee([]), null);
  assert.strictEqual(unwrapEmployee({ code: 403, msg: "denied" }), null);
  assert.strictEqual(unwrapEmployee(null), null);
});
