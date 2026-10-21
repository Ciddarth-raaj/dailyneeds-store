/**
 * Sales Reconciliation - "Pull from RetailPilot": the pulled rows go through
 * the same parser as the uploaded Retail Pilot CSV.
 *
 *   node --test util/retailPilotSalesPull.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { parseRetailPilotRows, retailPilotApiRowsToCsvRows } = require("./salesReconciliation");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const PULLED = [
  { date: "2026-10-16", outletname: "Lawspet", store_slug: "9rJMC", total_bill_amount: 123456.79, total_sales_return: 250.5, loyalty: 120 },
  { date: "2026-10-16", outletname: "Mudaliarpet", store_slug: "aB12x", total_bill_amount: 98000, total_sales_return: 0, loyalty: 0 },
];

test("pulled rows parse exactly as the CSV would: same fields, same day", () => {
  const fromPull = parseRetailPilotRows(retailPilotApiRowsToCsvRows(PULLED));
  const csv = [
    ["date", "outletname", "total_bill_amount", "loyalty", "total_sales_return"],
    ["2026-10-16", "Lawspet", "123456.79", "120", "250.5"],
    ["2026-10-16", "Mudaliarpet", "98000", "0", "0"],
  ];
  const fromCsv = parseRetailPilotRows(csv);
  assert.equal(fromPull.ok, true, JSON.stringify(fromPull.errors));
  assert.equal(fromPull.date, "2026-10-16");
  assert.deepEqual(fromPull, fromCsv);
});

test("a negative return and a missing amount are handled as the CSV parser does", () => {
  const ok = parseRetailPilotRows(retailPilotApiRowsToCsvRows([{ ...PULLED[0], total_sales_return: -250.5 }]));
  assert.equal(ok.ok, true);
  const bad = parseRetailPilotRows(retailPilotApiRowsToCsvRows([{ ...PULLED[0], loyalty: null }]));
  assert.equal(bad.ok, false);
  assert.match(bad.errors.join(" "), /loyalty is missing/);
});

test("the page pulls one day from GET /reconciliation/retailpilot-sales and parses it like the CSV", () => {
  assert.match(read("helper/reconciliation.js"), /API\.get\("\/reconciliation\/retailpilot-sales", \{\s*params: \{ date: day \},/);
  const page = read("pages/reconciliation/sales.jsx");
  assert.match(page, /await getRetailPilotSales\(pullDate\)/);
  assert.match(page, /parseRetailPilotRows\(retailPilotApiRowsToCsvRows\(response\.rows\)\)/);
  assert.match(page, /onClick=\{onPullFromRetailPilot\}/);
});
