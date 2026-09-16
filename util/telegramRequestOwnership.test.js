/**
 * OUT-OF-ORDER STATUS RESPONSES.
 *
 *   node --test util/telegramRequestOwnership.test.js
 *
 * THESE RESOLVE PROMISES OUT OF ORDER FOR REAL. A race asserted by reading the
 * source is a race nobody has tested: the whole question is what happens when
 * the network answers in an order the code did not expect, so each test below
 * holds the responses and releases them deliberately.
 *
 * The subject is `createRequestOwnership` - the same object the hook holds -
 * driven through the sequence the hook drives it through. A tiny stand-in for
 * the hook's state is kept here so the CONSEQUENCE can be asserted (did the
 * QR survive, did the screen walk backwards) rather than only the verdict.
 */
const test = require("node:test");
const assert = require("node:assert/strict");

const { createRequestOwnership } = require("./telegramRequestOwnership");
const { attemptSettled } = require("./employeeTelegram");

/** A promise somebody else decides the fate of. */
function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/**
 * The hook's refresh, reduced to exactly what matters here: take a ticket,
 * await the response, and apply it ONLY if the ticket is still good.
 *
 * `screen` stands in for the hook's state. The acceptance rule is the real
 * one - this file imports it rather than restating it.
 */
function makeClient() {
  const ownership = createRequestOwnership();
  const screen = {
    status: null,
    statusIsCurrent: true,
    error: null,
    loading: false,
    link: null,
    applied: [],
  };

  const refresh = async (response) => {
    const ticket = ownership.begin();
    screen.loading = true;
    try {
      const data = await response;
      if (!ownership.accept(ticket)) return "discarded";
      screen.status = data;
      screen.statusIsCurrent = true;
      screen.error = null;
      screen.applied.push(data && data.link_attempt);
      return "applied";
    } catch (err) {
      if (!ownership.accept(ticket)) return "discarded";
      screen.error = String(err.message || err);
      return "errored";
    } finally {
      if (ownership.isNewest(ticket)) screen.loading = false;
    }
  };

  const generate = (link) => {
    ownership.newGeneration();
    screen.statusIsCurrent = false;
    screen.link = link;
  };

  /** What the hook computes: settle only on an answer that belongs to this QR. */
  const qrWouldClose = () =>
    Boolean(screen.link) &&
    screen.statusIsCurrent &&
    attemptSettled(screen.status && screen.status.link_attempt);

  return { ownership, screen, refresh, generate, qrWouldClose };
}

const answer = (link_attempt, status = "CONNECTED") => ({ status, link_attempt });

/* ==================================================== across generations = */

test("A STALE VERIFIED FROM BEFORE THE QR CANNOT SETTLE IT", async () => {
  // The exact sequence from review: refresh A is already in flight when the
  // user presses Change Telegram, and answers last with the PREVIOUS
  // attempt's VERIFIED.
  const client = makeClient();
  const a = deferred();
  const b = deferred();

  // 1. Refresh A starts for generation 0.
  const refreshA = client.refresh(a.promise);
  // 2-3. The user generates a new QR; the generation moves on.
  client.generate("https://t.me/dnds_bot?start=e_new");
  // 4. Refresh B starts for generation 1.
  const refreshB = client.refresh(b.promise);

  // 5-6. B answers first, about the new QR.
  b.resolve(answer("PENDING"));
  assert.equal(await refreshB, "applied");
  assert.equal(client.screen.statusIsCurrent, true);

  // 7. A answers LATER, carrying the old VERIFIED.
  a.resolve(answer("VERIFIED"));
  assert.equal(await refreshA, "discarded", "the stale answer is refused whole");

  // 8-11. The screen still holds B's answer, and the QR survives.
  assert.equal(client.screen.status.link_attempt, "PENDING");
  assert.deepEqual(client.screen.applied, ["PENDING"], "A never reached the screen");
  assert.equal(client.qrWouldClose(), false, "the employee's QR is still on screen");
  assert.equal(client.screen.link, "https://t.me/dnds_bot?start=e_new");
});

test("a stale answer cannot mark the screen current, either", async () => {
  // `statusIsCurrent` is what allows a settled attempt to close the QR, so a
  // stale response setting it would reopen the whole bug by another door.
  const client = makeClient();
  const a = deferred();

  const refreshA = client.refresh(a.promise);
  client.generate("https://t.me/dnds_bot?start=e_new");
  assert.equal(client.screen.statusIsCurrent, false);

  a.resolve(answer("VERIFIED"));
  assert.equal(await refreshA, "discarded");
  assert.equal(client.screen.statusIsCurrent, false, "still waiting for an answer of its own");
  assert.equal(client.qrWouldClose(), false);
});

test("and once a genuine answer for the new QR arrives, it is accepted", async () => {
  const client = makeClient();
  client.generate("https://t.me/dnds_bot?start=e_new");
  const b = deferred();
  const refreshB = client.refresh(b.promise);

  b.resolve(answer("VERIFIED"));
  assert.equal(await refreshB, "applied");
  assert.equal(client.qrWouldClose(), true, "THIS verification does close the QR");
});

/* ================================================= within one generation = */

test("AN OLDER POLL CANNOT WALK THE SCREEN BACKWARDS", async () => {
  // Two polls overlap because one request outlived the 3-second interval.
  // The slower, older one answers last with a state the newer one has already
  // moved past.
  const client = makeClient();
  const first = deferred();
  const second = deferred();

  const refreshFirst = client.refresh(first.promise);
  const refreshSecond = client.refresh(second.promise);

  // The NEWER request answers first, with the later truth.
  second.resolve(answer("VERIFIED"));
  assert.equal(await refreshSecond, "applied");

  // The older one answers afterwards, with the earlier truth.
  first.resolve(answer("AWAITING_CONTACT"));
  assert.equal(await refreshFirst, "discarded");

  assert.equal(client.screen.status.link_attempt, "VERIFIED", "the newer answer stands");
  assert.deepEqual(client.screen.applied, ["VERIFIED"]);
});

test("in-order responses are both accepted, newest last", async () => {
  const client = makeClient();
  const first = deferred();
  const second = deferred();
  const refreshFirst = client.refresh(first.promise);
  const refreshSecond = client.refresh(second.promise);

  first.resolve(answer("AWAITING_CONTACT"));
  assert.equal(await refreshFirst, "applied");
  second.resolve(answer("VERIFIED"));
  assert.equal(await refreshSecond, "applied");

  assert.deepEqual(client.screen.applied, ["AWAITING_CONTACT", "VERIFIED"]);
});

/* =========================================================== failures === */

test("A STALE FAILURE CANNOT REPLACE A GOOD CURRENT ANSWER", async () => {
  const client = makeClient();
  const a = deferred();
  const b = deferred();

  const refreshA = client.refresh(a.promise);
  client.generate("https://t.me/dnds_bot?start=e_new");
  const refreshB = client.refresh(b.promise);

  b.resolve(answer("AWAITING_CONTACT"));
  assert.equal(await refreshB, "applied");

  // The abandoned request now fails.
  a.reject(new Error("Network request failed"));
  assert.equal(await refreshA, "discarded");

  assert.equal(client.screen.error, null, "no error is shown for a request nobody is waiting on");
  assert.equal(client.screen.status.link_attempt, "AWAITING_CONTACT");
  assert.equal(client.screen.link, "https://t.me/dnds_bot?start=e_new", "the QR is still usable");
});

test("an older failure inside one generation cannot overwrite a newer success", async () => {
  const client = makeClient();
  const first = deferred();
  const second = deferred();
  const refreshFirst = client.refresh(first.promise);
  const refreshSecond = client.refresh(second.promise);

  second.resolve(answer("VERIFIED"));
  assert.equal(await refreshSecond, "applied");
  first.reject(new Error("Network request failed"));
  assert.equal(await refreshFirst, "discarded");

  assert.equal(client.screen.error, null);
  assert.equal(client.screen.status.link_attempt, "VERIFIED");
});

test("a CURRENT failure is reported, because somebody is waiting on it", async () => {
  const client = makeClient();
  const only = deferred();
  const refresh = client.refresh(only.promise);
  only.reject(new Error("Network request failed"));
  assert.equal(await refresh, "errored");
  assert.match(client.screen.error, /Network request failed/);
});

/* ============================================================ loading === */

test("AN OLDER REQUEST DOES NOT REPORT THAT LOADING HAS FINISHED", async () => {
  // A newer request is still running; saying the screen has settled would
  // flicker it, and would be untrue.
  const client = makeClient();
  const first = deferred();
  const second = deferred();

  const refreshFirst = client.refresh(first.promise);
  const refreshSecond = client.refresh(second.promise);
  assert.equal(client.screen.loading, true);

  first.resolve(answer("AWAITING_CONTACT"));
  await refreshFirst;
  assert.equal(client.screen.loading, true, "the newer request is still in flight");

  second.resolve(answer("VERIFIED"));
  await refreshSecond;
  assert.equal(client.screen.loading, false, "and the newest one ends it");
});

test("a stale request still stops being in flight, it simply says nothing", async () => {
  // Refused is not the same as ignored forever: the newest request always
  // clears loading, whether or not its answer was allowed to be applied.
  const client = makeClient();
  const a = deferred();
  const refreshA = client.refresh(a.promise);
  client.generate("https://t.me/dnds_bot?start=e_new");
  const b = deferred();
  const refreshB = client.refresh(b.promise);

  a.resolve(answer("VERIFIED"));
  await refreshA;
  b.resolve(answer("PENDING"));
  await refreshB;
  assert.equal(client.screen.loading, false);
});

/* ============================================================= the rule = */

test("THE RULE, STATED AS ONE THING", () => {
  // A response may update the screen only if it belongs to the current QR AND
  // is not older than an answer already accepted for that QR.
  const ownership = createRequestOwnership();

  const beforeQr = ownership.begin();
  ownership.newGeneration();
  const forQr = ownership.begin();
  const laterForQr = ownership.begin();

  assert.equal(ownership.accept(laterForQr), true, "the newest answer is taken");
  assert.equal(ownership.accept(forQr), false, "an older one for the same QR is not");
  assert.equal(ownership.accept(beforeQr), false, "and one from before the QR never is");
  assert.equal(ownership.accept(null), false);
  assert.equal(ownership.accept(undefined), false);
});

test("a ticket is refused only once its generation is actually replaced", () => {
  const ownership = createRequestOwnership();
  const ticket = ownership.begin();
  assert.equal(ownership.currentGeneration(), 0);
  assert.equal(ownership.accept(ticket), true, "nothing has replaced it yet");

  const next = ownership.begin();
  ownership.newGeneration();
  assert.equal(ownership.accept(next), false);
});
