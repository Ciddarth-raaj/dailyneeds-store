/**
 * The IFSC lookup guard — two races, run rather than asserted.
 *
 *   node --test util/ifscLookupGuard.test.js
 *
 * This is the part of the lookup that could not be tested through source
 * matching, and both bugs it exists for were real: a source assertion can say
 * a line is present, but not that an answer for a deleted code fails to land.
 * So the guard lives outside the component and these tests drive it exactly
 * as the component does - `begin` when a lookup starts, `isCurrent` when a
 * reply arrives, `invalidate` when the field is edited.
 *
 * Each scenario below is written as the sequence of events the user causes,
 * in the order the component would call them.
 */
const test = require("node:test");
const assert = require("node:assert");

const { createLookupGuard } = require("./ifscLookupGuard");

const A = "SBIN0010507";
const B = "HDFC0000012";

/* =================== 1. resolve A, edit, type A again =================== */

test("A CODE CAN BE LOOKED UP AGAIN AFTER BEING EDITED AWAY AND RETYPED", () => {
  const g = createLookupGuard();

  // A is typed and resolves.
  const first = g.begin(A);
  assert.notStrictEqual(first, null, "the first lookup happens");
  assert.strictEqual(g.isCurrent(first), true, "and its answer is accepted");

  // The user edits the field - to anything, including a partial code.
  g.invalidate();

  // ...and types A again. This MUST look up again. Before the fix the code
  // was still remembered as asked, so the lookup silently refused, the bank
  // name never came back, and the form sat idle while saving insisted it was
  // "still checking".
  const second = g.begin(A);
  assert.notStrictEqual(second, null, "retyping the same code must ask again");
  assert.strictEqual(g.isCurrent(second), true);
  assert.notStrictEqual(second, first, "and it is a different lookup");
});

test("the answer to the FIRST A cannot satisfy the second", () => {
  // The two lookups are distinct, so a reply from the abandoned one is
  // discarded even though it carries the right code.
  const g = createLookupGuard();
  const first = g.begin(A);
  g.invalidate();
  const second = g.begin(A);

  assert.strictEqual(g.isCurrent(first), false, "the abandoned reply is stale");
  assert.strictEqual(g.isCurrent(second), true);
});

/* =================== 2. a reply landing after an edit =================== */

test("A REPLY FOR THE OLD CODE CANNOT FILL THE FORM IN AFTER AN EDIT", () => {
  // The dangerous one. A lookup for A is in flight; the user edits the field
  // to something incomplete, so NO new lookup begins. A sequence number alone
  // cannot help here - there is no newer lookup to be newer than - and before
  // the fix A's answer arrived and populated Bank Name and Branch beside a
  // code that was no longer A.
  const g = createLookupGuard();
  const inFlight = g.begin(A);

  g.invalidate(); // the user edits to "SBIN00105", a partial code

  assert.strictEqual(
    g.isCurrent(inFlight),
    false,
    "an answer for the edited-away code must be discarded"
  );
});

test("it holds however many edits happen while one lookup is in flight", () => {
  const g = createLookupGuard();
  const inFlight = g.begin(A);
  for (let i = 0; i < 5; i += 1) g.invalidate();
  assert.strictEqual(g.isCurrent(inFlight), false);
});

test("an edit to a DIFFERENT complete code discards the first answer too", () => {
  // Both halves matter here: the edit orphans A, and B's own lookup is the
  // only one whose answer is wanted.
  const g = createLookupGuard();
  const forA = g.begin(A);

  g.invalidate();
  const forB = g.begin(B);

  assert.strictEqual(g.isCurrent(forA), false, "A's answer must not fill B's fields");
  assert.strictEqual(g.isCurrent(forB), true);
});

/* =================== the ordinary duplicate case ======================== */

test("the debounce and the blur asking for the same code is ONE lookup", () => {
  // What the guard was for in the first place. Both fire for the code on
  // screen; only the first is a question.
  const g = createLookupGuard();
  const debounced = g.begin(A);
  const onBlur = g.begin(A);

  assert.notStrictEqual(debounced, null);
  assert.strictEqual(onBlur, null, "the second must not make a request");
  assert.strictEqual(g.isCurrent(debounced), true, "and the first is still awaited");
});

test("a re-render asking repeatedly still makes one request", () => {
  const g = createLookupGuard();
  const first = g.begin(A);
  for (let i = 0; i < 10; i += 1) assert.strictEqual(g.begin(A), null);
  assert.strictEqual(g.isCurrent(first), true);
});

/* =================== retrying a failure ================================= */

test("A FAILED LOOKUP CAN BE RETRIED WITHOUT EDITING THE CODE", () => {
  // A provider outage says nothing about the code, so the same code must be
  // askable again - but nothing already in flight should be orphaned by that,
  // which is why this is `forget` and not `invalidate`.
  const g = createLookupGuard();
  const failed = g.begin(A);
  assert.strictEqual(g.isCurrent(failed), true);

  g.forget(); // the request threw, or came back unavailable

  const retry = g.begin(A);
  assert.notStrictEqual(retry, null, "the same code may be asked again");
  assert.strictEqual(g.isCurrent(retry), true);
  assert.strictEqual(g.isCurrent(failed), false, "and the retry supersedes it");
});

test("forget does not orphan a lookup that is still wanted", () => {
  // The distinction between the two: `invalidate` is an edit and orphans
  // everything; `forget` only makes a code askable again.
  const g = createLookupGuard();
  const t = g.begin(A);
  const seqBefore = g._state().seq;
  g.forget();
  assert.strictEqual(g._state().seq, seqBefore, "forget must not advance the sequence");
  assert.strictEqual(g.isCurrent(t), true);
});

/* =================== an invalid code is not re-asked ==================== */

test("a code the provider rejected is not asked about again unprompted", () => {
  // `invalid` deliberately does NOT forget: re-asking about a code already
  // known to be wrong would be a request per re-render for no new answer.
  // Editing is what makes it askable again, which is the correct trigger.
  const g = createLookupGuard();
  const t = g.begin(A);
  // ...the reply is a 404. Nothing is forgotten.
  assert.strictEqual(g.begin(A), null, "no repeat request while it stands");
  assert.strictEqual(g.isCurrent(t), true);

  g.invalidate();
  assert.notStrictEqual(g.begin(A), null, "editing makes it askable again");
});

/* =================== the component uses it this way ===================== */

test("THE EDITOR DRIVES THE GUARD, AND NO LONGER KEEPS ITS OWN REFS", () => {
  const fs = require("fs");
  const path = require("path");
  const src = fs
    .readFileSync(path.join(__dirname, "..", "components/hr/profile/BankDetailsEditor.jsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  assert.match(src, /const guard = useRef\(createLookupGuard\(\)\)\.current;/);

  // Editing the IFSC invalidates the lookup, not just the displayed result.
  const set = src.slice(src.indexOf("const set = (name, value)"), src.indexOf("const held"));
  assert.match(set, /if \(name === "ifsc"\) \{[\s\S]{0,120}guard\.invalidate\(\);/);
  assert.match(set, /setIfscState\(\{ status: "idle" \}\)/);

  // A lookup claims a ticket, and a reply is checked against it.
  const resolve = src.slice(src.indexOf("const resolveIfsc"), src.indexOf("}, [guard]);"));
  assert.match(resolve, /const ticket = guard\.begin\(code\);/);
  assert.match(resolve, /if \(ticket === null\) return;/);
  assert.match(resolve, /if \(!guard\.isCurrent\(ticket\)\) return;/);
  assert.match(resolve, /if \(guard\.isCurrent\(ticket\)\) \{\s*guard\.forget\(\);/);

  // The hand-rolled refs are gone, so there is one mechanism rather than two.
  assert.ok(!/lookedUp/.test(src), "no separate last-code ref");
  assert.ok(!/lookupSeq/.test(src), "no separate sequence ref");

  // Closing the modal invalidates too, so a reply cannot land on the next
  // employee's form.
  const close = src.slice(src.indexOf("const close = () =>"), src.indexOf("const normalIfsc"));
  assert.match(close, /guard\.invalidate\(\)/);
});
