const { describe, it } = require("node:test");
const assert = require("node:assert/strict");

const P = require("./attendancePermission");

const DAY = {
  attendance_date: "2026-09-14",
  attendance_day_count: 1,
  is_final: true,
  worked_minutes: 540,
  shortage_minutes: 0,
  shortage_before_permission_minutes: 120,
  permission_minutes: 120,
  permission_window_minutes: 120,
  permissions: [
    { attendance_permission_id: 1, source: "DIRECT", state: "APPROVED", from_time: "20:00", to_time: "22:00", to_shift_end: true },
  ],
};

describe("the day's Permission", () => {
  it("Example 1: paid permission, not worked, and full pay", () => {
    const p = P.dayPermission(DAY);
    assert.equal(p.appliedMinutes, 120);
    assert.equal(p.fullPay, true);
    assert.equal(p.payLabel, "Present / Full Pay");
    assert.equal(P.permissionWindowLabel(p.windows[0]), "20:00 – shift end (22:00)");
    assert.deepEqual(P.permissionExplanation(DAY), [
      "Short before permission 2h",
      "Permission forgave 2h (paid permission – not worked)",
    ]);
  });

  it("a partial cover is not full pay", () => {
    const p = P.dayPermission({ ...DAY, shortage_minutes: 120, shortage_before_permission_minutes: 240 });
    assert.equal(p.fullPay, false);
    assert.equal(p.payLabel, null);
  });

  it("a window that covered nothing says so rather than implying paid time", () => {
    const p = P.dayPermission({ ...DAY, permission_minutes: 0, shortage_before_permission_minutes: 0 });
    assert.equal(p.uncoveredNote, "No chargeable shortage fell inside the permitted window");
    assert.deepEqual(P.permissionExplanation({ ...DAY, permission_minutes: 0 }), []);
  });

  it("a day with no permission has nothing to say", () => {
    assert.equal(P.dayPermission({ attendance_date: "2026-09-14" }), null);
  });

  it("an absent day is never full pay", () => {
    assert.equal(P.dayPermission({ ...DAY, attendance_day_count: 0 }).fullPay, false);
  });

  it("an old stored row without the before figure omits that line", () => {
    assert.deepEqual(P.permissionExplanation({ ...DAY, shortage_before_permission_minutes: null }), [
      "Permission forgave 2h (paid permission – not worked)",
    ]);
  });
});

describe("labels", () => {
  it("states, including the payroll-lock closure wording", () => {
    assert.equal(P.permissionStateLabel({ state: "CLOSED_AT_PAYROLL_LOCK" }), "Closed – Not approved before payroll lock");
    assert.equal(P.permissionStateColor({ state: "PENDING" }), "orange");
  });
  it("sources, with a bulk grant named as such", () => {
    assert.equal(P.permissionSourceLabel({ source: "REQUEST" }), "Requested");
    assert.equal(P.permissionSourceLabel({ source: "DIRECT" }), "Management grant");
    assert.equal(P.permissionSourceLabel({ source: "DIRECT", bulk_operation_id: "x" }), "Management grant (bulk)");
  });
  it("a window from date-times", () => {
    assert.equal(P.permissionWindowLabel({ permission_from: "2026-09-14 10:00:00", permission_to: "2026-09-14 11:00:00" }), "10:00 – 11:00");
  });
});

describe("the grant form", () => {
  const base = { attendance_date: "2026-10-20", from_time: "19:00", to_shift_end: true, reason: "Deepavali early closing" };
  it("festival: everybody, until the shift end", () => {
    const r = P.grantBody({ ...base, mode: "ALL" });
    assert.deepEqual(r.body, { attendance_date: "2026-10-20", from_time: "19:00", to_shift_end: true, target_mode: "ALL", reason: "Deepavali early closing" });
    assert.equal(P.needsBulkKey({ mode: "ALL" }), true);
  });
  it("one employee is EMPLOYEES with one id and needs no bulk key", () => {
    const r = P.grantBody({ ...base, mode: "ONE", employee_ids: [42] });
    assert.deepEqual(r.body.employee_ids, [42]);
    assert.equal(r.body.target_mode, "EMPLOYEES");
    assert.equal(P.needsBulkKey({ mode: "ONE", employee_ids: [42] }), false);
    assert.equal(P.needsBulkKey({ mode: "EMPLOYEES", employee_ids: [42, 43] }), true);
  });
  it("outlets, and the errors the screen shows", () => {
    assert.deepEqual(P.grantBody({ ...base, mode: "OUTLETS", outlet_ids: [3, "5"] }).body.outlet_ids, [3, 5]);
    assert.equal(P.grantBody({ ...base, mode: "OUTLETS" }).error, "Choose at least one outlet");
    assert.equal(P.grantBody({ ...base, mode: "ALL", reason: "no" }).error, "A reason of at least 5 characters is required");
    assert.match(P.grantBody({ ...base, mode: "ALL", to_shift_end: false }).error, /ends/);
  });
  it("the key changes with any field, so a stale preview is discarded", () => {
    assert.notEqual(P.grantKey({ ...base, mode: "ALL" }), P.grantKey({ ...base, mode: "ALL", from_time: "18:00" }));
  });
  it("the confirm sentence restates count, date and times", () => {
    assert.equal(
      P.confirmSentence({ counts: { eligible: 146 }, attendance_date: "2026-10-20", from_time: "19:00", to_shift_end: true }),
      "Grant paid permission to 146 employees on 2026-10-20, from 19:00 to their scheduled shift end?"
    );
  });
  it("the outcome tiles and problems", () => {
    const s = P.outcomeSummary({ summary: { succeeded: 2, skipped: 1, failed: 0 }, results: [{ outcome: "SUCCEEDED" }, { outcome: "SKIPPED", code: "PAYROLL_LOCKED" }] });
    assert.equal(s.succeeded, 2);
    assert.equal(s.problems.length, 1);
  });
  it("only an approved direct grant offers revoke here", () => {
    assert.equal(P.canRevokeDirect({ source: "DIRECT", state: "APPROVED" }), true);
    assert.equal(P.canRevokeDirect({ source: "REQUEST", state: "APPROVED" }), false);
    assert.equal(P.canRevokeDirect({ source: "DIRECT", state: "REVOKED" }), false);
  });
});

describe("the request form", () => {
  it("a late start and an early finish on one day", () => {
    const r = P.requestBody({
      attendance_date: "2026-09-14",
      windows: [{ from_time: "10:00", to_time: "11:00" }, { from_time: "20:00", to_shift_end: true }],
      reason: "Hospital appointment",
    });
    assert.deepEqual(r.body.windows, [{ from_time: "10:00", to_time: "11:00" }, { from_time: "20:00", to_shift_end: true }]);
    assert.equal(r.body.employee_id, undefined, "for yourself, nobody else is named");
  });
  it("refuses an empty window list and a short reason", () => {
    assert.equal(P.requestBody({ attendance_date: "2026-09-14", windows: [], reason: "Something" }).error, "Give the time you need");
    assert.match(P.requestBody({ attendance_date: "2026-09-14", windows: [{ from_time: "10:00", to_time: "11:00" }], reason: "x" }).error, /reason/);
  });
});
