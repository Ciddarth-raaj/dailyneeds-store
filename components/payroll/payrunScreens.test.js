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
/*
 * THE RESPONSIVE SPLIT. The screen renders the same month two ways and the
 * cells are shared, so most assertions below now run over the SHARED module -
 * which is the point of it existing: proving something about `presentation`
 * proves it for the table and the card at once.
 */
const list = read("components/payroll/PayrunEmployeeList.jsx");
const listCode = codeOf(list);
const card = read("components/payroll/PayrunEmployeeCard.jsx");
const cardCode = codeOf(card);
const presentation = read("components/payroll/payrunPresentation.jsx");
const presentationCode = codeOf(presentation);
/** Every payrun view, for the assertions that must hold on all of them. */
const ALL_VIEWS = [
  ["page", pageCode],
  ["table", tableCode],
  ["card", cardCode],
  ["list", listCode],
  ["presentation", presentationCode],
];
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
  assert.match(presentationCode, /row\.status/);
  assert.match(presentationCode, /reasonText\(row\)/);
  assert.ok(
    !/blocking_reasons\.push|status\s*=\s*"(READY|BLOCKED)"/.test(
      tableCode + cardCode + presentationCode + pageCode
    ),
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

test("an unapproved gross renders as unknown, never as zero - on BOTH layouts", () => {
  assert.match(
    presentationCode,
    /if \(row\.monthly_gross === null \|\| row\.monthly_gross === undefined\) return "—";/,
    "rendering a missing gross as 0 would read as 'this person is paid nothing'"
  );
  // And both layouts get it from that one function rather than formatting
  // their own, so they cannot disagree about a figure.
  assert.match(tableCode, /grossText\(row\)/);
  assert.match(cardCode, /grossText\(row\)/);
  [tableCode, cardCode].forEach((code) =>
    assert.ok(!/toLocaleString/.test(code), "a layout formatted its own gross")
  );
});

/* ================================================== blocked rows stay blocked */

test("selectable is EXACTLY initializable, and the rule is imported rather than restated", () => {
  assert.match(read("util/payrunSelection.js"), /require\("\.\/payrunAccess"\)/);
  assert.match(presentationCode, /isRowInitializable\(row\)/);
  assert.match(pageCode, /selectableEmployeeIds\(rows\)/);
  // Neither layout restates it; both ask the shared rule.
  assert.match(tableCode, /rowIsSelectable\(row, canInitialize\)/);
  assert.match(cardCode, /rowIsSelectable\(row, canInitialize\)/);
});

test("a blocked row's checkbox and Initialize button are both disabled", () => {
  assert.match(presentationCode, /isRowInitializable\(row\) && Boolean\(canInitialize\)/);
  // Both controls carry the SAME guard, in the shared module, so this holds
  // for the table row and the phone card at once.
  assert.ok(
    (presentationCode.match(/isDisabled=\{!selectable \|\| busy\}/g) || []).length >= 2,
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
  assert.ok(
    !/HOLD/.test(page + table + card + list + presentation + helper),
    "hold is a payroll status, not a pay route"
  );
  assert.match(presentationCode, /<option value="BANK">/);
  assert.match(presentationCode, /<option value="CASH">/);
});

test("no screen defaults a pay type, and none infers one from an employment fact", () => {
  [...ALL_VIEWS, ["hook", hookCode], ["helper", helperCode]].forEach(
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
  assert.match(presentationCode, /value=\{row\.pay_type\}/);
});

test("the exit badge is a badge - it is never wired to the pay type", () => {
  assert.match(presentationCode, /if \(!row\.exited_in_month\) return null;/);
  // The badge component renders no control at all - no Select, no Button, no
  // onChange - so there is nothing for it to drive on either layout.
  const badge = presentationCode.slice(
    presentationCode.indexOf("export function ExitedBadge"),
    presentationCode.indexOf("export function ReasonsBlock")
  );
  assert.ok(
    !/(Select|Button|onChange|onInitialize|pay_type)/.test(badge),
    "the exit badge must not reach the pay type control"
  );
  // And the pay type control never reads it.
  const payTypeControl = presentationCode.slice(
    presentationCode.indexOf("export function PayTypeControl")
  );
  assert.ok(!/exited_in_month/.test(payTypeControl));
});

test("the pay type is only editable once the month is initialized", () => {
  assert.match(presentationCode, /if \(row\.initialized && canChangePayType\)/);
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

/* ==================================================== the responsive split == */

/**
 * WHAT THESE PROVE, AND WHAT THEY CANNOT. There is still no React renderer in
 * this repo, so these check the SOURCE: which component is chosen at which
 * breakpoint, that the card carries every field, and - the part that actually
 * protects payroll - that the phone layout applies the same rules as the
 * desktop one rather than a relaxed copy of them.
 *
 * The rules themselves are pure modules and are proved properly in
 * `util/payrunRules.test.js`, which both layouts run through unchanged.
 */

test("MOBILE RENDERS CARDS AND DESKTOP RENDERS THE TABLE, at the repo's own breakpoint", () => {
  assert.match(listCode, /useBreakpointValue\(\{ base: true, md: false \}\)/);
  assert.match(listCode, /if \(isMobile\)/);
  assert.match(listCode, /<PayrunEmployeeCard/);
  assert.match(listCode, /return <PayrunTable \{\.\.\.props\} \/>;/);

  // The SAME breakpoint the two attendance screens already use. A third
  // definition of "mobile" in one app is a bug waiting for a narrow tablet.
  const attendanceList = codeOf(read("components/attendance/AttendanceDayList.jsx"));
  assert.match(attendanceList, /useBreakpointValue\(\{ base: true, md: false \}\)/);

  // The page delegates the choice; it does not make it twice.
  assert.match(pageCode, /<PayrunEmployeeList/);
  assert.ok(!/useBreakpointValue/.test(pageCode), "the page must not re-decide the layout");
});

test("the desktop table still has all ten columns, unchanged", () => {
  [
    "Employee ID",
    "Employee Name",
    "Location",
    "Designation",
    "Approved Monthly Gross",
    "Status",
    "Pay Type",
    "Blocking Reasons",
  ].forEach((heading) => assert.ok(table.includes(heading), `the table lost its ${heading} column`));
  assert.match(tableCode, /<Table size="sm" variant="simple">/);
});

test("the mobile card carries every field the table does", () => {
  assert.match(cardCode, /row\.employee_id/);
  assert.match(cardCode, /row\.employee_name/);
  assert.match(cardCode, /label="Location"/);
  assert.match(cardCode, /label="Designation"/);
  assert.match(cardCode, /label="Approved Monthly Gross"/);
  assert.match(cardCode, /label="Pay Type"/);
  assert.match(cardCode, /<StatusBadge row=\{row\} \/>/);
  assert.match(cardCode, /<ReasonsBlock row=\{row\}/);
  assert.match(cardCode, /<ExitedBadge row=\{row\} \/>/);
  assert.match(cardCode, /<SelectCheckbox/);
  assert.match(cardCode, /<InitializeControl/);
  assert.match(cardCode, /<PayTypeControl/);
});

test("BLOCKING REASONS ARE VISIBLE ON MOBILE - printed, never behind a tooltip", () => {
  // The reasons block is plain text, and it is NOT wrapped in a Tooltip:
  // there is no hover on a touch screen, so a hovered reason is unreadable.
  const reasonsBlock = presentationCode.slice(
    presentationCode.indexOf("export function ReasonsBlock"),
    presentationCode.indexOf("export function PayTypeControl")
  );
  assert.ok(!/Tooltip/.test(reasonsBlock), "blocking reasons must not be behind a tooltip");
  assert.match(reasonsBlock, /whiteSpace="normal"/, "a long reason must wrap, not be clipped");
  assert.match(reasonsBlock, /reasonText\(row\)/);
  // Warnings are shown too, and told apart from blocking reasons by colour.
  assert.match(reasonsBlock, /color="red\.600"/);
  assert.match(reasonsBlock, /color="orange\.600"/);
  // And the card renders it in the flow rather than in a collapsed section.
  assert.match(cardCode, /<ReasonsBlock row=\{row\} fontSize="xs" \/>/);
  assert.ok(!/Accordion|Collapse|isTruncated|noOfLines/.test(cardCode), "reasons must not be hidden or clipped on the card");
});

test("a READY row is selectable on BOTH layouts, through the one shared rule", () => {
  assert.match(presentationCode, /export function rowIsSelectable\(row, canInitialize\) \{/);
  assert.match(presentationCode, /return isRowInitializable\(row\) && Boolean\(canInitialize\);/);
  [["table", tableCode], ["card", cardCode]].forEach(([name, code]) => {
    assert.match(code, /rowIsSelectable\(row, canInitialize\)/, `${name} does not use the shared rule`);
    assert.match(code, /selectable=\{selectable\}/, `${name} does not pass it to its controls`);
  });
});

test("a BLOCKED row cannot be selected or initialized on mobile either", () => {
  // Both controls in the shared module carry `!selectable`, and the card
  // passes the same `selectable` to both - so a blocked card is as inert as a
  // blocked row. There is no mobile-only branch that relaxes it.
  assert.ok(
    !/canInitialize\s*\|\||selectable\s*\|\||isMobile\s*\?[^]*selectable/.test(cardCode),
    "the card must not widen the selectable rule"
  );
  assert.ok(!/isRowInitializable|status === "READY"/.test(cardCode), "the card must not restate the rule");
  const initialize = presentationCode.slice(presentationCode.indexOf("export function InitializeControl"));
  assert.match(initialize, /isDisabled=\{!selectable \|\| busy\}/);
});

test("the mobile pay type edit follows the SAME permission rule as desktop", () => {
  // One component, used by both, and the card passes the permission through
  // untouched - it does not default it, widen it or assume it.
  assert.match(cardCode, /canChangePayType=\{canChangePayType\}/);
  assert.ok(
    !/canChangePayType\s*(\|\||=\s*true)/.test(cardCode),
    "the card must not widen the pay type permission"
  );
  assert.match(presentationCode, /if \(row\.initialized && canChangePayType\)/);
  // The page still gates it on the permission AND the month lock, as before.
  assert.match(pageCode, /canChangePayType=\{mayChangePayType && !monthLocked\}/);
});

test("the exited badge stays display-only on the card", () => {
  // From the badge's USE in the card (not its import) to the status badge
  // beside it: a name, an id, and nothing that can be operated.
  const nameBlock = cardCode.slice(
    cardCode.indexOf("<ExitedBadge"),
    cardCode.indexOf("<StatusBadge")
  );
  assert.ok(nameBlock.length > 0);
  assert.ok(!/onChange|onClick|<Select|<Button/.test(nameBlock), "the badge must render no control");
  // And it is rendered in the NAME area, above the fields - not in the Pay
  // Type field, where it would read as a cause.
  assert.ok(
    cardCode.indexOf("<ExitedBadge") < cardCode.indexOf('label="Pay Type"'),
    "the exited badge must not sit inside the pay type field"
  );
});

test("the responsive work introduced NO payroll calculation or business rule", () => {
  ALL_VIEWS.forEach(([name, code]) => {
    assert.ok(
      !/monthly_gross\s*[*/+-]\s|daily_rate|salary_days|attendance_days|shortage_minutes|base_days/.test(code),
      `${name} does arithmetic on a payroll figure`
    );
    assert.ok(
      !/(pf_applicable|esi_applicable|is_final|resignation_date|date_of_joining)\s*(===|!==|\?)/.test(code),
      `${name} re-decides an eligibility rule the server already decided`
    );
    assert.ok(
      !/BLOCK_REASON|RESIGNED_DEFAULT|STATUS_GROUP\s*=/.test(code),
      `${name} restates a server-side vocabulary`
    );
  });
  // The new files add no rule module of their own: they import the two that
  // already existed and nothing else from util/.
  [cardCode, listCode].forEach((code) =>
    assert.ok(!/require\(|from "\.\.\/\.\.\/util\//.test(code), "a layout must not reach into util directly")
  );
  assert.match(presentationCode, /from "\.\.\/\.\.\/util\/payrunSelection"/);
  assert.match(presentationCode, /from "\.\.\/\.\.\/util\/payrunAccess"/);
});

test("the top area is mobile-friendly, and the bulk actions stay reachable", () => {
  // Filters two-across on a phone, five-across on a desktop.
  assert.match(pageCode, /columns=\{\{ base: 2, md: 5 \}\}/);
  // Summary cards two-across on a phone, four on a desktop - unchanged.
  assert.match(pageCode, /columns=\{\{ base: 2, md: 4 \}\}/);
  // The four counts are all still there.
  ["Total Eligible", "Ready", "Blocked", "Initialized"].forEach((label) =>
    assert.ok(page.includes(label), `the summary lost ${label}`)
  );
  // Bulk controls stick on a phone only.
  assert.match(pageCode, /position=\{\{ base: "sticky", md: "static" \}\}/);
  assert.match(pageCode, /Select all Ready/);
  assert.match(pageCode, /Initialize Selected \(\{selectedCount\}\)/);
});
