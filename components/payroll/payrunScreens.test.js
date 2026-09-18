/**
 * Payrun Initialization - the screen is wired to the real contract.
 *
 *   node --test components/payroll/payrunScreens.test.js
 *
 * There is no React test runner in this repo, so the screen is checked as
 * SOURCE, the way `components/payroll/payrollScreens.test.js` checks the two
 * salary screens. That is weaker than rendering it, and it catches the
 * failures that actually happen here:
 *
 *   a screen calling an endpoint the backend does not declare
 *   a screen deciding eligibility, a gross or a pay type in the browser
 *   a blocked employee becoming initializable through a checkbox
 *   an Initialize button appearing for somebody without the key
 *   a partial bulk outcome rendering as a success
 *   a pay type change implying it changed the employee's record
 *
 * The RULES behind this screen are pure modules and are proved properly in
 * `util/payrunRules.test.js`.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
/** Comments may NAME something to explain why it is absent; code may not. */
const codeOf = (src) => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const helper = read("helper/payrun.js");
const helperCode = codeOf(helper);
const page = read("pages/payroll/payrun.jsx");
const pageCode = codeOf(page);
const table = read("components/payroll/PayrunTable.jsx");
const tableCode = codeOf(table);
const hook = read("customHooks/usePayrunMonth.js");
const hookCode = codeOf(hook);

/* ============================================== the endpoints are the real ones */

test("the helper calls exactly the four endpoints the backend declares", () => {
  const calls = (helperCode.match(/API\.(get|post)\("([^"]+)"/g) || []).map((m) =>
    m.replace(/.*"([^"]+)".*/, "$1")
  );
  assert.deepStrictEqual(calls.sort(), [
    "/payrun/initialize",
    "/payrun/month",
    "/payrun/pay-type",
    "/payrun/pay-type/history",
  ]);
});

test("nothing outside the helper talks to the API", () => {
  [["page", pageCode], ["table", tableCode], ["hook", hookCode]].forEach(([name, code]) => {
    assert.ok(!/API\.(get|post|put|delete)\(/.test(code), `${name} calls the API directly`);
  });
  assert.match(pageCode, /PayrunHelper\./);
  assert.match(hookCode, /PayrunHelper\.getMonth/);
});

test("there is no single-employee initialize endpoint - one row posts a list of one", () => {
  assert.ok(!/\/payrun\/initialize\/\$\{/.test(helperCode));
  assert.match(pageCode, /runInitialize\(\[employeeId\], \{ confirm: true \}\)/);
});

/* ===================================== the browser decides nothing about payroll */

test("no payroll figure or eligibility is computed in the browser", () => {
  [["page", pageCode], ["table", tableCode], ["hook", hookCode]].forEach(([name, code]) => {
    assert.ok(
      !/monthly_gross\s*[*/+-]|daily_rate|salary_days|attendance_days|shortage_minutes/.test(code),
      `${name} does arithmetic on a payroll figure`
    );
    assert.ok(
      !/(pf_applicable|esi_applicable|is_final|resignation_date)\s*(===|!==|\?)/.test(code),
      `${name} re-decides an eligibility rule the server already decided`
    );
  });
});

test("the status and the blocking reasons are rendered, never derived", () => {
  assert.match(tableCode, /row\.status/);
  assert.match(tableCode, /reasonText\(row\)/);
  assert.ok(
    !/blocking_reasons\.push|status\s*=\s*"(READY|BLOCKED)"/.test(tableCode + pageCode),
    "a screen may not decide a row's status"
  );
});

test("the summary counts come from the server and are never recounted", () => {
  assert.match(hookCode, /month\.summary/);
  assert.ok(
    !/rows\.filter\([^)]*status\s*===\s*"(READY|BLOCKED|INITIALIZED)"\)\.length/.test(pageCode + hookCode),
    "counting the returned rows would report a FILTERED month as the month"
  );
});

test("an unapproved gross renders as unknown, never as zero", () => {
  assert.match(
    tableCode,
    /row\.monthly_gross === null \|\| row\.monthly_gross === undefined\s*\n?\s*\?\s*"—"/,
    "rendering a missing gross as 0 would read as 'this person is paid nothing'"
  );
});

/* ================================================== blocked rows stay blocked */

test("selectable is EXACTLY initializable, and the rule is imported rather than restated", () => {
  assert.match(read("util/payrunSelection.js"), /require\("\.\/payrunAccess"\)/);
  assert.match(tableCode, /isRowInitializable\(row\)/);
  assert.match(pageCode, /selectableEmployeeIds\(rows\)/);
});

test("a blocked row's checkbox and Initialize button are both disabled", () => {
  assert.match(tableCode, /const selectable = isRowInitializable\(row\) && canInitialize/);
  assert.match(tableCode, /isDisabled=\{!selectable \|\| busy\}/);
  // Both controls, not just one: two occurrences of the same guard.
  assert.ok(
    (tableCode.match(/isDisabled=\{!selectable \|\| busy\}/g) || []).length >= 2,
    "the checkbox and the button must carry the same guard"
  );
});

test("Select All means all READY, not all rows", () => {
  assert.match(pageCode, /Select all Ready/);
  assert.match(pageCode, /nextSelectAll\(selectableIds, selectedIds\)/);
});

test("a selection is pruned when the rows move", () => {
  assert.match(pageCode, /pruneSelection\(prev, selectableIds\)/);
});

/* ================================================================ permissions */

test("the screen gates on the same three keys the read endpoint requires", () => {
  assert.match(pageCode, /canOpenPayrun\(actor\)/);
  assert.match(page, /view_employees, view_payroll and view_salary|View Employees, View\s*\n?\s*Payroll and View Salary/i);
});

test("Initialize and the pay type are gated SEPARATELY", () => {
  assert.match(pageCode, /const mayInitialize = canInitializePayrun\(actor\)/);
  assert.match(pageCode, /const mayChangePayType = canChangePayrunPayType\(actor\)/);
  assert.match(pageCode, /canInitialize=\{mayInitialize && !monthLocked\}/);
  assert.match(pageCode, /canChangePayType=\{mayChangePayType && !monthLocked\}/);
});

test("a locked month disables both actions on the screen as well as on the server", () => {
  assert.match(pageCode, /monthLocked/);
  assert.match(pageCode, /isDisabled=\{Boolean\(busyEmployeeId\) \|\| monthLocked\}/);
});

/* ============================================================ what is told */

test("a partial bulk outcome is reported as partial, not as a success", () => {
  assert.match(pageCode, /outcomeMessage\(result\)/);
  assert.match(pageCode, /status: blocked \? "warning" : "success"/);
});

test("a refusal never renders as done", () => {
  assert.match(pageCode, /describeApiResult\(result\)/);
  assert.ok((pageCode.match(/outcome\.kind !== KIND\.OK/g) || []).length >= 2);
});

test("a failed read is not shown as an empty month", () => {
  assert.match(hookCode, /setDenied\(outcome\.kind === KIND\.DENIED\)/);
  assert.match(page, /it does not mean there is nothing to\s*\n?\s*initialize/);
});

test("the pay type change says it is month-specific and changes no employee record", () => {
  assert.match(pageCode, /This month only\. The employee's record is unchanged\./);
  assert.ok(
    !/payment_type/.test(pageCode + tableCode + helperCode),
    "no payrun screen may send or edit the Employee Master's payment type"
  );
});

test("HOLD is not offered as a pay type anywhere on the screen", () => {
  assert.ok(!/HOLD/.test(page + table + helper), "hold is a payroll status, not a pay route");
  assert.match(tableCode, /<option value="BANK">/);
  assert.match(tableCode, /<option value="CASH">/);
});

test("no screen defaults a pay type, and none infers one from an employment fact", () => {
  [["page", pageCode], ["table", tableCode], ["hook", hookCode], ["helper", helperCode]].forEach(
    ([name, code]) => {
      assert.ok(
        !/RESIGNED_DEFAULT/.test(code),
        `${name} names a pay type source that no longer exists`
      );
      assert.ok(
        !/(resigned|exited_in_month|resignation_date|status)[^\n]*\?[^\n]*("CASH"|"BANK")/.test(code),
        `${name} picks a pay type from an employment fact - the Employee Master decides, server-side`
      );
    }
  );
  // The pay type rendered on a row is whatever the server sent.
  assert.match(tableCode, /value=\{row\.pay_type\}/);
});

test("the exit badge is a badge - it is never wired to the pay type", () => {
  assert.match(tableCode, /row\.exited_in_month \?/);
  // It sits on the NAME cell, not the pay type cell, and drives no value.
  const payTypeCell = tableCode.slice(tableCode.indexOf("row.initialized && canChangePayType"));
  assert.ok(
    !/exited_in_month/.test(payTypeCell),
    "the exit badge must not reach the pay type control"
  );
});

test("the pay type is only editable once the month is initialized", () => {
  assert.match(tableCode, /row\.initialized && canChangePayType \?/);
});

/* ==================================================== the table's columns */

test("the table carries the columns the screen was asked for", () => {
  [
    "Employee ID",
    "Employee Name",
    "Location",
    "Designation",
    "Approved Monthly Gross",
    "Status",
    "Blocking Reasons",
  ].forEach((heading) => assert.ok(table.includes(heading), `the table has no ${heading} column`));
});

test("the filters go to the server, not to a filter() in the browser", () => {
  assert.match(pageCode, /const filters = useMemo\(\s*\n?\s*\(\) => \(\{ year, month, store_ids: storeId, status \}\)/);
  assert.ok(
    !/rows\.filter\(/.test(pageCode),
    "filtering in the browser would fetch everything and hide most of it"
  );
});
