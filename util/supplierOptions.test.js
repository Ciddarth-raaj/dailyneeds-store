/**
 * Suppliers from RetailPilot on the Distributors page and in the supplier
 * pickers; old suppliers kept only for history are hidden.
 *
 *   node --test util/supplierOptions.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { supplierOptions, currentSuppliers } = require("./supplierOptions");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

const LIST = [
  { CID: "RP10001", HQ_DIST_CODE: 1000010001, MDM_DIST_NAME: "akshaya agencies", mdm_tag: "a", is_old: false },
  { CID: "RP10002", HQ_DIST_CODE: 1000010002, MDM_DIST_NAME: "metro home need", mdm_tag: "i", is_old: false },
  { CID: "C11", HQ_DIST_CODE: 11, MDM_DIST_NAME: "Kaveri Foods", mdm_tag: "old", is_old: true },
];

test("a new choice is never an old supplier", () => {
  assert.deepEqual(supplierOptions(LIST).map((o) => o.id), [1000010001, 1000010002]);
});

test("a record that already has an old supplier still shows it", () => {
  assert.deepEqual(supplierOptions(LIST, 11).map((o) => o.value), ["akshaya agencies", "metro home need", "Kaveri Foods"]);
  assert.deepEqual(supplierOptions(LIST, "11").map((o) => o.id), [1000010001, 1000010002, 11]);
});

test("the Distributors page lists RetailPilot's suppliers only, with status, without the old code columns", () => {
  assert.deepEqual(currentSuppliers(LIST).map((d) => d.CID), ["RP10001", "RP10002"]);
  const page = read("pages/master/distributors/index.jsx");
  assert.match(page, /rowData=\{suppliersShown\}/);
  assert.match(page, /<RetailPilotSupplierSync onSynced=\{refetch\} \/>/);
  assert.doesNotMatch(page, /headerName: "Medishop Code"|headerName: "HQ Code"/);
  assert.match(page, /params\.data\?\.mdm_tag === "i" \? "Inactive" : "Active"/);
});

test("the pickers use the rule: advance requests keep their own supplier, LR create offers current ones", () => {
  assert.match(read("pages/advance-request/[...params].jsx"), /supplierOptions\(distributors, request\?\.distributor_code\)/);
  assert.match(read("pages/lr-followup/create.jsx"), /supplierOptions\(distributors\)/);
});

test("Sync Now only after a Dry Run, which changes nothing", () => {
  const c = read("components/master/RetailPilotSupplierSync.jsx");
  assert.match(c, /isDisabled=\{!preview \|\| !!running\}/);
  assert.match(read("helper/productDistributors.js"), /API\.post\("\/product-distributors\/retailpilot-sync", \{\s*dry_run: !!dryRun,/);
});
