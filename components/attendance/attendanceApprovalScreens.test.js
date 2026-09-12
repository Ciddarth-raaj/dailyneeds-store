/**
 * Attendance Approval, OT Approval and Recalculate Attendance: the approved
 * shape of the screens, read from the sources (no renderer in this repo).
 *
 *   node --test components/attendance/attendanceApprovalScreens.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const queue = strip(read("components/attendance/ApprovalQueue.jsx"));
const approval = strip(read("pages/attendance/approval/index.jsx"));
const ot = strip(read("pages/attendance/ot-approval/index.jsx"));
const recalc = strip(read("pages/attendance/recalculate/index.jsx"));
const helper = strip(read("helper/attendanceV2.js"));
const {
  buildRecalcBody, decisionLabel, stageLabel, recalcStatusLabel, runFilterLabel, displayDateTime,
} = require("../../util/attendanceV2");

const section = (src, name) => {
  const start = src.indexOf(`function ${name}(`);
  assert.notStrictEqual(start, -1, `${name} exists`);
  const next = src.indexOf("\nfunction ", start + 1);
  return src.slice(start, next === -1 ? undefined : next);
};
const detail = section(queue, "Detail");
const list = section(queue, "ApprovalQueue");

/* ======================================== Attendance Approval ==== */

test("1. Attendance Approval renders Pending with me, counted by the server", () => {
  assert.match(approval, /Pending with me:/);
  assert.match(approval, /getApprovalCount\("REGULARIZATION"\)/);
  assert.match(approval, /\{count === null \? "—" : count\}/);
  assert.match(approval, /permissionKey=\{\["view_attendance_approvals"\]\}/);
});

test("2. only attendance regularization rows are requested and rendered", () => {
  assert.match(approval, /getApprovals\(\{ request_type: "REGULARIZATION", status: "PENDING" \}\)/);
  assert.match(approval, /<ApprovalQueue[^>]*kind="REGULARIZATION"/);
  assert.ok(!/request_type: "OT"/.test(approval));
  assert.ok(!/<Tabs/.test(approval), "one list, no tabs");
});

test("3. a row or card expands inline - no separate detail page and no View button", () => {
  assert.match(list, /const toggle = \(id\) => setOpen/);
  assert.match(list, /aria-expanded=\{expanded\}/);
  assert.match(list, /\{expanded \? \(\s*<Tr>\s*<Td colSpan=\{columns\}[\s\S]*?<Detail/);
  assert.match(list, /as="button"[\s\S]*?onClick=\{\(\) => toggle\(id\)\}/);
  assert.ok(!/>\s*View\s*</.test(queue));
  assert.ok(!/router\.push|<Link/.test(queue), "expands in place");
});

test("4. existing and proposed punches are shown; 5. reason and attendance metrics are shown", () => {
  assert.match(detail, /label=\{isOt \? "Punches" : "Existing punches"\}/);
  assert.match(detail, /label="Proposed missing punch"/);
  assert.match(detail, /clock\(row\.proposed_punch_time\)/);
  assert.match(detail, /label="Employee reason"/);
  for (const m of ['label="NRM"', 'label="Worked"', 'label="Shortage"']) assert.match(detail, new RegExp(m), m);
  assert.match(detail, /label="Employee"/);
  assert.match(detail, /label="Date"/);
  assert.match(detail, /label="Shift"/);
  assert.match(detail, /<Chain chain=\{row\.chain\} current=\{row\.current_stage_no\}/);
  for (const h of ["Employee", "Date", "Shift", "Existing Punches", "Proposed Missing Punch", "Reason", "Submitted On", "Action"]) {
    assert.ok(list.includes(h), `column ${h}`);
  }
});

test("6. Approve / Reject decide the current stage and refresh the list and the count", () => {
  assert.match(detail, /onDecide\(row, "REJECTED", remarks\)/);
  assert.match(detail, /onDecide\(row, "APPROVED", remarks\)/);
  assert.match(detail, /<Textarea[^>]*value=\{remarks\}/);
  assert.match(approval, /decideApproval\(row\.attendance_approval_request_id, \{ decision, remarks \}\)/);
  assert.match(approval, /await load\(\);/);
  assert.match(helper, /`\/attendance\/regularization\/\$\{request_id\}\/decision`/);
  assert.match(helper, /\{ decision, remarks: remarks \|\| "" \}/);
  assert.ok(!/minutes/.test(helper.slice(helper.indexOf("decideApproval"), helper.indexOf("recalculateBulk"))), "the decision carries no minutes");
});

test("7. no OT approval or edit control on Attendance Approval", () => {
  assert.ok(!/OT|ot_/.test(approval.replace(/ot_now_available/g, "").replace(/OT Available/g, "")), "the page names no OT field");
  assert.match(detail, /!isOt \? \([\s\S]*?Proposed missing punch/, "the OT block is the OT screen's only");
  assert.ok(!/<Input|<NumberInput|type="number"/.test(queue), "no input for minutes anywhere in the queue");
});

/* ================================================== OT Approval ==== */

test("8. Pending / Approved / Rejected / All tabs render; 9. Pending with me renders", () => {
  for (const t of ["<Tab>Pending</Tab>", "<Tab>Approved</Tab>", "<Tab>Rejected</Tab>", "<Tab>All</Tab>"]) assert.ok(ot.includes(t), t);
  assert.match(ot, /const TABS = \["PENDING", "APPROVED", "REJECTED", "ALL"\]/);
  assert.match(ot, /Pending with me:/);
  assert.match(ot, /getApprovalCount\("OT"\)/);
  assert.match(ot, /getApprovals\(\{ request_type: "OT", status \}\)/);
  assert.match(ot, /permissionKey=\{\["view_attendance_approvals"\]\}/);
});

test("10. pending rows expand inline; 11. the employee's OT reason is shown; 12. OT minutes are read-only", () => {
  assert.match(ot, /<ApprovalQueue[^>]*kind="OT"/);
  assert.match(detail, /label="Eligible OT \(read only\)"/);
  assert.match(detail, /formatOtClock\(row\.eligible_ot_minutes\)/);
  assert.match(detail, /label="Employee reason"/);
  assert.ok(!/<Input|<NumberInput|type="number"/.test(queue));
  assert.ok(!/eligible_ot_minutes:|approved_ot_minutes:/.test(ot), "the page never sends minutes");
  for (const h of ["Employee", "Date", "Shift", "Worked", "Eligible OT", "Employee Reason", "Submitted On", "Action"]) {
    assert.ok(list.includes(h), `column ${h}`);
  }
});

test("13. Approve / Reject appear only where the backend says the row is actionable", () => {
  assert.match(detail, /row\.status === "PENDING" && row\.actionable && onDecide \?/);
  assert.match(ot, /onDecide=\{name === "PENDING" \|\| name === "ALL" \? onDecide : null\}/);
  assert.match(detail, /row\.not_actionable_reason/);
});

test("14. approved history and 15. rejected history render with the decider and time", () => {
  assert.match(list, /const history = rows\.length > 0 && rows\.every\(\(r\) => r\.status !== "PENDING"\)/);
  assert.ok(list.includes('"Eligible / Claimed OT"'));
  assert.ok(list.includes("Approved OT"));
  assert.ok(list.includes('"Final Status"'));
  assert.match(list, /row\.decided_by_name \|\| "—"/);
  assert.match(list, /displayDateTime\(row\.decided_at\)/);
  assert.match(detail, /label="Decision"[\s\S]*?decisionLabel\(row\)/);
});

test("16. payroll-lock closure wording renders exactly", () => {
  assert.equal(decisionLabel({ status: "REJECTED", closure_label: "Rejected – Not Requested Before Payroll Lock" }), "Rejected – Not Requested Before Payroll Lock");
  assert.equal(decisionLabel({ status: "REJECTED", closure_label: "Rejected – Not Approved Before Payroll Lock" }), "Rejected – Not Approved Before Payroll Lock");
  assert.equal(decisionLabel({ status: "REJECTED", closure_label: null }), "Rejected");
  assert.equal(decisionLabel({ status: "APPROVED" }), "Approved");
  assert.equal(stageLabel({ status: "PENDING", current_stage_no: 2, total_stages: 3, current_stage_role: "OPERATIONS_MANAGER" }), "Stage 2 of 3 · Operations Manager");
  assert.match(list, /decisionLabel\(row\)/);
});

test("17. mobile cards render, desktop is a compact table", () => {
  assert.match(list, /useBreakpointValue\(\{ base: true, md: false \}\)/);
  assert.match(list, /if \(isMobile\) \{[\s\S]*?<Stack spacing=\{2\}>[\s\S]*?borderRadius="md"/);
  assert.match(list, /<Table size="sm"/);
});

/* ================================================= Recalculate ==== */

test("18. desktop filters are one line: Date Range | Employee | Store | Designation | Recalculate | Reset; 19. mobile stacks", () => {
  assert.match(recalc, /<Flex direction=\{isMobile \? "column" : "row"\}[^>]*wrap="nowrap"/);
  const line = recalc.slice(recalc.indexOf('<Flex direction={isMobile ? "column" : "row"}'), recalc.indexOf("</Flex>", recalc.indexOf('<Flex direction={isMobile ? "column" : "row"}')));
  for (const label of ["From", "To", "Employee", "Store", "Designation"]) assert.match(line, new RegExp(`<FormLabel fontSize="sm">${label}</FormLabel>`), label);
  assert.match(line, />\s*Recalculate\s*</);
  assert.match(line, />\s*Reset\s*</);
  assert.match(recalc, /useBreakpointValue\(\{ base: true, md: false \}\)/);
  assert.match(recalc, /permissionKey=\{\["recalculate_attendance"\]\}/);
});

test("20. date range is required; 21. the other filters are optional and combinable", () => {
  assert.match(recalc, /<FormControl isRequired[^>]*>\s*<FormLabel fontSize="sm">From<\/FormLabel>/);
  assert.match(recalc, /<FormControl isRequired[^>]*>\s*<FormLabel fontSize="sm">To<\/FormLabel>/);
  assert.deepEqual(buildRecalcBody({ from_date: "", to_date: "2026-09-30" }), { error: "Choose a From and To date" });
  assert.deepEqual(buildRecalcBody({ from_date: "2026-10-01", to_date: "2026-09-30" }), { error: "From must not be after To" });
  assert.deepEqual(buildRecalcBody({ from_date: "2026-09-01", to_date: "2026-09-30" }).body, { from_date: "2026-09-01", to_date: "2026-09-30" });
  assert.deepEqual(buildRecalcBody({ from_date: "2026-09-01", to_date: "2026-09-30", employee_id: "42" }).body, { from_date: "2026-09-01", to_date: "2026-09-30", employee_id: 42 });
  assert.deepEqual(buildRecalcBody({ from_date: "2026-09-01", to_date: "2026-09-30", store_id: "3", designation_id: "11" }).body, { from_date: "2026-09-01", to_date: "2026-09-30", store_id: 3, designation_id: 11 });
  assert.deepEqual(buildRecalcBody({ from_date: "2026-09-01", to_date: "2026-09-30", employee_id: "42", store_id: "3", designation_id: "11" }).body, { from_date: "2026-09-01", to_date: "2026-09-30", employee_id: 42, store_id: 3, designation_id: 11 });
  for (const s of ['placeholder="All employees"', 'placeholder="All stores"', 'placeholder="All designations"']) assert.ok(recalc.includes(s), s);
});

test("22. Recalculate sends exactly the built filters; 23. Reset clears the optional filters", () => {
  assert.match(recalc, /const built = buildRecalcBody\(\{ from_date: from, to_date: to, \.\.\.filters \}\)/);
  assert.match(recalc, /recalculateBulk\(built\.body\)/);
  assert.match(helper, /"\/attendance\/calculated\/recalculate-bulk"/);
  assert.match(recalc, /const reset = \(\) => \{\s*setFilters\(EMPTY\);/);
  assert.match(recalc, /const EMPTY = \{ employee_id: "", store_id: "", designation_id: "" \}/);
});

test("24. running status shows an indeterminate progress bar, never an invented percentage", () => {
  assert.match(recalc, /state === "RUNNING" \? <Progress[^>]*isIndeterminate/);
  assert.ok(!/value=\{/.test(recalc.slice(recalc.indexOf("<Progress"), recalc.indexOf("/>", recalc.indexOf("<Progress")))), "no value on the bar");
  assert.deepEqual(["READY", "RUNNING", "COMPLETED", "COMPLETED_WITH_ERRORS", "FAILED"].map(recalcStatusLabel), ["Ready", "Recalculating", "Completed", "Completed with errors", "Failed"]);
  assert.match(recalc, /recalcStatusLabel\(state\)/);
});

test("25. the completed summary uses the counts the backend returned", () => {
  assert.match(recalc, /\{result\.employees_completed\} \/ \{result\.employees_targeted\}/);
  assert.match(recalc, /result\.attendance_days_processed/);
  assert.match(recalc, /\{result\.employees_failed\}/);
  assert.match(recalc, /setState\(res\.status \|\| "COMPLETED"\)/);
});

test("26. the error state renders, with a View errors action for per-employee failures", () => {
  assert.match(recalc, /setState\("FAILED"\)/);
  assert.match(recalc, /View errors \(\$\{result\.errors\.length\}\)/);
  assert.match(recalc, /<Alert status="error"[\s\S]*?\{error\}/);
});

test("27. recent recalculation history renders from the run audit", () => {
  assert.match(recalc, /getRecalculationRuns\(20\)/);
  assert.match(helper, /"\/attendance\/calculated\/recalculate-runs"/);
  for (const h of ["Requested On", "Date Range", "Employee / Filter", "Store", "Designation", "Records Processed", "Status", "Requested By"]) {
    assert.ok(recalc.includes(`<Th>${h}</Th>`) || recalc.includes(`<Th isNumeric>${h}</Th>`), `column ${h}`);
  }
  assert.equal(runFilterLabel({ employee_id: 42, employee_name: "Asha" }), "Asha (42)");
  assert.equal(runFilterLabel({ employee_id: null }), "All employees");
  assert.equal(displayDateTime("2026-09-15 09:00:00"), "15 Sep 2026 09:00");
});

test("28. no salary or payroll amounts appear on any of the three screens", () => {
  for (const src of [approval, ot, recalc, queue]) {
    assert.ok(!/\b(salary|gross|ctc|net pay|payslip|earnings|deduction|₹)\b/i.test(src));
    assert.ok(!/currencyFormatter/.test(src));
  }
  assert.ok(!/payroll/i.test(recalc.replace(/Payroll Lock/g, "")), "no payroll lock screen or wording on Recalculate");
});
