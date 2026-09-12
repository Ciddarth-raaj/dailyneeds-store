/**
 * M4 — the Payroll screens' decisions, as rules.
 *
 *   node --test util/payrollSalaryRules.test.js
 *
 * There is no React test runner in this repo, so the rules are pulled out of
 * the components into pure modules and asserted here; the SCREENS are checked
 * as source in `components/payroll/payrollScreens.test.js`, the way
 * `components/hr/payrollSection.test.js` checks M3's card.
 *
 * That split is deliberate rather than a workaround. The things that would be
 * wrong silently here are not rendering bugs:
 *
 *   a form letting a revision through with no reason
 *   an override whose components do not add up reaching the server
 *   a pending revision showing as somebody's CURRENT salary
 *   a future increment showing as current because a laptop's clock said so
 *   a screen doing its own arithmetic on pay and disagreeing with the record
 *   a refusal rendering as "saved"
 */
const test = require("node:test");
const assert = require("node:assert");

const access = require("./payrollAccess");
const form = require("./salaryRevisionForm");
const history = require("./salaryHistoryView");
const queue = require("./salaryApprovalQueue");
const apiError = require("./salaryApiError");
const previewView = require("./salaryPreviewView");

const keys = (...list) => ({ permissions: list.map((k) => ({ permission_key: k })) });
const ADMIN = { permissions: [], isAdmin: true };

/* ======================================================= A. permissions == */

test("SALARY REVISION & HISTORY NEEDS view_employees AND view_salary", () => {
  // The pair the history, current and preview endpoints all demand with
  // `requireAll`. Anything weaker here only produces a screen that renders and
  // then 403s.
  assert.strictEqual(access.canOpenRevisionScreen(keys("view_employees", "view_salary")), true);
  assert.strictEqual(access.canOpenRevisionScreen(keys("view_salary")), false);
  assert.strictEqual(access.canOpenRevisionScreen(keys("view_employees")), false);
  assert.strictEqual(access.canOpenRevisionScreen({}), false);
  assert.strictEqual(access.canOpenRevisionScreen(ADMIN), true, "the user_type 2 bypass holds");
});

test("VIEWING IS NOT PROPOSING, AND PROPOSING IS NOT AMENDING", () => {
  const viewer = keys("view_employees", "view_salary");
  assert.strictEqual(access.canOpenRevisionScreen(viewer), true, "a viewer gets the screen");
  assert.strictEqual(access.canAddSalary(viewer), false, "but no form");
  assert.strictEqual(access.canEditPendingSalary(viewer), false, "and cannot amend");

  const adder = keys("view_employees", "view_salary", "add_salary");
  assert.strictEqual(access.canAddSalary(adder), true);
  assert.strictEqual(access.canEditPendingSalary(adder), false, "add_salary is not edit_salary");

  const editor = keys("view_employees", "view_salary", "edit_salary");
  assert.strictEqual(access.canEditPendingSalary(editor), true);
  assert.strictEqual(access.canAddSalary(editor), false);
});

test("THE MANUAL OVERRIDE IS ITS OWN KEY, held by far fewer people", () => {
  // Entering a salary is an everyday HR act; moving Basic moves the PF wage,
  // which is a statutory change.
  const adder = keys("view_employees", "view_salary", "add_salary");
  assert.strictEqual(access.canOverrideComponents(adder), false);
  assert.strictEqual(
    access.canOverrideComponents(keys("manual_salary_component_override")),
    true
  );
  assert.strictEqual(access.canOverrideComponents(ADMIN), true);
});

test("SALARY APPROVAL NEEDS ALL THREE KEYS", () => {
  // Matching `GET /hr/salary/pending`: listing every outstanding pay proposal
  // in the company is a different disclosure from one employee's structure.
  assert.strictEqual(
    access.canOpenApprovalScreen(keys("view_employees", "view_salary", "approve_salary_revision")),
    true
  );
  assert.strictEqual(access.canOpenApprovalScreen(keys("view_employees", "view_salary")), false);
  assert.strictEqual(access.canOpenApprovalScreen(keys("approve_salary_revision")), false);
  assert.strictEqual(
    access.canOpenApprovalScreen(keys("view_employees", "approve_salary_revision")),
    false,
    "an approver who may not see salary is not an approver"
  );
  assert.strictEqual(access.canOpenApprovalScreen(ADMIN), true);
});

test("OWN APPROVAL IS REFUSED IN THE UI, AND REJECTION IS NOT", () => {
  const approver = keys("view_employees", "view_salary", "approve_salary_revision");

  assert.strictEqual(access.canApproveProposal(approver, { own_proposal: false }), true);
  assert.strictEqual(access.canApproveProposal(approver, { own_proposal: true }), false);

  // Withdrawing your own proposal by rejecting it is normal and allowed. Only
  // AGREEING to your own pay change is blocked.
  assert.strictEqual(access.canRejectProposal(approver), true);

  // Without the key, neither.
  const viewer = keys("view_employees", "view_salary");
  assert.strictEqual(access.canApproveProposal(viewer, { own_proposal: false }), false);
  assert.strictEqual(access.canRejectProposal(viewer), false);
});

test("THE FLAG COMES FROM THE SERVER AND IS NOT RECOMPUTED", () => {
  // `own_proposal` is set by the usecase, which compares employee identity
  // against employee identity and already honours the administrator
  // exception. A rule computed twice is a rule that can disagree with itself.
  const fn = String(access.canApproveProposal);
  assert.match(fn, /own_proposal/);
  assert.ok(!/employeeId|employee_id|created_by/.test(fn), "no second identity comparison here");
});

test("permissions are per designation - there is no per-user anything", () => {
  const source = require("fs").readFileSync(require.resolve("./payrollAccess"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  for (const forbidden of ["userId", "user_id", "employeeId", "allowlist", "exempt"]) {
    assert.ok(!new RegExp(forbidden).test(code), `${forbidden} has no place in a designation rule`);
  }
});

/* =================================================== B. the entry form == */

test("A REVISION NEEDS AN EFFECTIVE DATE AND A REASON", () => {
  const base = { is_opening: false, monthly_gross: "25000" };

  const missing = form.validateRevisionForm(base, {});
  assert.ok(missing.errors.effective_from, "the date is the user's and is required");
  assert.ok(missing.errors.revision_reason, "and so is why the pay is changing");
  assert.strictEqual(missing.valid, false);

  const blankReason = form.validateRevisionForm(
    { ...base, effective_from: "2026-10-01", revision_reason: "   " },
    {}
  );
  assert.ok(blankReason.errors.revision_reason, "a space bar is not an answer");

  const complete = form.validateRevisionForm(
    { ...base, effective_from: "2026-10-01", revision_reason: "Annual review increment" },
    {}
  );
  assert.strictEqual(complete.valid, true);
  assert.deepStrictEqual(complete.errors, {});
});

test("AN OPENING SALARY NEEDS NEITHER — it changes nothing and its date is the server's", () => {
  const opening = form.validateRevisionForm(
    { is_opening: true, monthly_gross: "20000" },
    {}
  );
  assert.strictEqual(opening.valid, true);
  assert.ok(!opening.errors.effective_from, "the opening date is a fact, not a preference");
  assert.ok(!opening.errors.revision_reason);
});

test("THE OPENING EFFECTIVE DATE IS NEVER SENT, even when the screen has displayed it", () => {
  // The server dates the first record at the later of the opening floor and
  // the date of joining and ignores anything sent. Sending one anyway would
  // be a screen asserting a rule it does not own.
  const body = form.toRequestBody({
    is_opening: true,
    monthly_gross: "20000",
    effective_from: "2020-01-01",
  });
  assert.ok(!("effective_from" in body), "no effective date on an opening proposal");
  assert.strictEqual(body.monthly_gross, 20000);
});

test("the gross must be a real, positive number", () => {
  assert.ok(form.validateRevisionForm({ is_opening: true }, {}).errors.monthly_gross);
  assert.ok(form.validateRevisionForm({ is_opening: true, monthly_gross: "abc" }, {}).errors.monthly_gross);
  assert.ok(form.validateRevisionForm({ is_opening: true, monthly_gross: "0" }, {}).errors.monthly_gross);
  assert.ok(form.validateRevisionForm({ is_opening: true, monthly_gross: "-5" }, {}).errors.monthly_gross);
});

test("A MANUAL OVERRIDE MUST ADD UP TO THE GROSS, TO THE PAISA", () => {
  const withOverride = (components) =>
    form.validateRevisionForm(
      {
        is_opening: true,
        monthly_gross: "25000",
        manual_override: true,
        components,
        override_reason: "Basic held at last year's figure",
      },
      { can_override: true, limits: {} }
    );

  const short = withOverride({ basic: "12000", conveyance: "1600", hra: "5000", special_allowance: "6000" });
  assert.ok(short.errors.components, "24,600 against a gross of 25,000 is refused");

  const exact = withOverride({ basic: "12000", conveyance: "1600", hra: "5000", special_allowance: "6400" });
  assert.strictEqual(exact.valid, true);

  // Compared in PAISE, so a sum that is off by one paisa is caught rather than
  // rounded away - the same reason the engine works in paise.
  const offByAPaisa = withOverride({
    basic: "12000.01",
    conveyance: "1600",
    hra: "5000",
    special_allowance: "6400",
  });
  assert.ok(offByAPaisa.errors.components);
});

test("THE CAPS ARE THE SERVER'S, READ OFF THE PREVIEW - never typed in here", () => {
  // A cap compiled into a bundle is a second copy of a statutory rule, and the
  // day it moves there are two answers and no way to tell which one was used.
  const limits = form.limitsFromPreview({
    statutory_snapshot: { conveyance_cap: 2500, hra_cap: 10000 },
    components: { basic: 12500 },
  });
  assert.deepStrictEqual(limits, { conveyance_cap: 2500, hra_cap: 10000, automatic_basic: 12500 });

  const over = form.validateRevisionForm(
    {
      is_opening: true,
      monthly_gross: "40000",
      manual_override: true,
      components: { basic: "24000", conveyance: "3000", hra: "11000", special_allowance: "2000" },
      override_reason: "why",
    },
    { can_override: true, limits }
  );
  assert.match(over.errors.conveyance, /2500/);
  assert.match(over.errors.hra, /10000/);

  // With no preview yet there is nothing to check against, and the screen says
  // nothing rather than inventing a limit. The server still refuses it.
  const noLimits = form.limitsFromPreview(null);
  assert.deepStrictEqual(noLimits, { conveyance_cap: null, hra_cap: null, automatic_basic: null });
});

test("AN OVERRIDE NEEDS ITS OWN REASON, AND IT IS NOT THE REVISION REASON", () => {
  const result = form.validateRevisionForm(
    {
      is_opening: false,
      monthly_gross: "25000",
      effective_from: "2026-10-01",
      revision_reason: "Annual review increment",
      manual_override: true,
      components: { basic: "12000", conveyance: "1600", hra: "5000", special_allowance: "6400" },
    },
    { can_override: true, limits: {} }
  );
  assert.ok(result.errors.override_reason, "the revision reason does not satisfy it");
  assert.ok(!result.errors.revision_reason, "and the revision reason is quite happy");
});

test("THE OVERRIDE IS REFUSED OUTRIGHT WITHOUT THE PERMISSION", () => {
  const result = form.validateRevisionForm(
    {
      is_opening: true,
      monthly_gross: "25000",
      manual_override: true,
      components: { basic: "12000", conveyance: "1600", hra: "5000", special_allowance: "6400" },
      override_reason: "why",
    },
    { can_override: false, limits: {} }
  );
  assert.strictEqual(result.valid, false);
  assert.match(result.errors.manual_override, /permission/);
});

test("THE REQUEST BODY CARRIES NO CALCULATED FIGURE — the route would 422 it", () => {
  // Joi runs without `allowUnknown`, so a body that so much as names
  // `employee_pf` or `monthly_ctc` is refused before the usecase is reached.
  const body = form.toRequestBody({
    is_opening: false,
    monthly_gross: "25000",
    effective_from: "2026-10-01",
    revision_reason: "Annual review increment",
    manual_override: true,
    components: { basic: "12000", conveyance: "1600", hra: "5000", special_allowance: "6400" },
    override_reason: "Basic held",
    // Things a careless spread of form state would carry along:
    employee_pf: 1440,
    monthly_ctc: 99999,
    status: "APPROVED",
    source: "OPENING_SALARY",
    salary_id: 7,
  });

  assert.deepStrictEqual(Object.keys(body).sort(), [
    "effective_from",
    "manual_components",
    "manual_override",
    "monthly_gross",
    "override_reason",
    "revision_reason",
  ]);
  for (const forbidden of ["employee_pf", "monthly_ctc", "status", "source", "salary_id", "basic"]) {
    assert.ok(!(forbidden in body), `${forbidden} must never be sent`);
  }
});

test("a body with no override carries no component amounts at all", () => {
  const body = form.toRequestBody({
    is_opening: false,
    monthly_gross: "25000",
    effective_from: "2026-10-01",
    revision_reason: "Promotion",
    components: { basic: "999", conveyance: "1", hra: "1", special_allowance: "1" },
  });
  assert.ok(!("manual_components" in body));
  assert.ok(!("manual_override" in body));
});

test("OPENING VS REVISION IS READ FROM THE HISTORY, AND A REJECTED ROW DOES NOT COUNT", () => {
  // Exactly how the server decides it. Reading `/current` instead would get
  // this wrong twice over: a PENDING first proposal is not current, and
  // neither is an approved one dated in the future.
  assert.strictEqual(form.isOpeningSalary([]), true);
  assert.strictEqual(form.isOpeningSalary([{ status: "REJECTED" }]), true, "a refused proposal leaves no salary");
  assert.strictEqual(form.isOpeningSalary([{ status: "PENDING" }]), false);
  assert.strictEqual(form.isOpeningSalary([{ status: "APPROVED" }]), false);
  assert.strictEqual(
    form.isOpeningSalary([{ status: "REJECTED" }, { status: "APPROVED" }]),
    false
  );
});

/* ================================================ C. the history table == */

const CURRENT = { salary_id: 2, effective_from: "2026-04-01" };

test("THE FIVE STATUSES", () => {
  const row = (over) => ({ salary_id: 9, status: "APPROVED", effective_from: "2026-04-01", ...over });

  assert.strictEqual(history.statusOf(row({ salary_id: 2 }), CURRENT), history.STATUS.CURRENT);
  assert.strictEqual(
    history.statusOf(row({ salary_id: 3, effective_from: "2026-12-01" }), CURRENT),
    history.STATUS.FUTURE
  );
  assert.strictEqual(
    history.statusOf(row({ salary_id: 1, effective_from: "2025-04-01" }), CURRENT),
    history.STATUS.PAST_APPROVED
  );
  assert.strictEqual(history.statusOf(row({ status: "PENDING" }), CURRENT), history.STATUS.PENDING);
  assert.strictEqual(history.statusOf(row({ status: "REJECTED" }), CURRENT), history.STATUS.REJECTED);
});

test("A PENDING OR REJECTED ROW IS NEVER CURRENT, whatever its date", () => {
  // The single most damaging thing this table could get wrong: a proposal
  // nobody has agreed to, shown as what somebody is being paid.
  const sameId = { salary_id: 2, effective_from: "2026-04-01" };
  assert.strictEqual(
    history.statusOf({ ...sameId, status: "PENDING" }, CURRENT),
    history.STATUS.PENDING
  );
  assert.strictEqual(
    history.statusOf({ ...sameId, status: "REJECTED" }, CURRENT),
    history.STATUS.REJECTED
  );
});

test("WITH NOTHING CURRENT, EVERY APPROVED ROW IS FUTURE", () => {
  // The resolver answering null means no approved salary applies today - which
  // is exactly what an approved row dated ahead of today is.
  assert.strictEqual(
    history.statusOf({ salary_id: 5, status: "APPROVED", effective_from: "2026-12-01" }, null),
    history.STATUS.FUTURE
  );
});

test("NO BROWSER CLOCK DECIDES A SALARY STATUS", () => {
  // "Today" in a browser is a device clock and a timezone. Comparing an
  // effective date to it is how a revision reads as Current in Chennai and
  // Future on a laptop set to UTC.
  const source = require("fs").readFileSync(require.resolve("./salaryHistoryView"), "utf8");
  const statusFn = source.slice(source.indexOf("function statusOf"), source.indexOf("function badgeFor"));
  assert.ok(!/new Date\(/.test(statusFn), "the status rule never reads a clock");
  assert.ok(!/Date\.now/.test(statusFn));
});

test("the badges are labelled the way the approved scope names them", () => {
  const labels = Object.values(history.STATUS_BADGE).map((b) => b.label).sort();
  assert.deepStrictEqual(labels, ["Current", "Future", "Past approved", "Pending", "Rejected"]);
});

test("THE FULL AUDIT TRAIL IS BUILT FROM THE RECORD", () => {
  const rejected = history.auditTrail({
    status: "REJECTED",
    created_by: 7,
    created_by_name: "Asha",
    created_at: "2026-09-10T09:00:00.000Z",
    rejected_by: 9,
    rejected_by_name: "Ravi",
    rejected_at: "2026-09-11T10:30:00.000Z",
    rejection_reason: "Budget not approved this quarter",
  });
  assert.deepStrictEqual(rejected.map((s) => s.key), ["created", "rejected"]);
  assert.strictEqual(rejected[0].who, "Asha");
  assert.strictEqual(rejected[1].who, "Ravi");
  assert.strictEqual(rejected[1].note, "Budget not approved this quarter");
  assert.ok(rejected[0].at, "and when");

  const approved = history.auditTrail({
    status: "APPROVED",
    created_by: 7,
    approved_by: 9,
    approved_at: "2026-09-11T10:30:00.000Z",
  });
  assert.deepStrictEqual(approved.map((s) => s.key), ["created", "approved"]);
  assert.ok(!approved.some((s) => s.key === "rejected"), "an approved record has no rejection line");
});

test("AN UNRESOLVED ACTOR NAME FALLS BACK TO THE ID, NOT TO A BLANK", () => {
  // "Employee 41" is still an answer; an empty cell is not.
  const trail = history.auditTrail({ status: "PENDING", created_by: 41, created_by_name: null });
  assert.strictEqual(trail[0].who, "Employee 41");

  const nobody = history.auditTrail({ status: "PENDING", created_by: null });
  assert.strictEqual(nobody[0].who, "not recorded");
});

test("the three reason fields stay three fields on a presented row", () => {
  const row = history.presentHistoryRow(
    {
      salary_id: 3,
      status: "REJECTED",
      effective_from: "2026-10-01",
      source: "REVISION",
      monthly_gross: 25000,
      revision_reason: "Annual review increment",
      manual_override: 1,
      override_reason: "Basic held at last year's figure",
      rejection_reason: "Budget not approved",
      unresolved_notes: [],
    },
    CURRENT
  );
  assert.strictEqual(row.revision_reason, "Annual review increment");
  assert.strictEqual(row.override_reason, "Basic held at last year's figure");
  assert.strictEqual(row.rejection_reason, "Budget not approved");
  assert.strictEqual(row.manual_override, true);
  assert.strictEqual(row.source_label, "Revision");
  assert.strictEqual(row.badge.label, "Rejected");
  assert.ok(row.figures, "and the full breakup travels with it");
});

test("at most one pending record, because that is what the schema allows", () => {
  assert.strictEqual(history.pendingRecord([{ status: "APPROVED" }]), null);
  assert.strictEqual(
    history.pendingRecord([{ status: "APPROVED" }, { salary_id: 4, status: "PENDING" }]).salary_id,
    4
  );
});

/* ================================================ D. the approval queue = */

const PROPOSAL = {
  salary_id: 12,
  employee_id: 42,
  employee_name: "Test Person",
  outlet_name: "DN Main",
  designation_name: "Cashier",
  monthly_gross: "25000.00",
  effective_from: "2026-10-01",
  source: "REVISION",
  revision_reason: "Annual review increment",
  created_by: 7,
  created_by_name: "Asha",
  created_at: "2026-09-10T09:00:00.000Z",
  status: "PENDING",
  unresolved_notes: [],
  current_salary: { salary_id: 3, monthly_gross: "20000.00", effective_from: "2026-04-01" },
  difference: { amount: 5000, percentage: 25 },
  own_proposal: false,
};

test("A QUEUE ROW SHOWS FROM WHAT, TO WHAT, BY HOW MUCH, FROM WHEN, AND WHY", () => {
  const row = queue.presentQueueRow(PROPOSAL);
  assert.strictEqual(row.employee_id, 42);
  assert.strictEqual(row.employee_name, "Test Person");
  assert.strictEqual(row.outlet_name, "DN Main");
  assert.strictEqual(row.designation_name, "Cashier");
  assert.match(row.current_monthly_gross, /20,000\.00/);
  assert.match(row.proposed_monthly_gross, /25,000\.00/);
  assert.match(row.difference.amount, /^\+/);
  assert.match(row.difference.amount, /5,000\.00/);
  assert.strictEqual(row.difference.percentage, "+25%");
  assert.strictEqual(row.effective_from, "01 Oct 2026");
  assert.strictEqual(row.revision_reason, "Annual review increment");
  assert.strictEqual(row.created_by_name, "Asha");
  assert.strictEqual(row.source_label, "Revision");
});

test("AN OPENING SALARY HAS NO DIFFERENCE, AND SAYS SO RATHER THAN SHOWING ZERO", () => {
  const row = queue.presentQueueRow({
    ...PROPOSAL,
    source: "OPENING_SALARY",
    revision_reason: null,
    current_salary: null,
    difference: null,
  });
  assert.strictEqual(row.current_monthly_gross, null);
  assert.strictEqual(row.difference, null);
  assert.strictEqual(row.is_opening, true);
  assert.strictEqual(row.source_label, "Opening Salary");
});

test("a cut is shown as a cut", () => {
  const row = queue.presentQueueRow({
    ...PROPOSAL,
    difference: { amount: -2000, percentage: -10 },
  });
  assert.match(row.difference.amount, /^−/);
  assert.strictEqual(row.difference.percentage, "−10%");
  assert.strictEqual(row.difference.tone, "red.600");
});

test("no change is 'No change', not a blank and not ₹0.00 with a plus sign", () => {
  const row = queue.presentQueueRow({ ...PROPOSAL, difference: { amount: 0, percentage: 0 } });
  assert.strictEqual(row.difference.amount, "No change");
  assert.strictEqual(row.difference.percentage, null);
});

test("THE SCREEN NEVER SUBTRACTS TWO SALARIES ITSELF", () => {
  // The difference is the server's figure. A screen doing its own arithmetic
  // on pay is a screen that can disagree with the record it is approving.
  const source = require("fs").readFileSync(require.resolve("./salaryApprovalQueue"), "utf8");
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/monthly_gross\s*[-+]\s/.test(code), "no subtraction of grosses");
  assert.ok(!/current[\w.]*\s*\/\s*\w/.test(code), "and no percentage worked out here");
  assert.match(code, /item\.difference/, "it reads the server's answer");
});

test("the detail panel is the full proposed structure and the current comparison", () => {
  const detail = queue.presentQueueDetail(PROPOSAL);
  assert.ok(detail.proposed.structure, "the four components");
  assert.ok(detail.proposed.employeeDeductions);
  assert.ok(detail.proposed.employerContributions);
  assert.ok(detail.proposed.ctc);
  assert.match(detail.current.monthly_gross, /20,000\.00/);
  assert.strictEqual(detail.current.effective_from, "01 Apr 2026");
});

test("an unresolved statutory figure is Pending WITH ITS REASON, never 0", () => {
  const detail = queue.presentQueueDetail({
    ...PROPOSAL,
    esi_status: "PENDING",
    employee_esi: null,
    unresolved_notes: [{ code: "ESI_WAGE_CONTEXT_UNAVAILABLE", component: "esi" }],
  });
  const esi = detail.proposed.employeeDeductions.find((r) => r.label === "Employee ESI");
  assert.strictEqual(esi.cell.kind, "pending");
  assert.strictEqual(esi.cell.text, "Pending");
  assert.match(esi.cell.reason, /monthly payroll has not produced one yet/);
});

test("the outlet filter is built from the queue rather than from the outlet master", () => {
  const outlets = queue.outletsInQueue([
    { store_id: 9, outlet_name: "Zeta" },
    { store_id: 3, outlet_name: "Alpha" },
    { store_id: 3, outlet_name: "Alpha" },
    { store_id: null },
  ]);
  assert.deepStrictEqual(outlets.map((o) => o.outlet_name), ["Alpha", "Zeta"]);
});

/* ================================================== E. what an answer is = */

test("A REFUSAL IS NOT A FAILURE AND NEITHER IS A SUCCESS", () => {
  assert.strictEqual(apiError.describeApiResult({ salary_id: 4, status: "PENDING" }).kind, "ok");
  assert.strictEqual(
    apiError.describeApiResult({ code: 403, msg: apiError.PERMISSION_DENIED_MSG }).kind,
    "denied"
  );
  assert.strictEqual(apiError.describeApiResult({ code: 422, msg: "x" }).kind, "refused");
  assert.strictEqual(apiError.describeApiResult({ code: 500, msg: "x" }).kind, "error");
  assert.strictEqual(apiError.describeApiResult(null).kind, "error");
});

test("THE SERVER'S BUSINESS-RULE MESSAGE IS SHOWN, minus the exception prefix", () => {
  // `respondError` sends `err.toString()`. The class name is noise; everything
  // after it was written to be read by the person who hit the rule, and
  // paraphrasing it here would be a second copy of a server-side rule.
  const conflict = apiError.describeApiResult({
    code: 422,
    msg: "ValidationError: A pending salary revision already exists for 2026-10-01",
  });
  assert.strictEqual(conflict.kind, "refused");
  assert.strictEqual(conflict.message, "A pending salary revision already exists for 2026-10-01");

  const future = apiError.describeApiResult({
    code: 422,
    msg:
      "ValidationError: This employee already has a future-dated salary revision (pending revision " +
      "effective 2026-12-01); decide that one before proposing another future revision",
  });
  assert.match(future.message, /^This employee already has a future-dated salary revision/);
  assert.match(future.message, /decide that one before proposing another/);

  const locked = apiError.describeApiResult({
    code: 422,
    msg: "ValidationError: The salary period 2026-04 is locked and cannot accept changes",
  });
  assert.match(locked.message, /^The salary period 2026-04 is locked/);

  const selfApproval = apiError.describeApiResult({
    code: 422,
    msg:
      "ValidationError: You cannot approve a salary revision you created yourself; it needs a " +
      "different approver",
  });
  assert.match(selfApproval.message, /^You cannot approve a salary revision you created yourself/);
});

test("a message with no prefix survives untouched, and a missing one still says something", () => {
  assert.strictEqual(apiError.stripErrorPrefix("Plain sentence"), "Plain sentence");
  assert.strictEqual(apiError.stripErrorPrefix(""), null);
  assert.strictEqual(apiError.describeApiResult({ code: 500 }).message, apiError.GENERIC_ERROR);
});

/* ================================================== F. the preview shape = */

test("THE PREVIEW IS RENAMED, NEVER RECALCULATED", () => {
  const flat = previewView.flattenPreview({
    monthly_gross: 25000,
    daily_salary: 961.54,
    components: { basic: 12500, conveyance: 1600, hra: 5000, special_allowance: 5900 },
    pf: {
      status: "APPLIED",
      pf_wage: 12500,
      employee_pf: 1500,
      employer_pf_total: 1500,
      employer_epf: 458,
      employer_eps: 1042,
      edli: 63,
      pf_admin_charge: 63,
    },
    esi: { status: "PENDING", esi_wage: null, employee_esi: null, employer_esi: null },
    monthly_ctc: null,
    ctc_status: "PENDING",
    unresolved: [{ code: "ESI_WAGE_CONTEXT_UNAVAILABLE", component: "esi" }],
    effective_from: "2026-10-01",
  });

  // Every value is the value the engine put in the field it came from.
  assert.strictEqual(flat.basic, 12500);
  assert.strictEqual(flat.employee_pf, 1500);
  assert.strictEqual(flat.esi_status, "PENDING");
  assert.strictEqual(flat.employee_esi, null, "a null stays null; it is not defaulted to 0");
  assert.strictEqual(flat.monthly_ctc, null);
  assert.strictEqual(flat.ctc_status, "PENDING");
  assert.deepStrictEqual(flat.unresolved_notes, [
    { code: "ESI_WAGE_CONTEXT_UNAVAILABLE", component: "esi" },
  ]);

  // A preview has no lifecycle: nothing renders a status badge on something
  // nobody has proposed yet.
  assert.strictEqual(flat.status, null);
});

test("a preview goes through the SAME presenter as a stored record", () => {
  const view = previewView.presentPreview({
    monthly_gross: 25000,
    daily_salary: 961.54,
    components: { basic: 12500, conveyance: 1600, hra: 5000, special_allowance: 5900 },
    pf: { status: "PENDING" },
    esi: { status: "PENDING" },
    ctc_status: "PENDING",
    unresolved: [{ code: "PF_APPLICABILITY_NOT_RECORDED", component: "pf" }],
    effective_from: "2026-10-01",
  });
  assert.deepStrictEqual(view.structure.map((r) => r.label), [
    "Basic",
    "Conveyance",
    "HRA",
    "Special Allowance",
  ]);
  const pf = view.employeeDeductions.find((r) => r.label === "Employee PF");
  assert.strictEqual(pf.cell.text, "Pending");
  assert.match(pf.cell.reason, /PF applicable has not been recorded/);
});

test("A LOCKED PERIOD IS READ FROM THE CONTRACT, not assumed away", () => {
  assert.strictEqual(previewView.periodLockOf({ period_lock: { locked: false } }), null);
  const locked = previewView.periodLockOf({
    period_lock: { locked: true, period: "2026-04", message: "The salary period 2026-04 is locked" },
  });
  assert.strictEqual(locked.period, "2026-04");
  assert.match(locked.message, /locked/);
});
