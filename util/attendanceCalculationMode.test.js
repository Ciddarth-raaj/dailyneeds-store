/**
 * Employment Details -> Attendance Calculation Type, the pure part.
 *
 *   node --test util/attendanceCalculationMode.test.js
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  ATTENDANCE_MODE,
  ATTENDANCE_MODE_OPTIONS,
  attendanceModeSummary,
  attendanceModeChange,
  currentAttendanceMode,
} = require("./attendanceCalculationMode");

const SHIFT_TODAY = { current_mode: "SHIFT_BASED", current_effective_from: null, upcoming: null, history: [] };

describe("the options and the read-only line", () => {
  it("offers exactly the two types, Shift Based first (the default)", () => {
    assert.deepEqual(
      ATTENDANCE_MODE_OPTIONS.map((o) => o.value),
      ["SHIFT_BASED", "PRESENT_ABSENT_ONLY"]
    );
    assert.deepEqual(
      ATTENDANCE_MODE_OPTIONS.map((o) => o.label),
      ["Shift Based", "Present/Absent Only"]
    );
  });

  it("an unread or empty answer is Shift Based", () => {
    assert.equal(currentAttendanceMode(null), ATTENDANCE_MODE.SHIFT_BASED);
    assert.equal(attendanceModeSummary(SHIFT_TODAY), "Shift Based");
  });

  it("states a scheduled change with its date", () => {
    const data = {
      ...SHIFT_TODAY,
      upcoming: { calculation_mode: "PRESENT_ABSENT_ONLY", effective_from: "2026-10-01" },
    };
    assert.equal(attendanceModeSummary(data), "Shift Based · Present/Absent Only from 01/10/2026");
  });

  it("states where the current type came from", () => {
    const data = { current_mode: "PRESENT_ABSENT_ONLY", current_effective_from: "2026-10-01", upcoming: null };
    assert.equal(attendanceModeSummary(data), "Present/Absent Only (since 01/10/2026)");
  });
});

describe("what the edit form sends", () => {
  it("nothing when the type is unchanged and no date is entered", () => {
    assert.deepEqual(attendanceModeChange({ attendance_calculation_mode: "SHIFT_BASED" }, SHIFT_TODAY), {
      changed: false,
      error: null,
      payload: null,
    });
  });

  it("a new type with no Effective From is refused - today is never assumed", () => {
    const r = attendanceModeChange({ attendance_calculation_mode: "PRESENT_ABSENT_ONLY" }, SHIFT_TODAY);
    assert.equal(r.changed, true);
    assert.match(r.error, /Effective From/);
    assert.equal(r.payload, null);
  });

  it("a new type with a date is sent as exactly the two fields", () => {
    const r = attendanceModeChange(
      { attendance_calculation_mode: "PRESENT_ABSENT_ONLY", attendance_mode_effective_from: "2026-10-01" },
      SHIFT_TODAY
    );
    assert.deepEqual(r.payload, { calculation_mode: "PRESENT_ABSENT_ONLY", effective_from: "2026-10-01" });
  });

  it("the same type with a date is still a change (e.g. cancelling a scheduled one)", () => {
    const r = attendanceModeChange(
      { attendance_calculation_mode: "SHIFT_BASED", attendance_mode_effective_from: "2026-10-01" },
      SHIFT_TODAY
    );
    assert.deepEqual(r.payload, { calculation_mode: "SHIFT_BASED", effective_from: "2026-10-01" });
  });
});

describe("the Employment Details wiring", () => {
  const section = fs.readFileSync(path.join(__dirname, "../components/hr/profile/EmploymentSection.jsx"), "utf8");
  const page = fs.readFileSync(path.join(__dirname, "../pages/hr/employees/[id].jsx"), "utf8");
  const helper = fs.readFileSync(path.join(__dirname, "../helper/hr.js"), "utf8");

  it("the section shows the type and edits it with an Effective From", () => {
    assert.match(section, /label="Attendance Calculation Type"/);
    assert.match(section, /name="attendance_mode_effective_from"/);
    assert.match(section, /type="date"/);
  });

  it("the two mode fields never ride the ordinary employee edit", () => {
    assert.match(section, /attendance_calculation_mode,\n\s+attendance_mode_effective_from,\n\s+\.\.\.placement/);
  });

  it("the page reads and writes it through its own endpoint", () => {
    assert.match(page, /HrHelper\.getAttendanceCalculationMode\(id\)/);
    assert.match(page, /HrHelper\.changeAttendanceCalculationMode\(id, payload\)/);
    assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/attendance-calculation-mode/);
  });

  it("the editor is offered only under the card's own edit right", () => {
    // The card is editable only with canEdit (employee_edit or admin); the
    // mode fields live inside its edit form and need the current value read.
    assert.match(page, /canEdit=\{canEdit && Boolean\(employee\)\}[\s\S]*onChangeAttendanceMode=\{changeAttendanceMode\}/);
    assert.match(section, /mayChangeAttendanceMode = typeof onChangeAttendanceMode === "function" && Boolean\(attendanceMode\)/);
  });
});
