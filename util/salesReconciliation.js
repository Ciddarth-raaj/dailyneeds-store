/**
 * Accounts → Reconciliation → Sales: the rules behind the screen.
 *
 * TWO POS EXPORTS, ONE RECONCILIATION. Gofrugal RPOS shipped the day as two
 * reports (Loyalty and Total Sales, Sales Return); Retail Pilot ships it as one
 * CSV. `parseRetailPilotRows` turns the Retail Pilot file into the same rows the
 * Gofrugal reports produced ("Bill Date", "Outlet Name", "Bill Amt", "Loyalty",
 * "Sales Return Amt"), so the page compares and saves both formats through the
 * same code path and `accounts_reconciliation_sales` sees no difference.
 *
 * `computeDifferences` is the comparison the page has always made (POS figure
 * minus DnDS figure, rounded to paise, ±₹5 counted as zero), moved here so it
 * can be tested. It adds no new metric.
 *
 * CommonJS, so the rules can be unit-tested with `node --test` without a
 * bundler, exactly as `util/companyDetails.js` is.
 *
 *   node --test util/salesReconciliation.test.js
 */

const POS_FORMAT = {
  RETAIL_PILOT: "retail_pilot",
  GOFRUGAL: "gofrugal",
};

// Retail Pilot column → the Gofrugal field it replaces.
const RETAIL_PILOT_COLUMNS = {
  date: "Bill Date",
  outletname: "Outlet Name",
  total_bill_amount: "Bill Amt",
  loyalty: "Loyalty",
  total_sales_return: "Sales Return Amt",
};

const REQUIRED_RETAIL_PILOT_COLUMNS = Object.keys(RETAIL_PILOT_COLUMNS);

const TOLERANCE = 5;

const roundAmount = (value) => Math.round(value * 100) / 100;

const withinTolerance = (value) => value >= -TOLERANCE && value <= TOLERANCE;

/**
 * `salesReturn` is null when the POS export has nothing for the outlet, which
 * is not the same as a return of zero: the former yields "-", the latter a
 * difference like any other.
 */
const computeDifferences = ({
  billAmt,
  loyalty,
  salesReturn,
  dndsTotalSales,
  dndsLoyalty,
  dndsSalesReturn,
}) => {
  let salesDifference = roundAmount(billAmt - dndsTotalSales);
  let loyaltyDifference = roundAmount(loyalty - dndsLoyalty);
  let salesReturnDifference =
    salesReturn === null ? "-" : roundAmount(salesReturn - dndsSalesReturn);

  if (withinTolerance(salesDifference)) salesDifference = 0;
  if (withinTolerance(loyaltyDifference)) loyaltyDifference = 0;
  if (salesReturn !== null && withinTolerance(salesReturnDifference)) {
    salesReturnDifference = 0;
  }

  return { salesDifference, loyaltyDifference, salesReturnDifference };
};

// Plain decimal only: "1,234", "₹10", "" or "abc" are refused rather than read
// as zero — a blank amount is missing data, not a zero sale.
const AMOUNT_PATTERN = /^-?(\d+(\.\d*)?|\.\d+)$/;

const parseStrictAmount = (value) => {
  const text = String(value ?? "").trim();
  if (!AMOUNT_PATTERN.test(text)) return null;
  const amount = Number(text);
  return Number.isFinite(amount) ? amount : null;
};

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

// YYYY-MM-DD, the only format the Retail Pilot export uses, and a real
// calendar day (2026-02-30 is refused).
const parseReportDate = (value) => {
  const text = String(value ?? "").trim();
  const match = DATE_PATTERN.exec(text);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return text;
};

const normalizeHeader = (header) =>
  String(header ?? "")
    .replace(/^﻿/, "")
    .trim()
    .toLowerCase();

/**
 * Outlet names compared case-, spacing- and punctuation-blind, with the brand
 * prefix the DnDS outlet master carries ("Daily Needs-", "DailyNeeds-") taken
 * off. Nothing fuzzier: "ecr" matches "Daily Needs-ECR", never "ECR 2".
 */
const normalizeOutletName = (name) =>
  String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^daily ?needs\b\s*/, "")
    .trim();

const isBlankRow = (row) =>
  !Array.isArray(row) || row.every((cell) => String(cell ?? "").trim() === "");

/**
 * `rows` is the CSV as an array of arrays, header first (Papa.parse with
 * `header: false`). Never throws: everything wrong with the file comes back
 * in `errors`, and a file with any error has no usable rows.
 */
const parseRetailPilotRows = (rows) => {
  const errors = [];
  const fail = (message) => ({ ok: false, errors: [message], date: null, data: [] });

  const nonBlank = (rows ?? []).filter((row) => !isBlankRow(row));
  if (nonBlank.length === 0) return fail("The file is empty.");

  const [headerRow, ...dataRows] = nonBlank;
  const headers = headerRow.map(normalizeHeader);
  const missing = REQUIRED_RETAIL_PILOT_COLUMNS.filter((c) => !headers.includes(c));
  if (missing.length > 0) {
    return fail(
      `Missing required column(s): ${missing.join(", ")}. Expected a Retail Pilot sales CSV with columns ${REQUIRED_RETAIL_PILOT_COLUMNS.join(", ")}.`
    );
  }
  if (dataRows.length === 0) return fail("The file has a header but no outlet rows.");

  const index = Object.fromEntries(
    REQUIRED_RETAIL_PILOT_COLUMNS.map((column) => [column, headers.indexOf(column)])
  );
  const cell = (row, column) => String(row[index[column]] ?? "").trim();

  const data = [];
  const dates = new Set();
  const seenOutlets = new Map();

  dataRows.forEach((row) => {
    const line = rows.indexOf(row) + 1;
    const rawDate = cell(row, "date");
    const outletName = cell(row, "outletname");
    const date = parseReportDate(rawDate);

    if (!rawDate) errors.push(`Row ${line}: date is missing.`);
    else if (!date) errors.push(`Row ${line}: date "${rawDate}" is not a valid YYYY-MM-DD date.`);
    else dates.add(date);

    if (!outletName) errors.push(`Row ${line}: outletname is missing.`);

    const amounts = {};
    ["total_bill_amount", "loyalty", "total_sales_return"].forEach((column) => {
      const raw = cell(row, column);
      const amount = parseStrictAmount(raw);
      if (amount === null) {
        errors.push(
          raw
            ? `Row ${line}: ${column} "${raw}" is not a valid amount.`
            : `Row ${line}: ${column} is missing.`
        );
      }
      amounts[column] = amount;
    });

    if (outletName) {
      const key = `${date ?? rawDate}|${normalizeOutletName(outletName)}`;
      if (seenOutlets.has(key)) {
        errors.push(
          `Row ${line}: outlet "${outletName}" appears more than once for ${date ?? rawDate} (also row ${seenOutlets.get(key)}).`
        );
      } else {
        seenOutlets.set(key, line);
      }
    }

    data.push({
      "Bill Date": date,
      "Outlet Name": outletName,
      "Bill Amt": amounts.total_bill_amount,
      Loyalty: amounts.loyalty,
      "Sales Return Amt": amounts.total_sales_return,
    });
  });

  if (dates.size > 1) {
    errors.unshift(
      `The file contains ${dates.size} reporting dates (${[...dates].sort().join(", ")}). Upload one day per file.`
    );
  }

  if (errors.length > 0) return { ok: false, errors, date: null, data: [] };
  return { ok: true, errors: [], date: [...dates][0], data };
};

/**
 * Pairs each imported outlet name with exactly one DnDS outlet. `dndsOutlets`
 * are the `outlet_name`s DnDS returned sales for on that date. A name that
 * normalises to no DnDS outlet, or to more than one, is left unmatched — it is
 * never guessed.
 */
const matchOutlets = (importedNames, dndsOutlets) => {
  const byKey = new Map();
  (dndsOutlets ?? []).forEach((name) => {
    const key = normalizeOutletName(name);
    if (!key) return;
    byKey.set(key, [...(byKey.get(key) ?? []), name]);
  });

  const matches = {};
  const unmatched = [];
  const ambiguous = [];

  importedNames.forEach((name) => {
    if (Object.prototype.hasOwnProperty.call(matches, name)) return;
    const candidates = byKey.get(normalizeOutletName(name)) ?? [];
    if (candidates.length === 1) {
      matches[name] = candidates[0];
    } else {
      matches[name] = null;
      (candidates.length === 0 ? unmatched : ambiguous).push(name);
    }
  });

  return { matches, unmatched, ambiguous };
};

/**
 * Everything that must hold before Retail Pilot differences may be saved.
 * Returns the reasons Save is blocked; an empty list means it may proceed.
 */
const retailPilotSaveBlockers = ({
  parsed,
  salesLoading,
  salesError,
  salesLoadedForDate,
  match,
}) => {
  if (!parsed) return ["Upload a Retail Pilot sales CSV."];
  if (!parsed.ok) return ["Fix the errors in the uploaded file."];
  if (parsed.data.length === 0) return ["The file has no outlet rows."];
  if (salesLoading || !salesLoadedForDate) return ["DnDS sales are still loading."];
  if (salesError) return [`DnDS sales could not be loaded: ${salesError}`];

  const blockers = [];
  if (match?.unmatched?.length) {
    blockers.push(`No DnDS outlet with sales on this date matches: ${match.unmatched.join(", ")}.`);
  }
  if (match?.ambiguous?.length) {
    blockers.push(`More than one DnDS outlet matches: ${match.ambiguous.join(", ")}.`);
  }
  const targets = Object.values(match?.matches ?? {}).filter(Boolean);
  const repeated = targets.filter((name, i) => targets.indexOf(name) !== i);
  if (repeated.length > 0) {
    blockers.push(`More than one row in the file matches DnDS outlet: ${[...new Set(repeated)].join(", ")}.`);
  }
  return blockers;
};

/**
 * Rows pulled from RetailPilot (GET /reconciliation/retailpilot-sales) as the
 * CSV would have them - header first, one array per outlet - so a pull goes
 * through parseRetailPilotRows exactly like an uploaded file.
 */
const retailPilotApiRowsToCsvRows = (rows) => [
  REQUIRED_RETAIL_PILOT_COLUMNS,
  ...(rows ?? []).map((row) =>
    REQUIRED_RETAIL_PILOT_COLUMNS.map((column) =>
      row?.[column] === null || row?.[column] === undefined ? "" : String(row[column])
    )
  ),
];

module.exports = {
  POS_FORMAT,
  retailPilotApiRowsToCsvRows,
  RETAIL_PILOT_COLUMNS,
  REQUIRED_RETAIL_PILOT_COLUMNS,
  TOLERANCE,
  roundAmount,
  computeDifferences,
  parseStrictAmount,
  parseReportDate,
  normalizeOutletName,
  parseRetailPilotRows,
  matchOutlets,
  retailPilotSaveBlockers,
};
