/**
 * How the GRN screens read a verification block.
 *
 *   node --test util/grnVerification.test.js
 *
 * THE TIMESTAMP IS THE PART THAT CAN QUIETLY BE WRONG. `verified_at` names an
 * instant - ISO-8601 UTC, because the API reads the column back with
 * UNIX_TIMESTAMP - and the screens must show it in Asia/Kolkata no matter
 * where the viewer's browser thinks it is. Two things are pinned here:
 *
 *   THE SAME STORED INSTANT displays as the same IST wall clock whatever
 *   TZ the process runs in, which is asserted by re-running the formatter
 *   under several process time zones rather than by trusting one.
 *
 *   A ZONELESS timestamp is refused. "2026-09-17 14:30:00" could mean any of
 *   a dozen instants; rendering it as though it were already IST is the bug
 *   this replaced, and it must show an em dash instead of a plausible lie.
 */
const test = require("node:test");
const assert = require("node:assert");

const {
  IST_LABEL,
  IST_OFFSET_MINUTES,
  isGrnVerified,
  grnVerificationStatusLabel,
  grnVerifiedByLabel,
  formatGrnVerifiedAt,
} = require("./grnVerification");

const verified = {
  status: "VERIFIED",
  verified_by: 7,
  verified_by_name: "Asha R",
  verified_at: "2026-09-17T08:35:00Z",
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

test("verified_at prints as DD/MM/YYYY hh:mm A in Asia/Kolkata", () => {
  // 09:00 UTC is 14:30 IST (+05:30), the example the feature is specified on.
  assert.strictEqual(
    formatGrnVerifiedAt("2026-09-17T09:00:00Z"),
    "17/09/2026 02:30 PM"
  );
  // Late UTC evening is already the NEXT DAY in India: the date has to roll
  // with the time, which a naive "add 5.5 hours to the hours field" misses.
  assert.strictEqual(
    formatGrnVerifiedAt("2026-09-17T18:45:00Z"),
    "18/09/2026 12:15 AM"
  );
  // Midnight and noon IST, the hours a bare `% 12` prints as "00".
  assert.strictEqual(
    formatGrnVerifiedAt("2026-01-05T06:30:00Z"),
    "05/01/2026 12:00 PM"
  );
  assert.strictEqual(
    formatGrnVerifiedAt("2026-01-04T18:30:00Z"),
    "05/01/2026 12:00 AM"
  );
  // The same instant written with a different explicit offset is the same
  // IST wall clock - the offset is read, not ignored.
  assert.strictEqual(
    formatGrnVerifiedAt("2026-09-17T05:00:00-04:00"),
    "17/09/2026 02:30 PM"
  );
  assert.strictEqual(
    formatGrnVerifiedAt("2026-09-17T14:30:00+05:30"),
    "17/09/2026 02:30 PM"
  );
});

test("IST is declared, not implied", () => {
  assert.strictEqual(IST_LABEL, "Asia/Kolkata");
  assert.strictEqual(IST_OFFSET_MINUTES, 330);
});

test("the same stored instant shows the same IST time in any viewer timezone", () => {
  const stored = "2026-09-17T09:00:00Z";
  const expected = "17/09/2026 02:30 PM";
  const zones = ["UTC", "America/New_York", "Asia/Kolkata", "Pacific/Kiritimati"];
  const original = process.env.TZ;

  try {
    for (const zone of zones) {
      process.env.TZ = zone;
      assert.strictEqual(
        formatGrnVerifiedAt(stored),
        expected,
        `expected IST rendering while the process runs in ${zone}`
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("an epoch from the API is accepted and placed in IST", () => {
  // Seconds, as UNIX_TIMESTAMP returns them, and the same moment in ms.
  assert.strictEqual(formatGrnVerifiedAt(1789635600), "17/09/2026 02:30 PM");
  assert.strictEqual(formatGrnVerifiedAt(1789635600000), "17/09/2026 02:30 PM");
});

test("a zoneless or unparseable timestamp is an em dash, never a guess", () => {
  assert.strictEqual(formatGrnVerifiedAt(null), "—");
  assert.strictEqual(formatGrnVerifiedAt(""), "—");
  assert.strictEqual(formatGrnVerifiedAt("   "), "—");
  assert.strictEqual(formatGrnVerifiedAt("not a date"), "—");
  // NO ZONE: this is the shape that used to be rendered as if it were local
  // wall-clock time. There is no honest instant behind it.
  assert.strictEqual(formatGrnVerifiedAt("2026-09-17 14:30:00"), "—");
  assert.strictEqual(formatGrnVerifiedAt("2026-09-17T14:30:00"), "—");
  // Explicit zone, impossible clock.
  assert.strictEqual(formatGrnVerifiedAt("2026-01-05T99:00:00Z"), "—");
});
