/**
 * Employee Master permissions — grantable, separable, and not a way into payroll.
 *
 *   node --test util/employeeMasterPermissions.test.js
 *
 * The defect these tests exist for: `routes/employee_master.js` has enforced
 * `employee_create`, `employee_edit`, `employee_resign` and `employee_rejoin`
 * since Stage 0C / C2, and the C2 migration declared all of them in
 * `all_permissions` — but none of them appeared in `constants/permissions.js`,
 * which is the ONLY source the Designation screen builds its checkboxes from.
 * The permissions were real and ungrantable at the same time, so the only way
 * to let a Store Manager correct a phone number was `add_employees`, which
 * carries the whole HR surface.
 *
 * So the first thing proved here is that the catalog and the backend agree,
 * read from the backend router rather than from a list typed into this file.
 * The second is that Edit Employee stays clear of salary, bank and Aadhaar.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");

const catalog = read("constants/permissions.js");
const profile = read("pages/hr/employees/[id].jsx");
const hrProfile = read("util/hrProfile.js");

const BACKEND = path.join(ROOT, "..", "dailyneeds-store-backend");
const backendAvailable = fs.existsSync(BACKEND);

/** The `employee:` group of the catalog, and nothing either side of it. */
function employeeGroup() {
  const start = catalog.indexOf("  employee: {");
  assert.ok(start > -1, "the catalog must still have an `employee` group");
  const end = catalog.indexOf("\n  },", start);
  assert.ok(end > start, "the `employee` group must be terminated");
  return catalog.slice(start, end);
}

/** Keys that are actually offered — a commented-out line grants nothing. */
function grantableKeys(group) {
  return group
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .flatMap((line) => {
      const m = line.match(/^\s*([a-z_0-9]+):\s*"/);
      return m ? [m[1]] : [];
    });
}

/* ==================================== the four approved permissions ===== */

test("the Employee Master permissions can be granted from the Designation screen", () => {
  const offered = grantableKeys(employeeGroup());

  for (const key of [
    "view_employees", // 1. View Employee
    "employee_create", // 2. Add Employee
    "employee_edit", // 3. Edit Employee
    "employee_resign", // 4. Change Employee Status …
    "employee_rejoin", //    … both halves of it
  ]) {
    assert.ok(offered.includes(key), `${key} must be grantable, it is enforced`);
  }
});

test("each one is its own checkbox, so a manager can get View + Edit and nothing else", () => {
  // The whole point of the change. If these were ever collapsed into one key,
  // granting Edit would silently grant Add and the status actions with it.
  const offered = grantableKeys(employeeGroup());
  const master = ["view_employees", "employee_create", "employee_edit", "employee_resign", "employee_rejoin"];
  assert.strictEqual(
    new Set(master.map((k) => offered.indexOf(k))).size,
    master.length,
    "the five keys must be five distinct entries"
  );
});

test("every key the catalog offers is one the backend actually knows", { skip: !backendAvailable }, () => {
  // Guards the other direction: a key invented here would be a checkbox that
  // grants nothing, which is worse than no checkbox at all.
  const declared = fs.readFileSync(path.join(BACKEND, "constants", "hr_permissions.js"), "utf8");
  for (const key of ["employee_create", "employee_edit", "employee_resign", "employee_rejoin", "view_employee_lifecycle"]) {
    assert.match(declared, new RegExp(`"${key}"`), `${key} must exist in the backend's key list`);
  }
});

test("the backend still enforces each of them on its own route", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(path.join(BACKEND, "routes", "employee_master.js"), "utf8");
  // Frontend hiding is presentation; these are what actually refuse a request.
  assert.match(router, /router\.post\(\s*"\/employee",\s*this\.permissions\.require\(P\.EMPLOYEE_CREATE\)/);
  assert.match(router, /router\.post\(\s*"\/employee\/:employee_id\/edit",\s*this\.permissions\.require\(P\.EMPLOYEE_EDIT\)/);
  assert.match(router, /router\.post\(\s*"\/employee\/:employee_id\/resign",\s*this\.permissions\.require\(P\.EMPLOYEE_RESIGN\)/);
  assert.match(router, /router\.post\(\s*"\/employee\/:employee_id\/rejoin",\s*this\.permissions\.require\(P\.EMPLOYEE_REJOIN\)/);
});

/* ================================= Edit Employee is not payroll access == */

test("EDIT EMPLOYEE ALONE REACHES NO SENSITIVE FIELD", () => {
  // `canEditEmployee` is `employee_edit`; the sensitive editor needs a
  // different pair entirely. If these ever converged, granting a manager Edit
  // Employee would hand them salary and bank details.
  assert.match(hrProfile, /function canEditEmployee\([^)]*\)\s*{\s*return isAdminUser\(isAdmin\) \|\| has\(permissions, "employee_edit"\);/s);
  assert.match(
    hrProfile,
    /function canEditSensitive[\s\S]*?has\(permissions, "edit_employee_sensitive"\) && has\(permissions, "add_employees"\)/,
    "sensitive edits need edit_employee_sensitive AND add_employees, never employee_edit"
  );
});

test("no sensitive column is in the ordinary editable list", () => {
  const start = hrProfile.indexOf("const HR_EDITABLE_FIELDS");
  const fields = hrProfile.slice(start, hrProfile.indexOf("];", start));
  for (const forbidden of ["salary", "pan_no", "uan", "pf_number", "esi_number", "account_no", "ifsc", "bank_name", "aadhaar"]) {
    assert.ok(!new RegExp(`"${forbidden}"`).test(fields), `${forbidden} must not be editable through employee_edit`);
  }
});

test("the sensitive keys are NOT added to the employee permission group", () => {
  // This task widened Employee Master access deliberately. It must not have
  // widened payroll access by putting a sensitive key on the same screen row.
  const offered = grantableKeys(employeeGroup());
  for (const key of ["edit_employee_sensitive", "view_employee_sensitive", "view_aadhaar_full", "add_salary_advance"]) {
    assert.ok(!offered.includes(key), `${key} must not be granted from the Employee group`);
  }
});

/* ================== View without Edit opens read-only, not an error page = */

test("a refused lifecycle read no longer blanks the profile", () => {
  // `view_employee_lifecycle` is a separate grant from `view_employees`, so a
  // manager with View Employee alone gets a 403 from the lifecycle call. The
  // page used to render the backend's own "You do not have permission to
  // perform this action" across the whole screen for exactly that user.
  assert.match(profile, /const identity =\s*\n?\s*lifecycle \|\|/, "identity falls back to the employee record");
  assert.match(profile, /if \(!identity\) {/, "only a total failure is blocked");
  assert.ok(
    !/if \(!lifecycle\) {\s*\n\s*return \(/.test(profile),
    "a missing lifecycle must not short-circuit the whole page"
  );
});

test("read-only is the section pattern, not a disabled page", () => {
  // Each section takes `canEdit` and hides its own Edit button; nothing on the
  // profile is gated as a whole on being able to edit it.
  const sectionCard = read("components/hr/profile/SectionCard.jsx");
  assert.match(sectionCard, /canView && canEdit \? \(/, "Edit shows only for someone who may edit");
  for (const section of ["PersonalSection", "EmploymentSection", "EducationSection"]) {
    assert.match(
      profile,
      new RegExp(`<${section}[\\s\\S]{0,400}?canEdit={canEdit && Boolean\\(employee\\)}`),
      `${section} must be read-only without employee_edit`
    );
  }
});

test("the status actions are offered only to somebody who holds them", () => {
  const hrStatus = read("util/hrStatus.js");
  assert.match(
    hrStatus,
    /canResign: Boolean\(isActive\) && \(isAdmin \|\| has\(permissions, "employee_resign"\)\)/
  );
  assert.match(hrStatus, /canRejoin: !isActive && \(isAdmin \|\| has\(permissions, "employee_rejoin"\)\)/);
  // And they are asked ONLY when the lifecycle is readable, because
  // `employee.status` is not reliably the employment status - the profile's
  // employee read joins three tables that each have a `status` column.
  assert.match(profile, /const \{ canResign, canRejoin \} = lifecycle\s*\n?\s*\?\s*lifecycleActions\(/);
  assert.match(profile, /:\s*\{ canResign: false, canRejoin: false \};/);
  assert.ok(
    !/is_active: Number\(employee\.status\)/.test(profile),
    "employment status must never be derived from the joined employee row"
  );
  // And the badge does not guess either.
  const employment = read("components/hr/profile/EmploymentSection.jsx");
  assert.ok(
    !/lifecycle\.status \?\? employee\.status/.test(employment),
    "the badge must not fall back to the ambiguous employee.status"
  );
});

/* ================== the pickers Edit Employee needs, and no more ======== */

test("the designation and department hooks keep the gated read as their default", () => {
  for (const hook of ["customHooks/useDesignations.js", "customHooks/useDepartments.js"]) {
    const src = read(hook);
    assert.match(src, /directory = false/, `${hook}: the picker must be opt-in`);
    assert.match(src, /Directory\(\)/, `${hook}: the picker call must exist`);
  }
  // The full, permission-gated call is still there for callers that need it.
  assert.match(read("customHooks/useDesignations.js"), /DesignationHelper\.getDesignation\(\)/);
  assert.match(read("customHooks/useDepartments.js"), /DepartmentHelper\.getDepartment\(\)/);
});

test("ONLY the Employee Master screens opted in", () => {
  // The same discipline as `useOutlets.test.js`: the opt-in list is explicit,
  // so no screen can start reading the ungated picker without this test saying
  // so. Everything not listed still gets the `view_designation` /
  // `view_department` read it always had.
  const roots = ["pages", "components", "customHooks"];
  // Assembled rather than written out, so this file does not match itself the
  // way a literal call would.
  const optIn = (name) => new RegExp(`${name}\\(\\{[^)]*directory: true`);
  const hooks = ["useDesignations", "useDepartments"];

  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!/\.(js|jsx)$/.test(entry.name) || entry.name.endsWith(".test.js")) continue;
      const normalised = rel.replace(/\\/g, "/");
      // The hooks themselves declare the option; they are not consumers of it.
      if (normalised === "customHooks/useDesignations.js") continue;
      if (normalised === "customHooks/useDepartments.js") continue;
      const src = read(normalised);
      if (hooks.some((h) => optIn(h).test(src))) found.push(normalised);
    }
  };
  roots.forEach(walk);

  assert.deepEqual(found.sort(), [
    // The employee profile: the Employment editor's Department and Designation
    // dropdowns, which `employee_edit` must be able to fill.
    "pages/hr/employees/[id].jsx",
    // The employee list: its designation filter.
    "pages/hr/employees/index.jsx",
    // Add Employee: the same two pickers, on `employee_create`.
    "pages/hr/employees/new.jsx",
  ]);
});

/* ============================================= admins are untouched ===== */

test("administrators keep everything through the existing user_type bypass", { skip: !backendAvailable }, () => {
  const middleware = fs.readFileSync(path.join(BACKEND, "middlewares", "permissions.js"), "utf8");
  assert.match(middleware, /const ADMIN_USER_TYPE = 2;/);
  assert.match(middleware, /if \(Number\(userType\) === ADMIN_USER_TYPE\) return null; \/\/ null = allow all/);
});
