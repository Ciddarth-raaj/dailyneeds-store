/**
 * M3 — the Employee Master's Payroll section is wired to the real contract,
 * and is a READ.
 *
 *   node --test components/hr/payrollSection.test.js
 *
 * There is no React test runner in this repo, so the screen is checked as
 * source the way components/hr/hrScreens.test.js is. That is weaker than
 * rendering it, but it catches the failures that actually happen here: a
 * screen calling an endpoint that does not exist, a screen fetching salary for
 * somebody who may not see it, a failure rendered as "no salary", and an edit
 * affordance appearing on a card that must never have one.
 *
 * The DISPLAY rules - Pending rather than 0, the reason text, the currency
 * formatting - are pinned in util/salaryView.test.js, against the values the
 * backend actually sends.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Comments may NAME something to explain why it is absent; code may not. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const section = read("components/hr/profile/PayrollSection.jsx");
const sectionCode = codeOf(section);
const hook = read("customHooks/useCurrentSalary.js");
const hookCode = codeOf(hook);
const helper = read("helper/employeeSalary.js");
const profile = read("pages/hr/employees/[id].jsx");
const rules = read("util/hrProfile.js");

const BACKEND_ROUTER = path.join(
  ROOT, "..", "dailyneeds-store-backend", "routes", "employee_salary.js"
);
const backendAvailable = fs.existsSync(BACKEND_ROUTER);

/* ================================ the contract is the M2 resolver, only == */

test("THE CURRENT-SALARY RESOLVER IS THE ONLY SALARY ENDPOINT THE FRONTEND CALLS", () => {
  assert.match(helper, /API\.get\(`\/hr\/salary\/employee\/\$\{employeeId\}\/current`/);

  // M2 exposes six salary endpoints. Five of them belong to screens that are
  // later modules, and a helper method for one of them is the first half of
  // building it here by accident. Checked against the CODE - the file's own
  // comment names them all, to say why they are absent.
  const helperCode = codeOf(helper);
  const paths = [...helperCode.matchAll(/\/hr\/salary[^"`)]*/g)].map((m) => m[0]);
  assert.deepStrictEqual(
    paths,
    ["/hr/salary/employee/${employeeId}/current"],
    "one salary path, and it is the resolver"
  );
  for (const forbidden of ["preview", "history", "revision", "approve", "reject"]) {
    assert.ok(
      !paths.some((p) => p.includes(forbidden)),
      `helper/employeeSalary.js must not call the ${forbidden} endpoint`
    );
  }
  const calls = helper.match(/API\.(get|post|put|delete)\(/g) || [];
  assert.strictEqual(calls.length, 1, "one endpoint, one call");
  assert.ok(!/API\.post|API\.put|API\.delete/.test(helper), "the Employee Master never writes pay");
});

test("the path the helper calls is the one the backend declares", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  assert.ok(
    router.includes('"/salary/employee/:employee_id/current"'),
    "the frontend calls a path the backend does not declare"
  );

  // And the backend gates it on the pair this screen gates itself on.
  const route = router.slice(router.indexOf('"/salary/employee/:employee_id/current"'));
  assert.match(route.slice(0, 200), /requireAll\(P\.VIEW_EMPLOYEES, P\.VIEW_SALARY\)/);
});

test("the resolver's contract is relied on rather than re-implemented", { skip: !backendAvailable }, () => {
  const usecase = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "usecase", "employee_salary.js"),
    "utf8"
  );
  // Approved only, effective on or before as_of, newest first. This is what
  // makes "pending never appears as current" and "a future revision does not
  // appear before its date" true, and it is true on the SERVER.
  const repo = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "repository", "employee_salary.js"),
    "utf8"
  );
  const query = repo.slice(repo.indexOf("getCurrentSalary("), repo.indexOf("getHistory("));
  assert.match(query, /status\\`\s*=\s*\?/);
  assert.match(query, /effective_from\\`\s*<=\s*\?/);
  assert.match(query, /STATUS\.APPROVED/);
  assert.match(usecase, /current_salary: null/, "no record is null, not zero");

  // So the frontend does none of it: no status filter, no date comparison, no
  // arithmetic on a component or a contribution.
  for (const forbidden of ["PENDING", "REJECTED", "APPROVED", "effective_from <", "new Date("]) {
    assert.ok(
      !sectionCode.includes(forbidden),
      `the card must not re-decide "${forbidden}" - the resolver already did`
    );
  }
  // NOTHING IS RECALCULATED HERE. The daily salary is Gross / 26, and the card
  // takes the backend's own `daily_salary` rather than doing the division -
  // the divisor is a payroll rule and belongs where the rule lives.
  assert.match(codeOf(read("util/salaryView.js")), /plainCell\(record\.daily_salary\)/);
  for (const arithmetic of [/_gross\s*\/\s*\d/, /\*\s*0\.\d/, /\bMath\./]) {
    assert.ok(!arithmetic.test(sectionCode), "no salary arithmetic in the browser");
    assert.ok(!arithmetic.test(codeOf(read("util/salaryView.js"))), "nor in its presenter");
  }
});

/* ============================================== permissions and fetching = */

test("VIEW_SALARY IS REQUIRED, ON TOP OF PROFILE ACCESS", () => {
  const { canViewSalary } = require(path.join(ROOT, "util/hrProfile.js"));
  const keys = (...list) => ({ permissions: list.map((k) => ({ permission_key: k })) });

  // Both halves, exactly as the backend's `requireAll` demands.
  assert.strictEqual(canViewSalary(keys("view_employees", "view_salary")), true);
  assert.strictEqual(canViewSalary(keys("view_employees")), false);
  assert.strictEqual(canViewSalary(keys("view_salary")), false);
  assert.strictEqual(canViewSalary({}), false);

  // ADMIN BEHAVIOUR IS PRESERVED: `user_type = 2` bypasses the table, here as
  // everywhere else on this profile.
  assert.strictEqual(canViewSalary({ permissions: [], isAdmin: true }), true);

  // AND `view_employee_sensitive` IS NOT PART OF IT. `view_salary` is the
  // approved salary permission; demanding the B3 key as well would make the
  // section ungrantable in practice.
  const fn = rules.slice(rules.indexOf("function canViewSalary"));
  assert.ok(
    !/view_employee_sensitive/.test(fn.slice(0, 400)),
    "salary visibility must not be gated on the sensitive key"
  );
});

test("B3 IS NOT WEAKENED ANYWHERE BY THIS", { skip: !backendAvailable }, () => {
  // The salary router still mounts both halves of the sensitive guard, and
  // nothing in M3 asks it not to.
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  assert.match(router, /router\.use\("\/salary", this\.sensitive\.filterResponse\)/);
  assert.match(router, /router\.use\("\/salary", this\.sensitive\.guardWrite\)/);

  // And the frontend's sensitive rules are untouched: the profile still gates
  // Payment and Statutory on `canViewSensitive`.
  assert.match(profile, /const mayViewSensitive = canViewSensitive\(actor\)/);
  assert.match(
    rules,
    /function canViewSensitive[\s\S]{0,300}has\(permissions, "view_employee_sensitive"\)/
  );
});

test("A USER WITHOUT view_salary NEVER FETCHES A SALARY, LET ALONE SHOWS ONE", () => {
  // The short-circuit is in the hook, BEFORE the request - not a filter on the
  // response and not a hidden card that fetched anyway.
  assert.match(hookCode, /if \(!employeeId \|\| !canView\) \{[\s\S]{0,80}return undefined;/);
  const guard = hookCode.indexOf("if (!employeeId || !canView)");
  const request = hookCode.indexOf("EmployeeSalaryHelper.getCurrentSalary");
  assert.ok(guard !== -1 && request > guard, "the permission check comes before the request");

  // And the card renders the shared no-access state rather than an empty one.
  assert.match(sectionCode, /canView=\{canView\}/);
  assert.match(section, /deniedMessage="You do not have permission to view this employee's salary\."/);
});

test("NO EMPLOYEE ID MEANS NO REQUEST", () => {
  // Rule 19. `/hr/salary/employee/undefined/current` is a bad request that
  // would come back as an error and read, on the card, as a failure.
  assert.match(hookCode, /if \(!employeeId \|\| !canView\)/);
  // The id the profile passes is the lifecycle's, which is the record the page
  // is certain of - `router.query.id` is a string that may not be there yet.
  assert.match(profile, /<PayrollSection employeeId=\{lifecycle\.employee_id\} canView=\{mayViewSalary\}/);
});

test("the profile computes the salary right through the shared rule", () => {
  const code = codeOf(profile);
  assert.match(code, /const mayViewSalary = canViewSalary\(actor\)/);
  // Not an ad hoc permission check on the page.
  assert.ok(
    !/usePermissions\(\["view_salary"\]\)/.test(code),
    "the rule is shared with the backend contract, not restated here"
  );
});

/* ============================== four states, and they are told apart ==== */

test("LOADING, ERROR, DENIED AND EMPTY ARE FOUR DIFFERENT ANSWERS", () => {
  // The hook reports them separately...
  for (const flag of ["loading", "loaded", "denied", "error"]) {
    assert.match(hookCode, new RegExp(`\\b${flag}\\b`), `the hook must report ${flag}`);
  }
  assert.match(hookCode, /setDenied\(res\.code === 403\)/);
  assert.match(hookCode, /setError\(res\.code !== 403\)/);
  // A successful read with nothing approved: `loaded` with no record.
  assert.match(hookCode, /setCurrent\(res\.current_salary \|\| null\)/);
  assert.match(hookCode, /setLoaded\(true\)/);

  // ...and the card branches on each of them.
  assert.match(sectionCode, /if \(loading\)/);
  assert.match(sectionCode, /if \(denied\)/);
  assert.match(sectionCode, /if \(error\)/);
  assert.match(sectionCode, /if \(loaded && !view\)/);
  // Loading is compact, not a full-page block.
  assert.match(sectionCode, /<Spinner size="sm" \/>/);
});

test("AN API FAILURE IS NEVER SHOWN AS 'No approved salary available.'", () => {
  // The single most damaging confusion this card could make: one of them is a
  // record somebody has to go and create, the other is a server that did not
  // answer, and HR would chase the wrong one.
  const empty = sectionCode.indexOf("No approved salary available.");
  const failure = sectionCode.indexOf("could not be loaded");
  assert.ok(empty !== -1, "the empty state says exactly that");
  assert.ok(failure !== -1, "and the error state says something else");
  assert.ok(failure < empty, "the error branch returns before the empty one is reached");

  // The error branch is an error, visibly.
  assert.match(sectionCode, /<Alert status="error"/);
  // And the empty state is NOT zeroes.
  const emptyBranch = sectionCode.slice(empty - 400, empty + 80);
  assert.ok(!/₹|0\.00|formatMoney/.test(emptyBranch), "no approved salary must not render as ₹0.00");
});

/* ===================================== the section is a read, and stays == */

test("THE SECTION IS READ-ONLY: NO EDIT, NO SAVE, NO REVISION, NO APPROVAL", () => {
  for (const forbidden of [
    "onEdit", "onSave", "onCancel", "canEdit", "editing", "saving",
    "EditField", "Input", "Select", "Textarea", "useState",
  ]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`).test(sectionCode),
      `the Payroll card must not carry ${forbidden}`
    );
  }
  // `SectionCard` only renders Edit / Save when it is given `canEdit`, and it
  // is not given it - so there is no affordance to press.
  assert.ok(!/<Button/.test(sectionCode), "the card has no button at all");
});

test("NO M4 / M5 SCREEN IS INTRODUCED ANYWHERE", () => {
  // Salary Revision & History, Salary Approval, Bulk Salary Upload and monthly
  // payroll are later modules. M3 is one card and one read.
  const surface = [
    "components/hr/profile/PayrollSection.jsx",
    "customHooks/useCurrentSalary.js",
    "helper/employeeSalary.js",
    "util/salaryView.js",
    "pages/hr/employees/[id].jsx",
  ];
  for (const file of surface) {
    const code = codeOf(read(file));
    for (const forbidden of [
      "salary_history", "SalaryHistory", "SalaryRevision", "SalaryApproval",
      "BulkSalary", "payroll_run", "payslip", "net_pay", "FileUpload",
    ]) {
      assert.ok(
        !new RegExp(forbidden, "i").test(code),
        `${file} must not reach into ${forbidden} - that is a later module`
      );
    }
  }

  // No new page was added under Payroll either.
  const pages = path.join(ROOT, "pages");
  assert.ok(!fs.existsSync(path.join(pages, "hr", "salary")), "no salary screens in M3");
  assert.ok(!fs.existsSync(path.join(pages, "payroll")), "no payroll section in M3");
});

test("THE LEGACY new_employee.salary COLUMN IS NOT READ ANYWHERE", () => {
  // M1 removed it from the write path; M3 must not quietly bring it back as a
  // fallback when the resolver says there is no approved salary.
  const surface = [
    "components/hr/profile/PayrollSection.jsx",
    "customHooks/useCurrentSalary.js",
    "helper/employeeSalary.js",
    "util/salaryView.js",
    "util/hrProfile.js",
    "pages/hr/employees/[id].jsx",
  ];
  for (const file of surface) {
    const code = codeOf(read(file));
    assert.ok(
      !/\bemployee\.salary\b/.test(code),
      `${file} must not read the legacy salary column`
    );
    assert.ok(
      !/\bsalary\b\s*[:=]/.test(code),
      `${file} must not put a bare salary into a payload or form state`
    );
  }
  // The card is not even given the employee row - only an id and a right.
  assert.ok(
    !/employee=\{/.test(profile.slice(profile.indexOf("<PayrollSection"), profile.indexOf("<PayrollSection") + 200)),
    "the Payroll card receives no employee record to read a salary out of"
  );
});

test("the salary figures never carry a sensitive employee field with them", () => {
  for (const forbidden of [
    "pan_no", "uan", "account_no", "ifsc", "aadhaar_number",
    "aadhaar_fingerprint", "account_fingerprint", "bank_name",
  ]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`).test(sectionCode),
      `the Payroll card must not reference ${forbidden}`
    );
  }
  assert.ok(!/console\.log/.test(section), "nothing here is logged");
  assert.ok(!/localStorage/.test(section), "and nothing is persisted");
});

/* ================================================== the approved layout = */

test("THE LAYOUT IS THE FIVE APPROVED GROUPS, IN ORDER", () => {
  const order = [
    "Salary Summary",
    "Salary Structure",
    "Employee Deductions",
    "Employer Contributions",
    "Monthly CTC",
  ];
  const positions = order.map((title) => sectionCode.indexOf(title));
  for (let i = 0; i < order.length; i += 1) {
    assert.ok(positions[i] >= 0, `${order[i]} must be rendered`);
    if (i > 0) assert.ok(positions[i] > positions[i - 1], `${order[i]} must follow ${order[i - 1]}`);
  }

  // The summary's three required figures, named on the card.
  assert.match(sectionCode, /label="Monthly Gross"/);
  assert.match(sectionCode, /label="Daily Salary \(Gross \/ 26\)"/);
  assert.match(sectionCode, /Effective From/);

  // The group memberships are decided in the presenter, so they are asserted
  // against it rather than against the JSX.
  const { presentCurrentSalary } = require(path.join(ROOT, "util/salaryView.js"));
  const view = presentCurrentSalary({ unresolved_notes: [] });
  assert.deepStrictEqual(
    view.structure.map((r) => r.label),
    ["Basic", "Conveyance", "HRA", "Special Allowance"]
  );
  assert.deepStrictEqual(
    view.employeeDeductions.map((r) => r.label),
    ["Employee PF", "Employee ESI"]
  );
  assert.deepStrictEqual(
    view.employerContributions.map((r) => r.label),
    ["Employer EPF", "Employer EPS", "EDLI", "PF Admin Charge", "Employer ESI"]
  );
});

test("the card follows the existing profile conventions and stays compact", () => {
  // The same shell every other section uses, so a locked section reads the
  // same way here as it does on Statutory Details.
  assert.match(section, /import \{ SectionCard \} from "\.\/SectionCard"/);
  assert.match(sectionCode, /<SectionCard/);
  // Chakra, and responsive: two columns on a phone rather than five.
  assert.match(sectionCode, /columns=\{\{ base: 2, md: \d \}\}/);
  // The CTC is prominent without being a card of its own.
  assert.match(sectionCode, /<Amount label="Monthly CTC" cell=\{view\.ctc\} emphasis \/>/);
});

test("the profile still renders the eight sections, with Payroll seventh", () => {
  const order = [
    "<AadhaarSection", "<PersonalSection", "<EmploymentSection", "<EducationSection",
    "<PaymentDetailsSection", "<StatutorySection", "<PayrollSection", "<DocumentsSection",
  ];
  const positions = order.map((tag) => profile.indexOf(tag));
  for (let i = 0; i < order.length; i += 1) {
    assert.ok(positions[i] >= 0, `${order[i]} must be rendered`);
    if (i > 0) assert.ok(positions[i] > positions[i - 1], `${order[i]} must come after ${order[i - 1]}`);
  }
});

/* ============================================ the permission is grantable = */

test("view_salary is offered on the Permission Matrix, and the write keys are not", () => {
  // The backend has checked `view_salary` since M2, but `constants/permissions.js`
  // is what the matrix renders - so without an entry the section would be
  // visible to administrators and to nobody else.
  const permissions = read("constants/permissions.js");
  const strip = permissions.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(strip, /view_salary:\s*"View Salary/);

  // The salary LIFECYCLE keys stay off the screen: their screens are later
  // modules, and a key granted before its screen exists grants nothing while
  // being remembered as if it did.
  for (const later of [
    "add_salary", "edit_salary", "approve_salary_revision",
    "manual_salary_component_override",
  ]) {
    assert.ok(
      !new RegExp(`\\b${later}\\s*:`).test(strip),
      `${later} belongs to a later module and must not be offered yet`
    );
  }
});
