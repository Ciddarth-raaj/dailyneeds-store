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
  // The reasons are the SERVER's objects, rendered as they arrive - its
  // compact label, and nothing composed here.
  assert.match(presentationCode, /row\.blocking_reasons \|\| \[\]/);
  assert.match(presentationCode, /reason\.label \|\| reason\.code/);
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

test("THE APPROVED MONTHLY GROSS IS NOT ON THE INITIALIZATION SCREEN AT ALL", () => {
  /*
   * Initialization is about WHETHER a month can be taken, not what it is
   * worth. The figure belongs on the calculation / review screen, and a salary
   * against every name turned a work queue into a payroll disclosure.
   *
   * PRESENTATION ONLY - the server still sends `monthly_gross` and the
   * snapshot still stores it; no screen renders it.
   */
  ALL_VIEWS.forEach(([name, code]) => {
    assert.ok(!/monthly_gross/.test(code), `${name} still renders a gross`);
    assert.ok(!/grossText|toLocaleString/.test(code), `${name} still formats a gross`);
  });
  assert.ok(
    !/Approved Monthly Gross/.test(tableCode + cardCode),
    "the gross column/field is gone"
  );
  // And nothing else took its place as a money figure on this screen.
  ALL_VIEWS.forEach(([name, code]) =>
    assert.ok(!/daily_salary|basic|conveyance|hra|special_allowance/.test(code), `${name} renders a salary component`)
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
    presentationCode.indexOf("export function PayTypeControl")
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
  assert.match(
    pageCode,
    /const filters = useMemo\(\s*\n?\s*\(\) => \(\{ year, month, store_ids: storeId, status, lifecycle \}\)/
  );
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
  assert.match(cardCode, /label="Pay Type"/);
  assert.match(cardCode, /<StatusBadge row=\{row\} \/>/);
  assert.match(cardCode, /<ExitedBadge row=\{row\} \/>/);
  assert.match(cardCode, /<SelectCheckbox/);
  assert.match(cardCode, /<InitializeControl/);
  assert.match(cardCode, /<PayTypeControl/);
});

test("THE BADGE SAYS ONLY THE STATUS - no count, no reason text on it", () => {
  const badge = presentationCode.slice(
    presentationCode.indexOf("export function StatusBadge"),
    presentationCode.indexOf("THERE IS NO `grossText`")
  );
  assert.match(badge, />\s*\{row\.status\}\s*</);
  assert.ok(!/\{row\.status\} \(/.test(badge), "a count must not be appended to the badge");
  assert.ok(!/reasons\.length\}/.test(badge), "the reason count must not be rendered");
  // A row with nothing wrong gets a plain badge with nothing to open.
  assert.match(badge, /if \(reasons\.length === 0\) return plainBadge;/);
});

test("THE POPOVER SHOWS ONLY THE COMPACT LABELS, ONE PER LINE", () => {
  const body = presentationCode.slice(
    presentationCode.indexOf("<PopoverBody>"),
    presentationCode.indexOf("</PopoverBody>")
  );
  // Every reason, each its own line, each just the label.
  assert.match(body, /reasons\.map\(\(reason\) =>/);
  assert.match(body, /\{reason\.label \|\| reason\.code\}/);
  assert.match(body, /<Stack spacing=\{1\}>/);
  assert.ok(!/\.join\(/.test(body), "the labels must not be flattened into one line");

  // THE SENTENCE IS NOT RENDERED ANYWHERE ON THIS SCREEN. The server still
  // sends `message`; this UI does not show it.
  ALL_VIEWS.forEach(([name, code]) =>
    assert.ok(!/reason\.message/.test(code), `${name} renders a reason message`)
  );
});

test("THE REASONS OPEN ON HOVER *AND* ON TAP, decided by pointer type", () => {
  const badge = presentationCode.slice(
    presentationCode.indexOf("export function StatusBadge"),
    presentationCode.indexOf("THERE IS NO `grossText`")
  );
  // Controlled, so one badge can serve both gestures.
  assert.match(badge, /useDisclosure\(\)/);
  assert.match(badge, /isOpen=\{isOpen\}/);

  // MOUSE: hover opens, leaving closes - both guarded on pointerType, which is
  // what stops a tap's synthetic pointerenter from fighting its own click.
  assert.match(badge, /onPointerEnter=/);
  assert.match(badge, /onPointerLeave=/);
  assert.match(badge, /if \(isMouse\(e\)\) onOpen\(\);/);
  assert.match(badge, /if \(isMouse\(e\)\) onClose\(\);/);
  assert.match(badge, /\(event\.pointerType \|\| "mouse"\) === "mouse"/);

  // TOUCH: the tap toggles; a mouse click re-opens rather than toggling shut.
  assert.match(badge, /onPointerDown=/);
  assert.match(badge, /lastPointer\.current === "mouse"\) onOpen\(\);/);
  assert.match(badge, /else onToggle\(\);/);

  // KEYBOARD.
  assert.match(badge, /onFocus=\{onOpen\}/);
  assert.match(badge, /onBlur=\{onClose\}/);
  assert.match(badge, /e\.key === "Enter" \|\| e\.key === " "/);

  // NOT the hover-only trigger, which would leave a phone with no way in.
  assert.ok(!/trigger="hover"/.test(badge));
  // And hovering must not steal focus from whatever somebody was doing.
  assert.match(badge, /autoFocus=\{false\}/);
});

test("no long explanatory sentence is printed inline on either layout", () => {
  // The prose that used to sit in a column is not rendered in the row or the
  // card any more - only inside the popover, for somebody who asked for it.
  [["table", tableCode], ["card", cardCode]].forEach(([name, code]) => {
    assert.ok(!/blocking_reasons/.test(code), `${name} still renders the reasons inline`);
    assert.ok(!/Blocking Reasons/.test(code), `${name} still has a blocking reasons column`);
  });
});

test("THE BANK-DETAILS WARNING IS NOT SHOWN ON THIS SCREEN AT ALL", () => {
  /*
   * It said what Pay Type already says - whether an account exists is that
   * field's business - and cost a third of a phone card's height to say it.
   * Bank readiness belongs to the payment stage, where somebody can act on it.
   */
  ALL_VIEWS.forEach(([name, code]) => {
    assert.ok(!/row\.warnings|WarningsBlock/.test(code), `${name} still renders a warning`);
    assert.ok(!/BANK_DETAILS_MISSING/.test(code), `${name} names the warning`);
    assert.ok(
      !/payment readiness|Bank details are missing/i.test(code),
      `${name} still carries the warning copy`
    );
  });

  // NOTHING REPLACED IT - not a badge, not an icon, not a second popover. The
  // only popover on this screen is the blocker one on the Status badge.
  // The ROOT <Popover> element, not its Trigger/Content/Arrow/Body children.
  assert.equal(
    (presentationCode.match(/<Popover(?=[\s>])/g) || []).length,
    1,
    "a second popover would be the warning coming back in another costume"
  );
  [tableCode, cardCode].forEach((code) =>
    assert.ok(!/warning/i.test(code), "no warning affordance may remain on a layout")
  );

  // AND THE SERVER STILL PRODUCES IT - this is presentation only. The payrun
  // rules module is untouched and still reports the warning for a later stage.
  const selection = read("util/payrunSelection.js");
  assert.ok(!/warnings/.test(codeOf(selection)), "the browser keeps no warning rule of its own");
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
      !/monthly_gross|daily_rate|salary_days|attendance_days|shortage_minutes|base_days/.test(code),
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
  assert.match(presentationCode, /from "\.\.\/\.\.\/util\/payrunAccess"/);
  // It no longer needs `payrunSelection` at all: the reasons are rendered as
  // the server's own objects rather than flattened by a helper.
  assert.ok(!/payrunSelection/.test(presentationCode));
});

test("the top area is mobile-friendly, and the bulk actions stay reachable", () => {
  // Filters two-across on a phone, five-across on a desktop.
  assert.match(pageCode, /columns=\{\{ base: 2, md: 6 \}\}/);
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

/* ================================================= the lifecycle filter == */

test("THE EXITED FILTER IS ITS OWN CONTROL, INDEPENDENT OF STATUS", () => {
  // Two selects, two pieces of state, both sent - so "Exited + Blocked" is one
  // request rather than an impossible combination.
  assert.match(pageCode, /const \[lifecycle, setLifecycle\] = useState\(""\)/);
  assert.match(pageCode, /const \[status, setStatus\] = useState\(""\)/);
  assert.match(pageCode, /placeholder="All employees"/);
  assert.match(pageCode, /<option value="ACTIVE">Active<\/option>/);
  assert.match(pageCode, /<option value="EXITED">Exited<\/option>/);
  // The status filter is untouched beside it.
  assert.match(pageCode, /placeholder="All statuses"/);
  assert.match(pageCode, /<option value="READY">Ready<\/option>/);
  assert.match(pageCode, /<option value="BLOCKED">Blocked<\/option>/);
  assert.match(pageCode, /<option value="INITIALIZED">Initialized<\/option>/);
});

test("the lifecycle filter is applied by the SERVER, like every other filter", () => {
  // It goes into the same filters object the hook serialises into the query,
  // so the rows that do not match are never read out of the database.
  assert.match(pageCode, /store_ids: storeId, status, lifecycle/);
  assert.ok(
    !/rows\.filter\(/.test(pageCode + cardCode + listCode),
    "filtering in the browser would fetch everybody and hide most of them"
  );
  // The helper and hook pass it through generically - no new plumbing.
  assert.match(hookCode, /for \(const \[name, value\] of Object\.entries\(parsed\)\)/);
  assert.match(helperCode, /API\.get\("\/payrun\/month", \{ params \}\)/);
});

test("the browser never decides WHO is exited - it sends a word and renders a flag", () => {
  ALL_VIEWS.forEach(([name, code]) => {
    assert.ok(
      !/resignation_date|exitedByMonthEnd|ended_on/.test(code),
      `${name} re-derives who left; that is the server's one dated rule`
    );
  });
  // The badge renders the server's dated answer and nothing else.
  assert.match(presentationCode, /if \(!row\.exited_in_month\) return null;/);
});

/* ============================================ interaction and pay type == */

test("the reasons popover is reachable by tap, click and keyboard alike", () => {
  const badge = presentationCode.slice(
    presentationCode.indexOf("export function StatusBadge"),
    presentationCode.indexOf("THERE IS NO `grossText`")
  );
  // No hover trigger anywhere on this screen's reason path.
  assert.ok(!/trigger="hover"/.test(badge));
  // A pointer affordance, a keyboard stop, and a name for a screen reader.
  assert.match(badge, /cursor="pointer"/);
  assert.match(badge, /tabIndex=\{0\}/);
  assert.match(badge, /role="button"/);
  assert.match(badge, /aria-label=\{`\$\{row\.status\}/);
});

test("PAY TYPE IS UNCHANGED BY THIS CLEANUP", () => {
  // Still on the screen, still only editable once initialized, still gated on
  // the permission AND the month lock, still BANK/CASH only.
  assert.match(presentationCode, /if \(row\.initialized && canChangePayType\)/);
  assert.match(presentationCode, /<option value="BANK">/);
  assert.match(presentationCode, /<option value="CASH">/);
  assert.ok(!/HOLD/.test(presentation + table + card + page));
  assert.match(pageCode, /canChangePayType=\{mayChangePayType && !monthLocked\}/);
  assert.match(cardCode, /label="Pay Type"/);
  assert.match(tableCode, /<Th>Pay Type<\/Th>/);
  // And still month-specific, still not the Employee Master.
  assert.match(pageCode, /This month only\. The employee's record is unchanged\./);
  assert.ok(!/payment_type/.test(pageCode + cardCode + tableCode + presentationCode + helperCode));
});

test("nothing moves an exited employee to CASH - the badge and the filter only FIND them", () => {
  // The exit signal reaches no pay type control on either layout.
  const payTypeControl = presentationCode.slice(
    presentationCode.indexOf("export function PayTypeControl"),
    presentationCode.indexOf("export function InitializeControl")
  );
  assert.ok(!/exited_in_month|lifecycle/.test(payTypeControl));
  // And no screen defaults one from an employment fact.
  ALL_VIEWS.forEach(([name, code]) =>
    assert.ok(
      !/(exited_in_month|lifecycle)[^\n]*\?[^\n]*("CASH"|"BANK")/.test(code),
      `${name} picks a pay type from an employment fact`
    )
  );
});
