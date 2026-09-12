/**
 * Attendance Approver Setup: the approved shape of the screen, read from
 * the sources (no renderer in this repo), plus the pure rules.
 *
 *   node --test components/attendance/attendanceApproverSetup.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const page = strip(read("pages/attendance/approver-setup/index.jsx"));
const table = strip(read("components/attendance/approver-setup/ApproverSetupTable.jsx"));
const setModal = strip(read("components/attendance/approver-setup/SetApproversModal.jsx"));
const replaceModal = strip(read("components/attendance/approver-setup/ReplaceApproverModal.jsx"));
const picker = strip(read("components/attendance/approver-setup/ApproverPicker.jsx"));
const helper = strip(read("helper/attendanceApproverSetup.js"));
const menus = read("constants/menus.js");
const queue = strip(read("components/attendance/ApprovalQueue.jsx"));
const {
  validateApproverForm, validateReplaceForm, approverCell, buildListParams, bulkResultSummary, replacePreviewSummary, LEVELS,
} = require("../../util/attendanceApproverSetup");
const { stageLabel } = require("../../util/attendanceV2");

test("1. the screen is gated on manage_attendance_approvers, on the page and in the menu", () => {
  assert.match(page, /permissionKey=\{\["manage_attendance_approvers"\]\}/);
  assert.match(page, /title="Attendance Approver Setup"/);
  assert.match(menus, /attendance_approver_setup:\s*\{[^}]*permission:\s*"manage_attendance_approvers"[^}]*location:\s*"\/attendance\/approver-setup"/);
});

test("2. filters: Department | Store | Designation | Employee | Search | Reset on one row, only the chosen ones sent", () => {
  for (const label of ["Department", "Store", "Designation", "Employee", "Search"]) assert.match(page, new RegExp(`<FormLabel fontSize="sm">${label}</FormLabel>`), label);
  assert.match(page, /direction=\{isMobile \? "column" : "row"\}/);
  assert.match(page, /onClick=\{reset\}/);
  assert.match(page, /useDepartments|useOutlets|useDesignations|useEmployeeDirectory/);
  assert.deepStrictEqual(buildListParams({ store_id: "3", department_id: "", search: " raj " }), { store_id: 3, search: "raj", limit: 500, offset: 0 });
  assert.match(helper, /"\/attendance\/approver-setup", \{ params \}/);
});

test("3. the table has exactly the approved columns, always all three approver levels", () => {
  assert.match(table, /const COLUMNS = \["Select", "Emp Code", "Employee", "Store", "Designation", "First Level Approver", "Second Level Approver", "Final Approver", ""\]/);
  for (const key of ["first_level_approver_employee_id", "second_level_approver_employee_id", "final_approver_employee_id"]) assert.match(table, new RegExp(`keyName="${key}"`), key);
  assert.strictEqual(approverCell({ final_approver_employee_id: 33, final_approver_name: "HR" }, "final_approver_employee_id"), "HR (33)");
  assert.strictEqual(approverCell({ first_level_approver_employee_id: null }, "first_level_approver_employee_id"), "—");
});

test("4. bulk selection: a checkbox per row, select-all, and the count on the action", () => {
  assert.match(table, /isChecked=\{selectedIds\.includes\(row\.employee_id\)\}/);
  assert.match(table, /isIndeterminate=\{selectedIds\.length > 0 && !allTicked\}/);
  assert.match(page, /const toggleAll = /);
  assert.match(page, /Set Approvers\{selectedIds\.length > 0 \? ` \(\$\{selectedIds\.length\}\)` : ""\}/);
  assert.match(page, /isDisabled=\{selectedIds\.length === 0\}/);
});

test("5. Set Approvers opens a modal with the three fields and posts the bulk body", () => {
  assert.match(page, /<SetApproversModal[\s\S]*?mode="bulk"/);
  assert.match(setModal, /LEVELS\.map\(\(\{ key, label, required \}\) =>/);
  assert.deepStrictEqual(LEVELS.map((l) => l.label), ["First Level Approver", "Second Level Approver", "Final Approver"]);
  assert.match(page, /bulkSet\(\{ employee_ids: selectedIds, \.\.\.body \}\)/);
  assert.match(helper, /"\/attendance\/approver-setup\/bulk"/);
});

test("6. Final Approver is required; 7. First and Second are optional", () => {
  assert.deepStrictEqual(LEVELS.map((l) => l.required), [false, false, true]);
  const missing = validateApproverForm({ first_level_approver_employee_id: 11 }, [1]);
  assert.strictEqual(missing.errors.final_approver_employee_id, "Final Approver is required");
  const finalOnly = validateApproverForm({ final_approver_employee_id: 33 }, [1]);
  assert.strictEqual(finalOnly.ok, true);
  assert.deepStrictEqual(finalOnly.body, { first_level_approver_employee_id: null, second_level_approver_employee_id: null, final_approver_employee_id: 33 });
  assert.match(setModal, /isRequired=\{required\}/);
  assert.match(picker, /\{isRequired \? "Select…" : "— None —"\}/);
});

test("8. self-approval is refused next to the field for one employee, warned (not blocked) for a bulk selection, and the three approvers must be distinct", () => {
  const one = validateApproverForm({ final_approver_employee_id: 1 }, [1]);
  assert.strictEqual(one.errors.final_approver_employee_id, "An employee cannot be their own approver");
  // Bulk: the Store Manager (2) is selected AND is everybody else's First Level.
  const many = validateApproverForm({ first_level_approver_employee_id: 2, final_approver_employee_id: 33 }, [1, 2, 3]);
  assert.strictEqual(many.ok, true, "the bulk save goes ahead; the server skips employee 2's own row");
  assert.match(many.warnings[0], /Employee 2 is among the selected employees; they will be skipped/);
  const dup = validateApproverForm({ first_level_approver_employee_id: 11, second_level_approver_employee_id: 11, final_approver_employee_id: 33 }, [1]);
  assert.match(dup.errors.second_level_approver_employee_id, /must be different people/);
  assert.match(setModal, /error=\{errors\[key\] \|\| null\}/);
  assert.match(setModal, /excludeIds=\{single \? employeeIds : \[\]\}/, "only a single edit hides the employee from the pickers");
  assert.match(setModal, /warnings\.map\(\(w\) =>/);
  assert.match(picker, /<FormErrorMessage fontSize="xs">\{error\}<\/FormErrorMessage>/);
});

test("9. a single employee is edited with the same three fields, named with code, store and designation", () => {
  assert.match(page, /<SetApproversModal[\s\S]*?mode="single"/);
  assert.match(page, /save\(editRow\.employee_id, body\)/);
  assert.match(setModal, /Emp Code \{single\.employee_id\}/);
  assert.match(setModal, /\[single\.store_name, single\.designation_name\]/);
  assert.match(helper, /`\/attendance\/approver-setup\/\$\{employee_id\}`, body/);
  assert.match(table, /onClick=\{\(\) => onEdit\(row\)\}/);
});

test("10. Replace Approver: Current Approver | Approval Level | New Approver; 12. confirmation against the server preview", () => {
  for (const label of ['label="Current Approver"', 'label="Approval Level"', 'label="New Approver"']) assert.ok(replaceModal.includes(label) || new RegExp(label.replace('label=', '<FormLabel[^>]*>').replace(/"/g, "")).test(replaceModal), label);
  assert.match(replaceModal, /replace\(\{ \.\.\.verdict\.body, preview: true \}\)/);
  assert.match(replaceModal, /Confirm Replace/);
  assert.match(replaceModal, /replace\(\{ \.\.\.verdict\.body, preview: false \}\)/);
  assert.match(replacePreviewSummary({ current_approver_name: "A", current_approver_employee_id: 1, new_approver_name: "B", new_approver_employee_id: 2, approval_level: "SECOND", setups_matched: 3, pending_regularization_steps: 1, pending_ot_steps: 2 }), /3 employee mappings and 3 pending steps \(1 regularization, 2 OT\)\. Approved and rejected steps are never changed\./);
  const same = validateReplaceForm({ current_approver_employee_id: 5, approval_level: "FINAL", new_approver_employee_id: 5 });
  assert.strictEqual(same.errors.new_approver_employee_id, "The new approver must be a different employee");
});

test("11. a resigned / inactive current approver can be found for replacement", () => {
  assert.match(replaceModal, /options\(\{ include_inactive: true \}\)/);
  assert.match(replaceModal, /currentApprovers\(\)/);
  assert.match(helper, /include_inactive: include_inactive \? 1 : 0/);
  assert.match(replaceModal, /employees=\{activeOptions\}/, "the NEW approver picks from active employees only");
  const { approverOptionLabel } = require("../../util/attendanceApproverSetup");
  assert.match(approverOptionLabel({ employee_id: 9, employee_name: "Old", is_active: false }), /\[resigned\/inactive\]/);
});

test("13. partial failure is reported per employee, never as a green total", () => {
  assert.match(setModal, /failed\.length === 0 \? "success" : result\.success_count > 0 \? "warning" : "error"/);
  assert.match(setModal, /\{failed\.map\(\(f\) =>/);
  assert.strictEqual(bulkResultSummary({ success_count: 3, failed_count: 1 }), "Approvers set for 3 employees; 1 failed and was not changed.");
  assert.strictEqual(bulkResultSummary({ success_count: 0, failed_count: 2 }), "No employees were updated. 2 failed.");
});

test("14. responsive: cards on a phone, a compact table on a desk", () => {
  assert.match(table, /if \(isMobile\) \{/);
  assert.match(table, /data-testid="approver-card"/);
  assert.match(table, /<Box overflowX="auto">/);
  assert.match(page, /useBreakpointValue\(\{ base: true, md: false \}\)/);
});

test("15. no payroll or salary field anywhere on the screen", () => {
  for (const [name, src] of [["page", page], ["table", table], ["setModal", setModal], ["replaceModal", replaceModal], ["helper", helper]]) {
    assert.ok(!/salary|payroll|gross|ctc|bank/i.test(src), name);
  }
});

test("the approval screens show the snapshotted employee-level approver, and role stages as before", () => {
  assert.match(queue, /const stageApproverLabel = \(st\) =>/);
  assert.match(queue, /st\.approver_name \|\| `Employee \$\{st\.approver_employee_id\}`/);
  assert.strictEqual(stageLabel({ status: "PENDING", current_stage_no: 2, total_stages: 3, current_stage_role: "EMPLOYEE", current_stage_approver_employee_id: 33, current_stage_approver_name: "Priya", current_stage_approval_level: "FINAL" }), "Stage 2 of 3 · Priya (Final Approver)");
  assert.strictEqual(stageLabel({ status: "PENDING", current_stage_no: 1, total_stages: 3, current_stage_role: "STORE_MANAGER", current_stage_approver_employee_id: null }), "Stage 1 of 3 · Store Manager");
});
