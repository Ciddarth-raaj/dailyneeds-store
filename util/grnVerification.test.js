/**
 * How the GRN screens read a verification block.
 *
 *   node --test util/grnVerification.test.js
 *
 * The case that makes the timestamp test worth having: `verified_at` is the
 * SERVER's wall clock, sent as "YYYY-MM-DD HH:mm:ss" with no offset. Handing
 * that string to `new Date()` in a browser would re-read it in the viewer's
 * timezone, and an audit screen would then show a time nobody approved
 * anything at. The formatter must be plain string surgery, and these tests
 * pin that it is - including 12 AM and 12 PM, where a naive `% 12` prints
 * "00".
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  isGrnVerified,
  grnVerificationStatusLabel,
  grnVerifiedByLabel,
  formatGrnVerifiedAt,
} = require("./grnVerification");

const verified = {
  status: "VERIFIED",
  verified_by: 7,
  verified_by_name: "Asha R",
  verified_at: "2026-09-17 14:05:00",
};
const pending = {
  status: "PENDING",
  verified_by: null,
  verified_by_name: null,
  verified_at: null,
};

test("a pending GRN is not verified, whatever else the block carries", () => {
  assert.strictEqual(isGrnVerified(pending), false);
  assert.strictEqual(isGrnVerified(undefined), false);
  assert.strictEqual(isGrnVerified({}), false);
  // Stale fields with a PENDING status must not read as verified.
  assert.strictEqual(
    isGrnVerified({ status: "PENDING", verified_by: 7, verified_at: "x" }),
    false
  );
  assert.strictEqual(isGrnVerified(verified), true);
});

test("status labels are the two the listing shows", () => {
  assert.strictEqual(grnVerificationStatusLabel(verified), "Verified");
  assert.strictEqual(
    grnVerificationStatusLabel(pending),
    "Pending Verification"
  );
  // A GRN from before this feature arrives with no block at all.
  assert.strictEqual(
    grnVerificationStatusLabel(undefined),
    "Pending Verification"
  );
});

test("the verifier column shows the name the API resolved", () => {
  assert.strictEqual(grnVerifiedByLabel(verified), "Asha R");
  assert.strictEqual(grnVerifiedByLabel(pending), "—");
  // An id the employee table could not name is still better than a blank.
  assert.strictEqual(
    grnVerifiedByLabel({ ...verified, verified_by_name: null }),
    "#7"
  );
  assert.strictEqual(
    grnVerifiedByLabel({ ...verified, verified_by_name: "  ", verified_by: null }),
    "—"
  );
});

test("verified_at prints as DD/MM/YYYY hh:mm A in the server's own clock", () => {
  assert.strictEqual(
    formatGrnVerifiedAt("2026-09-17 14:05:00"),
    "17/09/2026 02:05 PM"
  );
  assert.strictEqual(
    formatGrnVerifiedAt("2026-01-05 09:30:00"),
    "05/01/2026 09:30 AM"
  );
  // Midnight and noon: the hours a `% 12` alone gets wrong.
  assert.strictEqual(
    formatGrnVerifiedAt("2026-01-05 00:15:00"),
    "05/01/2026 12:15 AM"
  );
  assert.strictEqual(
    formatGrnVerifiedAt("2026-01-05 12:00:00"),
    "05/01/2026 12:00 PM"
  );
  // An ISO-ish T separator is accepted too, and read the same way.
  assert.strictEqual(
    formatGrnVerifiedAt("2026-01-05T23:45:10"),
    "05/01/2026 11:45 PM"
  );
});

test("a missing or unparseable timestamp is an em dash, not Invalid Date", () => {
  assert.strictEqual(formatGrnVerifiedAt(null), "—");
  assert.strictEqual(formatGrnVerifiedAt(""), "—");
  assert.strictEqual(formatGrnVerifiedAt("   "), "—");
  assert.strictEqual(formatGrnVerifiedAt("not a date"), "—");
  assert.strictEqual(formatGrnVerifiedAt("2026-01-05 99:00:00"), "—");
});
