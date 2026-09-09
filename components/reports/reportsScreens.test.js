/**
 * Reports — the Employee Master screens.
 *
 *   node --test components/reports/reportsScreens.test.js
 *
 * There is no component renderer wired up in this repo, so these read the
 * sources. That suits what needs proving here, because most of the guarantees
 * this feature makes are about what is ABSENT - no free-text SQL control, no
 * export button for somebody who may not export, no acknowledgement that
 * survives a re-run - and an absence is not something a render assertion
 * demonstrates. A rendering test proves one path behaves; these prove no path
 * was added that does not.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");

const saved = read("pages/reports/employee-master/index.jsx");
const view = read("pages/reports/employee-master/[templateId].jsx");
const create = read("pages/reports/employee-master/new.jsx");
const bench = read("components/reports/ReportWorkbench.jsx");
const drawer = read("components/reports/ColumnsDrawer.jsx");
const filtersUi = read("components/reports/ReportFilters.jsx");
// The workbench is the screen these assertions used to make about the single
// page: it is what runs, exports and paginates a report.
const page = bench;
const picker = read("components/reports/FieldPicker.jsx");
const warnings = read("components/reports/ReportWarnings.jsx");
const helper = read("helper/report.js");
const menus = read("constants/menus.js");

/** Comments stripped, so prose about SQL is not read as SQL. */
const strip = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const pageCode = strip(page);
const helperCode = strip(helper);

/* ============================================ the request carries no SQL */

test("NO SCREEN SENDS ANYTHING THE SERVER WOULD TREAT AS SQL", () => {
  // Filters are the HR directory's own controls. An operator grammar is a
  // query builder, and a query builder eventually accepts an operator from
  // whoever is typing.
  for (const forbidden of [
    "order_by",
    "orderBy",
    "sort_by",
    "column_name",
    "table_name",
    "select_expression",
    "where",
    "operator",
    "raw_sql",
  ]) {
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(pageCode),
      `the report screen must not send '${forbidden}'`
    );
    assert.ok(
      !new RegExp(`\\b${forbidden}\\b`, "i").test(helperCode),
      `the report helper must not send '${forbidden}'`
    );
  }
});

test("the filters sent are only keys the server accepts", () => {
  // The body carries `search` and `field_filters`, and nothing invented here.
  // Everything a field filter can express - outlet, department, designation,
  // employment status included - travels as a catalogue field KEY plus a
  // value, so there is no second filter vocabulary in the frontend to drift
  // from the server's.
  // Assembled in one place, from the complete definition - so a preview, an
  // export and a Save a Copy cannot describe three different reports.
  const declared = strip(bench).slice(strip(bench).indexOf("const filters = useMemo"));
  assert.match(declared.slice(0, 200), /toRequestFilters\(common, fieldFilters\)/);
  // And the shape it produces is exactly the keys the route validates.
  const { toRequestFilters } = require("../../util/reportFilterRules");
  assert.deepStrictEqual(Object.keys(toRequestFilters(null, [])).sort(), [
    "department_ids",
    "designation_ids",
    "field_filters",
    "outlet_ids",
    "search",
    "status",
  ]);

  // And the per-field entries are exactly the four shapes the route validates.
  const entry = strip(filtersUi);
  for (const key of ["field", "value", "from", "to"]) {
    assert.ok(entry.includes(key), `a filter entry must be able to carry ${key}`);
  }
  assert.ok(!/operator|op:/.test(entry), "no operator may come from the client");
});

/* ================================================ permissions on screen == */

test("THE SCREEN IS GATED ON view_reports AND view_employees", () => {
  // Both, matching what the backend requires with `requireAll`: the reporting
  // capability AND the dataset it is pointed at. `usePermissions` defaults to
  // ANY, which would let `view_reports` alone open a screen whose every
  // request then fails - so the option is not optional here.
  // On every screen, not just one - a route reachable without the check is
  // the same hole wherever it is.
  for (const [name, src] of [["saved", saved], ["view", view], ["create", create]]) {
    assert.match(
      strip(src),
      /usePermissions\(\["view_reports", "view_employees"\], \{ all: true \}\)/,
      `${name} must require both keys`
    );
    // And it says so rather than rendering an empty report, which would look
    // like there is no data rather than no access.
    assert.match(src, /You do not have permission to view reports/, name);
  }
});

test("THE EXPORT BUTTONS EXIST ONLY FOR SOMEBODY WHO MAY EXPORT", () => {
  // From the server's own answer, not from a permission list this page
  // interprets - so the two cannot disagree. A disabled button that produces
  // a 403 teaches the user nothing.
  assert.match(pageCode, /const canExport = Boolean\(catalogue && catalogue\.can_export\)/);
  assert.match(pageCode, /\{canExport && \(/);
});

test("the field list comes from the server, never from a hardcoded catalogue", () => {
  // A field the caller may not use is ABSENT from what the server returns.
  // Listing fields here would show them columns they cannot have, and would
  // go stale the first time the catalogue changed.
  const hook = strip(read("customHooks/useReportCatalogue.js"));
  assert.match(hook, /ReportHelper\.getFields\(\)/);

  // No screen, and no component, names an Employee Master column - including
  // the filter UI, which renders a control from the server's own metadata
  // rather than from a list of fields kept here.
  for (const columnish of ["pan_no", "account_no", "uan", "esi_number", "aadhaar", "bank_name"]) {
    for (const [name, src] of [
      ["workbench", pageCode],
      ["filters", strip(filtersUi)],
      ["drawer", strip(drawer)],
      ["picker", strip(picker)],
      ["catalogue hook", hook],
    ]) {
      assert.ok(
        !new RegExp(columnish).test(src),
        `${name} must not name the '${columnish}' column itself`
      );
    }
  }
});

/* ========================================== the widening acknowledgement = */

test("A WIDENED RESULT MUST BE ACKNOWLEDGED BEFORE EXPORT, NOT BEFORE PREVIEW", () => {
  // Looking at a wider set on screen is not the risk; taking it out of the
  // building is. The export buttons are disabled until the box is ticked;
  // nothing disables the preview.
  assert.match(
    pageCode,
    /blockedByAcknowledgement =\s*Boolean\(preview && preview\.requires_acknowledgement\) && !acknowledged/
  );
  assert.match(pageCode, /isDisabled=\{blockedByAcknowledgement \|\| overRowLimit \|\| !preview\}/);
  // Nothing about running is gated on it - only the two export buttons are.
  const runBody = pageCode.slice(pageCode.indexOf("const run = useCallback"), pageCode.indexOf("const doExport"));
  assert.ok(
    !/blockedByAcknowledgement|acknowledged/.test(runBody),
    "preview must not be gated on the acknowledgement"
  );
});

test("AN ACKNOWLEDGEMENT DOES NOT SURVIVE A NEW RUN OR AN EDIT", () => {
  // A fresh run is a fresh decision. Carrying a tick over from a previous
  // result would mean somebody acknowledged a different report's widening.
  const runBody = pageCode.slice(pageCode.indexOf("const run = useCallback"));
  assert.match(runBody.slice(0, runBody.indexOf("const doExport")), /setAcknowledged\(false\)/);

  // And an edit is a fresh decision too - both a column change and a filter
  // change drop it, or a tick would carry over to a report it never described.
  const edit = pageCode.slice(pageCode.indexOf("const applyColumns"));
  assert.match(edit.slice(0, 300), /setAcknowledged\(false\)/);
  // Both a dynamic filter change and a common one.
  assert.match(pageCode, /setFieldFilters\(next\);\s*setDirty\(true\);\s*setAcknowledged\(false\);/);
  assert.match(pageCode, /setCommon\(next\);\s*setDirty\(true\);\s*setAcknowledged\(false\);/);
});

test("the widening warning is separated from the harmless ones, and is louder", () => {
  assert.match(warnings, /w\.widens_result_set === true/);
  assert.match(warnings, /status="warning"/);
  assert.match(warnings, /status="info"/);
  // The checkbox is shown only when the server says an acknowledgement is
  // needed, so it cannot be ticked pre-emptively on a report that is fine.
  assert.match(warnings, /\{requiresAcknowledgement && \(/);
});

/* ============================================== templates and ownership == */

test("EDITING A BUILT-IN REPORT NEVER WRITES BACK TO IT", () => {
  // The report view has no update path at all: the only way to keep a change
  // is Save a Copy, which creates a NEW template. A built-in cannot be
  // mutated from here even by an administrator.
  assert.match(strip(view), /ReportHelper\.createTemplate\(/);
  assert.ok(!/updateTemplate/.test(strip(view)), "the report view must not update a template");
  assert.ok(!/deleteTemplate/.test(strip(view)), "nor delete one");
});

test("delete is offered only where the server said it is allowed", () => {
  // The catalogue page never decides ownership itself - it reads the server's
  // answer, and a built-in carries no such permission.
  assert.match(strip(saved), /template\.permissions && template\.permissions\.canDelete/);
});

test("AN UNTOUCHED SAVED REPORT IS RUN BY ID, SO IT IS RECONCILED", () => {
  // Sending the expanded definition instead would skip reconciliation
  // entirely, and with it every stale-value warning - including the one that
  // silently widens a one-branch report to the whole company. Once the user
  // edits it, what they can see must be what ran, so it goes expanded.
  const code = strip(bench);
  assert.match(code, /template && !edited\s*\?\s*\{ template_id: template\.template_id, page \}/);
  assert.match(
    code,
    /template && !dirty\s*\?\s*\{ template_id: template\.template_id, acknowledge_widened_filters: acknowledged \}/
  );
  // Editing a column or applying a filter is what makes it dirty.
  assert.match(code, /setDirty\(true\)/);
});

/* ================================================== the count on screen == */

test("THE COUNT SHOWN IS THE WHOLE RESULT, NOT THE PAGE", () => {
  // It is the number somebody checks before sending a file to PF or a bank,
  // and it is the number of rows the export will contain.
  assert.match(page, /\{preview\.matching_count\} employees found/);
  assert.match(page, /showing \{preview\.rows\.length\} on this page/);
});

test("an over-limit report says so and cannot be exported", () => {
  assert.match(pageCode, /overRowLimit = Boolean\(preview && preview\.over_row_limit\)/);
  assert.match(page, /Narrow the filters and run it again/);
});

/* ================================================== the field picker ==== */

test("ORDER IS THE CONTRACT, AND THE PICKER IS WHERE IT IS SET", () => {
  // Array position IS the column position - there is no separate sort index
  // anywhere to fall out of step with it.
  assert.match(picker, /const move = \(index, delta\)/);
  assert.match(picker, /\[next\[index\], next\[target\]\] = \[next\[target\], next\[index\]\]/);
  assert.match(picker, /Report columns, in order/);
});

test("a chosen field can always be un-chosen, even at the cap", () => {
  // Disabling an already-ticked box at the limit would make a report at the
  // cap impossible to edit at all.
  assert.match(picker, /isDisabled=\{disabled \|\| \(!isChosen && atLimit\)\}/);
});

test("a sensitive column is marked as such", () => {
  // Exporting one is a different decision from exporting a name, and the
  // export is audited as having included it.
  assert.match(picker, /field\.sensitive && \(/);
  assert.match(picker, /sensitive\s*<\/Badge>/);
});

/* ================================================== the helper ========== */

test("AN ERROR BODY IS NEVER SAVED TO DISK AS A SPREADSHEET", () => {
  // The response is requested as a blob, so a JSON refusal arrives as a blob
  // too. Without reading it back, a 409 would be downloaded as
  // `report.xlsx` containing JSON - which somebody opens in six months and
  // believes.
  assert.match(helperCode, /if \(res\.status !== 200\)/);
  assert.match(helperCode, /throw new ReportExportError/);
  assert.ok(
    helperCode.indexOf("res.status !== 200") < helperCode.indexOf("createObjectURL"),
    "the status is checked before anything is written to disk"
  );
});

test("each export refusal is told apart by the server's own code", () => {
  // A 409 needs "tick the box"; a 422 needs "narrow the filters"; a 403 needs
  // neither. Flattening them into "export failed" loses the next step.
  for (const code of ["FILTER_WIDENED", "TOO_MANY_ROWS", "EXPORT_FORBIDDEN"]) {
    assert.ok(helper.includes(code), `helper must name ${code}`);
    assert.ok(page.includes(code), `the screen must handle ${code}`);
  }
});

test("the object URL is revoked, so a large export is not held in memory", () => {
  assert.match(helperCode, /revokeObjectURL/);
});

/* ================================================== navigation ========== */

test("Reports is its own top-level module, behind both required keys", () => {
  // Placement is asserted in full by constants/hrNavigation.test.js; what
  // matters here is that the screen this file tests is actually reachable,
  // and reachable only by somebody holding the permission it checks.
  const reportsMenu = menus.slice(menus.indexOf("const REPORTS_MENU = {"), menus.indexOf("\n};", menus.indexOf("const REPORTS_MENU = {")));
  assert.match(reportsMenu, /location: "\/reports\/employee-master"/);
  assert.match(reportsMenu, /location: "\/reports\/employee-master\/new"/);
  assert.match(reportsMenu, /title: "Saved Reports"/);
  assert.match(reportsMenu, /title: "Create Report"/);
  // The same pair the screen and the backend require, so the entry cannot
  // appear on a rail belonging to somebody who would be refused on opening it.
  assert.match(reportsMenu, /permission: \["view_reports", "view_employees"\]/);
  assert.match(menus, /menu: REPORTS_MENU/);
});

test("only the dataset that exists is listed", () => {
  // An entry that leads nowhere is a promise the navigation cannot keep.
  // Attendance and Payroll reports arrive with their datasets.
  const reportsMenu = menus.slice(menus.indexOf("const REPORTS_MENU = {"), menus.indexOf("\n};", menus.indexOf("const REPORTS_MENU = {")));
  assert.ok(!/attendance/i.test(reportsMenu));
  assert.ok(!/payroll/i.test(reportsMenu));
});
