/**
 * Stage 0C / C3 — HR is a top-level module, and there is ONE employee master.
 *
 *   node --test constants/hrNavigation.test.js
 *
 * The navigation is a plain object, so it can be checked directly rather than
 * by rendering the sidebar. What is defended here is the architecture
 * decision, not the wording:
 *
 *   HR is a module beside WMS and GST, not a section inside another module
 *   Employees, Department and Designation live in it
 *   the old top-level Employees section is GONE, not merely renamed
 *   Attendance and Payroll are not inside HR
 *   /employee still resolves
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "menus.js"), "utf8");
/** Comments explain what moved and why; only code decides the navigation. */
const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

/** Every `location:` in a named block of the file. */
const locationsIn = (block) => (block.match(/location:\s*"([^"]+)"/g) || []).map((m) => m.slice(11, -1));

/** A menu tree by its `const NAME = {` declaration, to its closing `};`. */
const treeNamed = (name) => {
  const start = code.indexOf(`const ${name} = {`);
  assert.notStrictEqual(start, -1, `${name} must exist`);
  const end = code.indexOf("\n};", start);
  return code.slice(start, end);
};

/* ================================================= HR is a real module == */
test("HR is a top-level module on the rail, beside WMS and GST", () => {
  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  assert.match(modules, /\bhr:\s*\{/, "there must be an `hr` module");
  const hr = modules.slice(modules.indexOf("hr: {"), modules.indexOf("wms: {"));
  assert.match(hr, /title:\s*"HR"/);
  assert.match(hr, /menu:\s*HR_MENU/);
  // The application shell keeps its purple; HR is not a different product.
  assert.match(hr, /accent:\s*"purple"/);
});

test("Employees, Department and Designation are all inside HR", () => {
  const hrMenu = treeNamed("HR_MENU");
  assert.deepStrictEqual(locationsIn(hrMenu).sort(), [
    "/department",
    "/designation",
    "/hr/employees",
  ]);
});

test("the HR employee entry is gated on view_employees", () => {
  const hrMenu = treeNamed("HR_MENU");
  const entry = hrMenu.slice(hrMenu.indexOf("view_employees:"), hrMenu.indexOf("/hr/employees") + 20);
  assert.match(entry, /permission:\s*"view_employees"/);
});

/* ============================================ one employee master only == */
test("THE OLD TOP-LEVEL EMPLOYEES SECTION IS GONE", () => {
  const all = treeNamed("ALL_PAGES_MENU");

  // Not "renamed" and not "left with an empty submenu" - absent. Two employee
  // lists in the navigation is how two employee masters begin.
  assert.ok(!/^\s{2}employee:\s*\{/m.test(all), "the `employee` section must not exist");
  assert.ok(!locationsIn(all).includes("/employee"), "nothing may link to the old list");
});

test("the employee master appears exactly once in the whole navigation", () => {
  const everywhere = (code.match(/location:\s*"\/hr\/employees"/g) || []).length;
  assert.strictEqual(everywhere, 1, "one entry, in HR");
});

test("Department and Designation moved rather than being duplicated", () => {
  // They must not be left behind in the All menu as well - the same page in
  // two modules is the ambiguity this restructure removes.
  const all = treeNamed("ALL_PAGES_MENU");
  for (const moved of ["/department", "/designation"]) {
    assert.ok(!locationsIn(all).includes(moved), `${moved} must appear only in HR`);
  }
});

/* ================================= HR is HR, not HR-and-everything-else = */
test("ATTENDANCE AND PAYROLL ARE NOT INSIDE HR", () => {
  // Three separate top-level modules is the fixed architecture. They are also
  // not declared as empty modules yet: an empty module is a promise the
  // navigation cannot keep.
  const hrMenu = treeNamed("HR_MENU");
  for (const notYet of ["attendance", "payroll", "Attendance", "Payroll"]) {
    assert.ok(!hrMenu.includes(notYet), `HR must not contain ${notYet}`);
  }
  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  assert.ok(!/\battendance:\s*\{/.test(modules), "Attendance arrives with its own screens");
  assert.ok(!/\bpayroll:\s*\{/.test(modules), "Payroll arrives after Attendance");
});

/* ==================================================== nothing 404s now = */
test("/employee still resolves, as a redirect to the one master", () => {
  const page = fs.readFileSync(
    path.join(__dirname, "..", "pages", "employee", "index.jsx"),
    "utf8"
  );
  assert.match(page, /router\.replace\("\/hr\/employees"\)/, "the old URL must still work");
  // `replace`, not `push`: Back must not bounce the user straight back here.
  assert.ok(!/router\.push\("\/hr\/employees"\)/.test(page));
});

test("THE SYNC BUTTON AND LAST SYNC ARE GONE FROM THE EMPLOYEE MASTER", () => {
  // dnds.co.in IS the employee master now. An action offering to re-pull
  // these records from Digisme misdescribes which system is authoritative.
  const redirect = fs.readFileSync(
    path.join(__dirname, "..", "pages", "employee", "index.jsx"),
    "utf8"
  );
  const list = fs.readFileSync(
    path.join(__dirname, "..", "pages", "hr", "employees", "index.jsx"),
    "utf8"
  );
  const stripped = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  for (const [name, page] of Object.entries({ redirect, list })) {
    const c = stripped(page);
    assert.ok(!/handleSync/.test(c), `${name} must not offer a sync`);
    assert.ok(!/Last Sync/i.test(c), `${name} must not show a last-sync time`);
    assert.ok(!/useEmployees\(/.test(c), `${name} must not use the syncing hook`);
  }
});

/* ================================ one employee PROFILE, as well as one list */
test("the canonical employee profile appears exactly once as an implementation", () => {
  const pages = path.join(__dirname, "..", "pages");
  const profiles = [];

  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(js|jsx)$/.test(entry.name)) continue;
      const body = fs.readFileSync(full, "utf8");
      // A page that fetches an employee's lifecycle IS an employee profile.
      if (/HrHelper\.getLifecycle\(|EmployeeHelper\.getEmployeeByID\(/.test(body)) {
        profiles.push(path.relative(pages, full).replace(/\\/g, "/"));
      }
    }
  };
  walk(pages);

  assert.deepStrictEqual(profiles, ["hr/employees/[id].jsx"], "one profile, in HR");
});

test("HR navigation still appears exactly once, and still holds the three pages", () => {
  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  assert.strictEqual((modules.match(/\bhr:\s*\{/g) || []).length, 1, "one HR module");

  const hrMenu = treeNamed("HR_MENU");
  assert.deepStrictEqual(locationsIn(hrMenu).sort(), [
    "/department",
    "/designation",
    "/hr/employees",
  ]);
});

/* ============================== Reports is its own module, not HR's ===== */
test("REPORTS IS A TOP-LEVEL MODULE, BESIDE HR RATHER THAN INSIDE IT", () => {
  // The reporting machinery is per-dataset and the datasets belong to
  // different modules: Employee Master is HR's, Attendance and Payroll will be
  // their own. Nesting the reports under HR would mean an Attendance report
  // living somewhere nobody would look for it, or Reports existing twice.
  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  assert.strictEqual((modules.match(/\breports:\s*\{/g) || []).length, 1, "one Reports module");

  const reports = modules.slice(modules.indexOf("reports: {"), modules.indexOf("wms: {"));
  assert.match(reports, /title:\s*"Reports"/);
  assert.match(reports, /menu:\s*REPORTS_MENU/);
  // The application shell keeps its purple; Reports is the same product
  // looked at a different way, not a separate one.
  assert.match(reports, /accent:\s*"purple"/);
});

test("HR NO LONGER OWNS REPORTS", () => {
  const hrMenu = treeNamed("HR_MENU");
  assert.ok(!/reports/i.test(hrMenu), "HR must not contain a Reports section");
  assert.ok(
    !locationsIn(hrMenu).some((l) => l.startsWith("/reports")),
    "no report page may be reached through the HR menu"
  );
});

test("the Reports module contains only Employee Master, for now", () => {
  const reportsMenu = treeNamed("REPORTS_MENU");
  assert.deepStrictEqual(locationsIn(reportsMenu), ["/reports/employee-master"]);
});

test("THERE ARE NO ATTENDANCE OR PAYROLL REPORT PLACEHOLDERS", () => {
  // An entry that leads nowhere is a promise the navigation cannot keep. They
  // arrive with their datasets.
  const reportsMenu = treeNamed("REPORTS_MENU");
  for (const notYet of ["attendance", "Attendance", "payroll", "Payroll"]) {
    assert.ok(!reportsMenu.includes(notYet), `Reports must not contain ${notYet}`);
  }
  assert.ok(!locationsIn(reportsMenu).some((l) => /attendance|payroll/i.test(l)));
});

test("THE REPORT ENTRY REQUIRES view_reports AND view_employees", () => {
  // `view_reports` is a reporting capability, not a doorway into a dataset.
  // The Employee Master dataset is HR's, and the backend requires both keys
  // with `requireAll`; an entry shown on `view_reports` alone would put a
  // module on somebody's rail that 403s the moment they open it.
  //
  // It still confers no FIELD access: the columns somebody sees are decided by
  // their existing permissions, and exporting is the separate `export_reports`
  // decision - so neither the move between modules nor this pair widens
  // anyone's access to employee data.
  const reportsMenu = treeNamed("REPORTS_MENU");
  const entry = reportsMenu.slice(reportsMenu.indexOf("employee_master_report:"));
  assert.match(entry, /permission:\s*\["view_reports", "view_employees"\]/);
  assert.ok(!/export_reports/.test(reportsMenu), "the menu does not gate on the export verb");
});

test("the report route itself is unchanged by the move", () => {
  const reportsMenu = treeNamed("REPORTS_MENU");
  assert.match(reportsMenu, /location:\s*"\/reports\/employee-master"/);
});

test("the module rail reads All, HR, Reports, WMS, GST", () => {
  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  const ids = (modules.match(/^  (\w+):\s*\{/gm) || []).map((m) => m.trim().replace(/:.*/, ""));
  assert.deepStrictEqual(ids, ["all", "hr", "reports", "wms", "gst"]);
});

test("Attendance and Payroll are still not inside HR", () => {
  const hrMenu = treeNamed("HR_MENU");
  for (const notYet of ["attendance", "payroll", "Attendance", "Payroll"]) {
    assert.ok(!hrMenu.includes(notYet), `HR must not contain ${notYet}`);
  }
});
