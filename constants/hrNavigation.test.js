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
 *   Attendance and (M4) Payroll are sections of HR, never modules of their own
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

/**
 * ONE SECTION of a tree - `attendance: {` up to the start of the next
 * top-level section, or the end of the tree.
 *
 * Slicing to the end of the tree used to be the same thing, because Attendance
 * was last. M4 puts Payroll after it, so a slice that ran to the end would
 * read Payroll's entries as Attendance's and quietly assert the wrong thing.
 */
const sectionOf = (tree, name) => {
  const start = tree.indexOf(`${name}: {`);
  assert.notStrictEqual(start, -1, `${name} must be a section`);
  const rest = tree.slice(start + name.length + 4);
  const next = rest.search(/^ {2}\w+:\s*\{/m);
  return next === -1 ? tree.slice(start) : tree.slice(start, start + name.length + 4 + next);
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
    // Attendance v2: the HR/Admin view of a calculated month, and every
    // employee's own.
    "/attendance/approval",
    "/attendance/approver-setup",
    "/attendance/calculated",
    "/attendance/devices",
    "/attendance/imports",
    "/attendance/list",
    "/attendance/list?tab=audit",
    "/attendance/my",
    "/attendance/ot-approval",
    "/attendance/recalculate",
    "/department",
    "/designation",
    "/employee-shift-assignment",
    "/hr/employees",
    // M4: Payroll, a section of HR like the three above it. M5 adds the third
    // entry - a faster way to raise the proposals the first one raises singly.
    "/payroll/bulk-salary-upload",
    "/payroll/salary-approval",
    "/payroll/salary-revision",
    "/work-shift",
  ]);
});

/* ================================================= the work shift master = */
test("Work Shift Master is in HR, gated on the Work Shift system's own key", () => {
  const hrMenu = treeNamed("HR_MENU");
  const entry = hrMenu.slice(hrMenu.indexOf("view_work_shift:"), hrMenu.indexOf("/work-shift") + 20);
  assert.match(entry, /title:\s*"Work Shift Master"/);
  // The key the backend's /work-shift routes require. NOT the legacy
  // `view_shift`, which is granted to designations with no payroll role.
  assert.match(entry, /permission:\s*"view_work_shifts"/);
});

test("Employee Shift Assignment sits with the shift master, and needs BOTH keys", () => {
  const hrMenu = treeNamed("HR_MENU");
  const entry = hrMenu.slice(
    hrMenu.indexOf("employee_shift_assignment:"),
    hrMenu.indexOf("/employee-shift-assignment") + 30
  );
  assert.match(entry, /title:\s*"Employee Shift Assignment"/);
  // An array is ALL of them (util/menuPermissions.js), matching the
  // `requireAll(view_employees, view_shift_assignments)` on the backend's
  // read endpoint. A single key here would put an entry on a rail that 403s
  // when opened.
  assert.match(entry, /permission:\s*\["view_employees",\s*"view_shift_assignments"\]/);
});

test("neither shift entry is gated on the LEGACY shift master's keys", () => {
  const hrMenu = treeNamed("HR_MENU");
  const shifts = hrMenu.slice(
    hrMenu.indexOf("view_work_shift:"),
    hrMenu.indexOf("/employee-shift-assignment") + 30
  );
  assert.ok(!/permission:\s*"view_shift"/.test(shifts), "no bare view_shift");
  assert.ok(!/"view_shift"[,\]]/.test(shifts), "and none inside an array either");
  assert.ok(!/"add_shifts"/.test(shifts), "and no add_shifts");
});

test("THE LEGACY SHIFT MASTER IS NOT LISTED BESIDE THE NEW ONE", () => {
  // /shift still resolves and is deliberately unchanged, but two shift
  // masters on the rail would ask people to choose between them with nothing
  // to choose on. Phase 1 runs the old one behind its URL only.
  assert.ok(!locationsIn(code).includes("/shift"), "the legacy /shift page stays unlisted");
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

/* ============================ HR is the one people module: Attendance in it = */
test("ATTENDANCE AND PAYROLL ARE SECTIONS OF HR, NOT MODULES ON THE RAIL", () => {
  // HR is the single top-level module for employee, attendance and payroll
  // screens, and each of them is a section inside it built exactly like
  // Employee Master: a title, an icon and a subMenu.
  const hrMenu = treeNamed("HR_MENU");
  assert.match(hrMenu, /\battendance:\s*\{/, "HR must contain an `attendance` section");
  const att = sectionOf(hrMenu, "attendance");
  assert.match(att, /title:\s*"Attendance"/);
  assert.match(att, /subMenu:\s*\{/, "same section-with-subMenu shape as Employee Master and Shifts");

  // M4. Payroll waited for screens rather than being declared empty, and it
  // arrived HERE - a section of HR - exactly as C3 said it would.
  assert.match(hrMenu, /\bpayroll:\s*\{/, "HR must contain a `payroll` section");
  const pay = sectionOf(hrMenu, "payroll");
  assert.match(pay, /title:\s*"Payroll"/);
  assert.match(pay, /subMenu:\s*\{/);

  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  assert.ok(!/\battendance:\s*\{/.test(modules), "Attendance is not a module of its own any more");
  assert.ok(!/\bpayroll:\s*\{/.test(modules), "Payroll is never a module of its own");
  assert.strictEqual(code.indexOf("const ATTENDANCE_MENU"), -1, "no separate Attendance menu tree");
  assert.strictEqual(code.indexOf("const PAYROLL_MENU"), -1, "nor a separate Payroll one");
});

test("HR > Attendance: list, punch audit, devices and the DigiSME import, on the same routes behind the same keys", () => {
  const hrMenu = treeNamed("HR_MENU");
  const att = sectionOf(hrMenu, "attendance");
  assert.deepStrictEqual(locationsIn(att).sort(), [
    "/attendance/approval",
    "/attendance/approver-setup",
    "/attendance/calculated",
    "/attendance/devices",
    "/attendance/imports",
    "/attendance/list",
    "/attendance/list?tab=audit",
    "/attendance/my",
    "/attendance/ot-approval",
    "/attendance/recalculate",
  ]);
  assert.match(att, /title:\s*"Attendance Approval"[\s\S]*?permission:\s*"view_attendance_approvals"/);
  assert.match(att, /title:\s*"OT Approval"[\s\S]*?permission:\s*"view_attendance_approvals"/);
  assert.match(att, /title:\s*"Recalculate Attendance"[\s\S]*?permission:\s*"recalculate_attendance"/);
  assert.match(att, /title:\s*"Attendance Approver Setup"[\s\S]*?permission:\s*"manage_attendance_approvers"/);
  assert.match(att, /title:\s*"Import Attendance"[\s\S]*?permission:\s*"manage_attendance_import"/);
  assert.match(att, /title:\s*"Attendance List"[\s\S]*?permission:\s*"view_raw_attendance"/);
  assert.match(att, /title:\s*"Punch Audit"[\s\S]*?permission:\s*"view_attendance_punch_audit"/);
  assert.match(att, /title:\s*"Biomax Devices"[\s\S]*?permission:\s*"view_biomax_devices"/);
  // Attendance v2's first screens. My Attendance carries NO permission - it
  // is the employee's own month and the backend derives the employee from
  // the session; Employee Attendance is behind the read key the backend
  // checks. Neither is payroll, and nothing here is a payroll screen.
  assert.match(att, /my_attendance:\s*\{[^}]*title:\s*"My Attendance"/);
  assert.ok(!/my_attendance:\s*\{[^}]*permission:/.test(att), "My Attendance has no permission key");
  assert.match(att, /title:\s*"Employee Attendance"[\s\S]*?permission:\s*"view_calculated_attendance"/);
  assert.ok(!/\bpayroll\b|\bsalary\b|\block payroll\b/i.test(att), "no payroll screen in Attendance");
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

test("HR navigation still appears exactly once, and still holds its pages", () => {
  const modules = code.slice(code.indexOf("export const MENU_MODULES"));
  assert.strictEqual((modules.match(/\bhr:\s*\{/g) || []).length, 1, "one HR module");

  const hrMenu = treeNamed("HR_MENU");
  assert.deepStrictEqual(locationsIn(hrMenu).sort(), [
    // Attendance v2: the HR/Admin view of a calculated month, and every
    // employee's own.
    "/attendance/approval",
    "/attendance/approver-setup",
    "/attendance/calculated",
    "/attendance/devices",
    "/attendance/imports",
    "/attendance/list",
    "/attendance/list?tab=audit",
    "/attendance/my",
    "/attendance/ot-approval",
    "/attendance/recalculate",
    "/department",
    "/designation",
    "/employee-shift-assignment",
    "/hr/employees",
    // M4: Payroll, a section of HR like the three above it. M5 adds the third
    // entry - a faster way to raise the proposals the first one raises singly.
    "/payroll/bulk-salary-upload",
    "/payroll/salary-approval",
    "/payroll/salary-revision",
    "/work-shift",
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
  // Two entries, one dataset. Saved Reports is the catalogue and Create
  // Report is the builder - the split that took the column picker and the
  // results off the page somebody uses to CHOOSE a report. Still no
  // Attendance or Payroll: an entry that leads nowhere is a promise the
  // navigation cannot keep.
  const reportsMenu = treeNamed("REPORTS_MENU");
  assert.deepStrictEqual(locationsIn(reportsMenu), [
    "/reports/employee-master",
    "/reports/employee-master/new",
  ]);
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
  // BOTH entries, not just the first: a route reachable without the pair is
  // the same hole wherever it is.
  for (const name of ["saved_reports:", "create_report:"]) {
    const entry = reportsMenu.slice(reportsMenu.indexOf(name));
    assert.match(entry.slice(0, 200), /permission:\s*\["view_reports", "view_employees"\]/, name);
  }
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

test("M4/M5: HR > Payroll is the three salary screens, each behind ALL of its keys", () => {
  const hrMenu = treeNamed("HR_MENU");
  const pay = sectionOf(hrMenu, "payroll");

  assert.deepStrictEqual(locationsIn(pay).sort(), [
    "/payroll/bulk-salary-upload",
    "/payroll/salary-approval",
    "/payroll/salary-revision",
  ]);
  assert.match(pay, /title:\s*"Salary Revision & History"/);
  assert.match(pay, /title:\s*"Salary Approval"/);
  assert.match(pay, /title:\s*"Bulk Salary Upload"/);

  // ARRAYS MEAN ALL OF THESE KEYS (util/menuPermissions.js), matching the
  // `requireAll(...)` each backend route uses. An entry shown to somebody
  // holding only one key would put a screen on their rail that 403s the moment
  // they open it.
  assert.match(
    pay,
    /title:\s*"Salary Revision & History"[\s\S]*?permission:\s*\["view_employees", "view_salary"\]/
  );
  // The approver's worklist takes the approver's key as well as the two that
  // open the screen beside it: it lists every outstanding pay proposal in the
  // company, which is a different disclosure from one employee's structure.
  assert.match(
    pay,
    /title:\s*"Salary Approval"[\s\S]*?permission:\s*\["view_employees", "view_salary", "approve_salary_revision"\]/
  );

  // M5's entry takes `add_salary` on top of the reading pair, matching the two
  // /hr/salary/bulk endpoints exactly - and NOT a bulk key of its own, because
  // uploading a hundred proposals and typing a hundred proposals are the same
  // authority at different speeds.
  assert.match(
    pay,
    /title:\s*"Bulk Salary Upload"[\s\S]*?permission:\s*\["view_employees", "view_salary", "add_salary"\]/
  );
  assert.ok(!/bulk_salary_upload"/.test(pay), "no bulk-specific permission key was invented");
  // Bulk upload PROPOSES; it never decides. The approver's key opens nothing
  // here, which is why it is not among this entry's three.
  assert.ok(
    !/title:\s*"Bulk Salary Upload"[\s\S]*?approve_salary_revision/.test(pay),
    "bulk upload is not an approval screen"
  );

  // STILL NO MONTHLY PAYROLL. Payroll runs, payslips and bank payment are
  // later modules, and an entry that leads nowhere is a promise the navigation
  // cannot keep - the same rule that kept Payroll itself off the rail until M4.
  for (const notYet of ["Payslip", "payslip", "Payroll Run", "payroll_run", "Bank Payment"]) {
    assert.ok(!pay.includes(notYet), `Payroll must not list ${notYet} yet`);
  }
  // And it is not gated on the monthly-payroll keys it does not use.
  for (const unrelated of ["process_payroll", "hr_reports"]) {
    assert.ok(!pay.includes(unrelated), `${unrelated} is not what these screens need`);
  }

  assert.ok(hrMenu.includes("Attendance"), "HR must still contain Attendance");
});

test("SALARY IS ENTERED FROM PAYROLL, AND THE EMPLOYEE MASTER STILL LINKS NOWHERE NEAR IT", () => {
  // Employee Master keeps its three entries. A salary screen listed under it
  // would be the second place to type a salary that M3 exists to prevent.
  const hrMenu = treeNamed("HR_MENU");
  const master = sectionOf(hrMenu, "employee_master");
  assert.deepStrictEqual(locationsIn(master).sort(), ["/department", "/designation", "/hr/employees"]);
  for (const forbidden of ["salary", "Salary", "payroll"]) {
    assert.ok(!master.includes(forbidden), `Employee Master must not list ${forbidden}`);
  }
});
