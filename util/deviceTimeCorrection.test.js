/**
 * Device Time Correction - the screen's pure logic.
 *
 *   node --test util/deviceTimeCorrection.test.js
 */
const test = require("node:test");
const assert = require("node:assert");

const u = require("./deviceTimeCorrection");

const FORM = {
  ...u.EMPTY_FORM,
  date: "2026-09-25",
  biomax_device_id: "1",
  from_time: "06:30",
  to_time: "08:30",
  offset_minutes: "150",
  remarks: "WH showed 06:30 at 09:00 real time",
};

test("builds the criteria body with only the keys the route accepts", () => {
  const { body, error } = u.buildCriteriaBody(FORM);
  assert.strictEqual(error, undefined);
  assert.deepStrictEqual(body, {
    date: "2026-09-25", biomax_device_id: 1, from_time: "06:30:00", to_time: "08:30:00",
    offset_minutes: 150, reason_code: "BIOMAX_DEVICE_TIME_ERROR", remarks: "WH showed 06:30 at 09:00 real time",
  });
  assert.strictEqual(u.buildCriteriaBody({ ...FORM, outlet_id: "2" }).body.outlet_id, 2);
  assert.strictEqual(u.buildCriteriaBody({ ...FORM, offset_minutes: "-30" }).body.offset_minutes, -30);
});

test("the offset is never defaulted: empty, zero, fractional or oversized is refused", () => {
  assert.strictEqual(u.EMPTY_FORM.offset_minutes, "");
  assert.match(u.buildCriteriaBody({ ...FORM, offset_minutes: "" }).error, /offset/);
  assert.match(u.buildCriteriaBody({ ...FORM, offset_minutes: "0" }).error, /zero/);
  assert.match(u.buildCriteriaBody({ ...FORM, offset_minutes: "1.5" }).error, /whole number/);
  assert.match(u.buildCriteriaBody({ ...FORM, offset_minutes: "721" }).error, /at most 720/);
});

test("refuses a missing device, a reversed window or a short remark", () => {
  assert.match(u.buildCriteriaBody({ ...FORM, biomax_device_id: "" }).error, /device/);
  assert.match(u.buildCriteriaBody({ ...FORM, from_time: "09:00", to_time: "08:00" }).error, /not be after/);
  assert.match(u.buildCriteriaBody({ ...FORM, remarks: "ok" }).error, /Remarks/);
});

test("Apply sends the previewed criteria plus the batch ID and fingerprint, or nothing", () => {
  const { body } = u.buildCriteriaBody(FORM);
  const preview = { batch_ref: "b", preview_fingerprint: "f" };
  assert.deepStrictEqual(u.buildApplyBody(body, preview), { ...body, batch_ref: "b", preview_fingerprint: "f" });
  assert.strictEqual(u.buildApplyBody(body, null), null);
  assert.strictEqual(u.buildApplyBody(null, preview), null);
});

test("offset labels", () => {
  assert.strictEqual(u.offsetLabel(150), "+150 min (2h 30m later)");
  assert.strictEqual(u.offsetLabel(-30), "-30 min (30m earlier)");
  assert.strictEqual(u.offsetLabel(137), "+137 min (2h 17m later)");
});

test("the Punch Audit line says DEVICE CLOCK, original and corrected, reason and who - never a regularization", () => {
  const line = u.correctionAuditLine({
    time_corrected: true, original_clock_time: "06:42:15", clock_time: "09:12:15", time_correction_offset_minutes: 150,
    time_correction_reason: "Biomax Device Time Error", time_corrected_by_name: "Admin", time_corrected_at: "2026-09-25 11:00:00",
    time_correction_id: 4,
  });
  assert.strictEqual(
    line,
    "Device clock corrected: 06:42:15 → 09:12:15 · +150 min (2h 30m later) · Biomax Device Time Error · by Admin · on 2026-09-25 11:00:00 · batch #4"
  );
  assert.ok(!/regulari/i.test(line));
  assert.strictEqual(u.correctionAuditLine({ time_corrected: false, clock_time: "09:00:00" }), null);
});

test("revert is offered on an APPLIED batch only", () => {
  assert.strictEqual(u.canRevert({ status: "APPLIED" }), true);
  assert.strictEqual(u.canRevert({ status: "REVERTED" }), false);
});

test("a stale preview is named as such", () => {
  assert.match(u.refusalMessage({ code: 409, error: "PREVIEW_STALE", msg: "changed" }), /out of date/);
  assert.strictEqual(u.refusalMessage({ code: 422, msg: "ValidationError: locked" }), "locked");
});
