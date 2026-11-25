/**
 * Sales Reconciliation - Retail Pilot import, outlet matching and the
 * difference rules the page has always applied.
 *
 *   node --test util/salesReconciliation.test.js
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const {
  POS_FORMAT,
  computeDifferences,
  parseStrictAmount,
  parseReportDate,
  normalizeOutletName,
  parseRetailPilotRows,
  matchOutlets,
  retailPilotSaveBlockers,
} = require("./salesReconciliation");

const FIXTURES = path.join(__dirname, "__fixtures__", "retail-pilot");

// The fixtures hold no quoted fields, so a plain split reads them the way
// Papa.parse({ header: false }) does - trailing empty line included.
const csvRows = (text) => text.split(/\r?\n/).map((line) => line.split(","));
const fixture = (name) => csvRows(fs.readFileSync(path.join(FIXTURES, name), "utf8"));

const HEADER = ["date", "outletname", "total_bill_amount", "total_sales_return", "loyalty"];
const parse = (...lines) => parseRetailPilotRows([HEADER, ...lines]);

// The outlet master's own spelling (see the outlets seed migration).
const DNDS = [
  "Daily Needs-ECR",
  "Daily Needs-Kathirkamam",
  "Daily Needs-Moolakulam",
  "Daily Needs-Muthialpet",
  "Daily Needs-Vallalar Salai",
];

test("Retail Pilot is the default format and Gofrugal stays available", () => {
  assert.deepStrictEqual(POS_FORMAT, { RETAIL_PILOT: "retail_pilot", GOFRUGAL: "gofrugal" });
});

test("both supplied sample files import as one day of five outlets", () => {
  const day11 = parseRetailPilotRows(fixture("dailyneeds_2026-10-11.csv"));
  assert.strictEqual(day11.ok, true, day11.errors.join("\n"));
  assert.strictEqual(day11.date, "2026-10-11");
  assert.strictEqual(day11.data.length, 5);
  assert.deepStrictEqual(day11.data[0], {
    "Bill Date": "2026-10-11",
    "Outlet Name": "ecr",
    "Bill Amt": 472069.25,
    Loyalty: 2535,
    "Sales Return Amt": 1266,
  });
  // A loyalty of 0.0 is a zero, not a missing value.
  assert.strictEqual(day11.data[2].Loyalty, 0);

  const day12 = parseRetailPilotRows(fixture("dailyneeds_2026-10-12.csv"));
  assert.strictEqual(day12.ok, true, day12.errors.join("\n"));
  assert.strictEqual(day12.date, "2026-10-12");
  assert.deepStrictEqual(
    day12.data.map((row) => row["Outlet Name"]),
    ["ecr", "kathirkamam", "moolakulam", "muthialpet", "vallalar salai"]
  );
  // ECR returned nothing that day: 0.0 is a return of zero.
  assert.strictEqual(day12.data[0]["Sales Return Amt"], 0);

  // Every sample outlet matches exactly one DnDS outlet.
  const match = matchOutlets(day12.data.map((row) => row["Outlet Name"]), DNDS);
  assert.deepStrictEqual(match.unmatched, []);
  assert.deepStrictEqual(match.ambiguous, []);
  assert.strictEqual(match.matches["vallalar salai"], "Daily Needs-Vallalar Salai");
});

test("columns are found by name, in any order, case- and BOM-blind", () => {
  const result = parseRetailPilotRows([
    ["﻿Loyalty", " OutletName ", "TOTAL_SALES_RETURN", "total_bill_amount", "date", "extra"],
    ["10", "ecr", "0", "100.5", "2026-10-12", "x"],
  ]);
  assert.strictEqual(result.ok, true, result.errors.join("\n"));
  assert.deepStrictEqual(result.data[0], {
    "Bill Date": "2026-10-12",
    "Outlet Name": "ecr",
    "Bill Amt": 100.5,
    Loyalty: 10,
    "Sales Return Amt": 0,
  });
});

test("a missing required column is refused and named", () => {
  const result = parseRetailPilotRows([
    ["date", "outletname", "total_bill_amount", "loyalty"],
    ["2026-10-12", "ecr", "1", "1"],
  ]);
  assert.strictEqual(result.ok, false);
  assert.match(result.errors[0], /Missing required column\(s\): total_sales_return/);
  assert.deepStrictEqual(result.data, []);

  // A Gofrugal report dropped on the Retail Pilot upload is refused too.
  const gofrugal = parseRetailPilotRows([["Bill Date", "Outlet Name", "Bill Amt", "Loyalty"]]);
  assert.strictEqual(gofrugal.ok, false);
  assert.match(gofrugal.errors[0], /date, outletname, total_bill_amount, loyalty, total_sales_return/);
});

test("empty files and header-only files are refused", () => {
  assert.deepStrictEqual(parseRetailPilotRows([]).errors, ["The file is empty."]);
  assert.deepStrictEqual(parseRetailPilotRows([[""]]).errors, ["The file is empty."]);
  assert.deepStrictEqual(parseRetailPilotRows([HEADER, [""]]).errors, [
    "The file has a header but no outlet rows.",
  ]);
});

test("invalid amounts are errors, never silently zero", () => {
  for (const bad of ["", "abc", "1,234.00", "₹10", "12.3.4", "NaN", "1e5"]) {
    assert.strictEqual(parseStrictAmount(bad), null, `"${bad}" should be refused`);
  }
  assert.strictEqual(parseStrictAmount("0"), 0);
  assert.strictEqual(parseStrictAmount("0.0"), 0);
  assert.strictEqual(parseStrictAmount(" 12.50 "), 12.5);
  assert.strictEqual(parseStrictAmount("-3.25"), -3.25);

  const result = parse(["2026-10-12", "ecr", "abc", "", "1,000"]);
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.errors, [
    'Row 2: total_bill_amount "abc" is not a valid amount.',
    'Row 2: loyalty "1,000" is not a valid amount.',
    "Row 2: total_sales_return is missing.",
  ]);
  assert.deepStrictEqual(result.data, []);
});

test("missing and invalid dates are refused", () => {
  assert.strictEqual(parseReportDate("2026-10-12"), "2026-10-12");
  for (const bad of ["", "12-10-2026", "2026/10/12", "2026-02-30", "2026-13-01", "2026-10-12 10:00"]) {
    assert.strictEqual(parseReportDate(bad), null, `"${bad}" should be refused`);
  }

  const missing = parse(["", "ecr", "1", "0", "1"]);
  assert.strictEqual(missing.ok, false);
  assert.deepStrictEqual(missing.errors, ["Row 2: date is missing."]);

  const invalid = parse(["12/10/2026", "ecr", "1", "0", "1"]);
  assert.strictEqual(invalid.ok, false);
  assert.deepStrictEqual(invalid.errors, ['Row 2: date "12/10/2026" is not a valid YYYY-MM-DD date.']);
});

test("a file with more than one reporting date is refused, not truncated", () => {
  const result = parse(
    ["2026-10-11", "ecr", "1", "0", "1"],
    ["2026-10-12", "kathirkamam", "1", "0", "1"]
  );
  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.date, null);
  assert.deepStrictEqual(result.data, []);
  assert.match(result.errors[0], /2 reporting dates \(2026-10-11, 2026-10-12\)\. Upload one day per file\./);
});

test("an outlet listed twice for the day is refused, even spelt differently", () => {
  const result = parse(
    ["2026-10-12", "ecr", "1", "0", "1"],
    ["2026-10-12", "kathirkamam", "1", "0", "1"],
    ["2026-10-12", " ECR ", "2", "0", "2"]
  );
  assert.strictEqual(result.ok, false);
  assert.deepStrictEqual(result.errors, [
    'Row 4: outlet "ECR" appears more than once for 2026-10-12 (also row 2).',
  ]);
});

test("a missing outlet name is refused", () => {
  const result = parse(["2026-10-12", "", "1", "0", "1"]);
  assert.deepStrictEqual(result.errors, ["Row 2: outletname is missing."]);
});

test("outlet names match exactly or after normalising case, spacing, punctuation and brand prefix", () => {
  assert.strictEqual(normalizeOutletName("Daily Needs-Vallalar Salai"), "vallalar salai");
  assert.strictEqual(normalizeOutletName("DailyNeeds-Vallalar  Salai"), "vallalar salai");
  assert.strictEqual(normalizeOutletName("\tDaily Needs-Warehouse"), "warehouse");
  assert.strictEqual(normalizeOutletName("vallalar salai"), "vallalar salai");
  assert.strictEqual(normalizeOutletName("Vallalar-Salai."), "vallalar salai");

  const exact = matchOutlets(["Daily Needs-ECR"], DNDS);
  assert.deepStrictEqual(exact.matches, { "Daily Needs-ECR": "Daily Needs-ECR" });

  const normalised = matchOutlets(["ecr", "VALLALAR  SALAI", "muthialpet "], DNDS);
  assert.deepStrictEqual(normalised.matches, {
    ecr: "Daily Needs-ECR",
    "VALLALAR  SALAI": "Daily Needs-Vallalar Salai",
    "muthialpet ": "Daily Needs-Muthialpet",
  });
});

test("similar-looking names are not matched, unknown outlets are reported", () => {
  const result = matchOutlets(["vallalar", "ecr 2", "kathirkamam", "lawspet"], DNDS);
  assert.deepStrictEqual(result.unmatched, ["vallalar", "ecr 2", "lawspet"]);
  assert.strictEqual(result.matches.vallalar, null);
  assert.strictEqual(result.matches.kathirkamam, "Daily Needs-Kathirkamam");
});

test("a name that fits two DnDS outlets is ambiguous, never guessed", () => {
  const result = matchOutlets(["ecr"], ["Daily Needs-ECR", "DailyNeeds-ECR"]);
  assert.deepStrictEqual(result.ambiguous, ["ecr"]);
  assert.strictEqual(result.matches.ecr, null);
});

test("differences are POS minus DnDS, positive and negative, rounded to paise", () => {
  const base = { dndsTotalSales: 1000, dndsLoyalty: 100, dndsSalesReturn: 50 };
  assert.deepStrictEqual(
    computeDifferences({ ...base, billAmt: 1100.456, loyalty: 80, salesReturn: 70.1 }),
    { salesDifference: 100.46, loyaltyDifference: -20, salesReturnDifference: 20.1 }
  );
  assert.deepStrictEqual(
    computeDifferences({ ...base, billAmt: 900, loyalty: 150, salesReturn: 0 }),
    { salesDifference: -100, loyaltyDifference: 50, salesReturnDifference: -50 }
  );
});

test("±₹5 inclusive is zero; anything beyond is a difference", () => {
  const at = (delta) =>
    computeDifferences({
      billAmt: 1000 + delta,
      loyalty: 100 + delta,
      salesReturn: 50 + delta,
      dndsTotalSales: 1000,
      dndsLoyalty: 100,
      dndsSalesReturn: 50,
    });
  for (const delta of [5, -5, 4.99, -4.99, 0]) {
    assert.deepStrictEqual(at(delta), {
      salesDifference: 0,
      loyaltyDifference: 0,
      salesReturnDifference: 0,
    }, `delta ${delta}`);
  }
  assert.deepStrictEqual(at(5.01), {
    salesDifference: 5.01,
    loyaltyDifference: 5.01,
    salesReturnDifference: 5.01,
  });
  assert.deepStrictEqual(at(-5.01), {
    salesDifference: -5.01,
    loyaltyDifference: -5.01,
    salesReturnDifference: -5.01,
  });
});

test("a sales return of zero is compared; a missing one is '-'", () => {
  const zero = computeDifferences({
    billAmt: 0, loyalty: 0, salesReturn: 0,
    dndsTotalSales: 0, dndsLoyalty: 0, dndsSalesReturn: 120,
  });
  assert.strictEqual(zero.salesReturnDifference, -120);

  const missing = computeDifferences({
    billAmt: 0, loyalty: 0, salesReturn: null,
    dndsTotalSales: 0, dndsLoyalty: 0, dndsSalesReturn: 120,
  });
  assert.strictEqual(missing.salesReturnDifference, "-");
});

test("Save is blocked until the file, DnDS sales and every outlet are in order", () => {
  const parsed = parse(["2026-10-12", "ecr", "1", "0", "1"], ["2026-10-12", "lawspet", "1", "0", "1"]);
  const ready = {
    parsed,
    salesLoading: false,
    salesError: null,
    salesLoadedForDate: true,
    match: matchOutlets(["ecr"], DNDS),
  };

  assert.deepStrictEqual(retailPilotSaveBlockers({ ...ready, parsed: null }), ["Upload a Retail Pilot sales CSV."]);
  assert.deepStrictEqual(
    retailPilotSaveBlockers({ ...ready, parsed: parse(["bad", "ecr", "1", "0", "1"]) }),
    ["Fix the errors in the uploaded file."]
  );
  assert.deepStrictEqual(retailPilotSaveBlockers({ ...ready, salesLoading: true }), ["DnDS sales are still loading."]);
  assert.deepStrictEqual(retailPilotSaveBlockers({ ...ready, salesLoadedForDate: false }), ["DnDS sales are still loading."]);
  // A failed DnDS fetch blocks Save rather than comparing against zeros.
  assert.deepStrictEqual(retailPilotSaveBlockers({ ...ready, salesError: "Network Error" }), [
    "DnDS sales could not be loaded: Network Error",
  ]);

  assert.deepStrictEqual(retailPilotSaveBlockers(ready), []);

  // One unknown outlet blocks the whole save - no partial reconciliation.
  const partial = { ...ready, match: matchOutlets(["ecr", "lawspet"], DNDS) };
  assert.deepStrictEqual(retailPilotSaveBlockers(partial), [
    "No DnDS outlet with sales on this date matches: lawspet.",
  ]);

  const ambiguous = { ...ready, match: matchOutlets(["ecr"], ["Daily Needs-ECR", "DailyNeeds-ECR"]) };
  assert.deepStrictEqual(retailPilotSaveBlockers(ambiguous), ["More than one DnDS outlet matches: ecr."]);
});
