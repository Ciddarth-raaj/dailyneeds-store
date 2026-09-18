/**
 * Reports permissions, as the Permission Matrix offers them.
 *
 *   node --test components/designation/reportPermissions.test.js
 *
 * `constants/permissions.js` is what the Designation screen renders, so a key
 * missing from it cannot be granted to a designation however well the backend
 * gates it. The reports-foundation migration declared `view_reports`,
 * `export_reports` and `manage_shared_report_templates` and
 * `routes/employee_report.js` has required them since Reports shipped - but
 * they were never listed here, so Reports worked for administrators (through
 * the `user_type = 2` bypass) and could not be granted to anybody else.
 *
 * What is defended here:
 *
 *   - the three report keys are grantable, spelled exactly as the backend
 *     spells them, and are three SEPARATE boxes
 *   - no not-yet-built reporting key (`hr_reports`, `process_payroll`) is
 *     smuggled onto the screen beside them
 *   - `view_reports` alone opens nothing: every navigation entry and every
 *     page requires `view_employees` as WELL, which is AND and not OR - the
 *     same `requireAll` the backend applies
 *   - the administrator bypass is untouched: nothing here grants by user type
 *
 * No component renderer is wired up in this repo, so this reads the sources
 * the way components/designation/employeeMasterPermissions.test.js does.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const hasMenuPermission = require("../../util/menuPermissions");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const permissionsSrc = read("constants/permissions.js");
const catalogSrc = read("util/permissionCatalog.js");
const menusSrc = read("constants/menus.js");
const savedPage = read("pages/reports/employee-master/index.jsx");
const reportPage = read("pages/reports/employee-master/[templateId].jsx");
const newPage = read("pages/reports/employee-master/new.jsx");

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

const reports = group("reports");
const reportKeys = offeredKeys(reports);

/* ================================================= the boxes exist at all */

test("THE THREE REPORT RIGHTS ARE GRANTABLE FROM THE PERMISSION MATRIX", () => {
  // The whole bug: the backend checked these three and the screen offered
  // none of them, so only an administrator could ever use Reports.
  assert.deepStrictEqual(reportKeys, [
    "view_reports",
    "export_reports",
    "manage_shared_report_templates",
  ]);
});

test("the keys are the backend's, spelled exactly, and the labels say what they do", () => {
  assert.match(reports, /view_reports:\s*"View Reports"/);
  assert.match(reports, /export_reports:\s*"Export Reports"/);
  assert.match(reports, /manage_shared_report_templates:\s*"Manage Shared Report Templates"/);
});

test("THEY ARE THREE SEPARATE DECISIONS, NOT ONE", () => {
  // Reading a report on a screen and emailing a spreadsheet of it are not the
  // same trust, and publishing a template to everybody is a third thing.
  assert.strictEqual(new Set(reportKeys).size, 3, "no key is duplicated");
  const everywhere = offeredKeys(strip(permissionsSrc));
  for (const key of reportKeys) {
    assert.strictEqual(
      everywhere.filter((k) => k === key).length,
      1,
      `${key} must appear exactly once in the whole matrix`
    );
  }
});

test("NO NOT-YET-BUILT REPORTING KEY RIDES IN WITH THEM", () => {
  // `hr_reports` and `process_payroll` are declared by the M2 migration and
  // gate no screen. A key that can be granted before its screen exists grants
  // nothing while being remembered as if it did.
  const everywhere = offeredKeys(strip(permissionsSrc));
  for (const notYet of ["hr_reports", "process_payroll"]) {
    assert.ok(!everywhere.includes(notYet), `${notYet} must not be offered yet`);
  }
});

test("the Reports module gets its own header icon rather than the fallback folder", () => {
  assert.match(catalogSrc, /reports:\s*"fa-file-lines"/);
});

/* ============================== view_reports alone opens nothing =========== */

test("EVERY REPORT NAVIGATION ENTRY REQUIRES view_employees AS WELL", () => {
  const src = strip(menusSrc);
  const menu = src.slice(src.indexOf("const REPORTS_MENU"), src.indexOf("export const MENU_MODULES"));
  const entries = menu.match(/permission:\s*\[[^\]]*\]/g) || [];
  assert.ok(entries.length >= 2, "both report entries declare a permission");
  for (const entry of entries) {
    assert.ok(entry.includes("view_reports"), `${entry} must require view_reports`);
    assert.ok(entry.includes("view_employees"), `${entry} must require view_employees too`);
  }
  // And no entry names only the capability.
  assert.ok(
    !/permission:\s*"view_reports"/.test(menu),
    "a lone view_reports would put a module on a rail that 403s when opened"
  );
});

test("AN ARRAY OF KEYS IS AND, SO THE RAIL AGREES WITH `requireAll`", () => {
  const both = [{ permission_key: "view_reports" }, { permission_key: "view_employees" }];
  const onlyCapability = [{ permission_key: "view_reports" }];
  const onlyDirectory = [{ permission_key: "view_employees" }];

  assert.strictEqual(hasMenuPermission(["view_reports", "view_employees"], both), true);
  assert.strictEqual(
    hasMenuPermission(["view_reports", "view_employees"], onlyCapability),
    false,
    "the reporting capability is not a doorway into the employee master"
  );
  assert.strictEqual(
    hasMenuPermission(["view_reports", "view_employees"], onlyDirectory),
    false,
    "AND SEEING EMPLOYEES IS NOT THE SAME AS REPORTING ON THEM - this is the half that would otherwise show Reports to the whole HR directory"
  );
});

test("EVERY REPORT PAGE ASKS FOR BOTH KEYS, WITH { all: true }", () => {
  for (const [name, src] of [
    ["Saved Reports", savedPage],
    ["the report screen", reportPage],
    ["Create Report", newPage],
  ]) {
    const call = /usePermissions\(\s*\[([^\]]*)\]\s*,\s*\{([^}]*)\}\s*\)/.exec(strip(src));
    assert.ok(call, `${name} must guard itself with usePermissions`);
    assert.ok(call[1].includes("view_reports"), `${name} must require view_reports`);
    assert.ok(call[1].includes("view_employees"), `${name} must require view_employees`);
    assert.match(call[2], /all:\s*true/, `${name} must require BOTH, not either`);
  }
});

test("NOTHING HERE GRANTS BY USER TYPE, SO THE ADMIN BYPASS IS UNCHANGED", () => {
  // The `user_type = 2` bypass lives in the backend middleware. This screen
  // only lists keys; it must not start reading a user type to decide one.
  assert.ok(
    !/user_type/.test(strip(permissionsSrc)),
    "permissions.js must not inspect user_type"
  );
  assert.ok(!/isAdmin/.test(strip(read("util/permissionCatalog.js"))));
});
