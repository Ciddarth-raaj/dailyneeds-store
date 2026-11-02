/**
 * OT Auto-Approval screen: where it is, what it sends, and what it promises.
 *
 *   node --test components/attendance/otAutoApprovalScreen.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const page = read("pages/attendance/ot-auto-approval/index.jsx");
const helper = read("helper/attendanceV2.js");
const menus = read("constants/menus.js");

test("the menu item and the page sit behind manage_ot_auto_approval", () => {
  const item = menus.slice(menus.indexOf("attendance_ot_auto_approval: {"));
  assert.match(item.slice(0, 300), /permission: "manage_ot_auto_approval"/);
  assert.match(item.slice(0, 300), /location: "\/attendance\/ot-auto-approval"/);
  assert.match(page, /permissionKey=\{\["manage_ot_auto_approval"\]\}/);
});

test("the helper reads and saves the one setting; an empty cap is sent as null", () => {
  assert.match(helper, /call\("get", "\/attendance\/ot\/auto-approval"/);
  assert.match(helper, /API\.put\("\/attendance\/ot\/auto-approval", \{ auto_approve, max_minutes \}\)/);
  assert.match(page, /max_minutes: capText === "" \? null : Number\(capText\)/);
});

test("the page says what stays with approvers and that off undoes nothing", () => {
  assert.match(page, /payroll-locked month/);
  assert.match(page, /does not undo anything already/);
});
