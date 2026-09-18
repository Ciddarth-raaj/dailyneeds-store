/**
 * Payrun Calculation & Review - the screen is wired to the real contract.
 *
 *   node --test components/payroll/payrunCalculationScreens.test.js
 *
 * There is no React test runner in this repo, so the screen is checked as
 * SOURCE, the way `payrunScreens.test.js` and `payrunAdjustmentScreens.test.js`
 * check the two stages before it. That is weaker than rendering it, and it
 * catches the failures that actually happen here:
 *
 *   a screen calling an endpoint the backend does not declare
 *   a browser computing a payroll figure - a rate, a PF, a net pay
 *   a browser deciding a status, a blocker or who is ready
 *   an "approve all" that sends the ids a stale screen believes are ready
 *   an approval offered without the approval permission
 *   a stage that renders a table with no mobile layout
 *   an affordance for a payslip stage that does not exist
 *
 * The RULES behind this screen are pure modules and are proved properly in
 * `util/payrunCalculationRules.test.js`.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Comments may NAME something to explain why it is absent; code may not. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const helper = read("helper/payrunCalculation.js");
const helperCode = codeOf(helper);
const rules = read("util/payrunCalculation.js");
const rulesCode = codeOf(rules);
const access = read("util/payrunAccess.js");
const workflow = read("components/payroll/calculation/PayrunCalculation.jsx");
const workflowCode = codeOf(workflow);
const list = read("components/payroll/calculation/CalculationEmployeeList.jsx");
const listCode = codeOf(list);
const breakup = read("components/payroll/calculation/CalculationBreakup.jsx");
const breakupCode = codeOf(breakup);
const hook = codeOf(read("customHooks/usePayrunCalculationMonth.js"));
const page = read("pages/payroll/payrun.jsx");
const pageCode = codeOf(page);

const SCREEN_CODE = [workflowCode, listCode, breakupCode, rulesCode, hook].join("\n");

/* ======================================== the endpoints the backend declares */

test("every call the browser makes is an endpoint the backend declares", () => {
  const backendRoutes = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "routes", "payrun_calculation.js"),
    "utf8"
  );
  const declared = [...backendRoutes.matchAll(/"(\/payrun\/calculation[^"]*)"/g)].map((m) => m[1]);
  const called = [...helperCode.matchAll(/"(\/payrun\/calculation[^"]*)"/g)].map((m) => m[1]);

  assert.ok(called.length >= 6, `expected the whole surface, found ${called.length}`);
  for (const url of called) {
    assert.ok(declared.includes(url), `the backend does not declare ${url}`);
  }
});

test("nothing else in the browser talks to /payrun/calculation", () => {
  for (const [name, source] of [
    ["the workflow", workflowCode],
    ["the list", listCode],
    ["the breakup", breakupCode],
    ["the rules", rulesCode],
  ]) {
    assert.ok(!/API\.(get|post|request)/.test(source), `${name} calls the API directly`);
  }
});

/* ============================================== the browser decides nothing */

/**
 * NOT ONE PAYROLL FIGURE IS COMPUTED IN A BROWSER. This is the single most
 * important assertion in the file: a second implementation of a rate, a
 * contribution or a net pay on a screen whose purpose is to show what somebody
 * is about to be paid is a second answer, and it is the one people believe.
 */
test("no payroll arithmetic exists anywhere in the screen", () => {
  for (const forbidden of [
    /\/\s*26\b/,          // the daily rate
    /\/\s*60\b/,          // OT hours from minutes
    /12\s*\/\s*100|0\.12/, // the PF rate
    /0\.0075/,            // the ESI employee rate
    /3\.25|0\.0325/,      // and the employer's
  ]) {
    assert.ok(!forbidden.test(SCREEN_CODE), `the screen computes something: ${forbidden}`);
  }
  for (const word of ["pf_wage =", "net_pay =", "ot_hourly_rate =", "esi_wage ="]) {
    assert.ok(!SCREEN_CODE.includes(word), `the screen assigns ${word}`);
  }
});

/**
 * THE STATUS IS THE SERVER'S VERDICT. The browser mirrors the five values so it
 * can compare them; it must never DERIVE one from the figures on a row, which
 * would be a second copy of the state machine - and the copy would be the one
 * that lets somebody approve a stale month.
 */
test("the browser never derives a status, a blocker or a readiness", () => {
  assert.ok(
    /row\.status/.test(rulesCode),
    "the rules read the server's status"
  );
  for (const forbidden of [
    "derivedStatus",
    "computeStatus",
    "isReady(",
    "blockers.push",
    "recalculation_reasons.push",
  ]) {
    assert.ok(!SCREEN_CODE.includes(forbidden), `the screen derives ${forbidden}`);
  }
});

/** The labels on the badges are the server's words, not a lookup in a browser. */
test("status labels and reasons are rendered from the server's strings", () => {
  assert.ok(listCode.includes("row.status_label"));
  assert.ok(listCode.includes("reason.label"));
  assert.ok(breakupCode.includes("reason.message"));
  assert.ok(
    !/STATUS_LABEL\s*=/.test(SCREEN_CODE),
    "the browser must not keep its own label table"
  );
});

/* =================================================== the bulk actions */

/**
 * "CALCULATE ALL ELIGIBLE" AND "APPROVE ALL READY" SEND NO ID LIST. Who
 * qualifies is re-decided by the server at the moment of the request; sending
 * the ids this screen believes qualify would act on a month that may be minutes
 * old - an OT approval could have landed, or a colleague could have approved
 * somebody already.
 */
test("the select-all actions send a flag, never a list of ids", () => {
  assert.ok(helperCode.includes("all_eligible: true"));
  assert.ok(helperCode.includes("all_ready: true"));
  assert.ok(workflowCode.includes("{ all: true }"));
  assert.match(
    helperCode,
    /all_eligible\s*\?\s*\{\s*all_eligible:\s*true\s*\}\s*:\s*\{\s*employee_ids\s*\}/,
    "a bulk call must send one or the other, never both"
  );
});

/** A selection is narrowed per action rather than posted whole to each. */
test("a mixed selection is narrowed before it is sent", () => {
  assert.ok(workflowCode.includes("eligibleWithin(rows, selectedIds, isRecalculable)"));
  assert.ok(workflowCode.includes("eligibleWithin(rows, selectedIds, isApprovable)"));
});

/**
 * THE FOUR ACTIONS THE STAGE IS SPECIFIED TO HAVE, all present and all
 * labelled with what they would touch.
 */
test("the four actions are on the screen", () => {
  for (const label of [
    "Calculate All Eligible",
    "Recalculate Selected",
    "Approve Selected",
    "Approve All Ready",
  ]) {
    assert.ok(workflow.includes(label), `missing the ${label} action`);
  }
});

/* ======================================================== the permissions */

test("approving is its own permission and is not implied by calculating", () => {
  assert.ok(access.includes("approve_payrun"));
  assert.ok(access.includes("canApprovePayrun"));
  assert.ok(access.includes("canCalculatePayrun"));
  assert.ok(
    !/canApprovePayrun[\s\S]{0,400}process_payroll/.test(access),
    "approving must not be granted by the calculate key"
  );
});

test("every action is disabled without its key, and in a locked month", () => {
  assert.ok(workflowCode.includes("!mayCalculate || monthLocked"));
  assert.ok(workflowCode.includes("!mayApprove || monthLocked"));
  assert.ok(pageCode.includes("canApprovePayrun(actor)"));
  assert.ok(pageCode.includes("canCalculatePayrun(actor)"));
});

/**
 * THE APPROVAL DIALOG IS NOT OPTIONAL. Approving is the one act in this
 * feature that cannot be taken back, so it is always behind a confirmation
 * that says what it locks.
 */
test("approving always confirms first", () => {
  assert.ok(workflowCode.includes("approveMessage("));
  assert.ok(workflowCode.includes("window.confirm"));
});

/* ================================================== the stale-figure rule */

/**
 * OPENING OR REFRESHING THE SCREEN CALCULATES NOBODY. A screen that quietly
 * refreshed a stale employee would be the silent mutation the whole payrun
 * design exists to prevent, and it would do it at the moment somebody was
 * about to approve them.
 */
test("nothing on the screen calculates or recalculates on load", () => {
  assert.ok(
    !/useEffect\([^)]*\)\s*=>\s*\{[^}]*(calculate|recalculate)\(/.test(workflowCode),
    "an effect triggers a calculation"
  );
  assert.ok(!hook.includes("calculate("), "the hook must only read");
  assert.ok(hook.includes("getMonth"), "the hook reads the month");
});

/** The stale warning is shown ABOVE the figures it applies to. */
test("a stale calculation is warned about where the figures are read", () => {
  assert.ok(breakupCode.includes("recalculation_reasons"));
  assert.ok(breakup.includes("A source has changed since"));
  assert.ok(listCode.includes("recalculation_reasons"));
});

/* ============================================ the breakup the spec asks for */

test("the employee detail shows the whole specified breakup", () => {
  for (const label of [
    "Monthly Gross", "Daily Rate", "Salary Days", "Salary Earnings",
    "Missing Hours", "Missing Hours Deduction", "Extra Days", "Extra Day Amount",
    "Approved OT Hours", "Effective NRM", "OT Hourly Rate", "OT Amount",
    "Incentive", "Bonus", "Arrears", "Advance Recovery", "Shortage Recovery",
    "Balance Advance (Informational)",
    "PF Wage", "Employee PF", "Employer EPF", "Employer EPS",
    "ESI Wage", "Employee ESI", "Employer ESI",
    "Total Earnings", "Total Employee Deductions", "Net Pay", "Pay Type",
  ]) {
    assert.ok(breakup.includes(label), `the breakup is missing ${label}`);
  }
});

/**
 * THE BALANCE ADVANCE IS DRAWN AS INFORMATIONAL AND APART FROM THE
 * DEDUCTIONS. Printing it beside two real deductions without saying so is how
 * somebody reads it as a third one.
 */
test("the Balance Advance is labelled informational and is in no total", () => {
  assert.ok(breakup.includes("Balance Advance (Informational)"));
  assert.ok(breakup.includes("It changes no figure"));
  assert.ok(
    !/total[\s\S]{0,80}balance_advance/i.test(breakupCode),
    "the Balance Advance must not reach a total"
  );
});

/** The compact list carries exactly the columns the stage is specified with. */
test("the list shows the compact columns", () => {
  for (const column of [
    "Employee", "Salary Days", "Extra Days", "Approved OT", "Additions",
    "Deductions", "PF", "ESI", "Net Pay", "Pay Type", "Status",
  ]) {
    assert.ok(list.includes(`<Th`) && list.includes(column), `missing the ${column} column`);
  }
});

/* ==================================================== mobile and the stage */

/**
 * A TABLE WITH NO MOBILE LAYOUT IS THE FAILURE THIS ASSERTION EXISTS FOR. On a
 * phone the thirteenth column - the actions - is off the right-hand edge
 * behind a scroll nobody performs.
 */
test("the list has a responsive card layout, at the payroll breakpoint", () => {
  assert.ok(listCode.includes("useBreakpointValue"));
  assert.ok(/base:\s*true,\s*md:\s*false/.test(listCode));
  assert.ok(listCode.includes("CalculationCard"));
});

test("the stage is a step of the payrun and not a menu entry of its own", () => {
  assert.ok(pageCode.includes("CALCULATION: \"CALCULATION\""));
  assert.ok(page.includes("Calculation & Review"));
  assert.ok(pageCode.includes("<PayrunCalculation"));
  // It receives the month chosen once at the top, never its own month picker.
  assert.ok(!workflowCode.includes("MONTH_NAMES"), "the stage must not pick its own month");
  assert.ok(/year=\{year\}/.test(page) && /month=\{month\}/.test(page));
});

/**
 * NO PAYSLIP AFFORDANCE. Generating and publishing payslips is the next stage
 * and is not built; a button for it would be a promise the system cannot keep.
 */
test("there is no payslip, publish or unlock affordance anywhere", () => {
  /* Compared against the CODE: a comment may name a stage to explain why it
     is deliberately absent, which is exactly what the workflow's header does. */
  for (const forbidden of ["Generate Payslip", "Publish", "Unlock", "Unpublish"]) {
    assert.ok(
      !workflowCode.includes(forbidden) &&
        !listCode.includes(forbidden) &&
        !breakupCode.includes(forbidden),
      `the screen offers ${forbidden}, which is not built`
    );
  }
});

/** A failed read and an empty month are told apart. */
test("a failed read is not rendered as an empty month", () => {
  assert.ok(workflow.includes("it does not mean there is nothing to"));
  assert.ok(workflowCode.includes("denied"));
  assert.ok(workflowCode.includes("loaded && rows.length === 0"));
});

/** The summary is the server's and is never recounted in the browser. */
test("the five summary counts come from the server", () => {
  for (const label of [
    "Initialized",
    "Calculated",
    "Recalculation Required",
    "Ready for Approval",
    "Approved & Locked",
  ]) {
    assert.ok(workflow.includes(label), `missing the ${label} count`);
  }
  assert.ok(workflowCode.includes("summary."));
  assert.ok(!hook.includes("rows.filter("), "the hook must not recount the summary");
});
