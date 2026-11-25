/**
 * Stage 0C / C3 — the legacy /employee/[id] route forwards to the one profile.
 *
 *   node --test util/legacyEmployeeRoute.test.js
 *
 * The mapping is the part that can be silently wrong: a redirect that drops
 * the employee id sends everybody to the same stranger's profile, and one that
 * passes every segment through blindly opens a profile for an employee called
 * "create". Both are tested here rather than inferred from the page source.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { canonicalPathFor } = require("./legacyEmployeeRoute");

/* ============================================== the id is what matters == */
test("THE EMPLOYEE ID IS PRESERVED EXACTLY", () => {
  // The permanent employee code survives every resignation and rejoin, so a
  // bookmark written years ago must still open the same person.
  assert.strictEqual(canonicalPathFor("631"), "/hr/employees/631");
  assert.strictEqual(canonicalPathFor(631), "/hr/employees/631");
  assert.strictEqual(canonicalPathFor("1"), "/hr/employees/1");
  assert.strictEqual(canonicalPathFor("999999"), "/hr/employees/999999");
});

test("surrounding whitespace does not change which employee is opened", () => {
  assert.strictEqual(canonicalPathFor("  631  "), "/hr/employees/631");
});

test("an array param - Next.js's repeated-match shape - still resolves", () => {
  assert.strictEqual(canonicalPathFor(["631"]), "/hr/employees/631");
});

/* ===================================================== the special cases */
test("the old create form maps to the HR create page, not to a profile", () => {
  // /employee/create was the old "new employee" form. Passed through blindly
  // it would open a profile for an employee whose id is the word "create".
  assert.strictEqual(canonicalPathFor("create"), "/hr/employees/new");
  assert.strictEqual(canonicalPathFor("CREATE"), "/hr/employees/new");
});

test("anything that is not an employee id goes to the list, never to a profile", () => {
  for (const notAnId of ["", "  ", "abc", "12a", "-1", "0", "1.5", "../secrets", "631?x=1"]) {
    assert.strictEqual(
      canonicalPathFor(notAnId),
      "/hr/employees",
      `${JSON.stringify(notAnId)} must not become a profile URL`
    );
  }
});

test("no id yet means no redirect yet", () => {
  // The router's query is empty until it is ready; acting then would send
  // everybody to the list regardless of the URL they typed.
  assert.strictEqual(canonicalPathFor(undefined), null);
  assert.strictEqual(canonicalPathFor(null), null);
});

test("every answer stays inside the HR employee master", () => {
  for (const input of ["631", "create", "nonsense", "", ["7"], 12]) {
    const out = canonicalPathFor(input);
    assert.ok(
      out === null || out.startsWith("/hr/employees"),
      `${JSON.stringify(input)} produced ${out}`
    );
  }
});

/* ================================== there is ONE profile implementation = */
const ROOT = path.join(__dirname, "..");
const readIfPresent = (p) => {
  const full = path.join(ROOT, p);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : null;
};

test("THE LEGACY PROFILE IMPLEMENTATION IS GONE, not merely bypassed", () => {
  // A redirect in front of a page that still exists is two implementations
  // with one of them hidden - and hidden code is code somebody later trusts.
  const page = readIfPresent("pages/employee/[id].jsx");
  assert.ok(page, "the route must still exist, as a redirect");
  assert.strictEqual(readIfPresent("pages/employee/[id].js"), null, "the old page must be deleted");

  // Its seven form sections went with it; nothing else imported them.
  for (const orphan of [
    "CurrentPosition", "EducationDetails", "EmployeeIdentification",
    "EmployeeInformation", "PFAndESI", "PersonalDetails", "SalaryDetails",
  ]) {
    assert.strictEqual(
      readIfPresent(`components/Employee/${orphan}.jsx`),
      null,
      `components/Employee/${orphan}.jsx belonged to the deleted profile`
    );
  }
});

test("the redirect page renders no profile of its own", () => {
  const page = readIfPresent("pages/employee/[id].jsx");
  const code = page.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  // It fetches nothing, edits nothing and shows no employee field.
  assert.ok(!/EmployeeHelper/.test(code), "it must not fetch an employee");
  assert.ok(!/Formik|useFormik|onSubmit/.test(code), "it must not be a form");
  for (const field of ["salary", "account_no", "pan_no", "aadhaar", "employee_name"]) {
    assert.ok(!new RegExp(field, "i").test(code), `it must not render ${field}`);
  }
});

test("it replaces rather than pushes, and waits for the router", () => {
  const page = readIfPresent("pages/employee/[id].jsx");
  assert.match(page, /router\.replace\(target\)/, "replace, so Back does not bounce");
  assert.ok(!/router\.push\(/.test(page), "push would trap the user between two routes");
  assert.match(page, /if \(!router\.isReady\) return;/, "the id is not known until then");
});

test("the mapping is stated once, and the page uses it", () => {
  const page = readIfPresent("pages/employee/[id].jsx");
  assert.match(page, /canonicalPathFor/, "the page must not restate the mapping");
  assert.ok(
    !/\/hr\/employees\/\$\{/.test(page),
    "no second, hand-built version of the target URL"
  );
});

/* ====================================== nothing navigates to the old route */
test("NO ACTIVE LINK POINTS AT THE LEGACY PROFILE ANY MORE", () => {
  // The redirect is for bookmarks and saved URLs. Normal navigation inside
  // the application goes straight to the canonical route.
  const dirs = ["pages", "components", "constants", "customHooks", "util", "contexts"];
  const offenders = [];

  const walk = (dir) => {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) return;
    for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!/\.(js|jsx)$/.test(entry.name) || entry.name.endsWith(".test.js")) continue;
      // The redirect itself and its mapping are allowed to name the old route.
      const relPosix = rel.replace(/\\/g, "/");
      if (relPosix === "pages/employee/[id].jsx" || relPosix === "pages/employee/index.jsx") continue;

      const code = fs
        .readFileSync(path.join(ROOT, rel), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/^\s*\/\/.*$/gm, "");

      // Frontend navigation only: `/hr/employee/...` API paths are the
      // backend's and are not routes.
      if (/(href=|router\.push\(|router\.replace\(|location:\s*)["'`]\/employee(\/|["'`])/.test(code)) {
        offenders.push(relPosix);
      }
    }
  };
  dirs.forEach(walk);

  assert.deepStrictEqual(offenders, [], "these still navigate to the legacy employee route");
});

test("the employee list redirect still works", () => {
  const page = readIfPresent("pages/employee/index.jsx");
  assert.match(page, /router\.replace\("\/hr\/employees"\)/);
  assert.ok(!/router\.push\(/.test(page));
});
