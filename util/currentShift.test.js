/**
 * "Current shift" on the employee profile.
 *
 *   node --test util/currentShift.test.js
 *
 * Four states, three of which would render as an empty cell if nobody made
 * them say something. The one worth being careful about is the difference
 * between "nobody has assigned this employee" and "you may not see shifts":
 * only the first is somebody's job, and sending HR to the assignment screen
 * for the second wastes their time and does not fix anything.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const { shiftName, currentShiftLabel } = require("./currentShift");

const ASSIGNED = {
  assigned: true,
  work_shift_id: 4,
  shift_code: "GS1",
  shift_name: "9 TO 9",
  shift_active: true,
  timing: "09:00 - 21:00",
};

test("an assigned shift reads as its code, its name and its hours", () => {
  assert.strictEqual(currentShiftLabel({ shift: ASSIGNED }), "GS1 - 9 TO 9 · 09:00 - 21:00");
});

test("a shift with no code, or no hours, still reads as something", () => {
  assert.strictEqual(
    currentShiftLabel({ shift: { ...ASSIGNED, shift_code: "" } }),
    "9 TO 9 · 09:00 - 21:00"
  );
  assert.strictEqual(currentShiftLabel({ shift: { ...ASSIGNED, timing: null } }), "GS1 - 9 TO 9");
  // Nothing nameable at all is still not a blank cell.
  assert.strictEqual(
    currentShiftLabel({ shift: { assigned: true, work_shift_id: 4, timing: null } }),
    "#4"
  );
});

test("UNASSIGNED, REFUSED AND FAILED ARE THREE DIFFERENT SENTENCES", () => {
  assert.strictEqual(currentShiftLabel({ shift: { assigned: false } }), "Not assigned");
  assert.strictEqual(currentShiftLabel({ shift: null }), "Not assigned");
  assert.match(currentShiftLabel({ denied: true }), /permission/);
  assert.match(currentShiftLabel({ error: true }), /Could not be loaded/);
  // A refusal is not a missing assignment, and must never read as one.
  assert.notStrictEqual(currentShiftLabel({ denied: true }), "Not assigned");
});

test("NOTHING IS CLAIMED WHILE THE READ IS STILL IN FLIGHT", () => {
  // "Not assigned" flashed at somebody whose shift is about to appear is the
  // one wrong answer here - it sends HR to the assignment screen for nothing.
  assert.strictEqual(currentShiftLabel({ loading: true }), null);
  assert.strictEqual(currentShiftLabel({ loading: true, shift: { assigned: false } }), null);
  // And an absent hook state is not treated as an answer either.
  assert.strictEqual(currentShiftLabel(), "Not assigned");
});

test("a shift switched off since it was assigned is shown, not hidden", () => {
  // It is still this employee's shift. Hiding it would read as unassigned,
  // which is a different problem with a different fix.
  const label = currentShiftLabel({ shift: { ...ASSIGNED, shift_active: false } });
  assert.match(label, /GS1 - 9 TO 9/);
  assert.match(label, /inactive/);
});

test("shiftName is the same shape the assignment screen uses", () => {
  assert.strictEqual(shiftName({ shift_code: "GS1", shift_name: "9 TO 9" }), "GS1 - 9 TO 9");
  assert.strictEqual(shiftName({ shift_code: "GS1" }), "GS1");
  assert.strictEqual(shiftName({ shift_name: "9 TO 9" }), "9 TO 9");
  assert.strictEqual(shiftName(null), "");
});

test("NOTHING HERE CAN REACH THE LEGACY SHIFT", () => {
  // The point of the whole change: the profile reads the new mapping and has
  // no path back to `shift_master` or the columns that disagree with it.
  const src = fs.readFileSync(path.join(__dirname, "currentShift.js"), "utf8");
  const code = src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  assert.ok(!/shift_master/.test(code));
  // `\b` does not match inside `work_shift_id` or `default_work_shift_id`.
  assert.ok(!/\bshift_id\b/.test(code));

  const hook = fs.readFileSync(
    path.join(__dirname, "..", "customHooks", "useCurrentWorkShift.js"),
    "utf8"
  );
  assert.match(hook, /getEmployeeAssignment/, "it reads the new assignment endpoint");
  // `\b` matters: `EmployeeWorkShiftHelper` is the NEW helper and ends in the
  // same six letters as the legacy one.
  assert.ok(!/\bShiftHelper\b|helper\/shift"/.test(hook), "and never the legacy shift master");
});
