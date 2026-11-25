/**
 * M5 — Bulk Salary Upload: the file, and nothing about salary.
 *
 * Pure functions, no React and no network, so the file handling can be tested
 * with `node --test` - the same reason `util/payrollAccess.js` and
 * `util/salaryRevisionForm.js` are CommonJS.
 *
 * THIS MODULE KNOWS ABOUT THREE COLUMNS. It does not know what a salary is. It
 * does not classify a row as an opening salary or a revision, it does not work
 * out an effective date, it does not price anything and it does not decide
 * whether a row is valid. Every one of those is
 * `usecase/salary_bulk_upload.js` on the server, which answers per row - so the
 * screen shows the server's verdicts rather than a second opinion that can
 * disagree with them. What happens here is: read a spreadsheet into three named
 * cells, and write three named cells back out.
 *
 * WHY THE TEMPLATE HAS AN EFFECTIVE FROM COLUMN EVEN FOR OPENING SALARIES. The
 * approved template is exactly three columns and one file carries both kinds of
 * row. An opening salary's date is the server's - the later of 01 Apr 2026 and
 * the date of joining - so for those rows the column is CHECKED rather than
 * used: a date that disagrees comes back as `Opening salary Effective From must
 * be YYYY-MM-DD` and the row is refused. It is deliberately not corrected
 * silently, because a file that says one date and a record that says another is
 * how somebody finds out on a payslip.
 *
 * DATES ARE PASSED THROUGH EXACTLY AS TYPED. `04/01/2026` is not converted -
 * it is April the 1st in one country and the 4th of January in another, and a
 * screen guessing between them would date a hundred salary records wrongly and
 * silently. The server refuses anything that is not `YYYY-MM-DD` and says so,
 * which is the correct failure: unguessed on screen, never wrong on the record.
 */

/** The three input columns, in the approved order. There are no others. */
const TEMPLATE_COLUMNS = ["Employee ID", "Monthly Gross Salary", "Effective From"];

/** The one column the rejected-row export adds. Nothing else is added to it. */
const ERROR_COLUMN = "Error Reason";

const TEMPLATE_FILENAME = "bulk-salary-upload-template.csv";
const REJECTED_FILENAME = "bulk-salary-upload-rejected-rows.csv";

/** The API field each template column maps to. */
const COLUMN_TO_FIELD = {
  "Employee ID": "employee_id",
  "Monthly Gross Salary": "monthly_gross",
  "Effective From": "effective_from",
};

/** A header as it is compared: case and spacing are a spreadsheet's business. */
function headerKey(value) {
  return String(value === null || value === undefined ? "" : value)
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

/** The cell as text, trimmed. Empty is a value a row REPORTS, never a crash. */
function cellText(value) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

/** One CSV field, quoted only when it has to be. */
function csvField(value) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * CSV text from named headers and row objects keyed by those headers.
 *
 * Written here rather than taken from `util/exportCSVFile.js#jsonToCsv`
 * because that one derives its headers from the first row's keys, which means
 * a file of zero rows has no header line at all - and a template is exactly
 * that file. The columns are the contract; they do not depend on the data.
 */
function toCsv(headers, rows = []) {
  const lines = [headers.map(csvField).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => csvField(row ? row[h] : "")).join(","));
  }
  return `${lines.join("\n")}\n`;
}

/** The blank template: the three column headings, and not one row of data. */
function templateCsv() {
  return toCsv(TEMPLATE_COLUMNS, []);
}

/**
 * Which required columns a parsed file is missing.
 *
 * CHECKED BEFORE ANYTHING IS SENT. A file with a `Gross` column instead of
 * `Monthly Gross Salary` would otherwise upload six hundred rows that every one
 * come back "Monthly Gross Salary is required", which tells somebody six
 * hundred times what is wrong with the file once.
 */
function missingColumns(headers) {
  const present = new Set((Array.isArray(headers) ? headers : []).map(headerKey));
  return TEMPLATE_COLUMNS.filter((c) => !present.has(headerKey(c)));
}

/**
 * Extra columns the file carries that the template does not define.
 *
 * REPORTED, NOT REFUSED. They are dropped on the way to the server - only the
 * three named cells are sent - and saying so is better than letting somebody
 * believe a `Remarks` column they filled in went anywhere.
 */
function extraColumns(headers) {
  const known = new Set(TEMPLATE_COLUMNS.map(headerKey));
  return (Array.isArray(headers) ? headers : []).filter(
    (h) => cellText(h) !== "" && !known.has(headerKey(h))
  );
}

/**
 * Parsed spreadsheet rows as the API's three fields.
 *
 * NOTHING ELSE TRAVELS. The row objects are built from three named keys rather
 * than by spreading what the parser produced, so a stray column cannot reach
 * the request - the route's Joi schema runs without `allowUnknown` and would
 * answer 422 for the whole upload if one did.
 *
 * WHOLLY EMPTY ROWS ARE DROPPED. A spreadsheet exported with trailing blank
 * lines is the normal case, and reporting "Employee ID is required" against
 * four rows nobody typed is noise. A row with ANY cell filled in is kept and
 * gets its verdict.
 */
function toApiRows(parsedRows) {
  const source = Array.isArray(parsedRows) ? parsedRows : [];
  const rows = [];

  for (const raw of source) {
    const byKey = {};
    for (const key of Object.keys(raw || {})) byKey[headerKey(key)] = raw[key];

    const row = {};
    for (const column of TEMPLATE_COLUMNS) {
      row[COLUMN_TO_FIELD[column]] = cellText(byKey[headerKey(column)]);
    }

    if (row.employee_id === "" && row.monthly_gross === "" && row.effective_from === "") continue;
    rows.push(row);
  }

  return rows;
}

/**
 * The rejected rows, as the file somebody fixes and uploads again.
 *
 * EXACTLY THE ORIGINAL THREE COLUMNS PLUS THE REASON. No Basic, no CTC, no
 * contribution, no type, no status - a rejected row was never priced, and
 * putting calculated columns into a file meant to be corrected and re-uploaded
 * would produce a second upload carrying columns the template does not define.
 *
 * The three cells are the ones the server echoed back, which are the ones the
 * file had: what somebody typed, not what the server made of it.
 */
function rejectedRowsCsv(rows) {
  const invalid = (Array.isArray(rows) ? rows : []).filter((r) => r && r.valid !== true);
  return toCsv(
    [...TEMPLATE_COLUMNS, ERROR_COLUMN],
    invalid.map((r) => ({
      "Employee ID": r.employee_id,
      "Monthly Gross Salary": r.monthly_gross,
      "Effective From": r.effective_from,
      [ERROR_COLUMN]: r.error_reason || "Invalid row",
    }))
  );
}

/** Total / valid / invalid, read off whichever of the two results came back. */
function summarize(result) {
  const rows = (result && Array.isArray(result.rows) ? result.rows : []);
  const valid = rows.filter((r) => r && r.valid === true).length;
  return {
    total: rows.length,
    valid,
    invalid: rows.length - valid,
    created: rows.filter((r) => r && r.created === true).length,
  };
}

/** The rows a submit should carry: the three cells of the ones that passed. */
function validRowsFor(result) {
  const rows = (result && Array.isArray(result.rows) ? result.rows : []);
  return rows
    .filter((r) => r && r.valid === true)
    .map((r) => ({
      employee_id: r.employee_id,
      monthly_gross: r.monthly_gross,
      effective_from: r.effective_from,
    }));
}

/** `OPENING_SALARY` / `REVISION` as a person reads them. */
const TYPE_LABEL = {
  OPENING_SALARY: "Opening Salary",
  REVISION: "Revision",
};

function typeLabel(type) {
  return TYPE_LABEL[type] || "—";
}

module.exports = {
  TEMPLATE_COLUMNS,
  ERROR_COLUMN,
  TEMPLATE_FILENAME,
  REJECTED_FILENAME,
  COLUMN_TO_FIELD,
  TYPE_LABEL,
  headerKey,
  toCsv,
  templateCsv,
  missingColumns,
  extraColumns,
  toApiRows,
  rejectedRowsCsv,
  summarize,
  validRowsFor,
  typeLabel,
};
