/**
 * EMPLOYEE TELEGRAM - the rules every Telegram screen runs on.
 *
 *   node --test util/employeeTelegram.test.js
 *
 * There is no React test runner in this repository, so the logic lives here
 * and the components are thin - the same arrangement as `util/hrOnboarding.js`
 * and its tests. The properties worth pinning are the ones that would be real
 * defects: the label that must never say "Complete", the polling that must
 * stop, and the permission that must be an OR.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const {
  TELEGRAM_STATUS,
  TELEGRAM_POLL_INTERVAL_MS,
  telegramLabel,
  telegramBadgeScheme,
  isConnected,
  isLinkExpired,
  secondsUntil,
  countdownText,
  shouldPollTelegram,
  canManageTelegram,
  canViewTelegram,
  telegramStatusOf,
  telegramPending,
} = require("./employeeTelegram");

/* ---------------------------------------------------------------- labels */

test("CONNECTED NEVER READS AS COMPLETE - groups have not shipped", () => {
  assert.equal(telegramLabel(TELEGRAM_STATUS.CONNECTED), "Connected - Groups Pending");
  assert.equal(telegramLabel(TELEGRAM_STATUS.CONNECTED, { short: true }), "Connected - Groups Pending");
  for (const label of Object.values(require("./employeeTelegram").TELEGRAM_LABELS)) {
    assert.ok(!/complete/i.test(label), `"${label}" must not claim completion`);
  }
});

test("every backend status has a human label", () => {
  assert.deepEqual(Object.keys(TELEGRAM_STATUS).sort(), [
    "AWAITING_CONTACT",
    "CONNECTED",
    "DISCONNECTED",
    "MOBILE_MISMATCH",
    "PENDING",
  ]);
  assert.equal(telegramLabel("PENDING"), "Telegram Pending");
  assert.equal(telegramLabel("AWAITING_CONTACT"), "Waiting for Phone Verification");
  assert.equal(telegramLabel("MOBILE_MISMATCH"), "Mobile Number Mismatch");
  assert.equal(telegramLabel("DISCONNECTED"), "Telegram Disconnected");
});

test("AN UNKNOWN STATUS READS AS A DASH, never as its own enum name", () => {
  // A future backend state leaking onto a manager's screen as GROUPS_PENDING
  // looks like a fact; a dash is obviously "no answer".
  for (const unknown of [null, undefined, "", "GROUPS_PENDING", 7, {}]) {
    assert.equal(telegramLabel(unknown), "—");
    assert.equal(telegramBadgeScheme(unknown), "gray");
  }
});

test("the badge colours separate the state that needs a human", () => {
  assert.equal(telegramBadgeScheme("CONNECTED"), "green");
  assert.equal(telegramBadgeScheme("MOBILE_MISMATCH"), "red");
  assert.equal(telegramBadgeScheme("AWAITING_CONTACT"), "blue");
});

test("connected is exactly one status", () => {
  assert.ok(isConnected("CONNECTED"));
  for (const other of ["PENDING", "AWAITING_CONTACT", "MOBILE_MISMATCH", "DISCONNECTED", null]) {
    assert.ok(!isConnected(other));
  }
});

/* ---------------------------------------------------------------- expiry */

test("the countdown reads minutes and padded seconds", () => {
  const now = Date.now();
  assert.equal(countdownText(new Date(now + 763000).toISOString(), now), "12:43");
  assert.equal(countdownText(new Date(now + 65000).toISOString(), now), "1:05");
  assert.equal(countdownText(new Date(now + 5000).toISOString(), now), "0:05");
});

test("an expired or unusable link is expired, and never counts down below zero", () => {
  const now = Date.now();
  assert.ok(isLinkExpired(new Date(now - 1000).toISOString(), now));
  assert.ok(isLinkExpired(null));
  assert.ok(isLinkExpired(undefined));
  assert.ok(isLinkExpired("not a date"));
  assert.ok(!isLinkExpired(new Date(now + 1000).toISOString(), now));
  assert.equal(secondsUntil(new Date(now - 60000).toISOString(), now), 0);
  assert.equal(countdownText(new Date(now - 60000).toISOString(), now), "0:00");
});

/* --------------------------------------------------------------- polling */

test("POLLING RUNS ONLY WHILE THERE IS SOMETHING LEFT TO NOTICE", () => {
  // It exists to see the employee finish on their phone. Nothing else.
  assert.ok(shouldPollTelegram({ status: "PENDING", hasLiveLink: true }));
  assert.ok(shouldPollTelegram({ status: "AWAITING_CONTACT", hasLiveLink: true }));
  assert.ok(shouldPollTelegram({ status: "PENDING", attempt: "AWAITING_CONTACT", hasLiveLink: true }));
});

test("A RECONNECT KEEPS POLLING THOUGH THE EMPLOYEE READS CONNECTED", () => {
  // The old identity is deliberately kept until the new one verifies, so the
  // status says CONNECTED for the whole attempt. Watching it alone would stop
  // the poll the moment the QR appeared - and declare success for a
  // verification that had not happened.
  assert.ok(shouldPollTelegram({ status: "CONNECTED", attempt: "AWAITING_CONTACT", hasLiveLink: true }));
  assert.ok(shouldPollTelegram({ status: "CONNECTED", attempt: "PENDING", hasLiveLink: true }));
  assert.ok(!shouldPollTelegram({ status: "CONNECTED", attempt: "VERIFIED", hasLiveLink: true }));
  assert.ok(!shouldPollTelegram({ status: "CONNECTED", attempt: "MOBILE_MISMATCH", hasLiveLink: true }));
});

test("an older backend that sends no attempt still stops on CONNECTED", () => {
  // Which is right for a first connection, and is all it could ever have done.
  assert.ok(!shouldPollTelegram({ status: "CONNECTED", hasLiveLink: true }));
  assert.ok(!shouldPollTelegram({ status: "CONNECTED", attempt: null, hasLiveLink: true }));
  assert.ok(shouldPollTelegram({ status: "PENDING", attempt: null, hasLiveLink: true }));
});

test("a reconnect in flight is recognised, and a finished one is not", () => {
  const { isReconnectInFlight } = require("./employeeTelegram");
  assert.ok(isReconnectInFlight({ status: "CONNECTED", attempt: "AWAITING_CONTACT", hasLiveLink: true }));
  assert.ok(!isReconnectInFlight({ status: "CONNECTED", attempt: "VERIFIED", hasLiveLink: true }));
  assert.ok(!isReconnectInFlight({ status: "CONNECTED", attempt: "AWAITING_CONTACT", hasLiveLink: false }));
  assert.ok(!isReconnectInFlight({ status: "PENDING", attempt: "AWAITING_CONTACT", hasLiveLink: true }));
});

test("polling STOPS once the attempt in front of the user settles", () => {
  assert.ok(!shouldPollTelegram({ status: "CONNECTED", attempt: "VERIFIED", hasLiveLink: true }));
  assert.ok(!shouldPollTelegram({ status: "PENDING", attempt: "MOBILE_MISMATCH", hasLiveLink: true }));
});

test("polling STOPS on mobile mismatch - it needs a human, not another request", () => {
  assert.ok(!shouldPollTelegram({ status: "MOBILE_MISMATCH", hasLiveLink: true }));
});

test("polling STOPS when there is no live QR - an expired one cannot complete", () => {
  assert.ok(!shouldPollTelegram({ status: "PENDING", hasLiveLink: false }));
  assert.ok(!shouldPollTelegram({ status: "AWAITING_CONTACT", hasLiveLink: false }));
  assert.ok(!shouldPollTelegram({}));
});

test("the interval is modest - a manager is standing there, not a robot", () => {
  assert.equal(TELEGRAM_POLL_INTERVAL_MS, 3000);
});

/* ----------------------------------------------------------- permissions */

test("SETUP IS employee_create OR employee_edit - never create alone", () => {
  // Finishing setup for an employee who already exists must not require the
  // right to create employees; that is the whole reason it is an OR.
  assert.ok(canManageTelegram({ permissions: ["employee_edit"] }));
  assert.ok(canManageTelegram({ permissions: ["employee_create"] }));
  assert.ok(canManageTelegram({ permissions: ["employee_create", "employee_edit"] }));
  assert.ok(canManageTelegram({ isAdmin: true, permissions: [] }));
});

test("a view-only user may not manage it", () => {
  assert.ok(!canManageTelegram({ permissions: ["view_employees"] }));
  assert.ok(!canManageTelegram({ permissions: [] }));
  assert.ok(!canManageTelegram({}));
  assert.ok(canViewTelegram({ permissions: ["view_employees"] }));
});

/* ------------------------------------------------------ dashboard fields */

test("a row the server did not answer for is NOT pending", () => {
  // Chasing 630 people because a column was absent is worse than no column.
  assert.equal(telegramStatusOf({}), null);
  assert.equal(telegramStatusOf(null), null);
  assert.equal(telegramPending({}), false);
  assert.equal(telegramPending(null), false);
});

test("an unrecognised status from the server is treated as no answer", () => {
  assert.equal(telegramStatusOf({ telegram_status: "GROUPS_PENDING" }), null);
  assert.equal(telegramPending({ telegram_status: "GROUPS_PENDING" }), false);
});

test("pending is every answered state except connected", () => {
  assert.equal(telegramPending({ telegram_status: "CONNECTED" }), false);
  for (const status of ["PENDING", "AWAITING_CONTACT", "MOBILE_MISMATCH", "DISCONNECTED"]) {
    assert.equal(telegramPending({ telegram_status: status }), true, status);
  }
});
