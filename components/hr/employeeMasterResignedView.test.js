/**
 * HR -> Employee Master -> "Resigned" asks for the inclusive population, and
 * NOTHING ELSE does.
 *
 *   node --test components/hr/employeeMasterResignedView.test.js
 *
 * The backend's default `GET /employee/employees` drops everyone whose name is
 * in `resignation`, so the Resigned view - a browser filter over that list -
 * was missing every leaver whose resignation was recorded. The fix is an
 * opt-in `include_resigned=1`. These tests pin WHO opts in: the Employee
 * Master page, for its list and its status badges, and no shared picker, no
 * Onboarding queue, no other screen.
 *
 * Source-checked, as the other HR screen tests are: there is no React runner.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const code = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = code(read("pages/hr/employees/index.jsx"));
const onboarding = code(read("pages/hr/onboarding/index.jsx"));
const helper = code(read("helper/employee.js"));
const useEmployees = code(read("customHooks/useEmployees.js"));

test("Employee Master asks for the inclusive list", () => {
  assert.match(page, /EmployeeHelper\.getEmployee\(\{\s*include_resigned:\s*true\s*\}\)/);
  assert.strictEqual((page.match(/EmployeeHelper\.getEmployee\(/g) || []).length, 1);
});

test("and for the badges of the SAME population", () => {
  assert.match(page, /HrHelper\.getStatusSummary\(\{\s*include_resigned:\s*1\s*\}\)/);
  assert.strictEqual((page.match(/HrHelper\.getStatusSummary\(/g) || []).length, 1);
});

test("the page's own status filters are unchanged: Active = 1, Resigned = not 1", () => {
  assert.match(page, /status === "active" && Number\(e\.status\) !== 1\) return false/);
  assert.match(page, /status === "inactive" && Number\(e\.status\) === 1\) return false/);
  assert.match(page, /useState\("active"\)/, "Active is still the default view");
});

test("the helper sends include_resigned=1 only when asked, and nothing otherwise", () => {
  assert.match(helper, /if \(filter\?\.include_resigned\) \{\s*queryParams\.append\("include_resigned", "1"\);/);
});

test("the HR Onboarding queue keeps the default list and badges", () => {
  assert.ok(!/include_resigned/.test(onboarding));
  assert.match(onboarding, /EmployeeHelper\.getEmployee\(\)/);
});

test("the shared useEmployees pickers never ask for it", () => {
  assert.ok(!/include_resigned/.test(useEmployees));
});

test("NO OTHER SCREEN asks for it", () => {
  const hits = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      const rel = path.join(dir, name);
      const stat = fs.statSync(path.join(ROOT, rel));
      if (stat.isDirectory()) walk(rel);
      else if (/\.(jsx?|tsx?)$/.test(name) && !/\.test\.js$/.test(name) && /include_resigned/.test(read(rel))) {
        hits.push(rel);
      }
    }
  };
  for (const d of ["pages", "components", "customHooks", "hooks", "helper", "util", "contexts", "hocs"]) {
    if (fs.existsSync(path.join(ROOT, d))) walk(d);
  }
  assert.deepStrictEqual(hits.sort(), ["helper/employee.js", "pages/hr/employees/index.jsx"]);
});

test("the backend accepts the flag on both endpoints the page calls", () => {
  const backend = path.join(ROOT, "..", "dailyneeds-store-backend", "routes");
  if (!fs.existsSync(backend)) return; // the frontend checked out on its own
  const employeeRoutes = fs.readFileSync(path.join(backend, "employee.js"), "utf8");
  const masterRoutes = fs.readFileSync(path.join(backend, "employee_master.js"), "utf8");
  assert.match(employeeRoutes, /include_resigned: Joi\.number\(\)\.valid\(0, 1\)\.optional\(\)/);
  assert.match(masterRoutes, /include_resigned: Joi\.number\(\)\.valid\(0, 1\)\.optional\(\)/);
});
