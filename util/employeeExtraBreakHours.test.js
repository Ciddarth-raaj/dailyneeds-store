/**
 * EXTRA BREAK HOURS on the Employee Master, from the screens' side.
 *
 *   node --test util/employeeExtraBreakHours.test.js
 *
 * What is pinned here: the field is saved through the EXISTING employee edit
 * (no new permission, no second endpoint), a blank clears it rather than
 * sending "", an existing employee's value survives a save of anything else,
 * the Add Employee stage refuses a value the API would refuse, and the
 * Employment section renders the control and the read-only field.
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const { HR_EDITABLE_FIELDS, buildHrPatch } = require("./hrProfile");
const { buildCreatePayload, validateStage } = require("./hrOnboarding");

const section = fs.readFileSync(
  path.join(__dirname, "../components/hr/profile/EmploymentSection.jsx"),
  "utf8"
);
const addForm = fs.readFileSync(path.join(__dirname, "../pages/hr/employees/new.jsx"), "utf8");

/* ------------------------------------------------------------ the edit -- */

test("it is saved through the ordinary employee edit, with no endpoint of its own", () => {
  assert.ok(HR_EDITABLE_FIELDS.includes("extra_break_hours"));
  assert.ok(
    !/extra_break_hours/.test(fs.readFileSync(path.join(__dirname, "hrProfile.js"), "utf8").split("SENSITIVE_FIELD_API_KEY")[1] || ""),
    "it is not a sensitive-section field"
  );
});

test("a typed value is sent, and an unchanged one is not", () => {
  const employee = { extra_break_hours: null };
  assert.deepEqual(buildHrPatch(employee, { extra_break_hours: "0.5" }), { extra_break_hours: "0.5" });
  assert.deepEqual(buildHrPatch({ extra_break_hours: "0.50" }, { extra_break_hours: "0.50" }), {});
});

test("a blank CLEARS it - null, never the empty string", () => {
  const patch = buildHrPatch({ extra_break_hours: "0.50" }, { extra_break_hours: "" });
  assert.deepEqual(patch, { extra_break_hours: null });
});

test("an employee who has one keeps it when something else is saved", () => {
  const employee = { extra_break_hours: "0.50", employee_name: "Old" };
  const patch = buildHrPatch(employee, { employee_name: "New" });
  assert.deepEqual(patch, { employee_name: "New" });
  assert.ok(!("extra_break_hours" in patch));
});

/* ---------------------------------------------------------- Add Employee - */

test("the create payload sends hours as a number, and omits a blank", () => {
  const form = {
    employee_name: "A",
    date_of_joining: "2026-01-01",
    store_id: "1",
    department_id: "2",
    designation_id: "3",
  };
  assert.equal(buildCreatePayload({ ...form, extra_break_hours: "0.5" }).extra_break_hours, 0.5);
  assert.equal("extra_break_hours" in buildCreatePayload(form), false);
  assert.equal("extra_break_hours" in buildCreatePayload({ ...form, extra_break_hours: "" }), false);
});

test("the employment stage refuses what the API would refuse", () => {
  const ok = {
    store_id: "1",
    department_id: "2",
    designation_id: "3",
  };
  assert.equal(validateStage("employment", { ...ok, extra_break_hours: "0.5" }).extra_break_hours, undefined);
  assert.equal(validateStage("employment", { ...ok, extra_break_hours: "" }).extra_break_hours, undefined);
  assert.ok(validateStage("employment", { ...ok, extra_break_hours: "-1" }).extra_break_hours);
  assert.ok(validateStage("employment", { ...ok, extra_break_hours: "abc" }).extra_break_hours);
  assert.ok(validateStage("employment", { ...ok, extra_break_hours: "48" }).extra_break_hours);
});

/* --------------------------------------------------------- on the screen - */

test("Employment Details offers the control and shows the value when not editing", () => {
  assert.match(section, /label="Extra Break Hours"\s+name="extra_break_hours"/);
  assert.match(section, /<Field label="Extra Break Hours" value=\{employee\.extra_break_hours\} \/>/);
  assert.match(section, /extra_break_hours: employee\.extra_break_hours \?\? ""/);
});

test("Add Employee offers it on the Employment stage, in hours", () => {
  assert.match(addForm, /Extra Break Hours/);
  assert.match(addForm, /onChange=\{set\("extra_break_hours"\)\}/);
});

test("the help text says the rule the engine actually applies", () => {
  assert.match(section, /four or more punches/);
  assert.match(addForm, /four or more punches/);
});
