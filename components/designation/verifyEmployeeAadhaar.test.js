/**
 * THE EXISTING-EMPLOYEE AADHAAR VERIFICATION PERMISSION, on the screens.
 *
 *   node --test components/designation/verifyEmployeeAadhaar.test.js
 *
 * Two questions, and they are different:
 *
 *   CAN AN ADMINISTRATOR GRANT IT?  `constants/permissions.js` is what the
 *     Permission Matrix renders, so a key missing from it cannot be ticked
 *     however correctly the backend gates it.
 *
 *   DOES THE BUTTON FOLLOW IT?  "Verify now" on the employee profile used to
 *     appear on `employee_edit` alone and then call the ONBOARDING endpoints,
 *     which want `employee_create` + `edit_employee_sensitive` - so a store
 *     manager was shown a button that sent an OTP to somebody's phone and then
 *     answered "You do not have permission to perform this action".
 *
 * No component renderer is wired up in this repo, so this reads the sources
 * the way its sibling employeeMasterPermissions.test.js does, and exercises
 * the pure decision function directly.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const permissionsSrc = read("constants/permissions.js");
const profile = strip(read("pages/hr/employees/[id].jsx"));
const modal = strip(read("components/hr/AadhaarVerifyModal.jsx"));
const section = strip(read("components/hr/profile/AadhaarSection.jsx"));
const helper = strip(read("helper/hr.js"));

const { canVerifyExistingAadhaar, aadhaarSectionView } = require("../../util/hrStatus");

const KEY = "verify_employee_aadhaar";
const LABEL = "Verify Employee Aadhaar";

/** The body of one top-level group in PERMISSIONS, comments removed. */
const group = (name) => {
  const src = strip(permissionsSrc);
  const start = src.indexOf(`${name}: {`);
  assert.ok(start !== -1, `PERMISSIONS.${name} should exist`);
  const open = src.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < src.length; i += 1) {
    if (src[i] === "{") depth += 1;
    if (src[i] === "}") {
      depth -= 1;
      if (depth === 0) return src.slice(open + 1, i);
    }
  }
  throw new Error(`PERMISSIONS.${name} is not closed`);
};

const employee = group("employee");
const employeeKeys = employee
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => line.match(/^([a-z0-9_]+)\s*:/))
  .filter(Boolean)
  .map((m) => m[1]);

/** Permissions arrive from the API as rows, not strings. */
const P = (...keys) => keys.map((permission_key) => ({ permission_key }));
const ALL_THREE = P("view_employee_aadhaar", KEY, "employee_edit");

/* ===================================================================== */
/*  15-18. THE DESIGNATION PERMISSIONS CATALOG                           */
/* ===================================================================== */

test("15. the new permission appears in the Employee module's catalog", () => {
  assert.ok(
    employeeKeys.includes(KEY),
    "without this entry the Permission Matrix has no checkbox to grant it"
  );
});

test("16. the key is exactly the one the backend checks", () => {
  assert.match(permissionsSrc, new RegExp(`${KEY}:`));
  assert.strictEqual(
    employeeKeys.filter((k) => k === KEY).length,
    1,
    "it is listed once"
  );
});

test("17. the label is exactly the approved wording", () => {
  assert.match(permissionsSrc, new RegExp(`${KEY}:\\s*"${LABEL}"`));
});

test("18. it is an ORDINARY checkbox - no exclusivity, no auto-selection", () => {
  // `EXCLUSIVE_PERMISSION_GROUPS` makes ticking one key untick its siblings.
  // This one is nobody's sibling: it must save like any other box.
  const declaration = "export const EXCLUSIVE_PERMISSION_GROUPS = [";
  const start = permissionsSrc.indexOf(declaration);
  assert.ok(start !== -1, "the exclusivity list must be findable");
  const list = permissionsSrc.slice(start, permissionsSrc.indexOf("];", start));
  assert.ok(!list.includes(KEY), "an exclusivity rule would untick something else");
  assert.ok(list.includes("dashboard_scope_own_store"), "the slice covers the real list");

  // And nothing anywhere special-cases it by name: the matrix renders whatever
  // the catalog lists, so a key handled by name would not behave like a box.
  const mentions = (strip(permissionsSrc).match(new RegExp(KEY, "g")) || []).length;
  assert.strictEqual(mentions, 1, "the key appears once, as a catalog entry and nothing more");
});

test("the catalog gained exactly one entry, and dragged nothing else on", () => {
  assert.strictEqual(employeeKeys.length, 17, "sixteen before, seventeen after");
  for (const forbidden of [
    "view_aadhaar_full",
    "view_employee_sensitive",
    "edit_employee_sensitive",
    "employee_scope_all_branches",
  ]) {
    assert.ok(!employeeKeys.includes(forbidden), `${forbidden} must not appear beside it`);
  }
  // Everything offered before is still offered, unrenamed.
  for (const key of [
    "view_employees", "view_employee_lifecycle", "view_employee_aadhaar",
    "employee_edit", "employee_create", "employee_resign", "employee_rejoin",
  ]) {
    assert.ok(employeeKeys.includes(key), `${key} must still be grantable`);
  }
});

/* ===================================================================== */
/*  19-22. WHEN "VERIFY NOW" IS OFFERED                                  */
/* ===================================================================== */

const PENDING = { ok: true, state: "OK", data: { aadhaar_status: "PENDING", can_verify_now: true } };
const VERIFIED = {
  ok: true,
  state: "OK",
  data: { aadhaar_status: "VERIFIED", aadhaar_last4: "0000", can_verify_now: false },
};
const DENIED = { ok: false, state: "DENIED", data: null };
const UNAVAILABLE = { ok: false, state: "ERROR", data: null };

/** The exact condition the section renders the button on. */
const offersVerify = (outcome, actor) =>
  canVerifyExistingAadhaar(actor) && aadhaarSectionView(outcome).canOfferVerify;

test("19. PENDING + all three permissions -> Verify now is offered", () => {
  assert.strictEqual(offersVerify(PENDING, { permissions: ALL_THREE }), true);
  assert.strictEqual(offersVerify(PENDING, { permissions: [], isAdmin: true }), true);
});

test("20. PENDING without verify_employee_aadhaar -> the button is hidden", () => {
  assert.strictEqual(
    offersVerify(PENDING, { permissions: P("view_employee_aadhaar", "employee_edit") }),
    false,
    "the store manager's state today: sees the badge, may not verify"
  );
  // And neither of the other two alone is enough either - the workflow needs
  // all three, or the button sends an OTP and cannot finish.
  assert.strictEqual(offersVerify(PENDING, { permissions: P(KEY) }), false);
  assert.strictEqual(offersVerify(PENDING, { permissions: P(KEY, "employee_edit") }), false);
  assert.strictEqual(
    offersVerify(PENDING, { permissions: P(KEY, "view_employee_aadhaar") }),
    false,
    "without employee_edit the verification could never be attached"
  );
  // The broad sensitive key is NOT a substitute for the narrow one.
  assert.strictEqual(
    offersVerify(PENDING, {
      permissions: P("view_employee_aadhaar", "employee_edit", "edit_employee_sensitive"),
    }),
    false
  );
});

test("21. VERIFIED -> no Verify now, and no Replace / Change affordance at all", () => {
  const view = aadhaarSectionView(VERIFIED);
  assert.strictEqual(view.kind, "VERIFIED");
  assert.strictEqual(view.canOfferVerify, false);
  assert.strictEqual(offersVerify(VERIFIED, { permissions: ALL_THREE }), false);
  assert.strictEqual(offersVerify(VERIFIED, { permissions: [], isAdmin: true }), false);
  // Nothing on the section offers a second attempt under another name.
  for (const word of ["Replace", "Change Aadhaar", "Verify again", "Re-verify"]) {
    assert.ok(!section.includes(word), `"${word}" must not be offered for a verified Aadhaar`);
  }
});

test("22. a denied or unavailable status read -> hidden, and never read as PENDING", () => {
  for (const [what, outcome] of [["denied", DENIED], ["unavailable", UNAVAILABLE]]) {
    const view = aadhaarSectionView(outcome);
    assert.notStrictEqual(view.kind, "PENDING", `a ${what} read must not be inferred as PENDING`);
    assert.strictEqual(view.canOfferVerify, false);
    assert.strictEqual(offersVerify(outcome, { permissions: ALL_THREE }), false);
    assert.strictEqual(offersVerify(outcome, { permissions: [], isAdmin: true }), false);
  }
});

/* ===================================================================== */
/*  23. NO FULL-AADHAAR AFFORDANCE                                       */
/* ===================================================================== */

test("23. no full-Aadhaar affordance is introduced anywhere", () => {
  for (const src of [section, modal, profile, helper]) {
    assert.ok(!src.includes("aadhaar/full"), "the full-number endpoint is not called");
    assert.ok(!/view_aadhaar_full/.test(src), "the full-number key is not consulted");
    assert.ok(!/aadhaar_number\s*[:=]\s*res/.test(src), "no response field is read as a number");
  }
  for (const word of ["Show full", "Reveal", "View full Aadhaar"]) {
    assert.ok(!section.includes(word), `"${word}" must not exist on the Aadhaar section`);
  }
});

/* ===================================================================== */
/*  THE WIRING BEHIND THE BUTTON                                         */
/* ===================================================================== */

test("the profile gates the button on the whole workflow, not on Edit alone", () => {
  assert.match(
    profile,
    /canVerify=\{canVerifyExistingAadhaar\(actor\)\}/,
    "the Aadhaar section must be handed the three-key decision"
  );
  assert.ok(
    !/canVerify=\{canEdit\}/.test(profile),
    "canEdit alone is what produced a button that 403'd"
  );
});

test("the profile's modal uses the EXISTING-EMPLOYEE endpoints", () => {
  assert.match(profile, /employeeId=\{identity\.employee_id\}/);
  assert.match(modal, /initiateAadhaarForEmployee/);
  assert.match(modal, /verifyAadhaarOtpForEmployee/);
  assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/aadhaar\/initiate/);
  assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/aadhaar\/verify-otp/);
});

test("ADD EMPLOYEE IS UNTOUCHED: with no employeeId the onboarding calls are used", () => {
  // The onboarding helpers still exist and are still what the modal falls back
  // to, so new-hire onboarding keeps its existing authorization exactly.
  assert.match(helper, /initiateAadhaar:\s*\(/);
  assert.match(helper, /verifyAadhaarOtp:\s*\(/);
  assert.match(modal, /:\s*await HrHelper\.initiateAadhaar\(payload\)/);
  assert.match(modal, /:\s*await HrHelper\.verifyAadhaarOtp\(payload\)/);

  const newEmployee = strip(read("pages/hr/employees/new.jsx"));
  assert.ok(
    !newEmployee.includes(KEY),
    "creating a new employee must not start requiring the verification key"
  );
  assert.ok(
    !/employeeId=/.test(newEmployee.slice(
      newEmployee.indexOf("<AadhaarVerifyModal"),
      newEmployee.indexOf("/>", newEmployee.indexOf("<AadhaarVerifyModal"))
    )),
    "Add Employee has no employee yet, so it must pass no employeeId"
  );
});
