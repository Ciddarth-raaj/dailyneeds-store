/**
 * Attendance - Part 1 screens.
 *
 *   node --test components/attendance/attendanceScreens.test.js
 *
 * No component renderer is wired up in this repo, so these read the sources
 * the way components/work-shift/workShiftScreens.test.js does. What is
 * defended is the approved shape of the screens:
 *
 *   - the Attendance List has NO device / punch-location control; the Punch
 *     Audit has them; Home Outlet is on the list only
 *   - the location under a time is rendered identically for every punch
 *     (no colour or weight keyed on home outlet)
 *   - a quarantined count links to the Punch Audit
 *   - export is server-side CSV, not the grid's client export
 *   - nothing on either tab calculates attendance
 *   - devices: no delete, Cloud ID not an editable field, history shown,
 *     Effective From asked for on every registration
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/list/index.jsx"));
const cell = strip(read("components/attendance/PunchTimeCell.jsx"));
const banners = strip(read("components/attendance/AttendanceBanners.jsx"));
const helper = strip(read("helper/attendance.js"));
const devicesList = strip(read("pages/attendance/devices/index.jsx"));
const deviceNew = strip(read("pages/attendance/devices/new.jsx"));
const devicePage = strip(read("pages/attendance/devices/[id].jsx"));
const deviceForm = strip(read("components/attendance/DeviceForm.jsx"));
const permissions = read("constants/permissions.js");

/** The code of one function component in the page file. */
const section = (name) => {
  const start = page.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} exists`);
  const next = page.indexOf("\nfunction ", start + 1);
  return page.slice(start, next === -1 ? undefined : next);
};
const listTab = section("AttendanceListTab");
const auditTab = section("PunchAuditTab");

/* ================================================== two views (R14) ==== */

test("the Attendance List tab has Home Outlet, Department and Employee filters and NO device or punch-location control", () => {
  assert.match(listTab, /<FormLabel fontSize="sm">Home Outlet<\/FormLabel>/);
  assert.match(listTab, /<FormLabel fontSize="sm">Department<\/FormLabel>/);
  assert.match(listTab, /<FormLabel fontSize="sm">Employee<\/FormLabel>/);
  assert.ok(!/Punch Location|Device status|>Device</.test(listTab), "no device / punch-location control on the list");
  assert.ok(!/dev_id|punch_outlet_id/.test(listTab), "the list never sends a device parameter");
  assert.match(listTab, /buildListQuery\(/);
});

test("the Punch Audit tab has Punch Location, Device, Device status and Review filters, and no Home Outlet filter", () => {
  assert.match(auditTab, /<FormLabel fontSize="sm">Punch Location<\/FormLabel>/);
  assert.match(auditTab, /<FormLabel fontSize="sm">Device<\/FormLabel>/);
  assert.match(auditTab, /<FormLabel fontSize="sm">Device status<\/FormLabel>/);
  assert.match(auditTab, /<FormLabel fontSize="sm">Review<\/FormLabel>/);
  assert.ok(!/Home Outlet<\/FormLabel>/.test(auditTab));
  assert.match(auditTab, /buildAuditQuery\(/);
});

test("the Punch Audit is a separate tab behind its own permission, and says it is not an attendance list", () => {
  assert.match(page, /usePermissions\(\["view_attendance_punch_audit"\]\)/);
  assert.match(page, /canAudit \? <Tab>Punch Audit<\/Tab> : null/);
  assert.match(auditTab, /It is not an attendance list/);
});

test("the page is gated on view_raw_attendance and exports on export_raw_attendance", () => {
  assert.match(page, /permissionKey=\{\["view_raw_attendance"\]\}/);
  assert.match(page, /usePermissions\(\["export_raw_attendance"\]\)/);
  assert.match(listTab, /canExport \?/);
});

/* ================================================= dynamic columns ===== */

test("Clock Time columns come from attendanceListColumns(n) with n from the result - nothing hard-codes 4", () => {
  assert.match(listTab, /clockTimeColumnCount\(meta, rows\)/);
  assert.match(listTab, /attendanceListColumns\(n\)/);
  assert.ok(!/Clock Time-4|clock_time_4/.test(listTab), "no fixed fourth column anywhere");
});

test("the Clock Date column is shown as DD/MM/YYYY", () => {
  assert.match(listTab, /field: "clock_date_display"/);
});

/* ============================================== neutral location ======= */

test("the location under each time is neutral: one style for every punch, nothing keyed on home outlet", () => {
  assert.match(cell, /className="punch-location"/);
  assert.ok(!/at_home_outlet|home_outlet|away|colorScheme=|fontWeight=/.test(cell), "no home-vs-away styling in the cell");
  // The popover carries the audit detail.
  for (const label of ["Punch location", "Device", "Cloud ID", "Punched at", "Source IP"]) {
    assert.ok(cell.includes(label), label);
  }
});

/* ====================================================== quarantine ===== */

test("a quarantined count renders as '+N quarantined' linking to the Punch Audit for that day", () => {
  assert.match(listTab, /punchesCellText\(p\.data\)/);
  assert.match(listTab, /auditLinkFor\(p\.data\)/);
  assert.match(listTab, /quarantined_punch_count > 0/);
});

test("banners name the screen that fixes each condition, and the review queue", () => {
  assert.match(banners, /bannerItems\(meta\)/);
  assert.match(banners, /Review queue/);
});

/* ============================================= server-side export ====== */

test("export is the server's CSV with the same filters; the grid's client export is hidden", () => {
  assert.match(listTab, /AttendanceHelper\.exportAttendanceList\(\{ \.\.\.buildListQuery\(filters\)/);
  assert.match(listTab, /with_locations: 1/);
  assert.match(auditTab, /AttendanceHelper\.exportPunchAudit\(buildAuditQuery\(filters\)\)/);
  assert.match(listTab, /<AgGrid[^>]*hideExport/);
  assert.match(auditTab, /<AgGrid[^>]*hideExport/);
  assert.match(helper, /\/attendance\/raw\/export\.csv/);
  assert.match(helper, /\/attendance\/raw\/punches\/export\.csv/);
  assert.match(helper, /responseType: "blob"/);
});

/* ================================================ no calculation ======= */

test("NOTHING ON EITHER TAB CALCULATES ATTENDANCE", () => {
  for (const [name, src] of [["page", page], ["cell", cell], ["helper", helper]]) {
    assert.ok(!/\b(worked|overtime|OT|late|early|grace|present|absent|half.?day|clock_in|clock_out)\b|IN\/OUT/i.test(src), `${name} contains no attendance calculation`);
  }
});

/* ======================================================== devices ====== */

test("the device list shows the approved columns and links to Add Device for managers", () => {
  const headers = (devicesList.match(/headerName:\s*"([^"]+)"/g) || []).map((m) => m.slice(13, -1));
  assert.deepStrictEqual(headers, ["Device Label", "Cloud ID", "Location", "Effective From", "Effective To", "Status", "Last Punch", "Punches Today", "Actions"]);
  assert.match(devicesList, /\+ Add Device/);
  assert.match(devicesList, /usePermissions\(\["manage_biomax_devices"\]\)/);
  assert.match(devicesList, /permissionKey=\{\["view_biomax_devices"\]\}/);
});

test("THERE IS NO DELETE for a device, in the pages or the helper", () => {
  for (const [name, src] of [["list", devicesList], ["page", devicePage], ["helper", helper]]) {
    assert.ok(!/\bdelete\b|iconType:\s*"delete"|removeDevice/i.test(src), `${name} offers no delete`);
  }
});

test("unregistered devices are listed and Register pre-fills the Cloud ID and suggests the first punch as Effective From", () => {
  assert.match(devicesList, /Unregistered devices seen/);
  assert.match(devicesList, /\/attendance\/devices\/new\?dev_id=/);
  assert.match(devicesList, /first_punch=/);
  assert.match(deviceNew, /router\.query/);
  assert.match(deviceNew, /first_punch/);
});

test("Add Device asks for Location and Effective From every time, with no default date", () => {
  assert.match(deviceForm, /<FormLabel>Location<\/FormLabel>/);
  assert.match(deviceForm, /<FormLabel>Effective From<\/FormLabel>/);
  assert.ok(!/2026-09-01/.test(deviceForm + deviceNew), "the seed date is not a default");
  assert.match(deviceNew, /isDisabled=\{!value\.dev_id \|\| !value\.label \|\| !value\.outlet_id \|\| !value\.effective_from\}/);
});

test("the Cloud ID is not an editable field on the device page; correction is a separate audited action with a reason", () => {
  // The only Input bound to details is label; notes is a Textarea.
  assert.ok(!/value=\{details\.dev_id\}/.test(devicePage));
  assert.match(devicePage, /Correct Cloud ID/);
  assert.match(devicePage, /<FormLabel>Reason<\/FormLabel>/);
  assert.match(devicePage, /correctCloudId\(/);
});

test("Move, Deactivate and Reactivate are effective-dated, and closing before the last punch asks for confirmation", () => {
  assert.match(devicePage, /open\("move"\)/);
  assert.match(devicePage, /open\("deactivate"\)/);
  assert.match(devicePage, /open\("reactivate"\)/);
  assert.match(devicePage, /type="datetime-local"/);
  assert.match(devicePage, /needs_confirmation/);
  assert.match(devicePage, /confirm_before_last_punch: withConfirm/);
  assert.match(devicePage, /Yes, do it anyway/);
});

test("the device page shows the location history and the event history", () => {
  assert.match(devicePage, /Location history/);
  assert.match(devicePage, /Device history/);
  assert.match(devicePage, /effective_to: a\.effective_to \? displayDateTime\(a\.effective_to\) : "open"/);
});

/* ==================================================== permissions ====== */

test("the six attendance keys are in the permission catalogue under their own group", () => {
  const start = permissions.indexOf("attendance: {");
  const block = permissions.slice(start, permissions.indexOf("},", start));
  for (const key of ["view_raw_attendance", "export_raw_attendance", "view_attendance_punch_audit", "view_biomax_devices", "manage_biomax_devices", "rederive_attendance"]) {
    assert.ok(block.includes(key), key);
  }
});
