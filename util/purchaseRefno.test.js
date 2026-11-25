/**
 * Purchase screen - MRC Ref No sorts as a number, not as text.
 *
 *   node --test util/purchaseRefno.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { compareRefno } = require("./purchaseRefno");

test("ref nos sort as numbers: 9 before 10, 811 before 6385", () => {
  assert.deepEqual(["6385", "811", "10", "9", "961", "6372"].sort(compareRefno), ["9", "10", "811", "961", "6372", "6385"]);
  assert.deepEqual(["6385", "811", "10", "9"].sort((a, b) => compareRefno(b, a)), ["6385", "811", "10", "9"], "descending");
});

test("numbers as stored (strings or numbers, with spaces) compare the same", () => {
  assert.equal(compareRefno(" 811", 811), 0);
  assert.ok(compareRefno(99, "100") < 0);
});

test("a ref no that is not a plain number sorts after the numbers; blanks last", () => {
  assert.deepEqual(["A-12", "", "500", null, "A-2", "7"].sort(compareRefno), ["7", "500", "A-2", "A-12", "", null]);
});

test("the Purchase screen's MRC Ref No column uses it", () => {
  const page = fs.readFileSync(path.join(__dirname, "..", "pages", "purchase", "index.jsx"), "utf8");
  assert.match(page, /field: "mmh_mrc_refno",\s*headerName: "MRC Ref No",\s*comparator: compareRefno,/);
});
