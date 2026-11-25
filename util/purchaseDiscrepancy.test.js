/**
 * Purchase screen - discrepancies Accounts must correct or check, and the
 * corrections the screen allows.
 *
 *   node --test util/purchaseDiscrepancy.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { purchaseDiscrepancies, hasBlockingDiscrepancy } = require("./purchaseDiscrepancy");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("k.r.candles (unregistered, IGST 5%): the tax needs Accounts' review; a blank GSTIN alone never does", () => {
  const krc = { supplier_gstn: "", sgst: [], cgst: [], igst: [{ PERC: 5, TAXABLE: 4271.43, VALUE: 213.57 }] };
  assert.deepEqual(purchaseDiscrepancies(krc).map((d) => d.code), ["UNREGISTERED_SUPPLIER_TAX"]);
  const nil = [{ PERC: 0, TAXABLE: 4485, VALUE: 0 }];
  assert.deepEqual(purchaseDiscrepancies({ supplier_gstn: "", sgst: nil, cgst: nil, igst: [] }), [], "reviewed: no input tax");
  assert.deepEqual(purchaseDiscrepancies({ supplier_gstn: "" }), []);
});

test("bill 811 (ID Fresh Food, 33AAICM3930G1ZO): no CGST/SGST-versus-IGST warning", () => {
  const bill = {
    supplier_gstn: "33AAICM3930G1ZO",
    cgst: [{ PERC: 0, TAXABLE: 2911.22, VALUE: 0 }],
    sgst: [{ PERC: 0, TAXABLE: 2911.22, VALUE: 0 }],
    igst: [{ PERC: 0, TAXABLE: 2340.04, VALUE: 0 }, { PERC: 5, TAXABLE: 571.18, VALUE: 28.56 }],
    mmh_mrc_dt: "2026-10-10",
    mmh_dist_bill_dt: "2026-10-10",
  };
  assert.deepEqual(purchaseDiscrepancies(bill), []);
  assert.doesNotMatch(read("components/Purchase/PurchaseModal/index.jsx"), /TAX_TYPE_MISMATCH/);
});

test("blocks apply to RetailPilot bills only: a GoFrugal bill's save and approval are unchanged", () => {
  const modal = read("components/Purchase/PurchaseModal/index.jsx");
  assert.match(modal, /return item\?\.retailpilot \? list : asLegacy\(list\);/);
  const { asLegacy } = require("./purchaseDiscrepancy");
  const legacy = asLegacy(purchaseDiscrepancies({ supplier_gstn: "", igst: [{ PERC: 5, TAXABLE: 1, VALUE: 1 }] }));
  assert.equal(hasBlockingDiscrepancy(legacy), false);
});

test("the round-off the sync pre-filled is shown as not confirmed", () => {
  assert.match(read("components/Purchase/PurchaseModal/index.jsx"), /"ROUND_OFF_PREFILLED"/);
});

test("DN1 bill 271: dated 16-01-2026 with ref no 961 of the FY 2026-27 series - blocked until the MRC date is corrected", () => {
  const bill = { supplier_gstn: "34EEEEE0000E1Z5", mmh_mrc_refno: "961", voucher_fy: 2026, entered_at: "2026-10-16" };
  const asSynced = purchaseDiscrepancies({ ...bill, mmh_mrc_dt: "2026-01-16", mmh_dist_bill_dt: "2026-01-16" });
  assert.deepEqual(asSynced.map((d) => `${d.code}:${d.severity}`), ["MRC_DATE_OUTSIDE_SERIES_FY:block"]);
  // MRC date corrected; the supplier bill date is then shown for review
  const mrcFixed = purchaseDiscrepancies({ ...bill, mmh_mrc_dt: "2026-10-16", mmh_dist_bill_dt: "2026-01-16" });
  assert.deepEqual(mrcFixed.map((d) => `${d.code}:${d.severity}`), ["BILL_DATE_OTHER_FY:review"]);
  assert.equal(hasBlockingDiscrepancy(mrcFixed), false);
  assert.deepEqual(purchaseDiscrepancies({ ...bill, mmh_mrc_dt: "2026-10-16", mmh_dist_bill_dt: "2026-10-16" }), []);
});

test("the live check knows the ref no's financial year of a RetailPilot bill", () => {
  const modal = read("components/Purchase/PurchaseModal/index.jsx");
  assert.match(modal, /voucher_fy: item\?\.voucher_fy,\s*entered_at: item\?\.entered_at,/);
});

test("the Purchase screen lets Accounts correct the GSTIN and both dates", () => {
  const modal = read("components/Purchase/PurchaseModal/index.jsx");
  for (const name of ["supplier_gstn", "mmh_mrc_dt", "mmh_dist_bill_dt"]) {
    const at = modal.indexOf(`name={\`${name}\`}`);
    assert.ok(at > 0, name);
    assert.match(modal.slice(at, at + 120), /editable=\{editable\}/, `${name} is editable while the bill is`);
  }
  assert.match(modal, /type="date"/);
});

test("saving files the tax by the GSTIN being saved, not the one the bill was opened with", () => {
  const modal = read("components/Purchase/PurchaseModal/index.jsx");
  assert.match(modal, /const PERC = shouldShowIGST\(values\) \? taxItem\.PERC : taxItem\.PERC \/ 2;/);
  assert.doesNotMatch(modal, /shouldShowIGST\(item\) \? taxItem\.PERC/);
});

test("tax the GSTIN does not show is never dropped silently: Save waits for a correction or an explicit confirmation", () => {
  const modal = read("components/Purchase/PurchaseModal/index.jsx");
  assert.match(modal, /isDisabled=\{isTaxBlocked\(values\)\}/);
  assert.match(modal, /d\.severity === "block" &&\s*!\(TAX_CODES\.includes\(d\.code\) && taxOverride\)/);
});

test("the full round-off difference is shown, with no amount limit", () => {
  const modal = read("components/Purchase/PurchaseModal/index.jsx");
  assert.match(modal, /Bill amount minus calculated total/);
  assert.doesNotMatch(modal, /> ?10\b|LIMIT/);
});

test("a refused save or approval is shown with the server's reason, and approval is not attempted after a refused save", () => {
  const hook = read("customHooks/usePurchase.js");
  assert.match(hook, /if \(response\?\.code !== 200\) \{\s*return response;\s*\}\s*const approval = await approvePurchase/);
  assert.match(hook, /if \(approval\?\.code !== 200\) \{\s*return approval;/);
  assert.match(read("components/Purchase/PurchaseModal/index.jsx"), /throw new Error\(response\?\.msg/);
});

test("Delete Tally Response deletes by purchase id, never by voucher number", () => {
  assert.match(read("pages/purchase/index.jsx"), /deletePurchaseTallyResponse\(item\.purchase_id\)/);
  assert.match(read("customHooks/usePurchase.js"), /deletePurchaseTallyResponseForPurchase\(purchaseId\)/);
  assert.match(read("helper/purchase.js"), /API\.delete\(`\/purchase\/\$\{purchaseId\}\/tally-response`\)/);
});

test("the manual sync permission has a label on the Designation screen", () => {
  assert.match(read("constants/permissions.js"), /sync_retailpilot_purchases: "Run RetailPilot Purchase Sync"/);
});
