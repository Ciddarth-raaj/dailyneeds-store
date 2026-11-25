/**
 * THE SHIFT-SPECIFIC RIGHTS ON THE APPROVAL CENTRE.
 *
 *   node --test components/attendance/attendanceShiftRights.test.js
 *
 * Read from the sources, like every other screen test in this repo (there is
 * no renderer here). The BACKEND is the boundary - `routes/
 * attendance_shift_rights.test.js` in the API repo proves the same two keys
 * are enforced on the list, count, detail and decision endpoints. What is
 * asserted here is only that the screen stops OFFERING what the server would
 * refuse, and that Attendance and OT are untouched.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const approval = strip(read("pages/attendance/approval/index.jsx"));

test("11. the Shift selector is hidden without view_shift_change_requests", () => {
  // Both keys, AND semantics - the page's own key is not enough on its own.
  assert.match(
    approval,
    /SHIFT_VIEW_KEYS = \["view_attendance_approvals", "view_shift_change_requests"\]/
  );
  assert.match(approval, /canViewShift = usePermissions\(SHIFT_VIEW_KEYS, \{ all: true \}\)/);
  // The selector is built from the FILTERED list, so the button is absent
  // rather than present-and-disabled.
  assert.match(
    approval,
    /TYPES\.filter\(\(t\) => t\.key !== "SHIFT_CHANGE" \|\| canViewShift\)/
  );
  assert.match(approval, /\{types\.map\(\(t\) => \(/);
  assert.doesNotMatch(approval, /\{TYPES\.map\(\(t\) => \(/);
});

test("11b. a ?type=SHIFT deep link does not get around the key", () => {
  assert.match(approval, /if \(asked === "SHIFT_CHANGE" && !canViewShift\) return;/);
  // and a tab already open when the keys arrive is stepped back off it.
  assert.match(
    approval,
    /if \(type === "SHIFT_CHANGE" && !canViewShift\) setType\("REGULARIZATION"\);/
  );
});

test("12. Approve / Reject are not offered on a Shift row without approve_shift_change_request", () => {
  assert.match(
    approval,
    /SHIFT_DECIDE_KEYS = \["approve_attendance_regularization", "approve_shift_change_request"\]/
  );
  assert.match(approval, /canDecideShift = usePermissions\(SHIFT_DECIDE_KEYS, \{ all: true \}\)/);
  assert.match(
    approval,
    /type !== "SHIFT_CHANGE" \|\| canDecideShift/
  );
});

test("7-9 (UI). Attendance and OT are unchanged: no new key gates either tab", () => {
  // The page itself is still behind exactly the key it always was.
  assert.match(approval, /permissionKey=\{\["view_attendance_approvals"\]\}/);
  // The three types are still declared; only Shift is filtered, and only by
  // the Shift key.
  assert.match(approval, /\{ key: "REGULARIZATION", label: "Attendance" \}/);
  assert.match(approval, /\{ key: "OT", label: "OT" \}/);
  assert.match(approval, /\{ key: "SHIFT_CHANGE", label: "Shift" \}/);
  // No Shift key appears anywhere near the Attendance or OT paths: the only
  // mentions of the two new keys are the two constants above.
  assert.equal((approval.match(/view_shift_change_requests/g) || []).length, 1);
  assert.equal((approval.match(/approve_shift_change_request/g) || []).length, 1);
  // History tabs still carry no decision controls, exactly as before.
  assert.match(approval, /name === "PENDING" \|\| name === "ALL"/);
});

test("the hook used is the repo's own, with AND semantics", () => {
  assert.match(approval, /import usePermissions from "\.\.\/\.\.\/\.\.\/customHooks\/usePermissions"/);
  const hook = read("customHooks/usePermissions.js");
  assert.match(hook, /function usePermissions\(permissions = \[\], \{ all = false \} = \{\}\)/);
  assert.match(hook, /if \(all\) \{[\s\S]{0,120}\.every\(/);
});
