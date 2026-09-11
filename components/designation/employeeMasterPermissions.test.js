/**
 * Employee Master permissions, as the Permission Matrix offers them.
 *
 *   node --test components/designation/employeeMasterPermissions.test.js
 *
 * `constants/permissions.js` is what this screen renders, so a key that is
 * missing from it cannot be granted to a designation however well the backend
 * gates it. Stage 0C / C2 split the old catch-all `add_employees` into
 * `employee_create` / `employee_edit` / `employee_resign` / `employee_rejoin`
 * and guarded the routes with them, but never listed them here - so edit
 * access could only be handed out as `add_employees`, which also confers
 * create and status change. What is defended here:
 *
 *   - View and Edit are SEPARATE grantable keys, so a Store Manager can hold
 *     one without the other
 *   - `view_employees` appears exactly once: there is one View Employee
 *     permission, not a second one added beside it
 *   - the keys offered are the keys the backend actually checks - no key is
 *     invented on this screen
 *   - Edit Employee does NOT drag salary, bank, Aadhaar or the other
 *     separately restricted HR/payroll keys onto the screen with it
 *
 * No component renderer is wired up in this repo, so this reads the sources
 * the way components/attendance/attendanceScreens.test.js does.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const permissionsSrc = read("constants/permissions.js");
const profile = strip(read("pages/hr/employees/[id].jsx"));
const hrProfileUtil = strip(read("util/hrProfile.js"));

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

/** The permission keys a group OFFERS - commented-out lines are not offered. */
const offeredKeys = (body) =>
  body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => /^([a-z_][a-z0-9_]*)\s*:/i.exec(line))
    .filter(Boolean)
    .map((m) => m[1]);

const employee = group("employee");
const employeeKeys = offeredKeys(employee);

test("View and Edit Employee are separate, independently grantable keys", () => {
  assert.ok(
    employeeKeys.includes("view_employees"),
    "View Employee must stay on the screen"
  );
  assert.ok(
    employeeKeys.includes("employee_edit"),
    "Edit Employee must be grantable on its own, not only through add_employees"
  );
  assert.match(
    employee,
    /employee_edit:\s*"Edit Employee"/,
    "employee_edit should read as Edit Employee"
  );
});

test("there is exactly ONE View Employee permission", () => {
  const views = employeeKeys.filter((k) => k === "view_employees");
  assert.strictEqual(views.length, 1, "view_employees must not be duplicated");

  // And no second key that means the same thing under another name.
  const lookalikes = employeeKeys.filter(
    (k) => /^view_employee$/.test(k) || /^employee_view$/.test(k)
  );
  assert.deepStrictEqual(
    lookalikes,
    [],
    "a second View Employee key would split one decision across two grants"
  );
});

test("create and status change reuse the C2 keys rather than adding new ones", () => {
  for (const key of ["employee_create", "employee_resign", "employee_rejoin"]) {
    assert.ok(employeeKeys.includes(key), `${key} should be grantable`);
  }
  // Resign and Rejoin are the two halves of "change employee status"; they
  // stay two keys because they are the two the backend checks.
  assert.match(employee, /employee_resign:\s*"Change Employee Status/);
  assert.match(employee, /employee_rejoin:\s*"Change Employee Status/);
});

test("the profile's employment history is grantable, so View opens the profile", () => {
  assert.ok(
    employeeKeys.includes("view_employee_lifecycle"),
    "the profile reads the lifecycle; without a grant it cannot open at all"
  );
});

test("Edit Employee does not bring the restricted HR/payroll keys with it", () => {
  const restricted = [
    "view_employee_sensitive",
    "edit_employee_sensitive",
    "view_aadhaar_full",
    "view_banks",
    "add_banks",
    "view_salary_advance",
    "add_salary_advance",
    "verify_employee_bank",
    "confirm_bank_name_mismatch",
    "override_duplicate_bank_account",
  ];
  for (const key of restricted) {
    assert.ok(
      !employeeKeys.includes(key),
      `${key} is a separate decision and must not be offered beside Edit Employee`
    );
  }
});

test("the ordinary editor is gated on employee_edit alone", () => {
  assert.match(
    hrProfileUtil,
    /function canEditEmployee[\s\S]*?has\(permissions,\s*"employee_edit"\)/,
    "canEditEmployee should read employee_edit"
  );
  // Writing the sensitive fields stays a strictly higher bar. M1 review fix:
  // the bar is `edit_employee_sensitive` and no longer `add_employees` with
  // it - the backend stopped demanding Add Employee for the post-onboarding
  // sections, and keeping it here would leave the section keys ungrantable
  // from the other end. The sensitive key itself is not negotiable.
  assert.match(
    hrProfileUtil,
    /function canEditSensitive[\s\S]*?has\(permissions,\s*"edit_employee_sensitive"\)/,
    "canEditSensitive must keep requiring the sensitive key"
  );
  assert.ok(
    !/function canEditSensitive[\s\S]*?has\(permissions,\s*"add_employees"\)/.test(hrProfileUtil),
    "canEditSensitive must NOT require add_employees any more"
  );
});

test("a missing Edit does not blank the profile - it renders read-only", () => {
  // canEdit is passed DOWN to the sections; the page never returns early on
  // it. SectionCard simply omits the Edit button when canEdit is false.
  assert.ok(
    /canEdit\s*=\s*canEditEmployee\(actor\)/.test(profile),
    "the page should compute canEdit rather than gate the route on it"
  );
  assert.ok(
    !/if\s*\(!canEdit\)\s*\{[\s\S]{0,200}return/.test(profile),
    "the profile must not full-page block just because Edit is missing"
  );
  assert.ok(
    /canEdit=\{canEdit/.test(profile),
    "canEdit should reach the sections so they render read-only"
  );
});
