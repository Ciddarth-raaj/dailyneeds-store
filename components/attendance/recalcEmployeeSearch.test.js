/**
 * Recalculate Attendance: the Employee filter can be searched, and holds
 * every branch's staff.
 *
 *   node --test components/attendance/recalcEmployeeSearch.test.js
 *
 * It used to be a plain <Select> filled from `/employee/directory`, which
 * returns only the caller's OWN outlet - so an HR user recalculating for
 * another branch could not find that employee at all, and there was no way
 * to type to search a long list.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const page = read("pages/attendance/recalculate/index.jsx");
const picker = read("components/attendance/SearchableEmployeePicker.jsx");

const employeeField = page.slice(page.indexOf('<FormLabel fontSize="sm">Employee</FormLabel>'), page.indexOf('<FormLabel fontSize="sm">Store</FormLabel>'));

test("the Employee filter is a searchable combobox, by ID or name", () => {
  assert.match(employeeField, /<ReactSelect/);
  assert.ok(!/<Select\b/.test(employeeField), "no plain dropdown");
  assert.match(employeeField, /filterOption=\{\(option, input\) => matchesNeedle\(option\.data\.employee, input\)\}/);
  assert.match(employeeField, /isClearable/);
  assert.match(employeeField, /placeholder="All employees"/);
  // The same matcher the Calculated Attendance picker uses: id or name.
  assert.match(picker, /export \{ EmployeeOption, matchesNeedle, optionLabel, selectStyles \}/);
  assert.match(picker, /employee_name[\s\S]*includes\(n\)[\s\S]*employee_id[\s\S]*includes\(n\)/);
});

test("clearing the search means All employees, and the value stays a string id", () => {
  assert.match(employeeField, /setFilter\("employee_id", option \? option\.value : ""\)/);
  assert.match(page, /value: String\(e\.employee_id\)/);
});

test("the list is company-wide, not the caller's own outlet", () => {
  assert.match(page, /EmployeeHelper\.getEmployee\(\{ include_resigned: true \}\)/);
  assert.ok(!/useEmployeeDirectory/.test(page), "no longer the own-outlet directory hook");
});

test("without view_employees it falls back to what the screen offered before", () => {
  assert.match(page, /if \(result\.accessDenied\) result = unwrapList\(await EmployeeHelper\.getDirectory\(\)\)/);
});

test("the screen is otherwise unchanged: same permission and same request body", () => {
  assert.match(page, /permissionKey=\{\["recalculate_attendance"\]\}/);
  assert.match(page, /const built = buildRecalcBody\(\{ from_date: from, to_date: to, \.\.\.filters \}\)/);
});
