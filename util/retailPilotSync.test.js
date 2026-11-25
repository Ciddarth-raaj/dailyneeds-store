/**
 * Purchase screen - RetailPilot Sync button: Dry Run, Sync Now after a
 * confirmation, and the summary of what the sync did (or would do).
 *
 *   node --test util/retailPilotSync.test.js
 */
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { syncSummary, syncError, validDays } = require("./retailPilotSync");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const COMPONENT = "components/Purchase/RetailPilotSync/index.jsx";

test("summary: new, existing (updated + unchanged + approved), skipped and discrepancy counts", () => {
  const s = syncSummary({
    code: 200, dry_run: true, days: 3, row_count: 7,
    inserted: 4, updated: 1, unchanged: 1, approved_untouched: 1,
    skipped: [{ invoice_slug: "INV-X", reason: "no seq" }],
    discrepancies: [
      { outlet: 2, invoice_slug: "INV-KRC", code: "UNREGISTERED_SUPPLIER_TAX" },
      { outlet: 2, invoice_slug: "INV-KRC", code: "BILL_DATE_OTHER_FY" },
      { outlet: 1, invoice_slug: "INV-A", code: "GSTIN_INVALID" },
    ],
  });
  assert.deepEqual(
    [s.dryRun, s.total, s.new, s.existing, s.updated, s.unchanged, s.approved, s.skipped, s.discrepancies, s.discrepancyBills],
    [true, 7, 4, 3, 1, 1, 1, 1, 3, 2]
  );
});

test("summary of a run with nothing to do", () => {
  const s = syncSummary({ code: 200, days: 0, row_count: 0 });
  assert.deepEqual([s.dryRun, s.new, s.existing, s.skipped, s.discrepancies], [false, 0, 0, 0, 0]);
});

test("a refused run shows the server's reason", () => {
  assert.equal(syncError({ code: 200 }), null);
  assert.equal(syncError({ code: 409, message: "A RetailPilot purchase sync is already running" }), "A RetailPilot purchase sync is already running");
  assert.equal(syncError({ code: 403, msg: "You do not have permission to perform this action" }), "You do not have permission to perform this action");
  assert.equal(syncError({ code: 500 }), "Sync failed (code 500)");
  assert.match(syncError(undefined), /No response/);
});

test("look-back days: a whole number from 0 to 90, as the server accepts", () => {
  for (const ok of ["0", "3", "90", 15]) assert.equal(validDays(ok), true, String(ok));
  for (const bad of ["", " ", "-1", "91", "2.5", "abc"]) assert.equal(validDays(bad), false, JSON.stringify(bad));
});

test("the button shows only to holders of sync_retailpilot_purchases, and sits on the Purchase screen", () => {
  const c = read(COMPONENT);
  assert.match(c, /usePermissions\(\["sync_retailpilot_purchases"\]\)/);
  assert.match(c, /if \(!canSync\) return null;/);
  const page = read("pages/purchase/index.jsx");
  assert.match(page, /<RetailPilotSync onSynced=\{\(\) => refetch\(true\)\} \/>/);
});

test("it calls POST /purchase/retailpilot-sync with days and dry_run", () => {
  assert.match(read("helper/purchase.js"), /API\.post\(`\/purchase\/retailpilot-sync`, \{\s*days,\s*dry_run: dryRun,\s*\}\)/);
});

test("Dry Run never imports; Sync Now imports only from the confirmation", () => {
  const c = read(COMPONENT);
  assert.match(c, /onClick=\{\(\) => run\(true\)\}[\s\S]*?>\s*Dry Run\s*</, "Dry Run runs a dry run");
  assert.match(c, /onClick=\{confirm\.onOpen\}[\s\S]*?>\s*Sync Now\s*</, "Sync Now opens the confirmation");
  const imports = c.match(/run\(false\)/g) || [];
  assert.equal(imports.length, 1, "exactly one place imports");
  const at = c.indexOf("run(false)");
  assert.ok(c.lastIndexOf("Import RetailPilot purchases?", at) > 0 && c.indexOf("Import now", at) > at, "and it is the confirmation's Import now");
});
