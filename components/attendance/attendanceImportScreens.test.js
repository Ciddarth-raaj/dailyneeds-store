/**
 * Attendance Import screen, helper and navigation.
 *
 *   node --test components/attendance/attendanceImportScreens.test.js
 *
 * No component renderer is wired up in this repo, so these read the sources
 * the way components/attendance/attendanceScreens.test.js does. What is
 * defended is the approved shape of the screen:
 *
 *   - the page and the menu entry are behind `manage_attendance_import`
 *   - two tabs of its own; the Attendance List tabs are not touched
 *   - preview comes before commit, and there is no import button before one
 *   - choosing another file clears the preview
 *   - commit is confirmed in a modal, disabled while in flight, and a 409 is
 *     handled as "already committed", not as a failure
 *   - the exception grid pages on the SERVER
 *   - history has no delete
 *   - nothing calculates attendance and no filesystem path is ever shown
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/imports/index.jsx"));
const helper = strip(read("helper/attendance.js"));
const menus = read("constants/menus.js");
const permissions = read("constants/permissions.js");
const listPage = strip(read("pages/attendance/list/index.jsx"));

/** The code of one function component in the page file. */
const section = (name) => {
  const start = page.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} exists`);
  const next = page.indexOf("\nfunction ", start + 1);
  return page.slice(start, next === -1 ? undefined : next);
};
const newImport = section("NewImportTab");
const history = section("ImportHistoryTab");
const items = section("ItemsSection");

/* ------------------------------------------------------------ permission */

test("the page is gated on manage_attendance_import and nothing weaker", () => {
  assert.match(page, /permissionKey=\{\["manage_attendance_import"\]\}/);
  assert.doesNotMatch(page, /permissionKey=\{\["view_raw_attendance"\]\}/);
});

test("the menu entry is gated on the same key, so a user without it never sees it", () => {
  const entry = menus.slice(menus.indexOf("import_attendance:"), menus.indexOf("import_attendance:") + 260);
  assert.match(entry, /title: "Import Attendance"/);
  assert.match(entry, /permission: "manage_attendance_import"/);
  assert.match(entry, /location: "\/attendance\/imports"/);
});

test("it sits inside the existing HR > Attendance section and disturbs none of the three screens there", () => {
  const start = menus.indexOf("attendance: {");
  const sub = menus.slice(start, menus.indexOf("};", start));
  for (const existing of ['location: "/attendance/list"', 'location: "/attendance/list?tab=audit"', 'location: "/attendance/devices"']) {
    assert.ok(sub.includes(existing), `${existing} is untouched`);
  }
  // Inside the Attendance submenu, not a new top-level module.
  assert.ok(sub.indexOf("import_attendance:") > sub.indexOf("subMenu"));
});

test("the permission is listed so an administrator can grant it deliberately", () => {
  assert.match(permissions, /manage_attendance_import: "Import Attendance from DigiSME Excel"/);
});

test("the Attendance List page and its two tabs are not modified by this feature", () => {
  assert.match(listPage, /<Tab>Attendance List<\/Tab>/);
  assert.match(listPage, /<Tab>Punch Audit<\/Tab>/);
  assert.doesNotMatch(listPage, /Import Attendance|attendance\/imports/);
});

/* ----------------------------------------------------------------- tabs */

test("the import screen has its own two tabs: New Import and Import History", () => {
  assert.match(page, /<Tab>New Import<\/Tab>/);
  assert.match(page, /<Tab>Import History<\/Tab>/);
  assert.match(page, /Import historical attendance punches from DigiSME Excel exports\./);
  assert.match(page, /ATD Daily Attendance \(\.xlsx\)/);
});

test("it is built from the project's own components, not a parallel UI kit", () => {
  for (const component of ["GlobalWrapper", "CustomContainer", "AgGrid", "CustomModal"]) {
    assert.ok(page.includes(component), component);
  }
  assert.match(page, /from "@chakra-ui\/react"/);
  assert.doesNotMatch(page, /from "(axios|node-fetch|superagent)"/, "no second HTTP client");
  assert.doesNotMatch(page, /fetch\(/, "requests go through the helper");
});

/* --------------------------------------------------------- upload/preview */

test("the file picker accepts only .xlsx and shows the chosen name and size", () => {
  assert.match(newImport, /type="file"\s+accept="\.xlsx"/);
  assert.match(newImport, /Choose Excel File/);
  assert.match(newImport, /\{file\.name\}/);
  assert.match(newImport, /formatBytes\(file\.size\)/);
});

test("Preview Import is the only action before a preview exists - no import button appears first", () => {
  assert.match(newImport, /Preview Import/);
  const beforePreview = newImport.slice(0, newImport.indexOf("{preview ?"));
  assert.doesNotMatch(beforePreview, /Confirm Import|Import Attendance</);
  // Confirm Import only renders for a batch the server says is PREVIEWED.
  assert.match(newImport, /canCommit\(batch\) \?[\s\S]{0,400}Confirm Import/);
});

test("preview posts the file as multipart to the preview endpoint and cannot be double submitted", () => {
  assert.match(helper, /previewDigiSmeImport: \(file\) => \{[\s\S]*?new FormData\(\)[\s\S]*?formData\.append\("file", file, file\.name\)[\s\S]*?\/attendance\/imports\/digisme\/preview/);
  assert.match(newImport, /if \(previewing \|\| committing\) return;/);
  assert.match(newImport, /isLoading=\{previewing\}/);
  assert.match(newImport, /isDisabled=\{!file \|\| previewing \|\| committing\}/);
});

test("the browser never parses the workbook: no Excel library reaches this screen", () => {
  assert.doesNotMatch(page, /from "(xlsx|exceljs|papaparse|sheetjs)"/i);
  assert.doesNotMatch(page, /require\("(xlsx|exceljs|papaparse)"\)/i);
  assert.doesNotMatch(page, /XLSX\.|FileReader|arrayBuffer\(\)|readAsArrayBuffer/);
});

test("ANY new file selection clears the preview - same name and size included", () => {
  const handler = newImport.slice(newImport.indexOf("const onChooseFile"), newImport.indexOf("const reset"));
  // Unconditional: no comparison of the old file with the new one decides it.
  assert.match(handler, /setPreview\(null\);/);
  assert.match(handler, /setFilterFromCard\(""\);/);
  assert.doesNotMatch(handler, /selectionInvalidatesPreview|file\.name ===|file\.size ===|!==/);
  // And the clear is not nested inside a condition on the file itself.
  const clearAt = handler.indexOf("setPreview(null)");
  const guardAt = handler.indexOf("if (committing) return;");
  assert.ok(guardAt !== -1 && guardAt < clearAt, "the only guard before the clear is the commit lock");
  assert.strictEqual(handler.slice(guardAt + 24, clearAt).includes("if ("), false, "no further condition");
});

test("the browser never compares files to decide: no hashing or byte reading of the workbook", () => {
  assert.doesNotMatch(page, /createHash|sha256|crypto\.subtle|lastModified/i);
});

/* ------------------------------------------------------- locked on commit */

test("the file input is disabled while a batch is being committed", () => {
  assert.match(newImport, /type="file"[\s\S]{0,200}disabled=\{previewing \|\| committing\}/);
});

test("file selection is ignored outright during a commit, not merely visually disabled", () => {
  const handler = newImport.slice(newImport.indexOf("const onChooseFile"), newImport.indexOf("const reset"));
  assert.match(handler, /if \(committing\) return;/);
  assert.ok(handler.indexOf("if (committing) return;") < handler.indexOf("e.target.files"), "before the file is even read");
});

test("Preview Import is disabled during a commit and runPreview refuses to start", () => {
  assert.match(newImport, /isDisabled=\{!file \|\| previewing \|\| committing\}/);
  const run = newImport.slice(newImport.indexOf("const runPreview"), newImport.indexOf("const refreshDetails"));
  assert.match(run, /if \(previewing \|\| committing\) return;/);
  // The guard is the first thing in the function, before any request.
  assert.ok(run.indexOf("previewing || committing") < run.indexOf("previewDigiSmeImport"));
});

test("Start Over is disabled during a commit and refuses to clear state if called", () => {
  assert.match(newImport, /onClick=\{reset\} isDisabled=\{previewing \|\| committing\}/);
  const reset = newImport.slice(newImport.indexOf("const reset ="), newImport.indexOf("const runPreview"));
  assert.match(reset, /if \(committing\) return;/);
  assert.ok(reset.indexOf("if (committing) return;") < reset.indexOf("setFile(null)"));
});

/* -------------------------------------------------------------- summary */

test("the preview shows the batch facts and the five counts from the server", () => {
  assert.match(newImport, /<Facts batch=\{batch\} \/>/);
  assert.match(newImport, /<SummaryCards batch=\{batch\}/);
  assert.match(page, /batchFacts\(batch\)/);
  assert.match(page, /summaryCards\(batch\)/);
});

test("counts and classifications come from the server, never recomputed on screen", () => {
  assert.doesNotMatch(page, /valid_count \+|\+ unmatched_count|reduce\(/);
  assert.match(page, /commitPlan\(batch\)/);
});

test("the screen never claims the Excel data is or emulates terminal/protocol data", () => {
  assert.doesNotMatch(page, /as a terminal would have sent|exactly as a terminal|emulat|BM70W|protocol|as if from a device/i);
  // What it says instead: what a cell becomes, where it is stored, and that
  // nothing is calculated.
  const flat = page.replace(/\s+/g, " ");
  assert.match(flat, /Every non-empty Clock Time cell becomes one attendance punch\./);
  assert.match(flat, /stored in the same attendance punch store with source DigiSME Import/);
  assert.match(flat, /No attendance calculation is performed here\./);
});

test("nothing on the screen calculates attendance", () => {
  assert.doesNotMatch(page, /IN\/OUT|overtime|\blateness\b|hours worked|worked_hours|total_hours|in_time|out_time|payroll/i);
});

test("unmatched employee codes are listed with their punch count and first row, and cannot be remapped here", () => {
  assert.match(page, /Unmatched Employee Codes/);
  assert.match(page, /Employee Code<\/Box>/);
  assert.match(page, /Punch Count<\/Box>/);
  assert.match(page, /First Excel Row<\/Box>/);
  assert.match(page, /unmatched_employee_codes/);
  assert.doesNotMatch(page, /map to employee|reassign|setEmployeeId|employee_id=/i);
});

/* ------------------------------------------------------------ exceptions */

test("the exception grid filters by classification and pages on the SERVER", () => {
  assert.match(items, /ITEM_FILTERS\.map/);
  assert.match(items, /getAttendanceImportItems\(\s*itemsQuery\(importBatchId, classification, page, ITEMS_PAGE_SIZE\)/);
  assert.match(items, /setPage\(1\)/, "changing the filter returns to the first page");
  assert.match(items, /pageCount\(data\.total, ITEMS_PAGE_SIZE\)/);
});

test("imported punches show no invented device or location, and the blank is explained", () => {
  assert.match(items, /no device and no punch location - that is correct, not missing data|no punch location/);
  const cols = items.slice(items.indexOf("itemColumns("));
  assert.doesNotMatch(cols, /dev_id|punch_outlet|device_label|source_ip/);
});

/* ---------------------------------------------------------------- commit */

test("commit is confirmed in a modal that states the punch count and every consequence", () => {
  assert.match(newImport, /You are about to import \{formatCount\(plan\.toImport\)\} punches\./);
  assert.match(newImport, /Unmatched punches: \{formatCount\(plan\.unmatched\)\}/);
  assert.match(newImport, /Duplicates to skip: \{formatCount\(plan\.duplicates\)\}/);
  assert.match(newImport, /Collisions to retain: \{formatCount\(plan\.collisions\)\}/);
  assert.match(newImport, /Bad rows to skip: \{formatCount\(plan\.badRows\)\}/);
  assert.match(newImport, /Import Attendance\s*<\/Button>/);
});

test("the commit button cannot be pressed twice and needs a batch id", () => {
  assert.match(newImport, /if \(committing \|\| !batch\) return;/);
  assert.match(newImport, /setConfirmOpen\(false\)/);
  assert.match(newImport, /commitAttendanceImport\(batch\.import_batch_id\)/);
  assert.match(newImport, /isDisabled=\{committing\}/);
});

test("a 409 means the batch was already committed: the details are refreshed, not an error shown", () => {
  const start = newImport.indexOf("res.code === 409");
  assert.notStrictEqual(start, -1);
  const branch = newImport.slice(start, newImport.indexOf("} else {", start));
  assert.match(branch, /refreshDetails\(batch\.import_batch_id\)/);
  assert.match(branch, /status: "info"/);
  assert.doesNotMatch(branch, /status: "error"/);
});

test("after a commit the outcome counts and the batch status are shown, with a way to the Punch Audit", () => {
  assert.match(newImport, /outcomeRows\(preview\.outcome_counts\)/);
  assert.match(newImport, /commitResultMessage\(batch, preview\.outcome_counts\)/);
  assert.match(newImport, /BATCH_STATUS_LABEL\[batch\.status\]/);
  assert.match(newImport, /href="\/attendance\/list\?tab=audit"[\s\S]{0,200}View Punch Audit/);
});

/* --------------------------------------------------------------- history */

test("history lists the approved columns and opens a batch's details and items", () => {
  for (const header of ["Date/Time", "Filename", "Date Range", "Uploaded By", "Status", "Punches Found", "Imported", "Skipped", "Failed"]) {
    assert.ok(history.includes(`headerName: "${header}"`), header);
  }
  assert.match(history, /listAttendanceImports\(\)/);
  assert.match(history, /getAttendanceImportDetails\(id\)/);
  assert.match(history, /<ItemsSection importBatchId=\{details\.batch\.import_batch_id\}/);
});

test("import history is permanent: the screen offers no delete", () => {
  // No delete CONTROL and no delete call - the words appear only where the
  // screen tells the operator the history is permanent.
  assert.doesNotMatch(page, /onDelete|handleDelete|deleteBatch|ConfirmDeleteModal|iconType: "delete"/);
  assert.doesNotMatch(helper, /deleteAttendanceImport|\/attendance\/imports\/delete/);
  assert.match(history, /there is no delete/i);
});

/* ---------------------------------------------------------------- helper */

test("the helper exposes exactly the five documented calls on the backend's paths", () => {
  assert.match(helper, /previewDigiSmeImport/);
  assert.match(helper, /listAttendanceImports: \(params\) => get\("\/attendance\/imports", params\)/);
  assert.match(helper, /getAttendanceImportDetails: \(import_batch_id\) =>\s*get\("\/attendance\/imports\/details", \{ import_batch_id \}\)/);
  assert.match(helper, /getAttendanceImportItems: \(params\) => get\("\/attendance\/imports\/items", params\)/);
  assert.match(helper, /commitAttendanceImport: \(import_batch_id\) =>\s*post\("\/attendance\/imports\/commit", \{ import_batch_id \}\)/);
});

test("it uses the project's own API client, so the session token is handled as everywhere else", () => {
  assert.match(helper, /import API from "\.\.\/util\/api"/);
  assert.doesNotMatch(helper, /axios\.create|new XMLHttpRequest|window\.fetch/);
});

test("no filesystem path is ever rendered", () => {
  assert.doesNotMatch(page, /file\.path|tmpdir|\/tmp\/|filepath/i);
});

/* ------------------------------------------------------------ responsive */

test("the summary and outcome grids wrap responsively instead of forcing a wide screen", () => {
  assert.match(page, /columns=\{\{ base: 1, sm: 2, lg: 3, xl: 5 \}\}/);
  assert.match(page, /columns=\{\{ base: 1, sm: 2, lg: 3, xl: 6 \}\}/);
  assert.match(page, /direction=\{\{ base: "column", md: "row" \}\}/);
  assert.match(page, /overflowX="auto"/);
});
