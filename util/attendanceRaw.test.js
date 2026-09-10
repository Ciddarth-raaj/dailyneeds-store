/**
 * Attendance List helpers - dynamic columns, neutral display, and the two
 * query builders.
 *
 *   node --test util/attendanceRaw.test.js
 */
const test = require("node:test");
const assert = require("node:assert");

const u = require("./attendanceRaw");

const punch = (time, code) => ({ time, punch_outlet_code: code, punch_outlet: code, dev_id: "X", device_label: code });
const row = (punches, extra = {}) => ({
  employee_id: 1952, user_id: "1952", employee_name: "Ravi", department_name: "Ops", home_outlet: "Warehouse",
  home_outlet_code: "DNHO", clock_date: "2026-09-15", punches, punch_count: punches.length,
  distinct_punch_outlets: [...new Set(punches.map((p) => p.punch_outlet_code))], quarantined_punch_count: 0, ...extra,
});

test("Clock Time columns follow max_punch_count - 6 gives 1..6, 9 gives 1..9, never a fixed 4", () => {
  for (const n of [1, 4, 6, 9]) {
    const cols = u.attendanceListColumns(n).filter((c) => c.punchIndex !== undefined);
    assert.strictEqual(cols.length, n);
    assert.strictEqual(cols[0].header, "Clock Time-1");
    assert.strictEqual(cols[n - 1].header, `Clock Time-${n}`);
  }
  assert.strictEqual(u.clockTimeColumnCount({ max_punch_count: 9 }, []), 9);
  assert.strictEqual(u.clockTimeColumnCount(null, [row([punch("09:00:00", "DNHO"), punch("10:00:00", "DN2")])]), 2);
});

test("the fixed columns are Employee Code, Name, Department, Home Outlet, Clock Date, then times, then Punches", () => {
  const headers = u.attendanceListColumns(2).map((c) => c.header);
  assert.deepStrictEqual(headers, ["Employee Code", "Employee Name", "Department", "Home Outlet", "Clock Date", "Clock Time-1", "Clock Time-2", "Punches"]);
});

test("the Warehouse -> DN2 -> DN2 -> Warehouse row flattens to four punch cells in order, with locations attached", () => {
  const r = row([punch("09:05:12", "DNHO"), punch("14:10:40", "DN2"), punch("16:00:03", "DN2"), punch("20:15:55", "DNHO")]);
  const flat = u.flattenRow(r, 4);
  assert.deepStrictEqual([1, 2, 3, 4].map((i) => flat[`clock_time_${i}`].time), ["09:05:12", "14:10:40", "16:00:03", "20:15:55"]);
  assert.deepStrictEqual([1, 2, 3, 4].map((i) => flat[`clock_time_${i}`].punch_outlet_code), ["DNHO", "DN2", "DN2", "DNHO"]);
  assert.strictEqual(flat.clock_date_display, "15/09/2026");
  // No home-vs-away flag exists anywhere on the flattened row (neutral display).
  assert.ok(!Object.keys(flat).some((k) => /away|home_match|at_home/.test(k)));
});

test("a row narrower than N pads with nulls, never with invented punches", () => {
  const flat = u.flattenRow(row([punch("09:57:00", "DN1"), punch("19:45:00", "DN1")]), 5);
  assert.strictEqual(flat.clock_time_3, null);
  assert.strictEqual(flat.clock_time_5, null);
});

test("the Punches cell shows the quarantine marker only when there is something quarantined", () => {
  assert.strictEqual(u.punchesCellText(row([punch("09:00:00", "DNHO")])), "1");
  assert.strictEqual(u.punchesCellText(row([punch("09:00:00", "DNHO")], { quarantined_punch_count: 1 })), "1 (+1 quarantined)");
});

test("the audit link opens the Punch Audit tab on that employee's attendance date", () => {
  const link = u.auditLinkFor(row([]));
  assert.match(link, /^\/attendance\/list\?/);
  assert.match(link, /tab=audit/);
  assert.match(link, /employee_id=1952/);
  assert.match(link, /attendance_date=2026-09-15/);
});

test("the Attendance List query never carries a device or punch-location parameter", () => {
  const q = u.buildListQuery({ from: "2026-09-01", to: "2026-09-15", home_outlet_id: "2", department_id: "", search: " 1952 ", dev_id: "X", punch_outlet_id: 4 });
  assert.deepStrictEqual(q, { from: "2026-09-01", to: "2026-09-15", home_outlet_id: "2", search: "1952" });
});

test("the Punch Audit query carries device, punch location, status and review filters", () => {
  const q = u.buildAuditQuery({ from: "2026-09-15", to: "2026-09-15", dev_id: "C2695C56D30E1430", punch_outlet_id: "4", device_status: "UNREGISTERED_DEVICE", review: "needs_review", source_ip: " 1.2.3.4 " });
  assert.deepStrictEqual(q, { from: "2026-09-15", to: "2026-09-15", limit: 500, offset: 0, dev_id: "C2695C56D30E1430", punch_outlet_id: "4", device_status: "UNREGISTERED_DEVICE", review: "needs_review", source_ip: "1.2.3.4" });
});

test("dates display as DD/MM/YYYY", () => {
  assert.strictEqual(u.displayDate("2026-09-05"), "05/09/2026");
  assert.strictEqual(u.displayDateTime("2026-09-05 13:57:41"), "05/09/2026 13:57:41");
  assert.strictEqual(u.displayDate(null), "");
});

test("banners name the screen that fixes each condition, and say nothing when there is nothing to say", () => {
  assert.deepStrictEqual(u.bannerItems({}), []);
  const items = u.bannerItems({ no_shift_punches: 12, missing_cutoff_punches: 3, unmatched_punches: 2, unregistered_device_punches: 4, unregistered_devices: ["UNKNOWN01"], inactive_device_punches: 1 });
  assert.deepStrictEqual(items.map((i) => i.href), ["/employee-shift-assignment", "/work-shift", "/hr/employees", "/attendance/devices", "/attendance/devices"]);
  assert.match(items[0].text, /12 punch/);
  assert.match(items[3].text, /1 unregistered device/);
});

test("status labels are neutral wording - no colours, no judgement", () => {
  for (const label of Object.values(u.DERIVATION_STATUS_LABEL).concat(Object.values(u.DEVICE_STATUS_LABEL))) {
    assert.ok(!/late|absent|present|error|warning|invalid/i.test(label), label);
  }
});
