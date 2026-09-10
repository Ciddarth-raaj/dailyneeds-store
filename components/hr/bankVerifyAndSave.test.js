/**
 * Bank details: save and verify as one HR action.
 *
 *   node --test components/hr/bankVerifyAndSave.test.js
 *
 * ================================================== WHAT THIS IS ABOUT =====
 *
 * Entering an account and finding out whether it is real were two screens: add
 * the details, close, then hunt for Verify on the card. For a user who may do
 * both, that is one job, and it is now one button.
 *
 * They remain TWO BACKEND CALLS in sequence. Not fusing them is the point:
 * the sensitive update and the paid provider check have different permissions,
 * different audit entries and different failure modes. What the sequence buys
 * is one HR action; what it costs is a partial outcome, and the whole design
 * turns on reporting that honestly rather than hiding it.
 *
 * `bankActions` is pure, so it is exercised directly. The rest is asserted
 * against source, because what matters is largely structural - an order of
 * operations, an absence of a second paid call, a message that comes from the
 * backend rather than from us.
 */
const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");

const read = (rel) => fs.readFileSync(path.join(__dirname, "..", "..", rel), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const { bankActions, canVerifyBank } = require("../../util/hrStatus");
const editor = read("components/hr/profile/BankDetailsEditor.jsx");
const editorCode = strip(editor);
const card = read("components/hr/BankCard.jsx");
const cardCode = strip(card);
const profile = read("pages/hr/employees/[id].jsx");
const profileCode = strip(profile);

// Permissions arrive from the API as rows, and `has()` reads `permission_key`
// off each one - so the fixtures are shaped the way the app actually receives
// them rather than as bare strings.
const key = (k) => ({ permission_key: k });
const VERIFIER = { permissions: [key("verify_employee_bank"), key("view_employee_sensitive")] };
const EDITOR_ONLY = { permissions: [key("view_employee_sensitive")] };

/* ===================================== 1. new employee, full permissions == */

test("NEW EMPLOYEE + VERIFIER: the editor saves and verifies in one action", () => {
  const a = bankActions({
    status: "NOT_PROVIDED",
    hasAccount: false,
    ...VERIFIER,
    canEditSensitive: true,
  });
  assert.strictEqual(a.editorVerifies, true, "the editor runs the verification too");
  assert.strictEqual(a.editLabel, "Add Bank Details");
  // Nothing to verify yet, so the card does not offer it - the next step is to
  // add an account, not to check one that is not there.
  assert.strictEqual(a.canVerifyExisting, false);
});

test("the primary button says what it will do", () => {
  assert.match(editor, /Verify & Save Bank Details/);
  assert.match(editor, /"Save Bank Details"/);
  assert.match(editorCode, /canVerify \? "Verify & Save Bank Details" : "Save Bank Details"/);
});

test("SAVE HAPPENS FIRST, AND A FAILED SAVE VERIFIES NOTHING", () => {
  const fn = profileCode.slice(profileCode.indexOf("const saveAndVerifyBank"));
  const body = fn.slice(0, fn.indexOf("\n  };"));

  const saveAt = body.indexOf("updateEmployeeDetails");
  const verifyAt = body.indexOf("HrHelper.verifyBank");
  assert.ok(saveAt > -1 && verifyAt > -1, "both calls must be present");
  assert.ok(saveAt < verifyAt, "the save must precede the verification");

  // The refusal returns before the verification is reached.
  const guard = body.slice(saveAt, verifyAt);
  assert.match(guard, /if \(failed\(res\)\)/);
  assert.match(guard, /return \{ saved: false/);
});

test("ONLY A VERIFIED RESULT CLOSES THE MODAL", () => {
  assert.match(editorCode, /if \(result && result\.saved && result\.verified\) \{[\s\S]{0,120}close\(\);/);
});

/* ======================= 2. may edit but may not verify =================== */

test("EDIT WITHOUT VERIFY: saves only, and no verification is offered", () => {
  const a = bankActions({
    status: "NOT_PROVIDED",
    hasAccount: false,
    ...EDITOR_ONLY,
    canEditSensitive: true,
  });
  assert.strictEqual(a.editorVerifies, false, "no paid call for somebody who may not run one");
  assert.strictEqual(a.canVerifyExisting, false);
  assert.strictEqual(a.canEditDetails, true, "they may still save");
});

test("the editor takes the save-only path when it may not verify", () => {
  // A button that would predictably 403 is worse than no button.
  assert.match(editorCode, /if \(!canVerify\) \{[\s\S]{0,200}onSave\(values\)/);
});

test("the permission rule is composed, not restated", () => {
  // `bankActions` asks `canVerifyBank`, so admin bypass and the two required
  // keys are decided in exactly one place.
  const rules = strip(read("util/hrStatus.js"));
  const decision = rules.slice(rules.indexOf("function bankActions"));
  assert.match(decision.slice(0, 900), /canVerifyBank\(\{ permissions, isAdmin \}\)/);
  // And the admin bypass still works through it.
  assert.strictEqual(
    bankActions({ status: "PENDING", hasAccount: true, permissions: [], isAdmin: true, canEditSensitive: true })
      .canVerifyExisting,
    true
  );
  assert.strictEqual(canVerifyBank({ permissions: [], isAdmin: true }), true);
});

/* ============ 3 & 4. old employees: stored account, no re-entry ========== */

test("OLD EMPLOYEE, PENDING: verify the STORED account, with no re-entry", () => {
  const a = bankActions({ status: "PENDING", hasAccount: true, ...VERIFIER, canEditSensitive: true });
  assert.strictEqual(a.canVerifyExisting, true);
  assert.strictEqual(a.editLabel, "Change Bank Details");
});

test("that button sends only the employee id - never an account number", () => {
  // The route reads the stored account server-side, which is what makes the
  // fingerprint, and therefore staleness, mean anything.
  assert.match(cardCode, /HrHelper\.verifyBank\(employeeId\)/);
  const helper = strip(read("helper/hr.js"));
  assert.match(helper, /verifyBank: \(employeeId\) =>[\s\S]{0,200}\/bank\/verify`, \{\}\)/);
  // Nothing in the flow posts an account number to the verify endpoint.
  assert.ok(!/verifyBank\([^)]*account/.test(profileCode));
  assert.ok(!/verifyBank\([^)]*account/.test(cardCode));
});

test("4. AN ALREADY-VERIFIED ACCOUNT IS NOT ASKED TO VERIFY AGAIN", () => {
  // A healthy account must not invite another paid provider call as part of
  // normal work.
  const a = bankActions({ status: "VERIFIED", hasAccount: true, ...VERIFIER, canEditSensitive: true });
  assert.strictEqual(a.canVerifyExisting, false);
  // Changing it is still offered - that is how a genuine re-verification
  // begins.
  assert.strictEqual(a.canEditDetails, true);
  assert.strictEqual(a.editLabel, "Change Bank Details");
});

test("5. AN INCOMPLETE ACCOUNT IS DIRECTED TO ADD, NOT TO VERIFY", () => {
  const a = bankActions({ status: "NOT_PROVIDED", hasAccount: false, ...VERIFIER, canEditSensitive: true });
  assert.strictEqual(a.canVerifyExisting, false);
  assert.strictEqual(a.editLabel, "Add Bank Details");
});

/* ========================= staleness: the safety this rests on =========== */

test("A CHANGED ACCOUNT CANNOT CARRY THE OLD VERIFIED FORWARD", () => {
  // The frontend adds no staleness rule of its own, and must not: the backend
  // downgrades a verification whose fingerprint no longer matches to PENDING
  // with `bank_payroll_ready` false, so a changed account arrives here as
  // PENDING like any other unverified one. A rule here would be a second
  // opinion that could disagree.
  const a = bankActions({ status: "PENDING", hasAccount: true, ...VERIFIER, canEditSensitive: true });
  assert.strictEqual(a.canVerifyExisting, true, "the new account must be verifiable");

  // The rule is about the BANK VERIFICATION's staleness - `bank.stale`, the
  // fingerprint mismatch the backend has already folded into the status. The
  // IFSC cache has an unrelated `stale` of its own, meaning "served from the
  // branch list without re-checking", which decides nothing about a
  // verification; matching on the bare word would conflate the two.
  for (const src of [cardCode, editorCode, profileCode]) {
    assert.ok(
      !/bank\.stale\s*[&|=]/.test(src),
      "no screen may derive an action from verification staleness"
    );
  }
  // The card still SHOWS it, which is different from deciding on it.
  assert.match(cardCode, /bank\.stale \?/);
  // And nothing turns the IFSC cache flag into a verification decision.
  assert.ok(!/ifscState\.stale[\s\S]{0,40}verif/i.test(editorCode));
  // The card still SHOWS it, which is different from deciding on it.
  assert.match(cardCode, /bank\.stale \?/);
});

/* ================= 6. save succeeded, verification did not =============== */

test("A PARTIAL SUCCESS NEVER CLAIMS THE SAVE FAILED", () => {
  assert.match(editor, /The bank details were saved\. The verification did not pass\./);
  // And it says the account is stored, so nobody retypes it.
  assert.match(editor, /The account above is stored/);
});

test("THE REASON SHOWN IS THE BACKEND'S, NOT AN INVENTED ONE", () => {
  // `outcome.message` is the backend's `message`; the fallback is the shared
  // guidance for the backend's own status. No provider strings are authored
  // here.
  assert.match(editorCode, /outcome\.message \|\|/);
  assert.match(editorCode, /bankGuidance\(outcome\.status/);
  // Checked against what the component can RENDER, not against its comments:
  // the rule is that no provider reason is authored here, and a comment
  // explaining which call is the paid one is not a reason shown to anybody.
  for (const invented of ["Penny", "provider said", "NEFT", "IMPS", "bank refused"]) {
    assert.ok(!editorCode.includes(invented), `must not invent a reason: ${invented}`);
  }
});

test("a 200 carrying a non-VERIFIED status is an answer, not an error", () => {
  // The provider's real verdict arrives as code 200 with NAME_MISMATCH,
  // DUPLICATE_ACCOUNT or FAILED. Treating that as a failed request would tell
  // the user the wrong thing entirely.
  const fn = profileCode.slice(profileCode.indexOf("const saveAndVerifyBank"));
  assert.match(fn, /verification\.code && verification\.code !== 200/);
  assert.match(fn, /status === "VERIFIED"/);
  assert.match(fn, /return \{\s*saved: true,\s*verified: false,\s*status,/);
});

test("the modal stays open on a partial success so a correction is one edit", () => {
  assert.match(editorCode, /setOutcome\(result \|\| \{ saved: false \}\)/);
  // Retrying re-runs the same sequence: save the corrected details, then
  // verify those.
  assert.match(editor, /Save & verify again/);
});

/* ========================= the paid call is protected ==================== */

test("THE SEQUENCE CANNOT BE STARTED TWICE", () => {
  // Verification is billed per call, so a double click or a re-render must not
  // spend two.
  assert.match(editorCode, /const inFlight = useRef\(false\)/);
  assert.match(editorCode, /if \(inFlight\.current\) return;/);
  assert.match(editorCode, /inFlight\.current = true;/);
  assert.match(editorCode, /finally \{[\s\S]{0,80}inFlight\.current = false;/);
  // And the button is disabled for the duration.
  assert.match(editor, /isLoading=\{saving\}/);
});

test("NOTHING VERIFIES FROM AN EFFECT", () => {
  // A verification must only ever follow an explicit click.
  for (const [name, src] of [["editor", editorCode], ["card", cardCode], ["profile", profileCode]]) {
    const effects = src.match(/useEffect\([\s\S]{0,400}?\}, \[[^\]]*\]\);/g) || [];
    for (const e of effects) {
      assert.ok(!/verifyBank/.test(e), `${name}: no effect may call verifyBank`);
    }
  }
});

test("a network failure refreshes rather than blindly repeating", () => {
  const fn = profileCode.slice(profileCode.indexOf("const saveAndVerifyBank"));
  const c = fn.slice(fn.indexOf("} catch"));
  assert.match(c, /await load\(\)/);
  assert.ok(!/verifyBank/.test(c), "the catch must not retry the paid call");
  // A connection lost during the save leaves it genuinely unknown.
  assert.match(c, /phase === "save"/);
  assert.match(c, /saved: null/);
});

test("A LOST VERIFY RESPONSE IS RECONCILED, NOT RE-PAID", () => {
  // The backend stores the provider's answer BEFORE returning it, so losing
  // the response does not mean losing the check. Reading the status back is
  // free; running the check again is not.
  const r = profileCode.slice(
    profileCode.indexOf("const reconcileLostVerification"),
    profileCode.indexOf("const saveAndVerifyBank")
  );
  assert.ok(r.length > 0, "the verify-phase catch must reconcile");

  // It reads, and the read is the free one - never the paid route.
  assert.match(r, /HrHelper\.getBankStatus\(id\)/);
  assert.ok(!/verifyBank/.test(r), "reconciliation must not call the paid route");

  // A stored VERIFIED is a success: the check ran and passed.
  assert.match(r, /status === "VERIFIED"/);
  assert.match(r, /return \{ saved: true, verified: true, status \}/);

  // A stored verdict is shown as the real outcome it is.
  for (const s of ["VERIFIED", "NAME_MISMATCH", "DUPLICATE_ACCOUNT", "FAILED"]) {
    assert.ok(r.includes(`"${s}"`), `${s} must count as a settled verdict`);
  }
  assert.match(r, /settled\(status\)/);

  // And a failed status read must not be mistaken for a verdict.
  assert.match(r, /fresh && !fresh\.code \? fresh\.status : null/);
});

test("AN UNDETERMINED OUTCOME DOES NOT OFFER ANOTHER PAID CHECK", () => {
  const r = profileCode.slice(
    profileCode.indexOf("const reconcileLostVerification"),
    profileCode.indexOf("const saveAndVerifyBank")
  );
  // PENDING and an unreadable status fall through to a hold - and still say
  // plainly that the details were saved.
  assert.match(r, /indeterminate: true/);
  assert.match(r, /saved: true,\s*verified: false,\s*indeterminate: true/);

  // The editor honours the hold: the submit path refuses, and the button is
  // disabled rather than merely relabelled.
  assert.match(editorCode, /const held = Boolean\(outcome && outcome\.indeterminate\)/);
  assert.match(editorCode, /if \(held\) return;/);


  // Changing the details is the explicit act that lifts it.
  assert.match(editorCode, /o && o\.indeterminate \? \{ \.\.\.o, indeterminate: false \} : o/);
  // The button is disabled for this reason as well as for an unresolved IFSC;
  // both hold the same primary action, and neither may quietly drop the other.
  assert.match(editorCode, /isDisabled=\{held \|\| ifscBlocks\}/);

  // The wording must not claim a check ran and failed, because it may not have.
  assert.match(editor, /The check did not report back/);
  const partial = editorCode.slice(editorCode.indexOf("outcome.saved === true"));
  assert.match(
    partial.slice(0, 200),
    /!outcome\.indeterminate/,
    "the 'did not pass' alert must not render for an unknown outcome"
  );
});

test("THE CARD'S VERIFY BUTTON HAS THE SAME HARD DOUBLE-CLICK GUARD", () => {
  // `busy` only disables the button after a re-render; a fast second click can
  // land inside that gap and spend a second paid verification.
  assert.match(cardCode, /const inFlight = useRef\(false\)/);
  const run = cardCode.slice(cardCode.indexOf("const run = async"));
  const body = run.slice(0, run.indexOf("\n  };"));
  const guardAt = body.indexOf("if (inFlight.current) return;");
  const callAt = body.indexOf("await fn()");
  assert.ok(guardAt > -1, "run() must refuse a re-entrant call");
  assert.ok(guardAt < callAt, "the guard must precede the call it protects");
  // Set synchronously, before any await, and always released.
  assert.ok(body.indexOf("inFlight.current = true;") < callAt);
  assert.match(body, /finally \{\s*inFlight\.current = false;/);
  assert.match(cardCode, /import React, \{ useRef, useState \}/);
});

/* ================== 7-9. the existing safety model is intact ============= */

test("THE NAME MISMATCH NOW HAS A WAY OUT; DUPLICATE AND OVERRIDE ARE UNCHANGED", () => {
  assert.match(cardCode, /canReviewBankName\(\{ status, permissions, isAdmin \}\)/);
  assert.match(cardCode, /canOverrideDuplicateBank\(\{ status, permissions, isAdmin \}\)/);

  // THE REGRESSION THIS GUARDS. A hard mismatch used to render a sentence
  // saying nobody could confirm it, beside no action - an employee who could
  // not be paid and nothing to click.
  assert.ok(!/cannot be confirmed by anybody/.test(card), "the dead end must not come back");
  assert.match(card, /Review Name Mismatch/, "there is an action instead");
  for (const outcome of ["Approve as Same Person", "Change Bank Details", "Reject Bank Account"]) {
    assert.match(card, new RegExp(outcome), `the review must offer ${outcome}`);
  }
  // Neither decision goes through without a stated reason.
  assert.match(cardCode, /isDisabled=\{!bankReviewReasonValid\(reviewReason\)\}/);

  // The override still demands a reason.
  assert.match(cardCode, /reason\.trim\(\)\.length < 3/);
  // And the duplicate warning still names the other employee by id and name.
  assert.match(cardCode, /bank\.duplicate_of\.map/);
});

test("THE REVIEW SHOWS WHAT IT TAKES TO DECIDE, AND NEVER AN ACCOUNT NUMBER", () => {
  // Two names, the account, and the comparison's own result - the facts the
  // old dialog left out, which is why it could only ask for an optional note.
  assert.match(card, /Employee name:/);
  assert.match(card, /Name at bank:/);
  assert.match(cardCode, /review\.maskedAccount/);
  assert.match(cardCode, /review\.verdictLabel/);
  // The masked value the API sent, and nothing that could be a full number.
  assert.ok(!/account_no/.test(cardCode), "the card never touches a raw account number");
  // The audit is stated on the screen before the decision, not after it.
  assert.match(card, /recorded against your name/);
  assert.match(card, /bank-name-mismatch override/);
});

test("every existing status still renders", () => {
  const badges = read("util/hrStatus.js");
  for (const s of [
    "NOT_PROVIDED",
    "PENDING",
    "VERIFIED",
    "NAME_MISMATCH",
    "DUPLICATE_ACCOUNT",
    "REJECTED",
    "FAILED",
  ]) {
    assert.match(badges, new RegExp(s), `${s} must still be a known status`);
  }
});

/* ================= 10. nothing renders a full account number ============= */

test("THE FULL ACCOUNT NUMBER IS NEVER RENDERED FROM THE BACKEND", () => {
  for (const [name, src] of [["card", card], ["editor", editor], ["profile", profile]]) {
    // Only the masked value the API sends is displayed.
    assert.ok(!/\{bank\.account_no\}/.test(src), `${name} must not render account_no`);
    assert.ok(!/account_fingerprint/.test(src), `${name} must not touch the fingerprint`);
  }
  assert.match(cardCode, /bank\.masked_account/);
  // The editor's field is the one the user typed, cleared on close - never a
  // value read back from the server.
  // The bank name left the form when it became derived from the IFSC; the
  // account number and the code are still cleared on close.
  assert.match(editorCode, /setForm\(\{ account_no: "", ifsc: "" \}\)/);
  assert.ok(
    !/account_no: bank\./.test(editorCode),
    "the editor must never prefill from the stored account"
  );
});

test("the local validation is unchanged", () => {
  assert.match(editorCode, /\/\^\\d\{6,20\}\$\//);
  assert.match(editorCode, /\/\^\[A-Z\]\{4\}0\[A-Z0-9\]\{6\}\$\//);
});

/* ============================== scope ==================================== */

test("NO BACKEND CONTRACT WAS CHANGED BY THE FRONTEND", () => {
  // The helper still calls exactly the routes that already existed.
  const helper = strip(read("helper/hr.js"));
  assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/bank\/verify/);
  assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/bank\/verification/);
  assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/bank\/confirm-name/);
  assert.match(helper, /\/hr\/employee\/\$\{employeeId\}\/bank\/override-duplicate/);
  // And the save still goes through the existing sensitive path.
  assert.match(profileCode, /EmployeeHelper\.updateEmployeeDetails\(payload\)/);
});

test("no external bank or IFSC lookup was added", () => {
  for (const [name, src] of [["card", card], ["editor", editor], ["profile", profile]]) {
    for (const f of ["razorpay", "ifsc.razorpay", "api.postalpincode", 'fetch("http']) {
      assert.ok(!src.includes(f), `${name} must not add an external lookup: ${f}`);
    }
  }
});
