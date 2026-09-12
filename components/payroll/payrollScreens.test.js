/**
 * M4 — the two Payroll screens are wired to the real contract.
 *
 *   node --test components/payroll/payrollScreens.test.js
 *
 * There is no React test runner in this repo, so the screens are checked as
 * SOURCE, the way `components/hr/payrollSection.test.js` checks M3's card.
 * That is weaker than rendering them, and it catches the failures that
 * actually happen here:
 *
 *   a screen calling an endpoint the backend does not declare
 *   a screen calculating a salary figure in the browser
 *   an edit affordance appearing on the approval screen
 *   a rejection going through with no reason
 *   somebody approving their own pay revision
 *   a refusal rendering as a success
 *
 * The RULES behind these screens are pure modules and are proved properly in
 * `util/payrollSalaryRules.test.js`.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Comments may NAME something to explain why it is absent; code may not. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const helper = read("helper/payrollSalary.js");
const helperCode = codeOf(helper);
const revisionPage = read("pages/payroll/salary-revision.jsx");
const revisionPageCode = codeOf(revisionPage);
const revisionForm = read("components/payroll/SalaryRevisionForm.jsx");
const revisionFormCode = codeOf(revisionForm);
const approvalPage = read("pages/payroll/salary-approval.jsx");
const approvalPageCode = codeOf(approvalPage);
const proposalCard = read("components/payroll/PendingProposalCard.jsx");
const proposalCardCode = codeOf(proposalCard);
const historyTable = read("components/payroll/SalaryHistoryTable.jsx");
const historyTableCode = codeOf(historyTable);
const queueHook = codeOf(read("customHooks/usePendingSalaryQueue.js"));
const recordHook = codeOf(read("customHooks/useEmployeeSalaryRecord.js"));

const BACKEND_ROUTER = path.join(
  ROOT, "..", "dailyneeds-store-backend", "routes", "employee_salary.js"
);
const backendAvailable = fs.existsSync(BACKEND_ROUTER);

/* ============================================== the contract is the API == */

test("THE HELPER CALLS EXACTLY THE SALARY ENDPOINTS THAT EXIST", () => {
  const paths = [...helperCode.matchAll(/\/hr\/salary[^"`)]*/g)].map((m) => m[0]);
  assert.deepStrictEqual(paths.sort(), [
    "/hr/salary/employee/${employeeId}",
    "/hr/salary/employee/${employeeId}/current",
    "/hr/salary/employee/${employeeId}/history",
    "/hr/salary/pending",
    "/hr/salary/preview/${employeeId}",
    "/hr/salary/revision/${salaryId}",
    "/hr/salary/revision/${salaryId}/approve",
    "/hr/salary/revision/${salaryId}/reject",
  ]);
});

test("every path the helper calls is one the backend declares", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  for (const declared of [
    '"/salary/preview/:employee_id"',
    '"/salary/employee/:employee_id"',
    '"/salary/employee/:employee_id/current"',
    '"/salary/employee/:employee_id/history"',
    '"/salary/revision/:salary_id"',
    '"/salary/revision/:salary_id/approve"',
    '"/salary/revision/:salary_id/reject"',
    '"/salary/pending"',
  ]) {
    assert.ok(router.includes(declared), `the backend must declare ${declared}`);
  }
});

test("THE QUEUE IS GUARDED ON ALL THREE KEYS ON THE SERVER", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  const route = router.slice(router.indexOf('"/salary/pending"'));
  assert.match(
    route.slice(0, 300),
    /requireAll\(P\.VIEW_EMPLOYEES, P\.VIEW_SALARY, P\.APPROVE_SALARY_REVISION\)/
  );
});

test("B3 IS NOT WEAKENED BY M4", { skip: !backendAvailable }, () => {
  const router = fs.readFileSync(BACKEND_ROUTER, "utf8");
  assert.match(router, /router\.use\("\/salary", this\.sensitive\.filterResponse\)/);
  assert.match(router, /router\.use\("\/salary", this\.sensitive\.guardWrite\)/);
});

test("THE REVISION REASON IS REQUIRED BY THE SERVER, NOT ONLY BY THE FORM", { skip: !backendAvailable }, () => {
  // A required-field rule that lives only in a browser is not a rule.
  const usecase = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "usecase", "employee_salary.js"),
    "utf8"
  );
  assert.match(usecase, /A revision reason is required/);
  assert.match(usecase, /SOURCES_REQUIRING_REASON/);
  // And it is its own column, never the override's or the rejection's.
  const repo = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "repository", "employee_salary.js"),
    "utf8"
  );
  for (const column of ["revision_reason", "override_reason", "rejection_reason"]) {
    assert.ok(repo.includes(`"${column}"`), `${column} is its own column`);
  }
});

/* ================================================ nothing is calculated = */

test("NO SALARY ARITHMETIC HAPPENS IN THE BROWSER", () => {
  // Every figure on both screens comes from the preview endpoint, the
  // resolver, or a stored record. A second implementation of the breakup or
  // the statutory rules here would be a second answer, and the two would
  // disagree the first time a rate changed.
  const surface = [
    ["helper/payrollSalary.js", helperCode],
    ["pages/payroll/salary-revision.jsx", revisionPageCode],
    ["pages/payroll/salary-approval.jsx", approvalPageCode],
    ["components/payroll/SalaryRevisionForm.jsx", revisionFormCode],
    ["components/payroll/PendingProposalCard.jsx", proposalCardCode],
    ["components/payroll/SalaryHistoryTable.jsx", historyTableCode],
    ["components/payroll/SalaryBreakup.jsx", codeOf(read("components/payroll/SalaryBreakup.jsx"))],
  ];
  for (const [file, code] of surface) {
    // `/ 26` is deliberately NOT one of these: it appears as the LABEL
    // "Daily Salary (Gross / 26)" on a figure the server computed, exactly as
    // it does on the Employee Master's card. What is forbidden is doing the
    // division, not naming it.
    for (const arithmetic of [/_gross\s*[*/]\s*\d/, /\*\s*0\.\d/, /\bMath\.(round|floor|ceil)\(/]) {
      assert.ok(!arithmetic.test(code), `${file} must not calculate a salary figure`);
    }
    for (const statutory of ["employee_pf =", "employer_epf =", "monthly_ctc =", "esi_wage ="]) {
      assert.ok(!code.includes(statutory), `${file} must not assign a statutory amount`);
    }
  }
});

test("THE PREVIEW IS THE ONLY WAY THE FORM LEARNS A BREAKUP", () => {
  assert.match(revisionFormCode, /PayrollSalaryHelper\.preview\(/);
  // Submit is disabled until a preview has come back, and any edit throws the
  // preview away - so what is submitted is always a structure the server
  // produced from the inputs currently in the form.
  assert.match(revisionFormCode, /isDisabled=\{editingDisabled \|\| !preview/);
  assert.match(revisionFormCode, /const invalidate = \(setter\) => \(value\) => \{[\s\S]{0,80}setPreview\(null\)/);
  assert.match(revisionFormCode, /if \(saving \|\| !preview\) return;/);
});

/* ===================================== the revision screen's permissions = */

test("THE REVISION SCREEN USES THE SHARED RULES, not ad hoc permission checks", () => {
  for (const rule of [
    "canOpenRevisionScreen",
    "canAddSalary",
    "canEditPendingSalary",
    "canOverrideComponents",
  ]) {
    assert.ok(revisionPageCode.includes(rule), `${rule} decides its own thing`);
  }
  assert.ok(
    !/usePermissions\(\[/.test(revisionPageCode),
    "the rules are shared with the backend contract, not restated on the page"
  );
});

test("NO view_salary MEANS NO REQUEST, not a hidden screen that fetched anyway", () => {
  // The short-circuit is inside the hook, BEFORE the call.
  assert.match(recordHook, /if \(!employeeId \|\| !canView\) \{/);
  const guard = recordHook.indexOf("if (!employeeId || !canView)");
  const request = recordHook.indexOf("PayrollSalaryHelper.getHistory");
  assert.ok(guard !== -1 && request > guard, "the permission check comes before the request");
  assert.match(revisionPageCode, /useEmployeeSalaryRecord\(\s*employeeId,\s*mayOpen\s*\)/);
});

test("THE MANUAL OVERRIDE IS NOT RENDERED WITHOUT ITS PERMISSION", () => {
  // Not disabled, not greyed - absent. And it is an explicit opt-in rather
  // than the default form, so nobody departs from the automatic breakup by
  // filling in a field that happened to be there.
  assert.match(revisionFormCode, /\{canOverride \? \(/);
  assert.match(revisionFormCode, /isChecked=\{manualOverride\}/);
  assert.match(revisionFormCode, /\{manualOverride \? \(/);
  // The validator refuses it too, in case the state is set some other way.
  const rules = codeOf(read("util/salaryRevisionForm.js"));
  assert.match(rules, /if \(!options\.can_override\)/);
});

test("AMENDING A PENDING PROPOSAL TAKES edit_salary, AND KEEPS ITS DATE", () => {
  assert.match(revisionFormCode, /PayrollSalaryHelper\.amendPending\(pending\.salary_id/);
  assert.match(revisionFormCode, /if \(pending && canEdit\)/);
  // A record's identity is not up for amendment, only its numbers.
  assert.match(revisionFormCode, /const dateIsFixed = isOpening \|\| mode === MODE\.AMEND;/);
});

test("AN OPENING SALARY'S DATE IS DISPLAYED, NEVER OFFERED AS AN INPUT", () => {
  // The server dates the first record at the later of the opening floor and
  // the date of joining and ignores anything sent. A date picker somebody can
  // type into and watch be ignored is worse than no picker.
  assert.match(revisionFormCode, /dateIsFixed \? \(/);
  assert.match(revisionFormCode, /previewEffectiveFrom\(preview\)/);
  assert.match(revisionForm, /Set by the opening-salary rule on the server\./);
  const rules = codeOf(read("util/salaryRevisionForm.js"));
  assert.match(rules, /if \(!form\.is_opening && !isBlank\(form\.effective_from\)\)/);
});

test("A DUPLICATE SUBMIT CANNOT RAISE TWO PROPOSALS", () => {
  assert.match(revisionFormCode, /if \(saving \|\| !preview\) return;/);
  assert.match(revisionFormCode, /isLoading=\{saving\}/);
  assert.match(approvalPageCode, /if \(busyId\) return;/);
});

/* ================================ the approval screen cannot edit anything */

test("THE APPROVAL SCREEN HAS NO EDIT AFFORDANCE OF ANY KIND", () => {
  // Rule 14 of the approved scope. An approver who could amend a figure could
  // rewrite a proposal and agree to it in the same visit - the four-eyes rule
  // defeated from the other end.
  for (const forbidden of [
    "amendPending",
    "PayrollSalaryHelper.create",
    "PayrollSalaryHelper.preview",
    "monthly_gross:",
    "manual_components",
    "toRequestBody",
    "SalaryRevisionForm",
  ]) {
    assert.ok(
      !proposalCardCode.includes(forbidden),
      `the approval card must not carry ${forbidden}`
    );
    assert.ok(
      !approvalPageCode.includes(forbidden),
      `the approval screen must not carry ${forbidden}`
    );
  }

  // The only writable field on the whole screen is the rejection reason.
  const inputs = proposalCardCode.match(/<(Input|NumberInput|Select|Textarea)\b/g) || [];
  assert.deepStrictEqual(inputs, ["<Textarea"], "one field, and it is the rejection reason");
});

test("REJECTING REQUIRES A REASON, IN THE UI AND ON THE SERVER", () => {
  assert.match(proposalCardCode, /if \(reason\.trim\(\) === ""\) \{/);
  assert.match(proposalCard, /A reason is required to reject a salary revision\./);
  assert.match(proposalCardCode, /onReject\(row\.salary_id, reason\.trim\(\)\)/);
  assert.match(helperCode, /API\.post\(`\/hr\/salary\/revision\/\$\{salaryId\}\/reject`, \{ reason \}\)/);
});

test("OWN APPROVAL IS COMMUNICATED AND DISABLED, WITH THE SERVER AS THE AUTHORITY", () => {
  // The button is disabled and the reason is said out loud...
  assert.match(proposalCardCode, /isDisabled=\{!canApprove \|\| row\.own_proposal \|\| busy\}/);
  assert.match(proposalCard, /You raised this proposal, so you cannot approve it/);
  // ...and rejecting your own is deliberately still available: withdrawing a
  // proposal is normal, and only AGREEING to your own pay change is blocked.
  assert.match(proposalCardCode, /isDisabled=\{!canReject \|\| busy\}/);
  assert.ok(
    !/own_proposal[\s\S]{0,40}canReject/.test(proposalCardCode),
    "rejection is not gated on whose proposal it is"
  );
});

test("the own-approval refusal is the SERVER'S rule", { skip: !backendAvailable }, () => {
  const usecase = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "usecase", "employee_salary.js"),
    "utf8"
  );
  assert.match(usecase, /_refuseSelfApproval/);
  assert.match(usecase, /cannot approve a salary revision you created yourself/);
  // And the administrator exception is the existing one, not a second notion
  // of privilege.
  assert.match(usecase, /ADMIN_USER_TYPE = 2/);
});

/* ============================================== states are told apart === */

test("AN API FAILURE IS NEVER SHOWN AS AN EMPTY QUEUE OR AN EMPTY HISTORY", () => {
  // The single most damaging confusion either screen could make: one of them
  // is work somebody has to do, the other is a server that did not answer.
  assert.match(approvalPage, /No salary proposals are waiting for approval\./);
  assert.match(approvalPage, /it does not mean there is nothing to\s*\n?\s*approve/);
  const emptyAt = approvalPageCode.indexOf("No salary proposals are waiting");
  const errorAt = approvalPageCode.indexOf("{error ? (");
  assert.ok(errorAt !== -1 && errorAt < emptyAt, "the error branch renders before the empty one");

  assert.match(revisionPage, /it does not mean no salary has been\s*\n?\s*approved/);
  assert.match(historyTable, /No salary has been proposed for this employee yet\./);
});

test("A REFUSAL NEVER RENDERS AS A SUCCESS", () => {
  // Both write paths read the outcome before telling anybody it worked.
  assert.match(revisionFormCode, /if \(outcome\.kind !== KIND\.OK\) \{[\s\S]{0,200}setProblem\(outcome\)/);
  assert.match(approvalPageCode, /if \(outcome\.kind !== KIND\.OK\) \{/);
  assert.match(approvalPageCode, /if \(!ok\) return;/);
});

test("THE SERVER'S CONFLICT AND LOCK MESSAGES ARE SHOWN, NOT PARAPHRASED", () => {
  // A same-date conflict, a queued future revision and a locked period each
  // carry the sentence that says what to do about it.
  assert.match(revisionFormCode, /\{problem\.message\}/);
  assert.match(revisionFormCode, /periodLockOf\(preview\)/);
  assert.match(revisionFormCode, /\{lock\.message\}/);
  // And nothing is replaced on the caller's behalf.
  for (const forbidden of ["replace", "supersede", "overwrite", "force"]) {
    assert.ok(
      !new RegExp(`${forbidden}\\s*\\(`, "i").test(revisionFormCode),
      `a conflict must not be resolved by the screen (${forbidden})`
    );
  }
});

test("AFTER EVERY DECISION THE AFFECTED DATA IS RE-READ", () => {
  // Rather than patched in place, so what is on screen is what the server
  // holds - including the status a record has just moved into.
  assert.match(approvalPageCode, /await refresh\(\);/);
  assert.match(revisionPageCode, /await refresh\(\);/);
  assert.match(revisionPageCode, /onSaved=\{onSaved\}/);
});

/* =========================================== the queue is ONE read ====== */

test("THE QUEUE IS ONE ENDPOINT, NOT A WALK OF THE EMPLOYEE MASTER", () => {
  assert.match(queueHook, /PayrollSalaryHelper\.getPendingQueue\(/);
  for (const forbidden of ["getHistory", "getEmployee", "forEach", "Promise.all"]) {
    assert.ok(!queueHook.includes(forbidden), `the queue hook must not ${forbidden}`);
  }
  const calls = queueHook.match(/PayrollSalaryHelper\.\w+\(/g) || [];
  assert.deepStrictEqual(calls, ["PayrollSalaryHelper.getPendingQueue("], "one call, one read");
});

test("filters are SENT to the server rather than applied to a full list here", () => {
  assert.match(queueHook, /params\[name\] = value/);
  assert.ok(!/items\.filter/.test(queueHook), "rows that do not match are never fetched");
  assert.match(approvalPageCode, /usePendingSalaryQueue\(\s*filters,\s*mayOpen\s*\)/);
});

test("a late answer for a previous selection cannot land on the current one", () => {
  // Somebody picking through a list starts a read per selection, and they do
  // not come back in the order they were sent. A salary history shown under
  // the wrong name is the worst thing these screens could do.
  for (const hook of [recordHook, queueHook]) {
    assert.match(hook, /ticketRef/);
    assert.match(hook, /if \(!isCurrentRead\(\)\) return;/);
  }
});

/* ================================================ history is permanent == */

test("THE HISTORY HAS NO DELETE AND NO EDIT", () => {
  for (const forbidden of ["delete", "Delete", "remove", "onEdit", "onSave", "Input", "Textarea"]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`).test(historyTableCode),
      `the history table must not carry ${forbidden}`
    );
  }
});

test("EVERY AUDIT FIELD THE APPROVED SCOPE NAMES IS RENDERED", () => {
  // Effective date, gross, the four components, both deductions, the five
  // employer costs, the CTC, status, source, the revision reason, the manual
  // override and its reason, and who did what and when.
  assert.match(historyTableCode, /row\.effective_from/);
  assert.match(historyTableCode, /row\.monthly_gross/);
  assert.match(historyTableCode, /row\.badge/);
  assert.match(historyTableCode, /row\.source_label/);
  assert.match(historyTableCode, /row\.revision_reason/);
  assert.match(historyTableCode, /row\.manual_override/);
  assert.match(historyTableCode, /row\.override_reason/);
  assert.match(historyTableCode, /row\.audit\.map/);
  assert.match(historyTableCode, /step\.who/);
  assert.match(historyTableCode, /step\.at/);
  assert.match(historyTableCode, /step\.note/);
  // The figures come from the shared presenter, so an unresolved contribution
  // reads as Pending here exactly as it does on the employee profile.
  assert.match(historyTableCode, /<SalaryBreakup view=\{row\.figures\}/);
});

test("THE ACTOR NAMES COME FROM THE BACKEND, NOT FROM N+1 LOOKUPS", { skip: !backendAvailable }, () => {
  const repo = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "repository", "employee_salary.js"),
    "utf8"
  );
  for (const alias of ["created_by_name", "approved_by_name", "rejected_by_name"]) {
    assert.ok(repo.includes(alias), `${alias} is resolved in the query`);
  }
  // And nothing on this side goes looking an employee up per row.
  for (const code of [historyTableCode, proposalCardCode]) {
    assert.ok(!/EmployeeHelper/.test(code), "no per-row employee lookup");
  }
});

/* ============================ Payroll is separate from Employee Master == */

test("THE EMPLOYEE MASTER IS NOT TOUCHED BY EITHER SCREEN", () => {
  // Salary is entered here. The profile's Payroll section shows the current
  // approved figure and remains entirely read-only; a second place to type a
  // salary is a second salary.
  for (const code of [revisionPageCode, approvalPageCode, revisionFormCode, proposalCardCode]) {
    assert.ok(!/HrHelper/.test(code), "no employee write path");
    assert.ok(!/updateEmployeeDetails/.test(code));
    assert.ok(!/employeeSalary/.test(code), "the Employee Master's helper stays the profile's");
  }
});

test("THE LEGACY new_employee.salary COLUMN IS NEVER READ OR WRITTEN", () => {
  const surface = [
    ["helper/payrollSalary.js", helperCode],
    ["pages/payroll/salary-revision.jsx", revisionPageCode],
    ["pages/payroll/salary-approval.jsx", approvalPageCode],
    ["components/payroll/SalaryRevisionForm.jsx", revisionFormCode],
    ["components/payroll/PendingProposalCard.jsx", proposalCardCode],
    ["util/salaryRevisionForm.js", codeOf(read("util/salaryRevisionForm.js"))],
  ];
  for (const [file, code] of surface) {
    assert.ok(!/\bemployee\.salary\b/.test(code), `${file} must not read the legacy column`);
    // An object KEY, which is preceded by `{` or `,` - rather than the word
    // "salary" in a sentence on screen, which is prose and not a payload.
    assert.ok(
      !/[{,]\s*salary\s*:/.test(code),
      `${file} must not put a bare salary into a payload - B3 strips that key`
    );
  }
});

test("no sensitive employee field travels with a salary figure", () => {
  for (const code of [revisionPageCode, approvalPageCode, proposalCardCode, revisionFormCode]) {
    for (const forbidden of [
      "pan_no", "uan", "account_no", "ifsc", "aadhaar_number",
      "aadhaar_fingerprint", "account_fingerprint", "bank_name",
    ]) {
      assert.ok(!new RegExp(`\\b${forbidden}\\b`).test(code), `${forbidden} has no place here`);
    }
  }
  assert.ok(!/console\.log/.test(revisionForm), "nothing about pay is logged");
  assert.ok(!/console\.log/.test(proposalCard));
  assert.ok(!/localStorage/.test(revisionForm), "and nothing about pay is persisted in a browser");
  assert.ok(!/localStorage/.test(proposalCard));
});

/* ================================================== conventions ========= */

test("both screens follow the existing shell and stay compact and responsive", () => {
  for (const page of [revisionPageCode, approvalPageCode]) {
    assert.match(page, /<GlobalWrapper/);
    assert.match(page, /<CustomContainer/);
  }
  // Chakra, and it stacks on a phone rather than scrolling sideways.
  for (const code of [revisionFormCode, proposalCardCode, approvalPageCode]) {
    assert.match(code, /columns=\{\{ base: \d/);
  }
  assert.match(revisionFormCode, /size="sm"/);
});

test("money is Indian-formatted, through the one shared formatter", () => {
  const view = require(path.join(ROOT, "util/salaryView.js"));
  assert.strictEqual(view.formatMoney(4500000.5), "₹45,00,000.50");
  // And the screens use it rather than formatting money themselves.
  for (const code of [revisionPageCode, proposalCardCode]) {
    assert.ok(!/toFixed\(2\)/.test(code), "no hand-rolled currency formatting");
    assert.ok(!/₹/.test(code), "the rupee sign comes from the formatter");
  }
});

/* ========= M4 review fix — ONE PENDING PROPOSAL, AS THE SCREEN OFFERS IT == */

/*
 * The business rule is one decision at a time: an employee may have AT MOST
 * ONE pending salary proposal, whatever its effective date. The server refuses
 * a second one before anything is written and the database carries a unique
 * key behind that. The screen's job is to stop offering an action that cannot
 * succeed - and to stop implying the rule is "one per effective date".
 */

test("THERE IS NO 'PROPOSE A NEW REVISION' WHILE A PROPOSAL IS PENDING", () => {
  // The affordance is gone from the source entirely, not hidden behind a
  // condition: a control that exists is a control somebody reaches.
  // Read off the CODE, not the raw file: the comment above the component names
  // the affordance in order to explain why it is absent, which is exactly the
  // distinction `codeOf` exists to draw.
  assert.ok(
    !/Propose a new revision/i.test(revisionFormCode),
    "the screen must not offer a second proposal at all"
  );
  assert.ok(
    !/Amend the pending proposal/i.test(revisionFormCode),
    "and with nothing to switch between, there is no mode switcher either"
  );
});

test("THE FORM'S MODE IS DERIVED FROM THE PENDING RECORD, NOT CHOSEN", () => {
  // No `setMode`, so no control and no state that can disagree with the
  // history the server sent.
  assert.match(revisionFormCode, /const mode = pending \? MODE\.AMEND : MODE\.CREATE;/);
  assert.ok(!/setMode/.test(revisionFormCode), "there is nothing to set it to");
  assert.ok(
    !/useState\(MODE\./.test(revisionFormCode),
    "the mode is not state at all"
  );
});

test("AN edit_salary HOLDER AMENDS THE ONE PENDING PROPOSAL", () => {
  // The form IS that proposal, prefilled from it, and it submits through the
  // amend endpoint with the proposal's own id.
  assert.match(revisionFormCode, /if \(pending && canEdit\) \{/);
  assert.match(revisionFormCode, /const mayAmend = hasPending && canEdit;/);
  assert.match(
    revisionFormCode,
    /PayrollSalaryHelper\.amendPending\(pending\.salary_id, body\)/
  );
});

test("A NON-EDITOR SEES THE WAITING STATE AND GETS NO CREATE FORM", () => {
  // `add_salary` does not open a create form beside an outstanding proposal:
  // the server would refuse the request whoever made it.
  assert.match(revisionFormCode, /const mayCreate = !hasPending && canAdd;/);
  assert.match(revisionFormCode, /if \(hasPending && !mayAmend\) \{/);
  assert.match(revisionFormCode, /is waiting for approval\./);
  assert.match(revisionFormCode, /only one salary proposal at a time/);
});

test("THE SCREEN SAYS THE RULE IS ONE AT A TIME, NOT ONE PER DATE", () => {
  // The wording is the actionable part. "Already a pending proposal effective
  // <date>" invites somebody to try a different date, which is the request the
  // server now refuses.
  assert.ok(
    !/pending proposal at the same date|second one at the same date/i.test(revisionFormCode),
    "the screen must not describe the old per-date rule"
  );
  assert.match(revisionPageCode, /one salary proposal at a time/);
});

test("THE HISTORY TABLE RENDERS WHATEVER AUDIT STEPS THE RECORD HAS", () => {
  // Created, Changed, Approved, Rejected are decided by
  // `util/salaryHistoryView.js#auditTrail` and rendered generically here, so a
  // Changed line appears exactly when an amendment actually happened and the
  // table needs no rule of its own.
  assert.match(historyTableCode, /row\.audit\.map\(\(step\) =>/);
  assert.ok(
    !/changed_at|changed_by|updated_at/.test(historyTableCode),
    "the table reads no audit column directly"
  );
});

test("NO M5 — NO BULK UPLOAD, NO PAYROLL RUN, NO PAYSLIP", () => {
  // M4 builds two screens on M2's lifecycle. Nothing here anticipates monthly
  // payroll, and this fix adds nothing that does.
  for (const [file, code] of [
    ["helper/payrollSalary.js", helperCode],
    ["pages/payroll/salary-revision.jsx", revisionPageCode],
    ["pages/payroll/salary-approval.jsx", approvalPageCode],
    ["components/payroll/SalaryRevisionForm.jsx", revisionFormCode],
    ["components/payroll/PendingProposalCard.jsx", proposalCardCode],
    ["components/payroll/SalaryHistoryTable.jsx", historyTableCode],
  ]) {
    for (const notYet of ["bulk", "Payslip", "payslip", "payroll_run", "processPayroll"]) {
      assert.ok(!new RegExp(notYet, "i").test(code), `${file} must not reach into M5 (${notYet})`);
    }
  }
});
