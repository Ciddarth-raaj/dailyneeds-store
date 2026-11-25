/**
 * Calculation & Review - how the Department / Designation dropdowns are drawn.
 *
 *   node --test util/payrunCalculationFilters.test.js
 *
 * Who is in a department is the server's answer; these rules only decide
 * which choices to offer.
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  designationChoices,
  keepsDesignation,
  withSelected,
  optionLabel,
} = require("./payrunCalculationFilters");

const OPTIONS = {
  departments: [
    { id: 10, name: "Sales", count: 4 },
    { id: 20, name: "Stores", count: 2 },
  ],
  designations: [
    { id: 100, name: "Sales Executive", count: 3, department_ids: [10] },
    { id: 101, name: "Sales Lead", count: 1, department_ids: [10] },
    { id: 200, name: "Picker", count: 2, department_ids: [20] },
    { id: 300, name: "Helper", count: 1, department_ids: [10, 20] },
    { id: 400, name: "Unmapped", count: 1, department_ids: [] },
  ],
};
const ids = (list) => list.map((d) => d.id);

test("no department: every designation", () => {
  assert.deepStrictEqual(ids(designationChoices(OPTIONS, "")), [100, 101, 200, 300, 400]);
});

test("a department narrows to the designations that occur in it (value may be a string)", () => {
  assert.deepStrictEqual(ids(designationChoices(OPTIONS, "10")), [100, 101, 300, 400]);
  assert.deepStrictEqual(ids(designationChoices(OPTIONS, 20)), [200, 300, 400]);
});

test("a designation with no recorded department is not hidden by a department choice", () => {
  assert.ok(ids(designationChoices(OPTIONS, "20")).includes(400));
});

test("a chosen designation survives a department it occurs in, and is cleared otherwise", () => {
  assert.strictEqual(keepsDesignation(OPTIONS, "10", "100"), true);
  assert.strictEqual(keepsDesignation(OPTIONS, "20", "100"), false);
  assert.strictEqual(keepsDesignation(OPTIONS, "20", "300"), true);
  assert.strictEqual(keepsDesignation(OPTIONS, "20", ""), true);
});

test("the current choice is always listed, even when the scope no longer has it", () => {
  assert.deepStrictEqual(ids(withSelected(OPTIONS.departments, "30", "Department")), [10, 20, 30]);
  assert.deepStrictEqual(ids(withSelected(OPTIONS.departments, "10", "Department")), [10, 20]);
  assert.deepStrictEqual(ids(withSelected(OPTIONS.departments, "", "Department")), [10, 20]);
});

test("labels carry the employee count", () => {
  assert.strictEqual(optionLabel({ name: "Sales", count: 4 }), "Sales (4)");
});

test("empty or missing options are safe", () => {
  assert.deepStrictEqual(designationChoices(null, "10"), []);
  assert.deepStrictEqual(designationChoices(undefined, ""), []);
});
