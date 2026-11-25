/**
 * Attendance Permission and Present/Absent Only, side by side on the Attendance
 * Day List and the Day Detail.
 *
 *   node --test util/attendancePermissionPresentAbsentOnly.test.js
 *
 * A Permission forgives shortage against a shift. A Present/Absent Only date
 * has neither, so a permission on it is shown as a record and never as minutes
 * applied, a full-pay outcome or a corrected shortage. A Shift Based date reads
 * exactly as production's Permission screens do.
 */
const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const {
  dayIssue,
  presentBadge,
  timingMinutes,
  shiftLabel,
  shortExplanation,
  otExplanation,
} = require("./attendanceV2");
const { dayPermission, permissionExplanation, PRESENT_ABSENT_ONLY_PERMISSION_NOTE } = require("./attendancePermission");

const approved = {
  attendance_permission_id: 41,
  state: "APPROVED",
  source: "DIRECT",
  permission_from: "2026-09-14 20:00:00",
  permission_to: "2026-09-14 22:00:00",
  to_shift_end: 1,
  reason: "Festival",
};

const SNAPSHOT = { shift_code: "S7", in_time: "10:00:00", out_time: "22:00:00", shift_span_minutes: 720 };

/** A Shift Based day, as the engine returns it. */
const shiftDay = (over = {}) => ({
  attendance_date: "2026-09-14",
  attendance_calculation_mode: "SHIFT_BASED",
  status: "FINAL",
  is_final: 1,
  attendance_day_count: 1,
  punch_count: 2,
  shift_name: "Late Shift",
  shift_snapshot: SNAPSHOT,
  nrm_minutes: 660,
  worked_minutes: 540,
  shortage_minutes: 0,
  break_allowance_minutes: 60,
  permissions: [],
  permission_minutes: 0,
  permission_window_minutes: 0,
  shortage_before_permission_minutes: 0,
  ...over,
});

/** A Present/Absent Only day, as the engine returns it: no shift is read. */
const paoDay = (over = {}) => ({
  attendance_date: "2026-09-14",
  attendance_calculation_mode: "PRESENT_ABSENT_ONLY",
  status: "FINAL",
  is_final: 1,
  attendance_day_count: 1,
  punch_count: 1,
  shift_snapshot: null,
  work_shift_id: null,
  nrm_minutes: 0,
  worked_minutes: 0,
  shortage_minutes: 0,
  permissions: [],
  permission_minutes: 0,
  permission_window_minutes: 0,
  shortage_before_permission_minutes: null,
  ...over,
});

/** Everything the list row and the Day Detail read off a day. */
const screen = (day) => ({
  badge: dayIssue(day) || presentBadge(day),
  shift: shiftLabel(day),
  nrm: timingMinutes(day, day.nrm_minutes),
  worked: timingMinutes(day, day.worked_minutes),
  short: timingMinutes(day, day.shortage_minutes),
  shortTooltip: shortExplanation(day),
  otTooltip: otExplanation(day),
  permission: dayPermission(day),
});

describe("Shift Based + Permission: production's Permission UI, unchanged", () => {
  it("a permission that covered the shortage reads Present / Full Pay with the paid minutes", () => {
    const day = shiftDay({
      permissions: [approved],
      permission_minutes: 120,
      permission_window_minutes: 120,
      shortage_before_permission_minutes: 120,
    });
    const p = dayPermission(day);
    assert.equal(p.appliedMinutes, 120);
    assert.equal(p.payLabel, "Present / Full Pay");
    assert.equal(p.notApplicable, false);
    assert.equal(p.uncoveredNote, null);
    assert.deepEqual(permissionExplanation(day), ["Short before permission 2h", "Permission forgave 2h (paid permission – not worked)"]);
    const s = screen(day);
    assert.equal(s.badge, null, "a Shift Based FINAL day keeps no badge");
    assert.equal(s.short, "0m");
    assert.ok(s.shortTooltip.includes("Permission forgave 2h (paid permission – not worked)"));
  });

  it("a window that covered nothing says so in production's words", () => {
    const p = dayPermission(shiftDay({ permissions: [approved], permission_window_minutes: 120 }));
    assert.equal(p.uncoveredNote, "No chargeable shortage fell inside the permitted window");
    assert.equal(p.notApplicable, false);
  });

  it("no permission, nothing said", () => {
    assert.equal(dayPermission(shiftDay()), null);
  });
});

describe("Present/Absent Only + no Permission: the normal Present/Absent Only day", () => {
  it("Present, the mode named, every shift measurement a dash, no permission box", () => {
    const s = screen(paoDay());
    assert.deepEqual(s.badge, { key: "PRESENT", label: s.badge.label, color: "green" });
    assert.equal(s.shift, "Attendance Mode: Present/Absent Only");
    assert.deepEqual([s.nrm, s.worked, s.short], ["—", "—", "—"]);
    assert.deepEqual(s.shortTooltip, []);
    assert.deepEqual(s.otTooltip, []);
    assert.equal(s.permission, null);
  });
});

describe("Present/Absent Only + a Permission record", () => {
  const withPermission = (over = {}) => paoDay({ permissions: [approved], ...over });

  it("is still a Present/Absent Only Present day: no Late, Early, Short or corrected shortage", () => {
    const s = screen(withPermission());
    assert.equal(s.badge.key, "PRESENT");
    assert.deepEqual([s.nrm, s.worked, s.short], ["—", "—", "—"]);
    assert.deepEqual(s.shortTooltip, [], "no 'Short before permission' / 'Permission forgave' lines");
    assert.deepEqual(permissionExplanation(withPermission()), []);
  });

  it("the record is shown informationally, never as paid minutes or Full Pay", () => {
    const p = dayPermission(withPermission());
    assert.equal(p.notApplicable, true);
    assert.equal(p.appliedMinutes, 0);
    assert.equal(p.windowMinutes, 0);
    assert.equal(p.payLabel, null);
    assert.equal(p.fullPay, false);
    assert.deepEqual(p.windows, [approved], "the record itself is not hidden");
    assert.equal(p.uncoveredNote, PRESENT_ABSENT_ONLY_PERMISSION_NOTE);
  });

  it("says why in the backend engine's own words, from the day's notes when it carries them", () => {
    assert.equal(PRESENT_ABSENT_ONLY_PERMISSION_NOTE, "Permission does not apply: Present/Absent Only calculates no shortage to excuse");
    const note = "Permission does not apply: Present/Absent Only calculates no shortage to excuse";
    const p = dayPermission(withPermission({ notes: ["Present/Absent Only: one punch is a present day", note] }));
    assert.equal(p.uncoveredNote, note);
  });

  it("even a stray applied figure on the row is never presented as forgiven shortage", () => {
    const p = dayPermission(withPermission({ permission_minutes: 90, permission_window_minutes: 120, shortage_before_permission_minutes: 90 }));
    assert.equal(p.appliedMinutes, 0);
    assert.equal(p.payLabel, null);
    assert.deepEqual(permissionExplanation(withPermission({ permission_minutes: 90 })), []);
  });

  it("a pending request does not put 'Permission Pending' under Short on the list", () => {
    const p = dayPermission(withPermission({ permissions: [{ ...approved, state: "PENDING" }] }));
    assert.equal(p.notApplicable, true, "the list's PermissionLine renders nothing for it");
  });
});

describe("Present/Absent Only with and without a shift: the same attendance-mode semantics", () => {
  it("an employee who also holds a shift reads exactly like one who does not", () => {
    const withShift = paoDay({ permissions: [approved], shift_name: "Late Shift", work_shift_id: 7 });
    const withoutShift = paoDay({ permissions: [approved] });
    assert.deepEqual(screen(withShift), screen(withoutShift));
  });

  it("an absent date without a shift is Absent, never a No Shift problem", () => {
    const s = screen(paoDay({ status: "ABSENT", attendance_day_count: 0, punch_count: 0 }));
    assert.equal(s.badge.key, "ABSENT");
    assert.notEqual(s.badge.key, "NO_SHIFT");
    assert.equal(s.shift, "Attendance Mode: Present/Absent Only");
  });
});

describe("Shift Based + no shift: the existing No Shift behaviour", () => {
  it("still reads No Shift, with no Present badge and no attendance-mode wording", () => {
    const day = shiftDay({ status: "NO_SHIFT_FOR_DATE", shift_name: null, shift_snapshot: null, attendance_day_count: 0 });
    const s = screen(day);
    assert.equal(s.badge.key, "NO_SHIFT");
    assert.equal(presentBadge(day), null);
    assert.doesNotMatch(s.shift, /Present\/Absent Only/);
    assert.equal(s.short, "0m");
  });
});

describe("the two screens render through these helpers", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

  it("the Day List: Short is a dash on Present/Absent Only, with production's permission line after it", () => {
    const list = read("components/attendance/AttendanceDayList.jsx");
    const shortCells = list.match(/timingMinutes\(day, day\.shortage_minutes\)\}<\/ExplainTooltip>\s*<PermissionLine day=\{day\} \/>/g) || [];
    assert.equal(shortCells.length, 2, "the card and the table both keep the dash and the permission line");
    assert.doesNotMatch(list, /formatMinutes\(day\.shortage_minutes\)/);
    assert.match(list, /if \(!p \|\| p\.notApplicable\) return null;/);
  });

  it("the Day Detail: the Present badge, the permission box and its note", () => {
    const detail = read("components/attendance/AttendanceDayDetail.jsx");
    assert.match(detail, /const permission = dayPermission\(day\);/);
    assert.match(detail, /const issue = dayIssue\(day\) \|\| presentBadge\(day\);/);
    assert.match(detail, /permission\.uncoveredNote/);
    assert.match(detail, /timingMinutes\(day, day\.shortage_minutes\)/);
    assert.match(detail, /onRequestPermission/);
  });
});

describe("a NEW Permission is not offered on a Present/Absent Only date", () => {
  const { canRequestPermissionForDay, permissionPreviewNotApplicable, PERMISSION_NOT_APPLICABLE_MESSAGE } = require("./attendancePermission");
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

  it("the backend's sentence, word for word", () => {
    assert.equal(PERMISSION_NOT_APPLICABLE_MESSAGE, "Permission is not applicable because this employee uses Present/Absent Only attendance.");
  });

  it("Request Permission is offered on a Shift Based day, with or without a shift, and never on a Present/Absent Only day", () => {
    assert.equal(canRequestPermissionForDay(shiftDay()), true);
    assert.equal(canRequestPermissionForDay(shiftDay({ status: "NO_SHIFT_FOR_DATE", shift_snapshot: null })), true);
    assert.equal(canRequestPermissionForDay(paoDay()), false);
    assert.equal(canRequestPermissionForDay(paoDay({ shift_name: "Late Shift", work_shift_id: 7 })), false);
    assert.equal(canRequestPermissionForDay(paoDay({ status: "ABSENT", attendance_day_count: 0 })), false);
  });

  it("the Day Detail hides the button through that helper; the free-date form shows the server's refusal", () => {
    const detail = read("components/attendance/AttendanceDayDetail.jsx");
    assert.match(detail, /const showRequestPermission = !!onRequestPermission && canRequestPermissionForDay\(day\);/);
    assert.match(detail, /\{showRequestPermission \? \(/);
    assert.doesNotMatch(detail, /\{onRequestPermission \? \(/);
    const form = read("components/attendance/PermissionRequestForm.jsx");
    assert.match(form, /setError\(apiMessage\(res\)\)/);
  });

  it("the Approval Centre shows the reason, not a '0m → 0m → 0m' preview, and offers only Reject", () => {
    const row = { permission_preview: { not_applicable: true, attendance_calculation_mode: "PRESENT_ABSENT_ONLY", message: PERMISSION_NOT_APPLICABLE_MESSAGE } };
    assert.equal(permissionPreviewNotApplicable(row), PERMISSION_NOT_APPLICABLE_MESSAGE);
    assert.equal(permissionPreviewNotApplicable({ permission_preview: { shortage_before_permission_minutes: 120, permission_minutes: 120, shortage_after_permission_minutes: 0 } }), null);
    assert.equal(permissionPreviewNotApplicable({ permission_preview: null }), null);
    const queue = read("components/attendance/ApprovalQueue.jsx");
    assert.match(queue, /const preview = notApplicable \? null : row\.permission_preview;/);
    assert.match(queue, /isDisabled=\{!!deciding \|\| !!permissionPreviewNotApplicable\(row\)\}/);
    assert.match(queue, /isDisabled=\{!!deciding \|\| rejectBlocked\}/, "Reject is unchanged");
  });
});
