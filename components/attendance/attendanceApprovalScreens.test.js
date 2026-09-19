/**
 * The Attendance Approval Centre and Recalculate Attendance: the approved
 * shape of the screens, read from the sources (no renderer in this repo).
 *
 * THERE IS ONE APPROVAL SCREEN NOW, with Attendance | OT | Shift on it, and
 * `/attendance/ot-approval` is a redirect into its OT tab. The assertions
 * below are the same properties they always were - one request type at a
 * time, OT read-only, Approve/Reject only where the backend says the row is
 * actionable - stated against the one screen instead of two.
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
const shiftForm = strip(read("components/attendance/ShiftChangeRequestForm.jsx"));
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

test("1. the approval centre renders Pending with me, counted by the server under the SAME filters", () => {
  assert.match(approval, /Pending with me:/);
  assert.match(approval, /getApprovalCount\(type, queryFilters\)/);
  assert.match(approval, /\{count === null \? "—" : count\}/);
  assert.match(approval, /permissionKey=\{\["view_attendance_approvals"\]\}/);
});

test("2. ONE request type is requested and rendered at a time - Attendance, OT and Shift never mix", () => {
  assert.match(approval, /getApprovals\(\{ request_type: type, status, \.\.\.queryFilters \}\)/);
  assert.match(approval, /<ApprovalQueue[\s\S]*?kind=\{type\}/);
  assert.match(
    approval,
    /\{ key: "REGULARIZATION", label: "Attendance" \},\s*\{ key: "OT", label: "OT" \},\s*\{ key: "SHIFT_CHANGE", label: "Shift" \}/
  );
  // The old OT screen is a redirect and not a second queue.
  assert.match(ot, /router\.replace\("\/attendance\/approval\?type=OT"\)/);
  assert.ok(!/ApprovalQueue/.test(ot), "the OT route renders no queue of its own");
});

test("2b. the filters narrow and the outlet scope is the server's", () => {
  for (const f of ['placeholder="All outlets"', 'placeholder="All employees"', 'placeholder="All designations"']) {
    assert.ok(approval.includes(f), f);
  }
  assert.match(approval, />\s*Clear Filters\s*</);
  // The employee options come from the requests the server returned, so the
  // dropdown can never name somebody this approver is not entitled to see.
  assert.match(approval, /if \(!queryFilters\.employee_id\)/);
  assert.match(approval, /setRoster\(/);
  assert.ok(!/useEmployeeDirectory|useEmployees/.test(approval), "no employee-reading permission is assumed");
  // Switching tabs keeps the filters: `filters` is not reset when `type` changes.
  assert.ok(!/setFilters\(EMPTY_FILTERS\)[\s\S]{0,80}setType/.test(approval));
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
  for (const h of ["Employee", "Date", "Shift", "Existing Punches", "Proposed Punch", "Reason", "Submitted", "Action"]) {
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

test("7. no minutes can be typed anywhere, on any tab", () => {
  // The OT block belongs to the OT tab; the attendance tab shows the proposed
  // punch and the shift tab shows the two shifts, and none of the three
  // offers an input for a duration.
  assert.match(detail, /!isOt \? \([\s\S]*?Proposed missing punch/, "the OT block is the OT tab's only");
  assert.ok(!/<Input|<NumberInput|type="number"/.test(queue), "no input for minutes anywhere in the queue");
  assert.ok(!/eligible_ot_minutes:|approved_ot_minutes:|ot_minutes:/.test(approval), "the page sends no minutes");
});

/* ================================================== OT Approval ==== */

test("8. Pending / Approved / Rejected / All tabs render; 9. Pending with me renders", () => {
  for (const t of ["<Tab>Pending</Tab>", "<Tab>Approved</Tab>", "<Tab>Rejected</Tab>", "<Tab>All</Tab>"]) assert.ok(approval.includes(t), t);
  assert.match(approval, /const STATUSES = \["PENDING", "APPROVED", "REJECTED", "ALL"\]/);
  assert.match(approval, /Pending with me:/);
});

test("10. pending rows expand inline; 11. the employee's OT reason is shown; 12. OT minutes are read-only", () => {
  assert.match(detail, /label="Eligible OT \(read only\)"/);
  assert.match(detail, /formatOtClock\(row\.eligible_ot_minutes\)/);
  assert.match(detail, /label="Employee reason"/);
  assert.ok(!/<Input|<NumberInput|type="number"/.test(queue));
  // The OT table's approved columns, including the REGULAR NRM the base shift
  // decides - which on a covered day is deliberately not the day's own NRM.
  for (const h of ["Employee", "Date", "Shift", "Working Time", "Regular NRM", "OT", "Employee Reason", "Submitted", "Action"]) {
    assert.ok(list.includes(h), `column ${h}`);
  }
  assert.match(detail, /label="Regular NRM"[\s\S]*?row\.base_nrm_minutes/);
});

test("10b. the Shift tab's table is the approved one, and says what approving does", () => {
  for (const h of ["Normal Shift", "Requested Shift", "Approval Stage"]) {
    assert.ok(list.includes(h), `column ${h}`);
  }
  assert.match(detail, /label="Requested shift"/);
  assert.match(detail, /label="Normal shift"/);
  assert.match(detail, /and to no other date/);
  assert.match(detail, /permanent shift and salary are not changed/);
});

test("10c. a rejection cannot be recorded without a reason", () => {
  assert.match(detail, /const rejectBlocked = remarks\.trim\(\)\.length < 5/);
  assert.match(detail, /isDisabled=\{!!deciding \|\| rejectBlocked\}/);
});

test("10d. the one-day shift REQUEST asks, and says so", () => {
  assert.match(shiftForm, /raiseMyShiftChange\(\{[\s\S]*?attendance_date: date,[\s\S]*?work_shift_id: Number\(workShiftId\),[\s\S]*?reason: reason\.trim\(\)/);
  assert.ok(!/employee_id/.test(shiftForm), "never names an employee - the session decides whose it is");
  assert.match(shiftForm, /This is a request\./);
  assert.match(shiftForm, /only for this one date/);
  // Only longer shifts are offered, and the server is the authority on it.
  assert.match(shiftForm, /getMyShiftChangeOptions\(forDate\)/);
  assert.match(shiftForm, /longer working hours than your normal shift/);
  assert.match(shiftForm, /read only/);
});

test("13. Approve / Reject appear only where the backend says the row is actionable", () => {
  assert.match(detail, /row\.status === "PENDING" && row\.actionable && onDecide \?/);
  assert.match(approval, /onDecide=\{name === "PENDING" \|\| name === "ALL" \? onDecide : null\}/);
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

test("28. no salary or payroll amounts appear on any of these screens", () => {
  for (const src of [approval, ot, recalc, queue]) {
    // The ONE permitted mention of salary is the shift tab's reassurance that
    // approving a one-day shift does not touch the salary master - which is a
    // statement that no salary is involved, and is exactly the thing an
    // approver needs to be told. Every other form of the word, and every
    // amount, stays banned.
    const withoutReassurance = src.replace(/permanent shift and salary are not changed/g, "");
    assert.ok(!/\b(salary|gross|ctc|net pay|payslip|earnings|deduction|₹)\b/i.test(withoutReassurance));
    assert.ok(!/currencyFormatter/.test(src));
  }
  assert.ok(!/payroll/i.test(recalc.replace(/Payroll Lock/g, "")), "no payroll lock screen or wording on Recalculate");
});
