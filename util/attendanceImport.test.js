/**
 * DigiSME attendance import - the screen's arithmetic and vocabulary.
 *
 *   node --test util/attendanceImport.test.js
 *
 * What is defended here is the MEANING the screen gives to the server's
 * numbers, because that is where this feature can mislead an operator:
 *
 *   - a collision is a warning where BOTH punches are kept, never data loss
 *   - an unmatched employee code still imports the punch
 *   - a re-import duplicate is a safe skip
 *   - COMMITTED_WITH_ERRORS reports what imported, not a failed import
 *   - choosing a different file invalidates the preview on screen
 *   - the commit plan counts every punch that will be written
 */
const test = require("node:test");
const assert = require("node:assert");

const u = require("./attendanceImport");

const batch = (extra = {}) => ({
  import_batch_id: 7,
  original_filename: "ATDDailyAttendance.xlsx",
  sheet_name: "Attendance",
  status: "PREVIEWED",
  excel_row_count: 1200,
  employee_code_count: 212,
  candidate_count: 5982,
  valid_count: 5900,
  unmatched_count: 40,
  reimport_duplicate_count: 30,
  cross_source_collision_count: 2,
  bad_count: 10,
  date_from: "2026-08-01",
  date_to: "2026-08-31",
  ...extra,
});

/* --------------------------------------------------------------- summary */

test("the five summary cards carry the server's counts, and each says what its number means", () => {
  const cards = u.summaryCards(batch());
  assert.deepStrictEqual(
    cards.map((c) => [c.label, c.count]),
    [
      ["Valid Punches", 5900],
      ["Unmatched Employees", 40],
      ["Re-import Duplicates", 30],
      ["Cross-source Collisions", 2],
      ["Bad Rows / Cells", 10],
    ]
  );
  for (const c of cards) assert.ok(c.note && c.note.length > 10, `${c.label} explains itself`);
});

test("a collision is a warning that keeps both punches - never red, never loss", () => {
  const collision = u.summaryCards(batch()).find((c) => c.key === "collision");
  assert.notStrictEqual(collision.tone, "red");
  assert.match(collision.note, /[Bb]oth are kept/);
  assert.match(collision.note, /not changed/);
  assert.doesNotMatch(collision.note, /lost|overwrit|delete|replace/i);
  assert.notStrictEqual(u.CLASSIFICATION_TONE.CROSS_SOURCE_COLLISION, "red");
});

test("an unmatched punch is preserved and a duplicate is a safe skip - neither reads as a rejection", () => {
  const cards = u.summaryCards(batch());
  const unmatched = cards.find((c) => c.key === "unmatched");
  assert.match(unmatched.note, /still imported and kept/);
  const dup = cards.find((c) => c.key === "reimport");
  assert.match(dup.note, /[Ss]kipped safely|harmless/);
  // Only a bad row is actually skipped for being unreadable, and only that row.
  const bad = cards.find((c) => c.key === "bad");
  assert.match(bad.note, /[Oo]nly that row or cell/);
});

test("no classification is presented in red: nothing here loses a punch by classification", () => {
  for (const [key, tone] of Object.entries(u.CLASSIFICATION_TONE)) {
    assert.notStrictEqual(tone, "red", `${key} is not red`);
  }
});

test("the facts row is File Name, Sheet, Excel Rows, Employees, Punches Found and Date Range", () => {
  const facts = u.batchFacts(batch());
  assert.deepStrictEqual(facts.map((f) => f.label), [
    "File Name",
    "Sheet",
    "Excel Rows",
    "Employees",
    "Punches Found",
    "Date Range",
  ]);
  assert.strictEqual(facts.find((f) => f.label === "Date Range").value, "01-08-2026 to 31-08-2026");
  assert.strictEqual(facts.find((f) => f.label === "Punches Found").value, "5,982");
});

test("a single-day file shows one date, not a range of a date to itself", () => {
  assert.strictEqual(u.dateRangeText({ date_from: "2026-08-05", date_to: "2026-08-05" }), "05-08-2026");
  assert.strictEqual(u.dateRangeText({}), "-");
});

/* ------------------------------------------------------------ commit plan */

test("the confirm modal counts every punch that will be written: valid + unmatched + collisions", () => {
  const plan = u.commitPlan(batch());
  assert.strictEqual(plan.toImport, 5900 + 40 + 2);
  assert.strictEqual(plan.unmatched, 40);
  assert.strictEqual(plan.collisions, 2);
  assert.strictEqual(plan.duplicates, 30);
  assert.strictEqual(plan.badRows, 10);
});

test("duplicates and bad rows are NOT counted as punches to import", () => {
  const plan = u.commitPlan(batch({ valid_count: 0, unmatched_count: 0, cross_source_collision_count: 0 }));
  assert.strictEqual(plan.toImport, 0);
  assert.strictEqual(plan.duplicates, 30);
  assert.strictEqual(plan.badRows, 10);
});

test("only a PREVIEWED batch may be committed", () => {
  assert.strictEqual(u.canCommit(batch()), true);
  for (const status of ["COMMITTING", "COMMITTED", "COMMITTED_WITH_ERRORS", "FAILED"]) {
    assert.strictEqual(u.canCommit(batch({ status })), false, status);
  }
  assert.strictEqual(u.canCommit(null), false);
});

/* --------------------------------------------------------------- outcome */

test("the commit result reports the six outcomes in reporting order", () => {
  const rows = u.outcomeRows({ IMPORTED: 5900, IMPORTED_UNMATCHED: 40, IMPORTED_WITH_COLLISION: 2, SKIPPED_REIMPORT_DUPLICATE: 30, SKIPPED_BAD_ROW: 10 });
  assert.deepStrictEqual(rows.map((r) => r.key), [
    "IMPORTED",
    "IMPORTED_UNMATCHED",
    "IMPORTED_WITH_COLLISION",
    "SKIPPED_REIMPORT_DUPLICATE",
    "SKIPPED_BAD_ROW",
    "FAILED",
  ]);
  assert.strictEqual(rows.find((r) => r.key === "FAILED").count, 0);
  assert.match(rows.find((r) => r.key === "IMPORTED_WITH_COLLISION").label, /also kept/);
});

test("COMMITTED_WITH_ERRORS says what imported and is not called a failure", () => {
  const msg = u.commitResultMessage(batch({ status: "COMMITTED_WITH_ERRORS" }), {
    IMPORTED: 5900, IMPORTED_UNMATCHED: 40, IMPORTED_WITH_COLLISION: 2, FAILED: 3,
  });
  assert.strictEqual(msg.tone, "warning");
  assert.match(msg.text, /5,942 punch\(es\) imported/);
  assert.match(msg.text, /3 row\(s\) could not be written/);
  assert.doesNotMatch(msg.text, /failed import|import failed/i);
});

test("a clean commit counts the unmatched and colliding punches as imported too", () => {
  const msg = u.commitResultMessage(batch({ status: "COMMITTED" }), {
    IMPORTED: 100, IMPORTED_UNMATCHED: 5, IMPORTED_WITH_COLLISION: 1,
  });
  assert.strictEqual(msg.tone, "success");
  assert.match(msg.text, /106 punch\(es\) imported/);
});

test("a FAILED batch shows the server's own reason", () => {
  const msg = u.commitResultMessage(batch({ status: "FAILED", error_message: "the database connection was lost" }), {});
  assert.strictEqual(msg.tone, "error");
  assert.match(msg.text, /database connection was lost/);
});

/* ----------------------------------------------------- file selection UX */

test("only .xlsx is accepted, and an empty or oversized file is refused before a round trip", () => {
  assert.strictEqual(u.validateSelectedFile({ name: "ATDDailyAttendance.xlsx", size: 2048 }).ok, true);
  assert.strictEqual(u.validateSelectedFile({ name: "report.xls", size: 2048 }).ok, false);
  assert.strictEqual(u.validateSelectedFile({ name: "report.csv", size: 2048 }).ok, false);
  assert.strictEqual(u.validateSelectedFile({ name: "empty.xlsx", size: 0 }).ok, false);
  assert.strictEqual(u.validateSelectedFile({ name: "huge.xlsx", size: u.MAX_UPLOAD_BYTES + 1 }).ok, false);
  assert.strictEqual(u.validateSelectedFile(null).ok, false);
  // Case does not matter; the server checks the same way.
  assert.strictEqual(u.validateSelectedFile({ name: "A.XLSX", size: 10 }).ok, true);
});

test("choosing a DIFFERENT file invalidates the preview on screen; re-choosing the same one does not", () => {
  const first = { name: "ATDDailyAttendance.xlsx", size: 90000 };
  assert.strictEqual(u.selectionInvalidatesPreview(first, { name: "August.xlsx", size: 90000 }), true);
  assert.strictEqual(u.selectionInvalidatesPreview(first, { name: "ATDDailyAttendance.xlsx", size: 91000 }), true);
  assert.strictEqual(u.selectionInvalidatesPreview(first, null), true);
  assert.strictEqual(u.selectionInvalidatesPreview(first, { name: "ATDDailyAttendance.xlsx", size: 90000 }), false);
  // Nothing to invalidate before the first preview.
  assert.strictEqual(u.selectionInvalidatesPreview(null, first), false);
});

/* ------------------------------------------------------------ item views */

test("the exception filters are All plus the four exception classifications - never VALID-only", () => {
  assert.deepStrictEqual(u.ITEM_FILTERS.map((f) => f.label), [
    "All",
    "Unmatched Employee",
    "Re-import Duplicate",
    "Cross-source Collision",
    "Bad Row",
  ]);
  assert.strictEqual(u.ITEM_FILTERS[0].key, "");
});

test("Collided Punch ID is shown for collisions and for All, and dropped where it is always empty", () => {
  const has = (c) => u.itemColumns(c).some((col) => col.key === "collided_punch_id");
  assert.strictEqual(has(""), true);
  assert.strictEqual(has("CROSS_SOURCE_COLLISION"), true);
  assert.strictEqual(has("BAD_ROW"), false);
  assert.strictEqual(has("UNMATCHED_EMPLOYEE"), false);
});

test("the item columns are the approved set and carry no device or punch location", () => {
  const headers = u.itemColumns("").map((c) => c.header);
  assert.deepStrictEqual(headers, [
    "Excel Row",
    "Employee Code",
    "Clock Date",
    "Clock Time Column",
    "Clock Time",
    "Classification",
    "Attendance Date",
    "Collided Punch ID",
    "Message",
  ]);
  for (const h of headers) assert.doesNotMatch(h, /device|location|outlet|in\/out|hours/i);
});

test("paging is server-side: a page becomes limit and offset, and the batch id always travels", () => {
  assert.deepStrictEqual(u.pageQuery(1, 100), { limit: 100, offset: 0 });
  assert.deepStrictEqual(u.pageQuery(3, 100), { limit: 100, offset: 200 });
  assert.deepStrictEqual(u.pageQuery(0, 100), { limit: 100, offset: 0 }, "page 0 is page 1");
  assert.deepStrictEqual(u.itemsQuery(7, "BAD_ROW", 2, 50), {
    import_batch_id: 7, classification: "BAD_ROW", limit: 50, offset: 50,
  });
  const all = u.itemsQuery(7, "", 1, 50);
  assert.strictEqual("classification" in all, false, "All sends no classification");
});

test("page counts never drop below one, so an empty filter still renders", () => {
  assert.strictEqual(u.pageCount(0, 100), 1);
  assert.strictEqual(u.pageCount(100, 100), 1);
  assert.strictEqual(u.pageCount(101, 100), 2);
  assert.strictEqual(u.pageCount(5982, 100), 60);
});

/* ---------------------------------------------------------------- errors */

test("a 409 on commit explains that the batch is already committed, without alarm", () => {
  const msg = u.requestErrorMessage({ code: 409, msg: "batch is COMMITTED; only a PREVIEWED batch can be committed" });
  assert.match(msg, /COMMITTED/);
  const generic = u.requestErrorMessage({ code: 409 });
  assert.match(generic, /already been committed/);
  assert.doesNotMatch(generic, /error|failed/i);
});

test("a refusal and an unknown failure both say something true, and never a file path", () => {
  assert.match(u.requestErrorMessage({ code: 403 }), /do not have permission/);
  assert.strictEqual(u.requestErrorMessage({ code: 400, msg: "only .xlsx files are accepted" }), "only .xlsx files are accepted");
  assert.strictEqual(u.requestErrorMessage(null, "Could not load"), "Could not load");
});

/* ------------------------------------------------------------ formatting */

test("counts are grouped Indian-style and sizes are human", () => {
  assert.strictEqual(u.formatCount(5982), "5,982");
  assert.strictEqual(u.formatCount(0), "0");
  assert.strictEqual(u.formatBytes(900), "900 B");
  assert.strictEqual(u.formatBytes(90000), "87.9 KB");
  assert.strictEqual(u.formatBytes(3 * 1024 * 1024), "3.00 MB");
});

test("dates read the way the DigiSME sheet writes them, and a punch time is shown in full", () => {
  assert.strictEqual(u.displayDate("2026-08-31"), "31-08-2026");
  assert.strictEqual(u.displayDate(null), "");
  assert.strictEqual(u.displayDateTime("2026-09-11 09:39:04"), "11-09-2026 09:39");
  assert.strictEqual(u.displayPunchTime("20260911105331"), "11-09-2026 10:53:31");
  assert.strictEqual(u.displayPunchTime(""), "");
});

test("every batch status has a label and a tone, and COMMITTED_WITH_ERRORS is not worded as a failure", () => {
  for (const s of ["PREVIEWED", "COMMITTING", "COMMITTED", "COMMITTED_WITH_ERRORS", "FAILED"]) {
    assert.ok(u.BATCH_STATUS_LABEL[s], s);
    assert.ok(u.BATCH_STATUS_TONE[s], s);
  }
  assert.doesNotMatch(u.BATCH_STATUS_LABEL.COMMITTED_WITH_ERRORS, /^Failed/);
  assert.notStrictEqual(u.BATCH_STATUS_TONE.COMMITTED_WITH_ERRORS, "red");
});
