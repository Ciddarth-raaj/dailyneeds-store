/**
 * Attendance -> Device Time Correction - the shape of the screen, read from
 * the sources (no renderer in this repo).
 *
 *   node --test components/attendance/deviceTimeCorrection.test.js
 *
 * The backend is the boundary: every `/attendance/device-time-corrections`
 * route checks `user_type` 2, the preview fingerprint, the payroll lock and
 * the batch state itself. What this pins is that the SCREEN shows its
 * controls to administrators only, previews before it can apply, discards a
 * preview when the criteria change, sends only criteria (never punch ids or
 * corrected times), demands a reason to revert, and that the Punch Audit
 * shows the device-clock correction.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/device-time-correction/index.jsx"));
const helper = strip(read("helper/attendance.js"));
const menus = read("constants/menus.js");
const audit = strip(read("pages/attendance/list/index.jsx"));

test("administrators only: the controls render for user_type 2 and nobody else", () => {
  assert.match(page, /const isAdmin = String\(userConfig && userConfig\.userType\) === "2";/);
  assert.match(page, /if \(!isAdmin\) \{\s*return \(/);
  assert.match(page, /available to administrators only/);
  assert.match(page, /if \(!isAdmin\) return;/, "no API call for a non-administrator");
});

test("Apply is disabled until a preview that can apply, and asks for confirmation", () => {
  assert.match(page, /isDisabled=\{!preview \|\| !preview\.can_apply \|\| busy !== null\}/);
  assert.match(page, /onClick=\{\(\) => setConfirming\(true\)\}/);
  assert.match(page, /buildApplyBody\(previewBody, preview\)/);
});

test("any change to the criteria discards the preview", () => {
  const setField = /const setField = \(key, value\) => \{([\s\S]*?)\n  \};/.exec(page)[1];
  assert.match(setField, /setPreview\(null\)/);
  assert.match(setField, /setPreviewBody\(null\)/);
});

test("the preview table has the six requested columns", () => {
  for (const h of ["Employee ID", "Employee Name", "Original Punch", "Corrected Punch", "Device", "Outlet"]) {
    assert.ok(page.includes(`<Th>${h}</Th>`), h);
  }
});

test("revert needs a reason of five characters", () => {
  assert.match(page, /isDisabled=\{revertReason\.trim\(\)\.length < 5\}/);
  assert.match(page, /revertDeviceTimeCorrection\(\s*reverting\.attendance_device_time_correction_id,\s*revertReason\.trim\(\)\s*\)/);
});

test("the helper sends criteria and the preview's tokens - no punch id, corrected time or actor", () => {
  assert.match(helper, /previewDeviceTimeCorrection: \(body\) => post\("\/attendance\/device-time-corrections\/preview", body\)/);
  assert.match(helper, /applyDeviceTimeCorrection: \(body\) => post\("\/attendance\/device-time-corrections", body\)/);
  assert.match(helper, /revertDeviceTimeCorrection: \(id, reason\) => post\(`\/attendance\/device-time-corrections\/\$\{id\}\/revert`, \{ reason \}\)/);
  // What the page POSTs is the built criteria body, or it plus the preview's tokens.
  assert.match(page, /AttendanceHelper\.previewDeviceTimeCorrection\(built\.body\)/);
  assert.match(page, /AttendanceHelper\.applyDeviceTimeCorrection\(body\)/);
  assert.ok(!/biomax_punch_id/.test(helper.slice(helper.indexOf("getDeviceTimeCorrectionOptions"), helper.indexOf("DigiSME"))));
});

test("the menu entry is under Attendance, on the admin-only device key", () => {
  assert.match(
    menus,
    /device_time_correction: \{\s*title: "Device Time Correction",\s*permission: "manage_biomax_devices",\s*selected: false,\s*location: "\/attendance\/device-time-correction",\s*\}/
  );
});

test("the Punch Audit shows the original device time and the correction line", () => {
  assert.match(audit, /import \{ correctionAuditLine \} from "..\/..\/..\/util\/deviceTimeCorrection";/);
  assert.match(audit, /headerName: "Original Device Time"/);
  assert.match(audit, /headerName: "Device Time Correction"/);
  assert.match(audit, /CLOCK CORRECTED/);
});
