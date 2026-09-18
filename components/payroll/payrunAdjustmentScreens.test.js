/**
 * Payrun Adjustments V1 - the screen is wired to the real contract.
 *
 *   node --test components/payroll/payrunAdjustmentScreens.test.js
 *
 * There is no React test runner in this repo, so the screen is checked as
 * SOURCE, the way `components/payroll/payrunScreens.test.js` checks the
 * initialization screen. That is weaker than rendering it, and it catches the
 * failures that actually happen here:
 *
 *   a screen calling an endpoint the backend does not declare
 *   a browser holding its own copy of the V1 component list
 *   a browser deciding an adjustment state, a net effect or a PF rule
 *   an import path that confirms somebody as having no adjustment
 *   a blank-row count rendering as "done"
 *   a confirm button offered to somebody without the key, or in a locked month
 *   a stage that renders a table with no mobile layout
 *
 * The RULES behind this screen are pure modules and are proved properly in
 * `util/payrunAdjustmentRules.test.js`.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Comments may NAME something to explain why it is absent; code may not. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const helper = read("helper/payrunAdjustments.js");
const helperCode = codeOf(helper);
const rules = read("util/payrunAdjustments.js");
const rulesCode = codeOf(rules);
const workflow = read("components/payroll/adjustments/PayrunAdjustments.jsx");
const workflowCode = codeOf(workflow);
const list = read("components/payroll/adjustments/AdjustmentEmployeeList.jsx");
const listCode = codeOf(list);
const editor = read("components/payroll/adjustments/AdjustmentEditor.jsx");
const editorCode = codeOf(editor);
const preview = read("components/payroll/adjustments/AdjustmentsPreview.jsx");
const previewCode = codeOf(preview);
const hook = codeOf(read("customHooks/usePayrunAdjustmentsMonth.js"));
const page = read("pages/payroll/payrun.jsx");
const pageCode = codeOf(page);

const SCREEN_CODE = [workflowCode, listCode, editorCode, previewCode, rulesCode, hook].join("\n");

/* ======================================== the endpoints the backend declares */

test("every call the browser makes is an endpoint the backend declares", () => {
  const backendRoutes = fs.readFileSync(
    path.join(ROOT, "..", "dailyneeds-store-backend", "routes", "payrun_adjustment.js"),
    "utf8"
  );
  const declared = [...backendRoutes.matchAll(/"(\/payrun\/adjustments[^"]*)"/g)].map((m) => m[1]);
  const called = [...helperCode.matchAll(/"(\/payrun\/adjustments[^"]*)"/g)].map((m) => m[1]);
  assert.ok(called.length >= 7, `expected the whole surface, found ${called.length}`);
  for (const url of called) {
    assert.ok(declared.includes(url), `${url} is called but the backend does not declare it`);
  }
});

test("the screen reaches the API only through the helper", () => {
  for (const [name, code] of [
    ["the workflow", workflowCode],
    ["the list", listCode],
    ["the editor", editorCode],
    ["the preview", previewCode],
  ]) {
    assert.ok(!/\bAPI\.(get|post|put|request)\b/.test(code), `${name} calls the API directly`);
  }
});

/* ================================= the browser decides nothing about payroll */

test("the browser holds NO copy of the V1 component list", () => {
  for (const key of ["INCENTIVE", "BONUS", "ARREARS", "ADVANCE_RECOVERY", "SHORTAGE_RECOVERY"]) {
    assert.ok(
      !new RegExp(`["']${key}["']`).test(SCREEN_CODE),
      `the browser names ${key} - the component list is the server's, delivered by /components`
    );
  }
  // It renders whatever the server sent, in the server's order.
  assert.match(workflowCode, /getComponents/);
  assert.match(editorCode, /components \|\| \[\]/);
});

test("the browser does not classify a component or compute a net effect", () => {
  for (const forbidden of [
    /net_pay_delta\s*=/,
    /additions\s*\+\s*/,
    /reduce\(\s*\(total[^)]*amounts/,
    /kind === ["']ADDITION["']/,
    /pf_wage/i,
    /esi_wage/i,
  ]) {
    assert.ok(
      !forbidden.test(SCREEN_CODE),
      `the browser computes something payroll owns: ${forbidden}`
    );
  }
  // It prints the server's figures.
  assert.match(listCode, /row\.net_pay_delta/);
});

test("the browser does not derive an adjustment state", () => {
  // `isConfirmable` READS the server's state; nothing recomputes one from
  // amounts, which would be a second copy of the state machine.
  assert.match(rulesCode, /row\.adjustment_state === STATE\.NO_ADJUSTMENT_PENDING_CONFIRMATION/);
  assert.ok(
    !/adjustment_state\s*=\s*[^=]/.test(SCREEN_CODE),
    "the browser assigns an adjustment state"
  );
});

test("the summary is the server's and is never recounted from the rows", () => {
  assert.ok(
    !/rows\.filter\([^)]*adjustment_state[^)]*\)\.length/.test(workflowCode),
    "the screen counts states out of the rows, which may be a filtered view of the month"
  );
  assert.match(hook, /month && month\.summary/);
});

/* ================================== a blank is never a confirmation, anywhere */

test("NO IMPORT PATH CONFIRMS ANYBODY AS HAVING NO ADJUSTMENT", () => {
  const importSection = workflowCode.slice(
    workflowCode.indexOf("const handleFile"),
    workflowCode.indexOf("const confirmNoAdjustment")
  );
  assert.ok(importSection.length > 0, "the import section was not found - update this test");
  assert.ok(
    !/confirmNoAdjustment/.test(importSection),
    "the import path calls confirmNoAdjustment - a file of blanks must not sign anybody off"
  );
});

test("the preview says in words that blank rows are still pending", () => {
  assert.match(preview, /does <b>not<\/b> confirm them/);
  assert.match(preview, /Pending Confirmation/);
});

test("the save message carries the pending count rather than only a row count", () => {
  assert.match(rules, /pending_confirmation_after_save/);
  assert.match(workflowCode, /saveOutcomeMessage/);
});

test("the manual editor says a blank box is not a confirmation", () => {
  assert.match(editor, /is not a confirmation/);
  assert.match(editor, /Confirm No Adjustment/);
});

/* ============================================ permissions and the month lock */

test("no write control is offered without the key or in a locked month", () => {
  assert.match(workflowCode, /const canEdit = mayEdit && !monthLocked;/);
  // Every write affordance is gated on it.
  assert.match(workflowCode, /isDisabled=\{!canEdit \|\| !canSaveImport\(preview\)\}/);
  assert.match(workflowCode, /disabled=\{!canEdit \|\| importBusy\}/);
  assert.match(workflowCode, /canEdit=\{canEdit\}/);
  assert.match(listCode, /isDisabled=\{!canEdit/);
});

test("a locked month is stated rather than merely disabling things silently", () => {
  assert.match(workflow, /This payroll month is locked/);
  assert.match(editor, /This payroll month is locked/);
});

test("the screen never sends a confirmer or a timestamp", () => {
  for (const claim of ["confirmed_by", "confirmed_at", "changed_by"]) {
    assert.ok(
      !new RegExp(`${claim}:`).test(helperCode),
      `the helper sends ${claim} - the confirmer is the server's identity`
    );
  }
});

/* ============================================ the stage, and the mobile view */

test("Adjustments is a STAGE of the Payrun screen, not a separate menu entry", () => {
  assert.match(pageCode, /PayrunAdjustments/);
  assert.match(pageCode, /STAGE\.ADJUSTMENTS/);
  const nav = fs.existsSync(path.join(ROOT, "util", "sideBarMenu.js"))
    ? read("util/sideBarMenu.js")
    : "";
  if (nav) {
    assert.ok(
      !/adjustment/i.test(nav),
      "Adjustments has its own menu entry - it is a stage of the payrun, reached from the Payrun screen"
    );
  }
});

test("the stage switch does not ask for the payroll month a second time", () => {
  // Both stages receive the year and month the page already chose.
  assert.match(pageCode, /year=\{year\}/);
  assert.match(pageCode, /month=\{month\}/);
});

test("THE WORKFLOW IS THREE STEPS, in the order somebody works", () => {
  assert.match(workflow, /STEP 1 — Export Template|STEP \{number\} — \{title\}/);
  assert.match(workflow, /"Export Template"/);
  assert.match(workflow, /"Fill and Import"/);
  assert.match(workflow, /"Preview and Confirm"/);
  assert.match(workflow, /Save Adjustments/);
});

test("there is no Pay Separately / off-cycle affordance", () => {
  for (const absent of [/pay separately/i, /off.?cycle/i]) {
    assert.ok(!absent.test(SCREEN_CODE), `the screen offers ${absent}, which is not built`);
  }
});

test("THE MONTH RENDERS ON A PHONE - cards below md, a table above it", () => {
  assert.match(listCode, /useBreakpointValue\(\{ base: true, md: false \}\)/);
  assert.match(listCode, /if \(isMobile\) return <AdjustmentCards/);
  assert.match(listCode, /return <AdjustmentTable/);
});

test("the workflow's own layout is responsive", () => {
  // The steps stack on a phone and sit three across on a desktop; the counts
  // are 2-up rather than 4-up; the bulk bar sticks to the top on a phone, the
  // way the initialization screen's does.
  assert.match(workflowCode, /columns=\{\{ base: 1, md: 3 \}\}/);
  assert.match(workflowCode, /columns=\{\{ base: 2, md: 4 \}\}/);
  assert.match(workflowCode, /position=\{\{ base: "sticky", md: "static" \}\}/);
  assert.match(previewCode, /columns=\{\{ base: 2, md: 4 \}\}/);
  assert.match(editorCode, /columns=\{\{ base: 1, md: 2 \}\}/);
});

test("a failed read is not rendered as an empty month", () => {
  assert.match(workflow, /it does not mean there is nothing to adjust/);
  assert.match(hook, /setLoaded\(false\)/);
});

test("a partial bulk confirmation is not reported as a success", () => {
  assert.match(workflowCode, /has_adjustment_count/);
  assert.match(workflowCode, /not_initialized_count/);
  assert.match(workflow, /could not be confirmed/);
});

test("a 409 from the save replaces the preview and reports that NOTHING was saved", () => {
  assert.match(workflowCode, /data\?\.code === 409/);
  assert.match(workflowCode, /setPreview\(data\)/);
});
