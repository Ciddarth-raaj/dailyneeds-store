/**
 * Present/Absent Only on the raw punch screens and the Shift Change form.
 *
 *   node --test util/attendancePresentAbsentOnlyViews.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { derivationStatusText, derivationStatusBadge, attendanceModeNote, DERIVATION_STATUS_LABEL } = require("./attendanceRaw");
const { shiftChangeNotApplicable } = require("./attendanceV2");

const NOT_APPLICABLE = "Shift Change is not applicable because this employee uses Present/Absent Only attendance.";

describe("Punch Audit / Attendance List status", () => {
  it("a Present/Absent Only punch reads as the attendance mode, never 'no assigned shift'", () => {
    const punch = { derivation_status: "NO_SHIFT", derivation_display: "Attendance Mode: Present/Absent Only" };
    assert.equal(derivationStatusText(punch), "Attendance Mode: Present/Absent Only");
    assert.equal(derivationStatusBadge(punch), "PRESENT/ABSENT ONLY");
    assert.doesNotMatch(derivationStatusText(punch), /no assigned shift/i);
  });

  it("every other punch reads exactly as before", () => {
    assert.equal(derivationStatusText({ derivation_status: "NO_SHIFT" }), DERIVATION_STATUS_LABEL.NO_SHIFT);
    assert.equal(derivationStatusBadge({ derivation_status: "NO_SHIFT" }), "NO_SHIFT");
    assert.equal(derivationStatusText({ derivation_status: "OK" }), "");
    assert.equal(derivationStatusBadge({ derivation_status: "OK" }), null);
    assert.equal(derivationStatusText({ derivation_status: null }), "No derived row");
  });

  it("the screen renders through those helpers, and the list row names the mode", () => {
    const page = fs.readFileSync(path.join(__dirname, "../pages/attendance/list/index.jsx"), "utf8");
    assert.match(page, /derivationStatusText\(p\.data\)/);
    assert.match(page, /derivationStatusBadge\(p\.data\)/);
    assert.match(page, /attendanceModeNote\(p\.data\)/);
    assert.equal(attendanceModeNote({ attendance_calculation_mode: "PRESENT_ABSENT_ONLY" }), "Present/Absent Only");
    assert.equal(attendanceModeNote({ attendance_calculation_mode: "SHIFT_BASED" }), null);
  });
});

describe("the One-Day Shift Change form", () => {
  it("is told the date does not apply when the server says Present/Absent Only", () => {
    assert.equal(
      shiftChangeNotApplicable({ can_raise: false, attendance_calculation_mode: "PRESENT_ABSENT_ONLY", reason: NOT_APPLICABLE }),
      NOT_APPLICABLE
    );
  });

  it("any other answer leaves the form exactly as it was", () => {
    assert.equal(shiftChangeNotApplicable({ can_raise: false, reason: "HR blocked", hr_blocked: true }), null);
    assert.equal(shiftChangeNotApplicable({ can_raise: true, options: [] }), null);
    assert.equal(shiftChangeNotApplicable(null), null);
  });

  it("disables Submit and shows the reason - the server still refuses regardless", () => {
    const form = fs.readFileSync(path.join(__dirname, "../components/attendance/ShiftChangeRequestForm.jsx"), "utf8");
    assert.match(form, /setNotApplicable\(shiftChangeNotApplicable\(res\)\)/);
    assert.match(form, /isDisabled=\{Boolean\(notApplicable\)\}/);
  });
});
