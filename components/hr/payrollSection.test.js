/**
 * The Employee Master's Payroll section: where the FIRST salary is entered,
 * and where no salary is ever revised.
 *
 *   node --test components/hr/payrollSection.test.js
 *
 * M3 built this card read-only. That was right for a card that only displayed
 * pay and wrong for onboarding, which is the one moment an employee has no
 * salary at all and the person filling in their record is the person who knows
 * what they should be on. So the opening salary is entered here - once - and
 * every later change is a revision made on Payroll > Salary Revision & History.
 *
 * There is no React test runner in this repo, so the screen is checked partly
 * as source, the way components/hr/hrScreens.test.js is. That is weaker than
 * rendering it, but it catches the failures that actually happen here:
 *
 *   a screen calling an endpoint that does not exist
 *   a screen fetching salary for somebody who may not see it
 *   a failure rendered as "no salary"
 *   an entry form appearing for an employee who already has a salary
 *   an amend, approve or reject affordance appearing on this card at all
 *
 * WHICH OF THE FOUR STATES AN EMPLOYEE IS IN is a pure module,
 * `util/employeeMasterPayroll.js`, and it is tested as behaviour below rather
 * than as text - those are the rules that decide whether a form is offered.
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
const form = read("components/hr/profile/OpeningSalaryForm.jsx");
const formCode = codeOf(form);
const hook = read("customHooks/useEmployeeMasterSalary.js");
const hookCode = codeOf(hook);
const helper = read("helper/employeeSalary.js");
const profile = read("pages/hr/employees/[id].jsx");
const rules = read("util/hrProfile.js");

const {
  STATE,
  resolvePayrollState,
  canEnterOpeningSalary,
  showRevisionLink,
  hasLiveSalary,
} = require(path.join(ROOT, "util/employeeMasterPayroll.js"));

const BACKEND_ROUTER = path.join(
  ROOT, "..", "dailyneeds-store-backend", "routes", "employee_salary.js"
);
const backendAvailable = fs.existsSync(BACKEND_ROUTER);

/** A history row, in the shape `/hr/salary/employee/:id/history` returns one. */
const row = (over) => ({
  salary_id: 1,
  employee_id: 42,
  monthly_gross: 25000,
  status: "APPROVED",
  effective_from: "2026-04-01",
  source: "OPENING_SALARY",
  unresolved_notes: [],
  ...over,
});

/* ======================= the contract: read the record, enter the first == */

test("THE EMPLOYEE MASTER READS A SALARY AND CREATES THE FIRST ONE — NOTHING ELSE", () => {
  const helperCode = codeOf(helper);
  const paths = [...helperCode.matchAll(/\/hr\/salary[^"`)]*/g)].map((m) => m[0]);
  assert.deepStrictEqual(paths.sort(), [
    "/hr/salary/employee/${employeeId}",
    "/hr/salary/employee/${employeeId}/current",
    "/hr/salary/employee/${employeeId}/history",
    "/hr/salary/preview/${employeeId}",
  ]);

  /*
   * THE LINE THIS TEST EXISTS TO HOLD. Four calls, and not one of them can
   * change a salary that already exists. `amend`, `approve` and `reject` belong
   * to Payroll's own helper; a method for any of them here would be the first
   * half of building the revision workflow on the profile by accident, which is
   * exactly how a second place to type a salary appears.
   *
   * The bulk endpoints are absent for the same reason: this screen is about ONE
   * employee, opened deliberately.
   */
  for (const forbidden of ["revision", "approve", "reject", "bulk", "pending"]) {
    assert.ok(
      !paths.some((p) => p.includes(forbidden)),
      `helper/employeeSalary.js must not call the ${forbidden} endpoint`
    );
  }

  // Two reads and two writes, and the two writes are a preview (which stores
  // nothing) and the opening create.
  assert.strictEqual((helperCode.match(/API\.get\(/g) || []).length, 2);
  assert.strictEqual((helperCode.match(/API\.post\(/g) || []).length, 2);
  assert.ok(!/API\.put|API\.delete/.test(helperCode), "nothing here updates or deletes");
});

test("the paths the helper calls are ones the backend declares", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  for (const declared of [
    '"/salary/employee/:employee_id/current"',
    '"/salary/employee/:employee_id/history"',
    '"/salary/preview/:employee_id"',
    '"/salary/employee/:employee_id"',
  ]) {
    assert.ok(router.includes(declared), `the frontend calls ${declared}, which must exist`);
  }

  // And the backend gates each on the pair (or the create pair) this screen
  // gates itself on.
  const guardFor = (declared) => router.slice(router.indexOf(declared)).slice(0, 220);
  assert.match(
    guardFor('"/salary/employee/:employee_id/current"'),
    /requireAll\(P\.VIEW_EMPLOYEES, P\.VIEW_SALARY\)/
  );
  assert.match(
    guardFor('"/salary/employee/:employee_id/history"'),
    /requireAll\(P\.VIEW_EMPLOYEES, P\.VIEW_SALARY\)/
  );
  assert.match(
    guardFor('"/salary/preview/:employee_id"'),
    /requireAll\(P\.VIEW_EMPLOYEES, P\.VIEW_SALARY\)/
  );
  assert.match(
    guardFor('"/salary/employee/:employee_id"'),
    /requireAll\(P\.VIEW_EMPLOYEES, P\.ADD_SALARY\)/
  );
});

test("NOTHING CREATED HERE IS APPROVED, AND ITS DATE IS THE SERVER'S",
  { skip: !backendAvailable }, () => {
    const usecase = fs.readFileSync(
      path.join(ROOT, "..", "dailyneeds-store-backend", "usecase", "employee_salary.js"),
      "utf8"
    );
    // Always PENDING, including for an administrator.
    assert.match(usecase, /NOTHING IS EVER CREATED APPROVED/);
    assert.match(usecase, /status: STATUS\.PENDING/);
    // And the opening effective date is resolved, not accepted: a caller's
    // `effective_from` is read only when a live salary already exists.
    assert.match(
      usecase,
      /const effectiveFrom = existing\s*\n?\s*\? normalizeDate\(input\.effective_from[\s\S]{0,120}resolveOpeningEffectiveFrom/
    );
  });

test("the resolver's contract is relied on rather than re-implemented", { skip: !backendAvailable }, () => {
  const usecase = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "usecase", "employee_salary.js"),
    "utf8"
  );
  const repo = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "repository", "employee_salary.js"),
    "utf8"
  );
  const query = repo.slice(repo.indexOf("getCurrentSalary("), repo.indexOf("getHistory("));
  assert.match(query, /status\\`\s*=\s*\?/);
  assert.match(query, /effective_from\\`\s*<=\s*\?/);
  assert.match(query, /STATUS\.APPROVED/);
  assert.match(usecase, /current_salary: null/, "no record is null, not zero");

  /*
   * SO THE CARD DOES NONE OF IT. No date is compared to a browser clock
   * anywhere on this surface - which state an employee is in is decided from
   * the server's own `/current` answer and the statuses on the history rows,
   * never from `new Date()`. See `util/employeeMasterPayroll.js#futureApproved`,
   * which works out "approved but not yet in force" by ELIMINATION.
   */
  for (const file of [
    "components/hr/profile/PayrollSection.jsx",
    "components/hr/profile/OpeningSalaryForm.jsx",
    "util/employeeMasterPayroll.js",
  ]) {
    const code = codeOf(read(file));
    assert.ok(!/new Date\(/.test(code), `${file} must not read the browser clock`);
    for (const arithmetic of [/_gross\s*\/\s*\d/, /\*\s*0\.\d/, /\bMath\./]) {
      assert.ok(!arithmetic.test(code), `${file} must not calculate a salary figure`);
    }
  }
  // NOTHING IS RECALCULATED IN THE PRESENTER EITHER. The daily salary is
  // Gross / 26, and the card takes the backend's own `daily_salary` rather than
  // doing the division - the divisor is a payroll rule and belongs where the
  // rule lives.
  assert.match(codeOf(read("util/salaryView.js")), /plainCell\(record\.daily_salary\)/);
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

test("THE SALARY RIGHTS ARE THE SHARED ONES, NOT A SECOND SET FOR THIS SCREEN", () => {
  // One module holds the salary permission rules and both the Employee Master
  // and Payroll read it, so the profile and the revision screen cannot end up
  // disagreeing about who may enter a salary.
  const code = codeOf(profile);
  assert.match(code, /from "\.\.\/\.\.\/\.\.\/util\/payrollAccess"/);
  assert.match(code, /const mayAddSalary = canAddSalary\(actor\)/);
  assert.match(code, /const mayEditSalary = canEditPendingSalary\(actor\)/);
  assert.match(code, /const mayOverrideSalary = canOverrideComponents\(actor\)/);
  assert.match(code, /const mayViewSalary = canViewSalary\(actor\)/);

  // NOT the approver's key, and not an ad hoc check on the page.
  assert.ok(!/canApprove/.test(code), "approving is not a profile right");
  assert.ok(
    !/usePermissions\(\["view_salary"\]\)/.test(code),
    "the rule is shared with the backend contract, not restated here"
  );

  // The card is handed all four decisions and makes none of them itself.
  const block = profile.slice(profile.indexOf("<PayrollSection"), profile.indexOf("<PayrollSection") + 400);
  assert.match(block, /canView=\{mayViewSalary\}/);
  assert.match(block, /canAdd=\{mayAddSalary\}/);
  assert.match(block, /canEdit=\{mayEditSalary\}/);
  assert.match(block, /canOverride=\{mayOverrideSalary\}/);
});

test("B3 IS NOT WEAKENED ANYWHERE BY THIS", { skip: !backendAvailable }, () => {
  // The salary router still mounts both halves of the sensitive guard, and
  // nothing here asks it not to - including the two new bulk endpoints, which
  // mount on the same router.
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
  // The short-circuit is in the hook, BEFORE the requests - not a filter on the
  // response and not a hidden card that fetched anyway.
  const guard = hookCode.indexOf("if (!employeeId || !canView)");
  const request = hookCode.indexOf("EmployeeSalaryHelper.getCurrentSalary");
  assert.ok(guard !== -1, "the hook refuses to ask when it may not");
  assert.ok(request > guard, "the permission check comes before the request");

  // And the card renders the shared no-access state rather than an empty one.
  assert.match(sectionCode, /canView=\{canView\}/);
  assert.match(section, /deniedMessage="You do not have permission to view this employee's salary\."/);
});

test("NO EMPLOYEE ID MEANS NO REQUEST", () => {
  assert.match(hookCode, /if \(!employeeId \|\| !canView\)/);
  // The id the profile passes is the lifecycle's, which is the record the page
  // is certain of - `router.query.id` is a string that may not be there yet.
  assert.match(profile, /<PayrollSection\s*\n\s*employeeId=\{lifecycle\.employee_id\}/);
});

/* ============================== four read states, and they are told apart = */

test("LOADING, ERROR, DENIED AND EMPTY ARE FOUR DIFFERENT ANSWERS", () => {
  for (const flag of ["loading", "loaded", "denied", "error"]) {
    assert.match(hookCode, new RegExp(`\\b${flag}\\b`), `the hook must report ${flag}`);
  }
  assert.match(hookCode, /setDenied\(refused\.code === 403\)/);
  assert.match(hookCode, /setError\(refused\.code !== 403\)/);
  // A successful read with nothing approved: `loaded`, with a null current and
  // whatever history there is.
  assert.match(hookCode, /setCurrent\(currentBody\.current_salary \|\| null\)/);
  assert.match(hookCode, /setLoaded\(true\)/);

  // ...and the card branches on each of them.
  assert.match(sectionCode, /if \(loading\)/);
  assert.match(sectionCode, /if \(denied\)/);
  assert.match(sectionCode, /if \(error\)/);
  assert.match(sectionCode, /if \(!loaded\) return null;/);
  // Loading is compact, not a full-page block.
  assert.match(sectionCode, /<Spinner size="sm" \/>/);
});

test("A SLOW READ NEVER LANDS UNDER THE WRONG EMPLOYEE'S NAME", () => {
  // Somebody picking through a list starts a read per selection and they do not
  // come back in order. A salary shown against the wrong person is the worst
  // thing this card could do, so every read takes a ticket.
  assert.match(hookCode, /ticketRef/);
  assert.match(hookCode, /const isCurrentRead = \(\) => ticketRef\.current === ticket/);
});

test("AN API FAILURE IS NEVER SHOWN AS A MISSING SALARY", () => {
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

/* ================== the four payroll states, as rules rather than as text = */

test("18. NO SALARY + add_salary — the opening-salary entry is offered", () => {
  const resolved = resolvePayrollState([], null);
  assert.strictEqual(resolved.state, STATE.NO_SALARY);
  assert.strictEqual(
    canEnterOpeningSalary(resolved.state, { canView: true, canAdd: true }),
    true
  );

  // And the card renders it in that state and no other.
  assert.match(
    sectionCode,
    /resolved\.state === STATE\.NO_SALARY[\s\S]{0,260}<OpeningSalaryForm/
  );
});

test("18b. a REJECTED-ONLY history is still no salary, exactly as the backend counts it", () => {
  // If every proposal so far was refused, this employee still has no salary and
  // their next one is still their first - so the opening entry comes back. The
  // backend's `hasLiveSalary` says the same thing, and a screen that disagreed
  // would either hide a form the server would accept or offer one it refuses.
  const history = [row({ salary_id: 1, status: "REJECTED" }), row({ salary_id: 2, status: "REJECTED" })];
  assert.strictEqual(hasLiveSalary(history), false);
  assert.strictEqual(resolvePayrollState(history, null).state, STATE.NO_SALARY);
});

test("19. NO SALARY + view only — a plain sentence, and no form", () => {
  const resolved = resolvePayrollState([], null);
  assert.strictEqual(canEnterOpeningSalary(resolved.state, { canView: true, canAdd: false }), false);
  // Nor with the create right but no sight of salary: entering one without the
  // preview would be typing a number into the dark, and the preview endpoint
  // demands `view_salary` anyway.
  assert.strictEqual(canEnterOpeningSalary(resolved.state, { canView: false, canAdd: true }), false);

  assert.match(sectionCode, /No approved salary available\./);
  assert.match(sectionCode, /you do not have permission to enter one/i);
});

test("20. A PENDING PROPOSAL — the waiting state, and NO second create form", () => {
  const history = [row({ salary_id: 3, status: "PENDING" })];
  const resolved = resolvePayrollState(history, null);

  assert.strictEqual(resolved.state, STATE.PENDING);
  assert.strictEqual(resolved.pending.salary_id, 3);
  // An employee may hold ONE proposal at a time. Offering a second create form
  // would be the screen inviting a request the server is going to refuse.
  assert.strictEqual(canEnterOpeningSalary(resolved.state, { canView: true, canAdd: true }), false);

  // A pending proposal ALSO wins over a current approved salary: the next thing
  // that happens to this person's pay is that somebody decides that proposal.
  const withCurrent = resolvePayrollState(
    [row({ salary_id: 1 }), row({ salary_id: 3, status: "PENDING", effective_from: "2026-10-01" })],
    row({ salary_id: 1 })
  );
  assert.strictEqual(withCurrent.state, STATE.PENDING);
  assert.strictEqual(canEnterOpeningSalary(withCurrent.state, { canView: true, canAdd: true }), false);

  assert.match(sectionCode, /is waiting for approval/);
  assert.match(sectionCode, /only one salary proposal at a time/i);
});

test("20b. amending a pending proposal is a LINK to Payroll, never a form here", () => {
  // With `edit_salary`, the card points at the screen where amendments live.
  assert.strictEqual(showRevisionLink(STATE.PENDING, { canView: true, canEdit: true }), true);
  // Without it there is nothing to do but wait, and a signpost to a screen that
  // will not let you act is worse than none.
  assert.strictEqual(showRevisionLink(STATE.PENDING, { canView: true, canEdit: false }), false);

  const { REVISION_SCREEN_PATH } = require(path.join(ROOT, "util/employeeMasterPayroll.js"));
  assert.strictEqual(REVISION_SCREEN_PATH, "/payroll/salary-revision");
  assert.match(sectionCode, /REVISION_SCREEN_PATH/);
  // It is a link and not a control: the card presses nothing itself.
  assert.ok(!/<Button/.test(sectionCode), "the Payroll card has no button at all");
});

test("21. A CURRENT APPROVED SALARY — the read-only display, unchanged", () => {
  const current = row({ salary_id: 1 });
  const resolved = resolvePayrollState([current], current);

  assert.strictEqual(resolved.state, STATE.CURRENT_APPROVED);
  assert.strictEqual(canEnterOpeningSalary(resolved.state, { canView: true, canAdd: true }), false);
  // A link to where the next revision is proposed, for anybody who can see
  // salary at all.
  assert.strictEqual(showRevisionLink(STATE.CURRENT_APPROVED, { canView: true }), true);
  assert.strictEqual(showRevisionLink(STATE.CURRENT_APPROVED, { canView: false }), false);
});

test("22. APPROVED BUT NOT YET IN FORCE — not 'no salary', and no second opening", () => {
  /*
   * The state this whole module exists for. The resolver answers `null` for an
   * employee whose only approved revision is dated ahead of today, exactly as
   * it does for an employee with nothing at all - so a screen reading only
   * `/current` would tell HR this person has no salary and offer them an
   * opening one, which the server then refuses as a duplicate.
   */
  const future = row({ salary_id: 9, effective_from: "2027-01-01" });
  const resolved = resolvePayrollState([future], null);

  assert.strictEqual(resolved.state, STATE.FUTURE_APPROVED);
  assert.strictEqual(resolved.future.salary_id, 9);
  assert.strictEqual(canEnterOpeningSalary(resolved.state, { canView: true, canAdd: true }), false);
  assert.strictEqual(showRevisionLink(STATE.FUTURE_APPROVED, { canView: true }), true);

  assert.match(sectionCode, /An approved salary takes effect on/);
  assert.match(sectionCode, /an opening salary cannot be entered again/i);
});

test("22b. the future state is worked out by ELIMINATION, never by a date comparison", () => {
  // "Not yet in force" means approved and NOT the row the server's resolver
  // picked. A browser comparing `effective_from` to its own clock can disagree
  // with the server across a timezone; this cannot.
  const inForce = row({ salary_id: 1, effective_from: "2026-04-01" });
  const later = row({ salary_id: 2, effective_from: "2027-01-01" });
  const resolved = resolvePayrollState([inForce, later], inForce);
  assert.strictEqual(resolved.state, STATE.CURRENT_APPROVED, "the resolver's row is current");

  const util = codeOf(read("util/employeeMasterPayroll.js"));
  assert.ok(!/new Date\(/.test(util), "no clock is read");
  assert.ok(!/Date\.now/.test(util));
});

/* ========================= 23. the server is the only calculator, again == */

test("23. THE OPENING SALARY IS PREVIEWED AND CREATED BY THE SERVER", () => {
  assert.match(formCode, /EmployeeSalaryHelper\.preview\(employeeId, toRequestBody\(form\)\)/);
  assert.match(formCode, /EmployeeSalaryHelper\.createOpeningSalary\(/);

  // Submit is disabled until a preview has come back, and any edit throws the
  // preview away - so what is submitted is always a structure the server
  // produced from the inputs currently in the form.
  assert.match(formCode, /isDisabled=\{!preview \|\| previewing/);
  assert.match(formCode, /const invalidate = \(setter\) => \(value\) => \{[\s\S]{0,80}setPreview\(null\)/);
  assert.match(formCode, /if \(saving \|\| !preview\) return;/);

  // It reuses the shared rules and the shared renderer rather than a second
  // copy of either.
  assert.match(form, /from "\.\.\/\.\.\/\.\.\/util\/salaryRevisionForm"/);
  assert.match(form, /from "\.\.\/\.\.\/\.\.\/util\/salaryPreviewView"/);
  assert.match(form, /import SalaryBreakup from "\.\.\/\.\.\/payroll\/SalaryBreakup"/);

  // NO EFFECTIVE-DATE INPUT. The opening date is the server's and it ignores
  // any date sent, so a field here would be a box somebody typed into and
  // watched be disregarded.
  assert.ok(!/type="date"/.test(formCode), "there is no effective-date picker");
  assert.match(formCode, /previewEffectiveFrom\(preview\)/);
  assert.match(form, /cannot be\s+chosen here/);

  // NO REVISION REASON EITHER. An opening salary changes nothing, so there is
  // nothing for a reason to be about - and the server does not ask for one.
  assert.ok(!/Revision Reason/.test(form), "there is no revision-reason field");
  assert.match(formCode, /revision_reason: ""/, "and the shared validator is handed a blank one");

  // The override is offered only with its own key.
  assert.match(formCode, /canOverride \?/);
  assert.match(formCode, /Manual Override Reason/);

  // After a successful submit the section re-reads the server rather than
  // patching a proposal into state it guessed the shape of.
  assert.match(formCode, /if \(onSubmitted\) await onSubmitted\(\)/);
  assert.match(sectionCode, /onSubmitted=\{refresh\}/);
});

/* ================================== what this surface must never acquire = */

test("THE EMPLOYEE MASTER NEVER ACQUIRES THE REVISION OR APPROVAL WORKFLOW", () => {
  /*
   * The product rule, defended file by file. The profile enters the FIRST
   * salary; it does not amend a pending one, it does not approve or reject
   * anything, it shows no history table and it runs no bulk upload. Those are
   * Payroll's screens, and this assertion is what keeps the Employee Master's
   * files from acquiring them by degrees.
   */
  const surface = [
    "components/hr/profile/PayrollSection.jsx",
    "components/hr/profile/OpeningSalaryForm.jsx",
    "customHooks/useEmployeeMasterSalary.js",
    "helper/employeeSalary.js",
    "util/employeeMasterPayroll.js",
    "pages/hr/employees/[id].jsx",
  ];
  for (const file of surface) {
    const code = codeOf(read(file));
    for (const forbidden of [
      "amendPending",
      "payrollSalary",
      "PayrollSalaryHelper",
      "salaryApprovalQueue",
      "SalaryHistoryTable",
      // The COMPONENT, not `util/salaryRevisionForm.js`: the shared validation
      // rules are deliberately reused, and a second copy of them would be a
      // second answer about what a form may submit.
      "payroll/SalaryRevisionForm",
      "PendingProposalCard",
      "bulkValidate",
      "bulkSubmit",
      "BulkSalary",
      "payroll_run",
      "payslip",
      "net_pay",
    ]) {
      assert.ok(
        !new RegExp(forbidden, "i").test(code),
        `${file} must not reach into ${forbidden} - that belongs to Payroll`
      );
    }
  }

  // No salary screen was added under the Employee Master's own routes.
  const pages = path.join(ROOT, "pages");
  assert.ok(!fs.existsSync(path.join(pages, "hr", "salary")), "salary is not an Employee Master screen");
});

test("PAYROLL'S SCREENS EXIST, AND THERE IS STILL NO MONTHLY PAYROLL", () => {
  // The other half of the rule above: Payroll is a real section, with exactly
  // three screens - propose one, decide them, and propose many.
  const payroll = path.join(ROOT, "pages", "payroll");
  assert.ok(fs.existsSync(payroll), "the Payroll screens exist");
  assert.deepStrictEqual(fs.readdirSync(payroll).sort(), [
    "bulk-salary-upload.jsx",
    "salary-approval.jsx",
    "salary-revision.jsx",
  ]);

  // Payroll runs, payslips, attendance calculation and bank payment are later
  // modules. Not started, not stubbed, not linked.
  const payrollFiles = [
    "pages/payroll/salary-revision.jsx",
    "pages/payroll/salary-approval.jsx",
    "pages/payroll/bulk-salary-upload.jsx",
    "helper/payrollSalary.js",
    "util/salaryRevisionForm.js",
    "util/salaryApprovalQueue.js",
    "util/salaryHistoryView.js",
    "util/payrollAccess.js",
    "util/bulkSalaryUpload.js",
  ];
  for (const file of payrollFiles) {
    const code = codeOf(read(file));
    for (const forbidden of [
      "payroll_run", "payslip", "net_pay", "process_payroll", "hr_reports", "bank_payment",
      "annual_ctc", "increment_percent",
    ]) {
      assert.ok(
        !new RegExp(forbidden, "i").test(code),
        `${file} must not reach into ${forbidden} - that is a later module`
      );
    }
  }
});

test("THE LEGACY new_employee.salary COLUMN IS NOT READ OR WRITTEN ANYWHERE", () => {
  // M1 removed it from the write path; nothing here may quietly bring it back
  // as a fallback when the resolver says there is no approved salary, and the
  // opening-salary create must not revive it either.
  const surface = [
    "components/hr/profile/PayrollSection.jsx",
    "components/hr/profile/OpeningSalaryForm.jsx",
    "customHooks/useEmployeeMasterSalary.js",
    "helper/employeeSalary.js",
    "util/salaryView.js",
    "util/employeeMasterPayroll.js",
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
      !/\bsalary\b\s*[:=]\s*(?!=)/.test(code),
      `${file} must not put a bare salary into a payload or form state`
    );
  }
  // The card is not even given the employee row - only an id and four rights.
  assert.ok(
    !/employee=\{/.test(profile.slice(profile.indexOf("<PayrollSection"), profile.indexOf("<PayrollSection") + 400)),
    "the Payroll card receives no employee record to read a salary out of"
  );
});

test("the salary figures never carry a sensitive employee field with them", () => {
  for (const code of [sectionCode, formCode]) {
    for (const forbidden of [
      "pan_no", "uan", "account_no", "ifsc", "aadhaar_number",
      "aadhaar_fingerprint", "account_fingerprint", "bank_name",
    ]) {
      assert.ok(
        !new RegExp(`\\b${forbidden}\\b`).test(code),
        `the Payroll surface must not reference ${forbidden}`
      );
    }
  }
  assert.ok(!/console\.log/.test(section + form), "nothing here is logged");
  assert.ok(!/localStorage/.test(section + form), "and nothing is persisted");
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

test("a PENDING structure is never dressed as an approved one", () => {
  // The same five groups render a pending proposal, because the figures are
  // stored figures either way - but the status badge follows the record.
  assert.match(sectionCode, /colorScheme=\{view\.summary\.status === "APPROVED" \? "green" : "orange"\}/);
});

test("the card follows the existing profile conventions and stays compact", () => {
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

test("the five salary keys are all grantable on the Permission Matrix", () => {
  // The backend has checked these since M2, but `constants/permissions.js` is
  // what the matrix renders - so without an entry a permission cannot be
  // granted at all and its screen is visible to administrators and to nobody
  // else.
  const permissions = read("constants/permissions.js");
  const strip = permissions.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.match(strip, /view_salary:\s*"View Salary/);

  for (const key of [
    "add_salary", "edit_salary", "approve_salary_revision",
    "manual_salary_component_override",
  ]) {
    assert.ok(
      new RegExp(`\\b${key}\\s*:`).test(strip),
      `${key} gates a salary screen and must be grantable`
    );
  }

  // ADD AND APPROVE ARE STILL TWO ENTRIES. Collapsing them into one label
  // would let somebody grant both without meaning to, which is the four-eyes
  // rule given away by a checkbox.
  assert.ok(!/add_salary:[^\n]*[Aa]pprove/.test(strip), "adding is not approving");

  // NO BULK KEY. `add_salary` is what the bulk endpoints demand: uploading a
  // hundred proposals and typing a hundred proposals are the same authority at
  // different speeds, and a second key to grant is the one somebody forgets.
  assert.ok(!/bulk_salary/i.test(strip), "no bulk-salary permission was invented");

  // AND THE MONTHLY-PAYROLL KEYS STAY OFF IT. `process_payroll` and
  // `hr_reports` gate nothing that exists.
  for (const later of ["process_payroll", "hr_reports", "view_payroll"]) {
    assert.ok(
      !new RegExp(`\\b${later}\\s*:`).test(strip),
      `${later} gates no screen yet and must not be offered`
    );
  }
});
