/**
 * DigiSME attendance import - the screen's vocabulary and arithmetic.
 *
 * Everything here is presentation of what the BACKEND decided. Nothing in
 * this file parses a workbook, resolves an employee, dates a punch or counts
 * anything the server did not already count: the batch row and the item rows
 * are the source of truth and these functions only label and arrange them.
 *
 * The tone matters and is encoded here rather than left to each call site:
 *
 *   collision            a WARNING. Both punches are kept; the device punch
 *                        is never touched and nothing is lost.
 *   re-import duplicate  neutral. Already imported, so skipped safely.
 *   unmatched employee   a WARNING. The punch IS preserved, exactly as a live
 *                        punch from an unknown code is; only the identity is
 *                        missing.
 *   bad row / cell       the only real rejection, and only of that row or cell.
 *
 * `COMMITTED_WITH_ERRORS` is deliberately not called a failure: the punches
 * that imported are imported.
 */

const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
const ITEMS_PAGE_SIZE = 100;

/* ------------------------------------------------------------ vocabulary */

const CLASSIFICATION = {
  VALID: "VALID",
  UNMATCHED_EMPLOYEE: "UNMATCHED_EMPLOYEE",
  BAD_ROW: "BAD_ROW",
  REIMPORT_DUPLICATE: "REIMPORT_DUPLICATE",
  CROSS_SOURCE_COLLISION: "CROSS_SOURCE_COLLISION",
};

const CLASSIFICATION_LABEL = {
  VALID: "Valid",
  UNMATCHED_EMPLOYEE: "Unmatched Employee",
  BAD_ROW: "Bad Row",
  REIMPORT_DUPLICATE: "Re-import Duplicate",
  CROSS_SOURCE_COLLISION: "Cross-source Collision",
};

/** Chakra colour schemes. Nothing is red: no classification loses a punch. */
const CLASSIFICATION_TONE = {
  VALID: "green",
  UNMATCHED_EMPLOYEE: "orange",
  BAD_ROW: "gray",
  REIMPORT_DUPLICATE: "blue",
  CROSS_SOURCE_COLLISION: "yellow",
};

const OUTCOME_LABEL = {
  IMPORTED: "Imported",
  IMPORTED_UNMATCHED: "Imported (unmatched employee)",
  IMPORTED_WITH_COLLISION: "Imported (device punch also kept)",
  SKIPPED_REIMPORT_DUPLICATE: "Skipped - already imported",
  SKIPPED_BAD_ROW: "Skipped - bad row",
  FAILED: "Failed",
};

const OUTCOME_TONE = {
  IMPORTED: "green",
  IMPORTED_UNMATCHED: "orange",
  IMPORTED_WITH_COLLISION: "yellow",
  SKIPPED_REIMPORT_DUPLICATE: "blue",
  SKIPPED_BAD_ROW: "gray",
  FAILED: "red",
};

const BATCH_STATUS_LABEL = {
  PREVIEWED: "Previewed",
  COMMITTING: "Committing",
  COMMITTED: "Committed",
  COMMITTED_WITH_ERRORS: "Committed with some rows failed",
  FAILED: "Failed",
};

const BATCH_STATUS_TONE = {
  PREVIEWED: "purple",
  COMMITTING: "blue",
  COMMITTED: "green",
  COMMITTED_WITH_ERRORS: "orange",
  FAILED: "red",
};

/** The exception filter chips, in the order the screen shows them. */
const ITEM_FILTERS = [
  { key: "", label: "All" },
  { key: CLASSIFICATION.UNMATCHED_EMPLOYEE, label: CLASSIFICATION_LABEL.UNMATCHED_EMPLOYEE },
  { key: CLASSIFICATION.REIMPORT_DUPLICATE, label: CLASSIFICATION_LABEL.REIMPORT_DUPLICATE },
  { key: CLASSIFICATION.CROSS_SOURCE_COLLISION, label: CLASSIFICATION_LABEL.CROSS_SOURCE_COLLISION },
  { key: CLASSIFICATION.BAD_ROW, label: CLASSIFICATION_LABEL.BAD_ROW },
];

/* -------------------------------------------------------------- formatting */

function formatCount(value) {
  return Number(value || 0).toLocaleString("en-IN");
}

function formatBytes(bytes) {
  const n = Number(bytes);
  if (!n || n < 0) return "0 KB";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

/** `YYYY-MM-DD` -> `DD-MM-YYYY`, the form the DigiSME sheet itself uses. */
function displayDate(iso) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
  return m ? `${m[3]}-${m[2]}-${m[1]}` : String(iso);
}

function displayDateTime(value) {
  if (!value) return "";
  const s = String(value);
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}` : s;
}

/** The batch's own range, as one phrase. */
function dateRangeText(batch) {
  if (!batch || (!batch.date_from && !batch.date_to)) return "-";
  const from = displayDate(batch.date_from);
  const to = displayDate(batch.date_to);
  if (from && to && from !== to) return `${from} to ${to}`;
  return from || to;
}

/** `20260911105331` -> `11-09-2026 10:53:31`; anything else is shown as-is. */
function displayPunchTime(ioTimeRaw) {
  const s = String(ioTimeRaw || "");
  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(s);
  return m ? `${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}:${m[6]}` : s;
}

/* ------------------------------------------------------- file selection */

/**
 * Is this file worth sending? The BACKEND is authoritative - it re-checks the
 * extension, the zip signature and the size and refuses with its own message.
 * This is only so an obvious mistake does not need a round trip.
 *
 * @returns {{ok: boolean, error: string|null}}
 */
function validateSelectedFile(file) {
  if (!file) return { ok: false, error: "Choose an .xlsx file to preview." };
  if (!/\.xlsx$/i.test(String(file.name || ""))) {
    return { ok: false, error: "Only .xlsx files are accepted. Export the ATD Daily Attendance report from DigiSME as Excel." };
  }
  if (Number(file.size) === 0) return { ok: false, error: "That file is empty." };
  if (Number(file.size) > MAX_UPLOAD_BYTES) {
    return { ok: false, error: `That file is larger than ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` };
  }
  return { ok: true, error: null };
}

/**
 * Does choosing this file invalidate the preview on screen?
 *
 * Any different file does: the staged batch belongs to the file that was
 * uploaded, and committing it after the operator has picked another one would
 * import something they are no longer looking at. Re-picking the identical
 * file (same name and size) is not a change.
 */
function selectionInvalidatesPreview(previousFile, nextFile) {
  if (!previousFile) return false;
  if (!nextFile) return true;
  return String(previousFile.name) !== String(nextFile.name) || Number(previousFile.size) !== Number(nextFile.size);
}

/* ----------------------------------------------------------- the summary */

/** File Name / Sheet / Excel Rows / Employees / Punches Found / Date Range. */
function batchFacts(batch) {
  if (!batch) return [];
  return [
    { key: "file", label: "File Name", value: batch.original_filename || "-" },
    { key: "sheet", label: "Sheet", value: batch.sheet_name || "-" },
    { key: "rows", label: "Excel Rows", value: formatCount(batch.excel_row_count) },
    { key: "employees", label: "Employees", value: formatCount(batch.employee_code_count) },
    { key: "punches", label: "Punches Found", value: formatCount(batch.candidate_count) },
    { key: "range", label: "Date Range", value: dateRangeText(batch) },
  ];
}

/**
 * The five status cards. `note` is what the count MEANS, and is the reason
 * this lives in one place: a collision must read as "both kept", never as
 * data lost.
 */
function summaryCards(batch) {
  const b = batch || {};
  return [
    {
      key: "valid",
      label: "Valid Punches",
      count: Number(b.valid_count || 0),
      tone: CLASSIFICATION_TONE.VALID,
      note: "Ready to import.",
      classification: CLASSIFICATION.VALID,
    },
    {
      key: "unmatched",
      label: "Unmatched Employees",
      count: Number(b.unmatched_count || 0),
      tone: CLASSIFICATION_TONE.UNMATCHED_EMPLOYEE,
      note: "Employee Code is not in the employee master. The punch is still imported and kept.",
      classification: CLASSIFICATION.UNMATCHED_EMPLOYEE,
    },
    {
      key: "reimport",
      label: "Re-import Duplicates",
      count: Number(b.reimport_duplicate_count || 0),
      tone: CLASSIFICATION_TONE.REIMPORT_DUPLICATE,
      note: "Already imported from an earlier file. Skipped safely - re-importing the same export is harmless.",
      classification: CLASSIFICATION.REIMPORT_DUPLICATE,
    },
    {
      key: "collision",
      label: "Cross-source Collisions",
      count: Number(b.cross_source_collision_count || 0),
      tone: CLASSIFICATION_TONE.CROSS_SOURCE_COLLISION,
      note: "A device punch already exists for this employee at the same time. Both are kept; the device punch is not changed.",
      classification: CLASSIFICATION.CROSS_SOURCE_COLLISION,
    },
    {
      key: "bad",
      label: "Bad Rows / Cells",
      count: Number(b.bad_count || 0),
      tone: CLASSIFICATION_TONE.BAD_ROW,
      note: "An unreadable Employee Code, date or time. Only that row or cell is skipped.",
      classification: CLASSIFICATION.BAD_ROW,
    },
  ];
}

/**
 * What the confirmation modal states. `toImport` is every punch that will be
 * written: valid, unmatched and colliding alike, because all three are kept.
 */
function commitPlan(batch) {
  const b = batch || {};
  const valid = Number(b.valid_count || 0);
  const unmatched = Number(b.unmatched_count || 0);
  const collisions = Number(b.cross_source_collision_count || 0);
  return {
    toImport: valid + unmatched + collisions,
    valid,
    unmatched,
    collisions,
    duplicates: Number(b.reimport_duplicate_count || 0),
    badRows: Number(b.bad_count || 0),
  };
}

/** Only a PREVIEWED batch may be committed; anything else is already decided. */
function canCommit(batch) {
  return Boolean(batch) && batch.status === "PREVIEWED";
}

/* ------------------------------------------------------------ the result */

/** The six outcome counts, in reporting order, from `outcome_counts`. */
function outcomeRows(outcomeCounts) {
  const counts = outcomeCounts || {};
  return [
    "IMPORTED",
    "IMPORTED_UNMATCHED",
    "IMPORTED_WITH_COLLISION",
    "SKIPPED_REIMPORT_DUPLICATE",
    "SKIPPED_BAD_ROW",
    "FAILED",
  ].map((key) => ({ key, label: OUTCOME_LABEL[key], tone: OUTCOME_TONE[key], count: Number(counts[key] || 0) }));
}

/**
 * One sentence for the finished batch. COMMITTED_WITH_ERRORS says what did
 * import first, because it is not a failed import.
 */
function commitResultMessage(batch, outcomeCounts) {
  const c = outcomeCounts || {};
  const imported = Number(c.IMPORTED || 0) + Number(c.IMPORTED_UNMATCHED || 0) + Number(c.IMPORTED_WITH_COLLISION || 0);
  const failed = Number(c.FAILED || 0);
  const status = batch ? batch.status : null;
  if (status === "COMMITTED") {
    return { tone: "success", text: `${formatCount(imported)} punch(es) imported.` };
  }
  if (status === "COMMITTED_WITH_ERRORS") {
    return {
      tone: "warning",
      text: `${formatCount(imported)} punch(es) imported. ${formatCount(failed)} row(s) could not be written and are listed below; re-importing the same file will retry only those.`,
    };
  }
  if (status === "FAILED") {
    return { tone: "error", text: (batch && batch.error_message) || "The import could not be completed." };
  }
  return { tone: "info", text: "This batch has been previewed and not yet imported." };
}

/* ----------------------------------------------------------- item rows */

/** The item grid's columns. `Collided Punch ID` only where it can be filled. */
function itemColumns(classification) {
  const cols = [
    { key: "excel_row", header: "Excel Row", width: 110 },
    { key: "user_id", header: "Employee Code", width: 140 },
    { key: "raw_clock_date", header: "Clock Date", width: 130 },
    { key: "column_name", header: "Clock Time Column", width: 160 },
    { key: "raw_clock_time", header: "Clock Time", width: 120 },
    { key: "classification", header: "Classification", width: 180 },
    { key: "attendance_date", header: "Attendance Date", width: 150 },
    { key: "message", header: "Message", width: 320 },
  ];
  if (!classification || classification === CLASSIFICATION.CROSS_SOURCE_COLLISION) {
    cols.splice(7, 0, { key: "collided_punch_id", header: "Collided Punch ID", width: 160 });
  }
  return cols;
}

/** `{limit, offset}` for a page, and the page count for a total. */
function pageQuery(page, pageSize = ITEMS_PAGE_SIZE) {
  const p = Math.max(Number(page) || 1, 1);
  const size = Math.max(Number(pageSize) || ITEMS_PAGE_SIZE, 1);
  return { limit: size, offset: (p - 1) * size };
}

function pageCount(total, pageSize = ITEMS_PAGE_SIZE) {
  const size = Math.max(Number(pageSize) || ITEMS_PAGE_SIZE, 1);
  return Math.max(Math.ceil(Number(total || 0) / size), 1);
}

/** The items request for a batch and a filter. An empty filter sends none. */
function itemsQuery(importBatchId, classification, page, pageSize = ITEMS_PAGE_SIZE) {
  const q = { import_batch_id: importBatchId, ...pageQuery(page, pageSize) };
  if (classification) q.classification = classification;
  return q;
}

/**
 * The message for a failed request. A 409 on commit means somebody already
 * committed this batch - the punches are in, so say that rather than alarm.
 */
function requestErrorMessage(response, fallback) {
  if (response && response.code === 409) {
    return response.msg || "This batch has already been committed. Refreshing to show what was imported.";
  }
  if (response && response.code === 403) {
    return "You do not have permission to import attendance.";
  }
  if (response && response.msg) return response.msg;
  return fallback || "The request could not be completed.";
}

module.exports = {
  MAX_UPLOAD_BYTES,
  ITEMS_PAGE_SIZE,
  CLASSIFICATION,
  CLASSIFICATION_LABEL,
  CLASSIFICATION_TONE,
  OUTCOME_LABEL,
  OUTCOME_TONE,
  BATCH_STATUS_LABEL,
  BATCH_STATUS_TONE,
  ITEM_FILTERS,
  formatCount,
  formatBytes,
  displayDate,
  displayDateTime,
  displayPunchTime,
  dateRangeText,
  validateSelectedFile,
  selectionInvalidatesPreview,
  batchFacts,
  summaryCards,
  commitPlan,
  canCommit,
  outcomeRows,
  commitResultMessage,
  itemColumns,
  pageQuery,
  pageCount,
  itemsQuery,
  requestErrorMessage,
};
