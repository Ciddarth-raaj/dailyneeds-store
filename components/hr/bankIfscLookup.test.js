/**
 * Bank Details: the branch code fills the form in.
 *
 *   node --test components/hr/bankIfscLookup.test.js
 *
 * ================================================== WHAT THIS IS ABOUT =====
 *
 * HR types an IFSC and the bank and branch appear. Both are read-only,
 * because they are DERIVED from the code rather than typed beside it - which
 * is the whole point: a typed bank name can disagree with the branch code it
 * sits next to, and then payroll stores one bank's name against another
 * bank's account.
 *
 * Two things must not be confused by anything here, and most of these tests
 * exist to keep them apart:
 *
 *   THE LOOKUP    free at the point of use, cached in the backend's IFSC
 *                 master for six months, no employee involved, no account
 *                 number involved.
 *   PENNY-LESS    the paid provider check, spent only by the primary button,
 *                 reading the stored account server-side.
 *
 * A change that let the lookup run per keystroke, or from the primary
 * button's guard, would not fail anything else - it would just cost money and
 * show up on a bill.
 *
 * There is no React test runner in this repo, so the components are asserted
 * as source.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const editor = read("components/hr/profile/BankDetailsEditor.jsx");
const editorCode = strip(editor);
const helper = strip(read("helper/hr.js"));
const field = strip(read("components/hr/profile/SectionCard.jsx"));
const profileCode = strip(read("pages/hr/employees/[id].jsx"));
const card = read("components/hr/BankCard.jsx");

/* ============ 1-2. only a complete code, and never per keystroke ========= */

test("ONLY A COMPLETE IFSC IS LOOKED UP", () => {
  // Eleven characters in the agreed shape. Anything shorter is somebody
  // mid-word, and asking about it would be asking about a code nobody typed.
  assert.match(editorCode, /const IFSC_PATTERN = \/\^\[A-Z\]\{4\}0\[A-Z0-9\]\{6\}\$\//);
  assert.match(editorCode, /const ifscComplete = IFSC_PATTERN\.test\(normalIfsc\)/);

  // The effect refuses outright unless the code is complete.
  const effect = editorCode.slice(editorCode.indexOf("useEffect(() => {"));
  assert.match(effect, /if \(!isOpen \|\| !ifscComplete\) return undefined;/);

  // And the lookup itself checks again, so a blur cannot bypass it.
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"));
  assert.match(resolve.slice(0, 200), /if \(!IFSC_PATTERN\.test\(code\)\) return;/);
});

test("NO REQUEST ON EVERY KEYSTROKE - IT IS DEBOUNCED, AND FIRES ON BLUR", () => {
  assert.match(editorCode, /const IFSC_DEBOUNCE_MS = \d+/);
  assert.match(editorCode, /setTimeout\(\(\) => resolveIfsc\(normalIfsc\), IFSC_DEBOUNCE_MS\)/);
  // Cleared on every change, so typing straight through is one request.
  assert.match(editorCode, /return \(\) => clearTimeout\(timer\)/);

  // Blur asks at once rather than waiting the debounce out.
  assert.match(editorCode, /const onIfscBlur = \(\) => \{\s*if \(ifscComplete\) resolveIfsc\(normalIfsc\);/);
  assert.match(editorCode, /onBlur=\{onIfscBlur\}/);

  // The guard is what stops the debounce and the blur both asking; its own
  // tests in util/ifscLookupGuard.test.js run that rather than assert it.
  assert.match(editorCode, /const ticket = guard\.begin\(code\);/);
  assert.match(editorCode, /if \(ticket === null\) return;/);
});

test("a stale answer cannot overwrite a newer one, NOR an edited field", () => {
  // Two codes typed quickly, the first answering last - and the harder case,
  // a reply arriving after the field was edited but before any new lookup
  // began. Both are exercised for real in util/ifscLookupGuard.test.js; what
  // is checked here is that the component actually consults the guard.
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"));
  assert.match(resolve, /if \(!guard\.isCurrent\(ticket\)\) return;/);
  assert.match(resolve, /if \(guard\.isCurrent\(ticket\)\) \{\s*guard\.forget\(\);/);
  assert.match(editorCode, /const guard = useRef\(createLookupGuard\(\)\)\.current;/);
});

/* ============ 3-4. it fills the two fields, and they are read-only ======= */

test("A VALID IFSC FILLS BANK NAME AND BRANCH", () => {
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"));
  assert.match(resolve, /status: "ok",\s*bank_name: res\.bank_name,\s*branch_name: res\.branch_name,/);
  // Both must be present; a half answer is not a fill.
  assert.match(resolve, /code_ === 200 && res\.bank_name && res\.branch_name/);
});

test("BANK NAME AND BRANCH ARE READ-ONLY, AND COME ONLY FROM THE LOOKUP", () => {
  const grid = editorCode.slice(editorCode.indexOf("<FieldGrid"), editorCode.indexOf("</FieldGrid>"));

  for (const name of ["bank_name", "branch_name"]) {
    const at = grid.indexOf(`name="${name}"`);
    assert.ok(at > -1, `${name} must be a field`);
    const block = grid.slice(at, at + 400);
    assert.match(block, /isReadOnly/, `${name} must be read-only`);
    // Its value is the resolved one, never form state.
    assert.match(
      block,
      new RegExp(`value=\\{ifscState\\.status === "ok" \\? ifscState\\.${name} : ""\\}`),
      `${name} must render the resolved value`
    );
    assert.ok(!block.includes(`form.${name}`), `${name} must not come from typed state`);
  }

  // The form itself no longer carries a bank name to type into.
  assert.match(editorCode, /useState\(\{ account_no: "", ifsc: "" \}\)/);
  assert.ok(!/form\.bank_name/.test(editorCode), "there is no typed bank name any more");

  // And the field component actually honours it.
  assert.match(field, /isReadOnly=\{isReadOnly\}/);
});

test("what is SAVED is the resolved bank name, never a typed one", () => {
  const validated = editorCode.slice(editorCode.indexOf("const validated"), editorCode.indexOf("const submit"));
  assert.match(validated, /bank_name: ifscState\.status === "ok" \? ifscState\.bank_name : ""/);
  // Branch is display only - it is not part of what the employee record gets.
  assert.ok(!/branch_name:/.test(validated), "branch_name must not be saved");
  assert.ok(
    !/branch/i.test(strip(read("util/hrProfile.js"))),
    "no branch field may be added to the employee payload"
  );
});

/* ============ 5. editing the code clears what it resolved ================ */

test("CHANGING THE IFSC CLEARS THE PREVIOUS BANK AND BRANCH IMMEDIATELY", () => {
  // Not when the next lookup answers - at once. A resolved name shown beside
  // a different code is an invitation to save a mismatch.
  const set = editorCode.slice(editorCode.indexOf("const set = (name, value)"), editorCode.indexOf("const held"));
  assert.match(set, /if \(name === "ifsc"\) \{[\s\S]{0,200}setIfscState\(\{ status: "idle" \}\)/);
  // And the LOOKUP is invalidated too, not only its result - otherwise an
  // answer for the old code could still land, and retyping a code that had
  // just resolved would never look it up again.
  assert.match(set, /guard\.invalidate\(\);/);

  // And closing resets everything, so the next employee starts clean.
  const close = editorCode.slice(editorCode.indexOf("const close = () =>"), editorCode.indexOf("const normalIfsc"));
  assert.match(close, /setIfscState\(\{ status: "idle" \}\)/);
  assert.match(close, /guard\.invalidate\(\)/);
});

/* ============ 6-7. invalid blocks; unavailable does not =================== */

test("AN INVALID IFSC BLOCKS SAVE AND VERIFY", () => {
  // An account nothing can ever be paid into is not worth storing.
  assert.match(editorCode, /const ifscBlocks =\s*ifscState\.status === "invalid" \|\|/);
  assert.match(editorCode, /isDisabled=\{held \|\| ifscBlocks\}/);

  // The button is not the only barrier: submit refuses too.
  const validated = editorCode.slice(editorCode.indexOf("const validated"), editorCode.indexOf("const submit"));
  assert.match(validated, /if \(ifscState\.status === "invalid"\)/);
  assert.match(validated, /return null;/);

  // And it is called an invalid code in those words.
  assert.match(editor, /Invalid IFSC — please check the code/);
});

test("A PROVIDER FAILURE IS NEVER SHOWN AS AN INVALID IFSC", () => {
  // The distinction the backend keeps, kept here too. Telling somebody their
  // correct IFSC is invalid because a server was down is how they retype a
  // right answer until they give up.
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"));

  // Only 404 and 422 - the backend's two "this code is wrong" answers - set
  // invalid. Everything else is unavailable.
  assert.match(resolve, /if \(code_ === 404 \|\| code_ === 422\) \{[\s\S]{0,200}status: "invalid"/);
  assert.match(resolve, /setIfscState\(\{\s*status: "unavailable"/);
  // A thrown request is not evidence about the code either.
  const thrown = resolve.slice(resolve.indexOf("} catch"), resolve.indexOf("if (!guard.isCurrent(ticket)) return;"));
  assert.match(thrown, /status: "unavailable"/);
  assert.ok(!/invalid/.test(thrown), "a failed request must not judge the code");

  // It says so in those words, and points at the outage rather than the code.
  assert.match(editor, /This is not a problem with the\s*code — please try again in a moment/);
});

test("A CACHED ANSWER SURVIVES A PROVIDER OUTAGE, AND STILL SAVES", () => {
  // The backend serves its cached row whenever the provider is unreachable,
  // flagged `stale`. That is still the answer - branches do not move often -
  // so it fills the form and saves normally rather than being thrown away.
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"));
  assert.match(resolve, /stale: Boolean\(res\.stale\)/);
  assert.match(editorCode, /status: "ok",\s*bank_name: res\.bank_name/);

  // `ok` is never blocked, stale or not: the bank name is known.
  assert.ok(
    !/ifscBlocks =[\s\S]{0,200}"ok"/.test(editorCode),
    "a known bank name must never hold the save"
  );
  // And the user is told where it came from rather than it passing as fresh.
  assert.match(editor, /from the saved branch list; the bank lookup could not be reached to re-check it/);
});

test("A NEVER-SEEN CODE PLUS AN OUTAGE HOLDS THE SAVE INSTEAD OF STORING A BLANK", () => {
  // Reaching `unavailable` means the backend has never resolved this code AND
  // cannot now - so there is no bank name to be had. Saving would put an
  // account on the employee with no bank name against it, and the record
  // would keep that gap long after the outage ended.
  assert.match(
    editorCode,
    /const ifscBlocks =\s*ifscState\.status === "invalid" \|\|\s*ifscState\.status === "checking" \|\|\s*ifscState\.status === "unavailable";/
  );

  // submit() refuses too, so the disabled button is not the only barrier.
  const validated = editorCode.slice(editorCode.indexOf("const validated"), editorCode.indexOf("const submit"));
  assert.match(validated, /if \(ifscState\.status === "unavailable"\)/);
  assert.match(validated, /the details are not saved without it/);

  // A blank bank name can therefore never be what gets saved.
  assert.match(validated, /bank_name: ifscState\.status === "ok" \? ifscState\.bank_name : ""/);
});

test("pasting a code and clicking at once asks first rather than saving a blank", () => {
  // `idle` with a complete code means the debounce has not fired yet. The
  // half second is worth more than a bank name nobody notices is missing.
  const validated = editorCode.slice(editorCode.indexOf("const validated"), editorCode.indexOf("const submit"));
  assert.match(validated, /ifscState\.status === "checking" \|\| ifscState\.status === "idle"/);
  assert.match(validated, /if \(ifscState\.status === "idle"\) resolveIfsc\(ifsc\);/);
});

test("there is a small loading state while it checks", () => {
  assert.match(editorCode, /checking: \(/);
  assert.match(editor, /Checking IFSC…/);
  assert.match(editorCode, /<Spinner size="xs"/);
  // And a success indication.
  assert.match(editor, /✓ \{ifscState\.bank_name\}/);
});

/* ============ 8-9. the existing paid flow is untouched =================== */

test("THE VERIFY & SAVE SEQUENCE IS UNCHANGED", () => {
  // Same labels, same order, same partial-success handling.
  assert.match(editorCode, /canVerify \? "Verify & Save Bank Details" : "Save Bank Details"/);
  assert.match(editorCode, /if \(!canVerify\) \{[\s\S]{0,200}onSave\(values\)/);
  assert.match(editorCode, /if \(result && result\.saved && result\.verified\) \{[\s\S]{0,120}close\(\);/);

  const fn = profileCode.slice(profileCode.indexOf("const saveAndVerifyBank"));
  const body = fn.slice(0, fn.indexOf("\n  };"));
  assert.ok(
    body.indexOf("updateEmployeeDetails") < body.indexOf("HrHelper.verifyBank"),
    "save still precedes verify"
  );
  // And the lost-response reconciliation survives.
  assert.match(profileCode, /const reconcileLostVerification/);
  assert.match(profileCode, /indeterminate: true/);
});

test("THE PAID-CALL PROTECTIONS STILL STAND, AND THE LOOKUP IS OUTSIDE THEM", () => {
  // The modal's guard.
  assert.match(editorCode, /const inFlight = useRef\(false\)/);
  assert.match(editorCode, /if \(inFlight\.current\) return;/);
  assert.match(editorCode, /if \(held\) return;/);
  // The card's guard.
  assert.match(strip(card), /const inFlight = useRef\(false\)/);

  // The lookup must not touch the paid-call guard: sharing it would let a
  // reference lookup block a verification, or worse, release its lock.
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"), editorCode.indexOf("useEffect(() => {"));
  assert.ok(!/inFlight/.test(resolve), "the lookup must not use the paid-call guard");
  assert.ok(!/verifyBank/.test(resolve), "and must never spend a verification");
});

test("NOTHING VERIFIES FROM AN EFFECT - AND THE ONE EFFECT ONLY LOOKS UP", () => {
  // The rule was: a paid verification only ever follows an explicit click.
  // The new effect exists, so it is checked rather than assumed.
  for (const [name, src] of [["editor", editorCode], ["card", strip(card)], ["profile", profileCode]]) {
    const effects = src.match(/useEffect\([\s\S]{0,500}?\}, \[[^\]]*\]\);/g) || [];
    for (const e of effects) {
      assert.ok(!/verifyBank/.test(e), `${name}: no effect may call verifyBank`);
      assert.ok(!/updateEmployeeDetails/.test(e), `${name}: no effect may save`);
    }
  }
});

/* ============ 10. and nothing about the account number changed ========== */

test("THE FULL ACCOUNT NUMBER IS STILL NEVER RENDERED, AND NEVER SENT TO A LOOKUP", () => {
  assert.ok(!/\{bank\.account_no\}/.test(editor));
  assert.ok(!/account_no: bank\./.test(editorCode), "still never prefilled from the stored account");
  assert.match(editorCode, /setForm\(\{ account_no: "", ifsc: "" \}\)/);

  // The IFSC lookup takes a branch code and nothing else, at every layer.
  assert.match(helper, /lookupIfsc: \(ifsc\) =>/);
  // Encoded into a local first, so the path is a plain template - which is
  // what lets hrScreens.test.js parse it and prove the route really exists.
  assert.match(helper, /const code = encodeURIComponent\(ifsc\);/);
  assert.match(helper, /API\.get\(`\/hr\/bank\/ifsc\/\$\{code\}`\)/);
  assert.ok(!/lookupIfsc\([^)]*account/.test(editorCode));
  const resolve = editorCode.slice(editorCode.indexOf("const resolveIfsc"));
  assert.ok(!/account/.test(resolve.slice(0, resolve.indexOf("useEffect"))), "no account number in the lookup");

  // The account number still reaches only the save.
  assert.match(editorCode, /account_no: account/);
});

/* ============ scope ===================================================== */

test("SANDBOX IS NEVER CALLED FROM THE BROWSER", () => {
  // The lookup goes to our own backend, which owns the token and the cache.
  for (const [name, src] of [["editor", editor], ["helper", read("helper/hr.js")]]) {
    for (const forbidden of ["sandbox.co.in", "x-api-key", "SANDBOX", "authenticate", "razorpay", "ifsc.razorpay"]) {
      assert.ok(!src.includes(forbidden), `${name} must not reach a provider directly: ${forbidden}`);
    }
  }
  // And the only new call is our own route.
  assert.match(helper, /\/hr\/bank\/ifsc\//);
});

test("the field component change is additive and breaks no existing caller", () => {
  // `isReadOnly` and `onBlur` are new optional props; everything else about
  // EditField is as it was, so the eight sections using it are unaffected.
  assert.match(field, /isReadOnly,\s*onBlur,/);
  assert.match(field, /const blur = onBlur \? \(\) => onBlur\(name\) : undefined;/);
  assert.match(field, /onBlur=\{blur\}/);
  // The existing behaviour is untouched.
  assert.match(field, /isDisabled=\{isDisabled\}/);
  assert.match(field, /const set = \(e\) => onChange\(name, e\.target\.value\);/);
});
