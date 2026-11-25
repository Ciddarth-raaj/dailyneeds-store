/**
 * The Employee Attendance month summary: All | Present Days | Absent Days |
 * Need Action, the counts behind them and the client-side filter they drive.
 *
 *   node --test components/attendance/attendanceSummaryCards.test.js
 *
 * The counting is real - `daySummaryBucket`, `attendanceSummary` and
 * `filterDaysBySummary` are pure and exercised directly. The wiring is read
 * from the sources, the way the other attendance screen tests do, because no
 * component renderer is set up in this repo.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const {
  SUMMARY_FILTER,
  NEED_ACTION_ISSUE_KEYS,
  daySummaryBucket,
  attendanceSummary,
  filterDaysBySummary,
  summaryEmptyMessage,
  dayIssue,
  otClaim,
} = require("../../util/attendanceV2");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const hrPage = strip(read("pages/attendance/calculated/index.jsx"));
const cards = strip(read("components/attendance/AttendanceSummaryCards.jsx"));
const list = strip(read("components/attendance/AttendanceDayList.jsx"));
const picker = strip(read("components/attendance/SearchableEmployeePicker.jsx"));
const helper = strip(read("helper/attendanceV2.js"));

/* Day fixtures, one per real status. */
const day = (over) => ({ attendance_date: "2026-09-01", status: "FINAL", punch_count: 2, ...over });
const PRESENT = day({});
const ABSENT = day({ status: "ABSENT" });
const MISSING_PUNCH = day({ status: "REVIEW_REQUIRED", punch_count: 3, review_reasons: ["MISSING_PUNCH"] });
const REG_PENDING = day({ status: "REGULARIZATION_PENDING" });
const NO_SHIFT = day({ status: "NO_SHIFT_FOR_DATE" });
const SHIFT_SETUP = day({ status: "NO_SCHEDULE_ROW" });

/* ======================================= 1-2. the row and the All count ==== */

test("1. the summary cards render after an employee is selected, between the summary and the table", () => {
  assert.match(hrPage, /<AttendanceSummaryCards/);
  assert.match(hrPage, /\{employeeId \? \([\s\S]*?<AttendanceSummaryCards/);
  const block = hrPage.slice(hrPage.indexOf("{employeeId ? ("));
  assert.ok(
    block.indexOf("<AttendanceSummaryCards") < block.indexOf("<AttendanceDayList"),
    "the cards come before the table"
  );
  assert.match(hrPage, /<SearchableEmployeePicker[\s\S]*?<AttendanceSummaryCards/, "and after the picker/summary");
});

test("2. All is shown, first, and is the total loaded rows", () => {
  const first = cards.slice(cards.indexOf("const CARDS = ["));
  assert.match(first, /\{ key: SUMMARY_FILTER\.ALL, label: "All"/);
  assert.ok(
    first.indexOf("SUMMARY_FILTER.ALL") < first.indexOf("SUMMARY_FILTER.PRESENT"),
    "All sits at the start of the row"
  );
  for (const label of ["All", "Present Days", "Absent Days", "Need Action"]) {
    assert.ok(cards.includes(`"${label}"`), label);
  }
  const counts = attendanceSummary([PRESENT, ABSENT, MISSING_PUNCH, REG_PENDING]);
  assert.strictEqual(counts[SUMMARY_FILTER.ALL], 4);
});

/* ============================================== 3-5. the three counts ==== */

test("3-5. Present, Absent and Need Action count the right days", () => {
  const days = [
    PRESENT,
    PRESENT,
    PRESENT,
    ABSENT,
    MISSING_PUNCH,
    REG_PENDING,
    NO_SHIFT,
    SHIFT_SETUP,
  ];
  const counts = attendanceSummary(days);
  assert.strictEqual(counts[SUMMARY_FILTER.PRESENT], 3);
  assert.strictEqual(counts[SUMMARY_FILTER.ABSENT], 1);
  assert.strictEqual(counts[SUMMARY_FILTER.NEED_ACTION], 4);
  assert.strictEqual(counts[SUMMARY_FILTER.ALL], 8);
  // Every row lands in exactly one bucket.
  assert.strictEqual(
    counts[SUMMARY_FILTER.PRESENT] + counts[SUMMARY_FILTER.ABSENT] + counts[SUMMARY_FILTER.NEED_ACTION],
    counts[SUMMARY_FILTER.ALL]
  );
});

/* ========================================== 6-10. what needs action ==== */

test("6. a Missing Punch day is Need Action, not Absent", () => {
  assert.strictEqual(dayIssue(MISSING_PUNCH).label, "Missing Punch");
  assert.strictEqual(daySummaryBucket(MISSING_PUNCH), SUMMARY_FILTER.NEED_ACTION);
  assert.notStrictEqual(daySummaryBucket(MISSING_PUNCH), SUMMARY_FILTER.ABSENT);
});

test("7. a Regularization Pending day is Need Action", () => {
  assert.strictEqual(dayIssue(REG_PENDING).label, "Regularization Pending");
  assert.strictEqual(daySummaryBucket(REG_PENDING), SUMMARY_FILTER.NEED_ACTION);
});

test("8. a No Shift Assigned day is Need Action", () => {
  assert.strictEqual(dayIssue(NO_SHIFT).label, "No Shift Assigned");
  assert.strictEqual(daySummaryBucket(NO_SHIFT), SUMMARY_FILTER.NEED_ACTION);
});

test("9. a Shift Setup Issue day is Need Action", () => {
  assert.strictEqual(dayIssue(SHIFT_SETUP).label, "Shift Setup Issue");
  assert.strictEqual(daySummaryBucket(SHIFT_SETUP), SUMMARY_FILTER.NEED_ACTION);
});

test("10. Absent is NOT Need Action, and the action keys are exactly the four", () => {
  assert.strictEqual(daySummaryBucket(ABSENT), SUMMARY_FILTER.ABSENT);
  assert.deepStrictEqual([...NEED_ACTION_ISSUE_KEYS].sort(), [
    "MISSING_PUNCH",
    "NO_SHIFT",
    "REGULARIZATION_PENDING",
    "SHIFT_SETUP",
  ]);
  assert.ok(!NEED_ACTION_ISSUE_KEYS.includes("ABSENT"));
});

test("11. Absent counts only actual absent days", () => {
  const counts = attendanceSummary([ABSENT, ABSENT, MISSING_PUNCH, PRESENT, NO_SHIFT]);
  assert.strictEqual(counts[SUMMARY_FILTER.ABSENT], 2);
});

test("12. a normal final day with no issue is Present", () => {
  assert.strictEqual(dayIssue(PRESENT), null);
  assert.strictEqual(daySummaryBucket(PRESENT), SUMMARY_FILTER.PRESENT);
});

/* ================================= 13-16. OT never moves a day ==== */

test("13-16. no OT claim state removes a day from Present, or changes any count", () => {
  const states = [
    ["AVAILABLE", { candidate_ot_minutes: 39 }],
    ["REQUEST_PENDING", { ot_requested_minutes: 39 }],
    ["APPROVED", { approved_ot_minutes: 39 }],
    ["REJECTED", {}],
  ];
  for (const [state, extra] of states) {
    const withOt = day({ ot_claim_state: state, ...extra });
    // The claim really is live on the day...
    assert.ok(otClaim(withOt), `${state} is a real claim`);
    // ...and the day is still Present.
    assert.strictEqual(daySummaryBucket(withOt), SUMMARY_FILTER.PRESENT, state);
  }
  // The same holds for the other buckets: OT does not rescue a bad day either.
  assert.strictEqual(
    daySummaryBucket({ ...ABSENT, ot_claim_state: "APPROVED", approved_ot_minutes: 60 }),
    SUMMARY_FILTER.ABSENT
  );
  assert.strictEqual(
    daySummaryBucket({ ...MISSING_PUNCH, ot_claim_state: "AVAILABLE", candidate_ot_minutes: 20 }),
    SUMMARY_FILTER.NEED_ACTION
  );
  // Counts are identical with and without the claim.
  const plain = [PRESENT, ABSENT, MISSING_PUNCH];
  const otted = plain.map((d) => ({ ...d, ot_claim_state: "REQUEST_PENDING", ot_requested_minutes: 30 }));
  assert.deepStrictEqual(attendanceSummary(otted), attendanceSummary(plain));
});

test("the classifier never reads the OT claim at all", () => {
  const src = strip(read("util/attendanceV2.js"));
  const fn = src.slice(src.indexOf("function daySummaryBucket"), src.indexOf("function attendanceSummary"));
  assert.ok(!/ot_claim|otClaim|candidate_ot|approved_ot/.test(fn), "no OT in the bucketing");
  assert.match(fn, /dayIssue\(day\)/, "the attendance status is the only input");
});

/* ================================== 17-21. clicking the cards ==== */

test("17-19. each filter narrows the loaded rows to its own bucket", () => {
  const days = [PRESENT, ABSENT, MISSING_PUNCH, REG_PENDING, PRESENT];
  const present = filterDaysBySummary(days, SUMMARY_FILTER.PRESENT);
  assert.strictEqual(present.length, 2);
  assert.ok(present.every((d) => daySummaryBucket(d) === SUMMARY_FILTER.PRESENT));

  const absent = filterDaysBySummary(days, SUMMARY_FILTER.ABSENT);
  assert.deepStrictEqual(absent, [ABSENT]);

  const needAction = filterDaysBySummary(days, SUMMARY_FILTER.NEED_ACTION);
  assert.deepStrictEqual(needAction, [MISSING_PUNCH, REG_PENDING]);
});

test("20. All restores every loaded row", () => {
  const days = [PRESENT, ABSENT, MISSING_PUNCH];
  assert.deepStrictEqual(filterDaysBySummary(days, SUMMARY_FILTER.ALL), days);
  assert.deepStrictEqual(filterDaysBySummary(days, null), days);
});

test("the cards are buttons wired to the filter, and the table renders the filtered rows", () => {
  assert.match(cards, /as="button"/);
  assert.match(cards, /onClick=\{\(\) => onSelect\(card\.key\)\}/);
  assert.match(hrPage, /filter=\{summaryFilter\}/);
  assert.match(hrPage, /onFilterChange=\{setSummaryFilter\}/);
  assert.match(hrPage, /const visibleDays = filterDaysBySummary\(days, summaryFilter\)/);
  assert.match(hrPage, /<AttendanceDayList[\s\S]*?days=\{visibleDays\}/);
});

test("21. the selected card is visually highlighted and says so to assistive tech", () => {
  assert.match(cards, /aria-pressed=\{selected\}/);
  assert.match(cards, /selected=\{filter === card\.key\}/);
  assert.match(cards, /borderColor=\{selected \? `\$\{card\.color\}\.400` : "gray\.200"\}/);
  assert.match(cards, /bg=\{selected \? `\$\{card\.color\}\.50` : "white"\}/);
});

test("the card colours follow the attendance conventions", () => {
  const block = cards.slice(cards.indexOf("const CARDS = ["), cards.indexOf("function SummaryCard"));
  assert.match(block, /label: "All", color: "purple"/);
  assert.match(block, /label: "Present Days", color: "green"/);
  assert.match(block, /label: "Absent Days", color: "red"/);
  assert.match(block, /label: "Need Action", color: "orange"/);
});

/* ============================= 22-23. a filter belongs to its month ==== */

test("22-23. changing employee or month resets the filter to All", () => {
  assert.match(hrPage, /useEffect\(\(\) => \{\s*setSummaryFilter\(SUMMARY_FILTER\.ALL\);\s*\}, \[employeeId, month\]\);/);
  // The outlet filter clears the employee when it no longer matches, which
  // runs the same reset through employeeId.
  assert.match(picker, /if \(!stillValid\) onSelect\(null\)/);
  assert.match(hrPage, /useState\(SUMMARY_FILTER\.ALL\)/, "and it starts at All");
});

/* ================================================= 24. the phone ==== */

test("24. mobile cards are filtered by the same selection", () => {
  // One filtered list feeds both renderers, so the phone cannot disagree with
  // the desktop table.
  assert.match(list, /if \(isMobile\) \{[\s\S]*?<DayCard/);
  assert.match(list, /function AttendanceDayList\(\{ days, loading, onSelect, emptyMessage \}\)/);
  assert.match(hrPage, /<AttendanceDayList[\s\S]*?days=\{visibleDays\}/);
  assert.match(cards, /columns=\{\{ base: 2, md: 4 \}\}/, "the cards themselves wrap on a phone");
  // The card tap still opens the Day Detail.
  assert.match(list, /as="button"[\s\S]*?onClick=\{\(\) => onSelect\(day\)\}/);
});

/* ==================================== 25. nothing in this filter ==== */

test("25. a filter with no rows says so, compactly, in its own words", () => {
  assert.strictEqual(summaryEmptyMessage(SUMMARY_FILTER.ABSENT), "No absent days in this month.");
  assert.strictEqual(summaryEmptyMessage(SUMMARY_FILTER.NEED_ACTION), "No attendance items need action.");
  assert.strictEqual(summaryEmptyMessage(SUMMARY_FILTER.PRESENT), "No present days in this month.");
  assert.strictEqual(summaryEmptyMessage(SUMMARY_FILTER.ALL), "No attendance for this period.");
  assert.strictEqual(summaryEmptyMessage(undefined), "No attendance for this period.");
  assert.strictEqual(filterDaysBySummary([PRESENT], SUMMARY_FILTER.ABSENT).length, 0);
  assert.match(hrPage, /emptyMessage=\{summaryEmptyMessage\(summaryFilter\)\}/);
  // No bordered empty table: the list returns the line before it builds one.
  assert.match(list, /if \(!days \|\| days\.length === 0\) \{[\s\S]*?<Text[\s\S]*?\{emptyMessage \|\| "No attendance for this period\."\}/);
});

/* ========================= 26-29. everything else is left alone ==== */

test("26. the employee picker is untouched by this change", () => {
  assert.match(hrPage, /<SearchableEmployeePicker[\s\S]*?selectedId=\{employeeId\}[\s\S]*?onSelect=\{setEmployeeId\}/);
  assert.match(picker, /function SearchableEmployeePicker\(\{ selectedId, onSelect, disabled = false, trailingControl = null \}\)/);
  assert.ok(!/summary|Summary|filter=/.test(picker.slice(picker.indexOf("function SearchableEmployeePicker"))), "the picker knows nothing about the cards");
  assert.match(hrPage, /type="month"/);
});

test("27-28. View Details and the Day Detail still work, on the filtered rows", () => {
  assert.match(list, /View Details →/);
  assert.match(list, /e\.stopPropagation\(\);\s*onSelect\(day\);/);
  assert.match(list, /<Tr[\s\S]*?onClick=\{\(\) => onSelect\(day\)\}/);
  assert.match(hrPage, /<AttendanceDayList[\s\S]*?onSelect=\{setSelected\}/);
  assert.match(hrPage, /<AttendanceDayDetail[\s\S]*?isOpen=\{!!selected\}/);
  // Edit Shift and Void Punch stay on the detail, still permission-gated.
  assert.match(hrPage, /onEditShift=\{canEditShift \? \(day\) => setEditing\(day\) : null\}/);
  assert.match(hrPage, /onVoidPunch=\{canVoidPunch \? \(punch\) => setVoiding\(punch\) : null\}/);
});

test("29. no API or helper call changed: the cards cost no request", () => {
  // The page still makes exactly the one calculated-attendance read it made
  // before, keyed on employee and month only.
  assert.match(hrPage, /getEmployeeAttendance\(\{ employee_id: employeeId, \.\.\.bounds \}\)/);
  assert.strictEqual((hrPage.match(/AttendanceV2Helper\./g) || []).length, 1, "one read, not two");
  assert.match(hrPage, /\}, \[employeeId, month\]\);/, "the load depends on employee and month, not the filter");
  assert.ok(!/summaryFilter/.test(hrPage.slice(hrPage.indexOf("const load ="), hrPage.indexOf("useEffect"))), "the filter never reaches the request");
  // And the helper itself is untouched by this change.
  assert.match(helper, /"\/attendance\/calculated"/);
  assert.ok(!/summary|need_action|present_days/i.test(helper), "no new endpoint");
});
