/**
 * THE BROWSER HIDES NOTHING THE SERVER RETURNED - the regression guard for
 * "employee 106 is not in Attendance / OT Approval" and "09:00-21:00 is not
 * offered as a one-day shift".
 *
 *   node --test components/attendance/approvalVisibilityNoClientFilter.test.js
 *
 * Both reports were traced to the backend: the approval queue's outlet scope
 * dropped rows whose chain named the approver, and the shift options are
 * decided server-side. This file pins the other half so the diagnosis stays
 * true: the approval screen opens with NO outlet, employee or designation
 * filter, renders every row the API returned, and the shift form offers
 * every option the API returned - no client-side rule that could hide either.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const approval = strip(read("pages/attendance/approval/index.jsx"));
const queue = strip(read("components/attendance/ApprovalQueue.jsx"));
const shiftForm = strip(read("components/attendance/ShiftChangeRequestForm.jsx"));
const helper = strip(read("helper/attendanceV2.js"));

test("the approval screen opens UNFILTERED: no default outlet, employee or designation", () => {
  assert.match(approval, /const EMPTY_FILTERS = \{ outlet_id: "", employee_id: "", designation_id: "" \};/);
  assert.match(approval, /useState\(EMPTY_FILTERS\)/);
  // An empty choice is sent as NO filter, not as the viewer's own outlet.
  assert.match(approval, /outlet_ids: filters\.outlet_id \? \[Number\(filters\.outlet_id\)\] : null/);
  assert.match(helper, /\.\.\.\(outlet_ids && outlet_ids\.length > 0 \? \{ outlet_ids: outlet_ids\.join\(","\) \} : \{\}\)/);
});

test("the rows the API returned are the rows rendered", () => {
  assert.match(approval, /const loaded = Array\.isArray\(list\.rows\) \? list\.rows : \[\];\s*setRows\(loaded\);/);
  assert.ok(!/rows\.filter\(|loaded\.filter\(/.test(approval), "the page filters no row out");
  assert.ok(!/rows\.filter\(/.test(queue), "the queue filters no row out");
  assert.match(queue, /\{rows\.map\(\(row\) =>/);
});

test("the shift form offers every option the server returned", () => {
  assert.match(shiftForm, /setOptions\(Array\.isArray\(res\.options\) \? res\.options : \[\]\);/);
  assert.ok(!/options\.filter\(/.test(shiftForm), "no client-side longer-than / weekday / active rule");
  assert.match(shiftForm, /\{options\.map\(\(o\) =>/);
});
