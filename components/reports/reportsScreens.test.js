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

const page = read("pages/reports/employee-master.jsx");
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

test("the filters sent are exactly the five the server accepts", () => {
  const declared = pageCode.slice(
    pageCode.indexOf("const EMPTY_FILTERS"),
    pageCode.indexOf("};", pageCode.indexOf("const EMPTY_FILTERS"))
  );
  for (const key of ["status", "outlet_ids", "department_ids", "designation_ids", "search"]) {
    assert.ok(declared.includes(key), `missing filter: ${key}`);
  }
  // Nothing else. A sixth key would be silently dropped by Joi's strict
  // validation, which is a control that appears to work and does not.
  const keys = (declared.match(/^\s*(\w+):/gm) || []).map((k) => k.trim().replace(":", ""));
  assert.deepStrictEqual(keys.sort(), [
    "department_ids",
    "designation_ids",
    "outlet_ids",
    "search",
    "status",
  ]);
});

/* ================================================ permissions on screen == */

test("THE SCREEN IS GATED ON view_reports", () => {
  assert.match(pageCode, /usePermissions\(\["view_reports"\]\)/);
  // And it says so rather than rendering an empty report, which would look
  // like there is no data rather than no access.
  assert.match(page, /You do not have permission to view reports/);
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
  assert.match(pageCode, /ReportHelper\.getFields\(\)/);
  for (const columnish of ["pan_no", "account_no", "uan", "esi_number", "aadhaar"]) {
    assert.ok(
      !new RegExp(columnish).test(pageCode),
      `the screen must not name the '${columnish}' column itself`
    );
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
  assert.match(pageCode, /isDisabled=\{blockedByAcknowledgement \|\| overRowLimit\}/);
  assert.ok(
    !/Run report[\s\S]{0,200}blockedByAcknowledgement/.test(pageCode),
    "preview must not be gated on the acknowledgement"
  );
});

test("AN ACKNOWLEDGEMENT DOES NOT SURVIVE A NEW RUN OR AN EDIT", () => {
  // A fresh run is a fresh decision. Carrying a tick over from a previous
  // result would mean somebody acknowledged a different report's widening.
  const runBody = pageCode.slice(pageCode.indexOf("const run = async"));
  assert.match(runBody.slice(0, runBody.indexOf("const doExport")), /setAcknowledged\(false\)/);

  const edit = pageCode.slice(pageCode.indexOf("const editDefinition"));
  assert.match(edit.slice(0, 240), /setAcknowledged\(false\)/);
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

test("EDITING THE DEFINITION DETACHES IT FROM THE SAVED REPORT", () => {
  // Otherwise Update would overwrite a colleague's shared report with
  // something they never saw.
  assert.match(pageCode, /if \(templateId\) setTemplateId\(null\)/);
});

test("Update is offered only where the server said it is allowed", () => {
  assert.match(pageCode, /activeTemplate\.permissions &&\s*activeTemplate\.permissions\.canEdit/);
  assert.match(pageCode, /permitted\.canDelete && \(/);
  assert.match(pageCode, /permitted\.canCopy && \(/);
  // The screen never decides ownership itself - it reads the server's answer.
  assert.ok(!/is_system === 1 \?/.test(pageCode.replace(/Badge[\s\S]{0,200}/g, "")));
});

test("A SAVED REPORT IS RUN BY ID, SO IT IS RECONCILED", () => {
  // Sending the expanded definition instead would skip reconciliation
  // entirely, and with it every stale-value warning - including the one that
  // silently widens a one-branch report to the whole company.
  assert.match(pageCode, /templateId\s*\?\s*\{ template_id: templateId, page \}/);
  assert.match(
    pageCode,
    /templateId\s*\?\s*\{ template_id: templateId, acknowledge_widened_filters: acknowledged \}/
  );
});

/* ================================================== the count on screen == */

test("THE COUNT SHOWN IS THE WHOLE RESULT, NOT THE PAGE", () => {
  // It is the number somebody checks before sending a file to PF or a bank,
  // and it is the number of rows the export will contain.
  assert.match(page, /\{preview\.matching_count\} matching employees/);
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

test("Reports is in the HR menu, behind view_reports", () => {
  assert.match(menus, /location: "\/reports\/employee-master"/);
  const section = menus.slice(menus.indexOf("  reports: {"));
  assert.match(section.slice(0, 600), /permission: "view_reports"/);
});

test("only the dataset that exists is listed", () => {
  // An empty section is a promise the navigation cannot keep. Attendance and
  // Payroll reports arrive with their datasets.
  const section = menus.slice(menus.indexOf("  reports: {"), menus.indexOf("MENU_MODULES"));
  assert.ok(!/attendance/i.test(section));
  assert.ok(!/payroll/i.test(section));
});
