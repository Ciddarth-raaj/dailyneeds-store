/**
 * Payroll Reports - column selection rules.
 *
 *   node --test util/payrollReportColumns.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const C = require("./payrollReportColumns");
const A = require("./payrollReportAccess");

const groups = [
  { group: "Employee", fields: [{ key: "employee_id", label: "Employee ID" }, { key: "employee_name", label: "Employee Name" }, { key: "outlet", label: "Outlet" }] },
  { group: "Payroll", fields: [{ key: "gross_salary", label: "Gross Salary" }, { key: "net_pay", label: "Net Pay" }] },
  { group: "Employee Master (current)", fields: [{ key: "em_mobile", label: "Mobile", subgroup: "Contact" }] },
];

test("toggle adds at the end, removes in place, and respects the cap", () => {
  assert.deepStrictEqual(C.toggle(["a", "b"], "c", 5), ["a", "b", "c"]);
  assert.deepStrictEqual(C.toggle(["a", "b", "c"], "b", 5), ["a", "c"]);
  assert.deepStrictEqual(C.toggle(["a", "b"], "c", 2), ["a", "b"]);
});

test("Select All within a group keeps the existing order and appends the rest", () => {
  assert.deepStrictEqual(C.selectAllInGroup(["net_pay", "employee_id"], groups[0], 10), ["net_pay", "employee_id", "employee_name", "outlet"]);
  assert.deepStrictEqual(C.selectAllInGroup([], groups[0], 2), ["employee_id", "employee_name"]);
  assert.ok(C.isGroupFullySelected(["employee_id", "employee_name", "outlet"], groups[0]));
  assert.deepStrictEqual(C.clearGroup(["net_pay", "outlet", "employee_id"], groups[0]), ["net_pay"]);
});

test("Clear optional columns keeps only the identity columns", () => {
  assert.deepStrictEqual(C.clearOptional(["net_pay", "employee_name", "outlet", "employee_id"]), ["employee_name", "employee_id"]);
});

test("drag-and-drop reorder and the up/down buttons move one column", () => {
  assert.deepStrictEqual(C.reorder(["a", "b", "c", "d"], 0, 2), ["b", "c", "a", "d"]);
  assert.deepStrictEqual(C.reorder(["a", "b", "c", "d"], 3, 0), ["d", "a", "b", "c"]);
  assert.deepStrictEqual(C.reorder(["a", "b"], 0, 9), ["a", "b"]);
  assert.deepStrictEqual(C.move(["a", "b", "c"], 1, -1), ["b", "a", "c"]);
  assert.deepStrictEqual(C.move(["a", "b", "c"], 2, 1), ["a", "b", "c"]);
});

test("search matches labels, groups and Employee Master sub-groups", () => {
  assert.deepStrictEqual(C.filterGroups(groups, "net").map((g) => g.group), ["Payroll"]);
  assert.deepStrictEqual(C.filterGroups(groups, "contact")[0].fields.map((f) => f.key), ["em_mobile"]);
  assert.strictEqual(C.filterGroups(groups, "").length, 3);
});

test("a key the catalogue no longer offers is dropped before it reaches the table", () => {
  assert.deepStrictEqual(C.availableOnly(["employee_id", "uan", "net_pay"], groups), ["employee_id", "net_pay"]);
});

test("month helpers", () => {
  assert.strictEqual(C.monthLabel(2026, 9), "September 2026");
  assert.deepStrictEqual(C.parseMonthValue(C.monthValue({ year: 2026, month: 10 })), { year: 2026, month: 10 });
});

test("access mirrors the server: read keys, + export_reports, + view_employee_sensitive", () => {
  const read = ["view_reports", "view_employees", "view_payroll", "view_salary"];
  assert.strictEqual(A.canOpenPayrollReports({ permissions: read.slice(1) }), false);
  assert.strictEqual(A.canOpenPayrollReports({ permissions: read.map((k) => ({ permission_key: k })) }), true);
  assert.strictEqual(A.canExportPayrollReports({ permissions: read }), false);
  assert.strictEqual(A.canExportPayrollReports({ permissions: [...read, "export_reports"] }), true);
  assert.strictEqual(A.canDownloadStatutoryFiles({ permissions: [...read, "export_reports"] }), false);
  assert.strictEqual(A.canDownloadStatutoryFiles({ permissions: [...read, "export_reports", "view_employee_sensitive"] }), true);
  assert.strictEqual(A.canDownloadStatutoryFiles({ isAdmin: true }), true);
});
