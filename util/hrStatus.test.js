/**
 * Stage 0C / C3 — the rules the HR screens run on.
 *
 *   node --test util/hrStatus.test.js
 *
 * These mirror backend rules that must not drift. The three that matter most,
 * because getting any of them wrong is a real defect rather than a cosmetic
 * one:
 *
 *   a MISMATCH must never be offerable for confirmation
 *   the duplicate-account override must never appear for ordinary HR
 *   the duplicate-person warning must never block a create
 */
const test = require("node:test");
const assert = require("node:assert");
const {
  aadhaarBadge,
  aadhaarBlocksCreate,
  aadhaarOutcome,
  bankBadge,
  bankGuidance,
  canConfirmBankName,
  canOverrideDuplicateBank,
  canVerifyBank,
  lifecycleActions,
  rejoinNeedsPreviousEnd,
  duplicateSummary,
  employmentBadge,
} = require("./hrStatus");

const perms = (...keys) => keys.map((permission_key) => ({ permission_key }));

/* ================================================================ Aadhaar */
test("Aadhaar shows Verified or Pending, and nothing else", () => {
  assert.strictEqual(aadhaarBadge("VERIFIED").label, "Verified");
  assert.strictEqual(aadhaarBadge("PENDING").label, "Pending");
  // An employee predating C2 has no status at all; they are Pending, not blank.
  assert.strictEqual(aadhaarBadge(undefined).label, "Pending");
  assert.strictEqual(aadhaarBadge(null).label, "Pending");
});

test("Aadhaar never blocks creating an employee", () => {
  assert.strictEqual(aadhaarBlocksCreate(), false);
});

test("an OTP result routes to the right next step", () => {
  const created = aadhaarOutcome({ next_action: "create", aadhaar_last4: "2229" });
  assert.strictEqual(created.kind, "create");
  assert.strictEqual(created.tone, "success");

  const employed = aadhaarOutcome({
    next_action: "already_employed",
    existing_employee: { employee_id: 412, is_active: true },
  });
  assert.strictEqual(employed.kind, "already_employed");
  assert.strictEqual(employed.employeeId, 412);
  assert.match(employed.detail, /Do not create a second record/);

  const rejoin = aadhaarOutcome({
    next_action: "rejoin",
    existing_employee: { employee_id: 412, is_active: false, last_ended_on: "2024-05-31" },
  });
  assert.strictEqual(rejoin.kind, "rejoin");
  assert.strictEqual(rejoin.employeeId, 412);
  assert.match(rejoin.detail, /2024-05-31/);
  assert.match(rejoin.cta, /Rejoin/);
});

test("a rejoin outcome still names the employee when the leaving date is unknown", () => {
  const r = aadhaarOutcome({
    next_action: "rejoin",
    existing_employee: { employee_id: 7, is_active: false, last_ended_on: null },
  });
  assert.strictEqual(r.employeeId, 7);
  assert.match(r.detail, /Use Rejoin/);
});

/* =================================================================== bank */
test("every bank status has a badge, and an unknown one is not treated as verified", () => {
  for (const s of ["NOT_PROVIDED", "PENDING", "VERIFIED", "NAME_MISMATCH", "DUPLICATE_ACCOUNT", "FAILED"]) {
    assert.ok(bankBadge(s).label, `${s} needs a badge`);
  }
  assert.notStrictEqual(bankBadge("SOMETHING_NEW").label, "Verified");
});

test("the guidance distinguishes a reviewable name from an impossible one", () => {
  assert.match(bankGuidance("NAME_MISMATCH", "REVIEW"), /must confirm/);
  assert.match(bankGuidance("NAME_MISMATCH", "MISMATCH"), /belongs to someone else/);
  assert.match(bankGuidance("DUPLICATE_ACCOUNT"), /still working/);
  assert.match(bankGuidance("VERIFIED"), /Ready for payroll/);
});

test("a REVIEW name can be confirmed by someone holding both keys", () => {
  assert.strictEqual(
    canConfirmBankName({
      status: "NAME_MISMATCH",
      verdict: "REVIEW",
      permissions: perms("confirm_bank_name_mismatch", "view_employee_sensitive"),
    }),
    true
  );
});

test("A MISMATCH IS NEVER CONFIRMABLE, whatever permissions are held", () => {
  assert.strictEqual(
    canConfirmBankName({
      status: "NAME_MISMATCH",
      verdict: "MISMATCH",
      permissions: perms("confirm_bank_name_mismatch", "view_employee_sensitive"),
    }),
    false
  );
});

test("confirming needs BOTH keys, and only applies to a name mismatch", () => {
  assert.strictEqual(
    canConfirmBankName({
      status: "NAME_MISMATCH",
      verdict: "REVIEW",
      permissions: perms("confirm_bank_name_mismatch"),
    }),
    false,
    "sensitive access is required too"
  );
  assert.strictEqual(
    canConfirmBankName({
      status: "VERIFIED",
      verdict: "MATCH",
      permissions: perms("confirm_bank_name_mismatch", "view_employee_sensitive"),
    }),
    false,
    "there is nothing to confirm"
  );
});

test("ORDINARY HR NEVER SEES THE DUPLICATE-ACCOUNT OVERRIDE", () => {
  // Holding every HR key there is - including the one for confirming a name -
  // must not surface the override. It is a different decision by a different
  // person, and the backend grants it to nobody.
  const hrExecutive = perms(
    "employee_create",
    "employee_edit",
    "employee_resign",
    "employee_rejoin",
    "view_employee_lifecycle",
    "verify_employee_bank",
    "confirm_bank_name_mismatch",
    "view_employee_sensitive",
    "edit_employee_sensitive"
  );
  assert.strictEqual(
    canOverrideDuplicateBank({ status: "DUPLICATE_ACCOUNT", permissions: hrExecutive }),
    false
  );
});

test("an administrator can override, and only on a duplicate", () => {
  assert.strictEqual(
    canOverrideDuplicateBank({ status: "DUPLICATE_ACCOUNT", permissions: [], isAdmin: true }),
    true
  );
  assert.strictEqual(
    canOverrideDuplicateBank({ status: "VERIFIED", permissions: [], isAdmin: true }),
    false,
    "nothing to override"
  );
});

test("someone explicitly granted the override key can use it", () => {
  assert.strictEqual(
    canOverrideDuplicateBank({
      status: "DUPLICATE_ACCOUNT",
      permissions: perms("override_duplicate_bank_account", "view_employee_sensitive"),
    }),
    true
  );
});

test("running the paid check needs both keys, or admin", () => {
  assert.strictEqual(canVerifyBank({ permissions: perms("verify_employee_bank") }), false);
  assert.strictEqual(
    canVerifyBank({ permissions: perms("verify_employee_bank", "view_employee_sensitive") }),
    true
  );
  assert.strictEqual(canVerifyBank({ permissions: [], isAdmin: true }), true);
});

/* ============================================================== lifecycle */
test("active employees resign, inactive ones rejoin, never both", () => {
  const p = perms("employee_resign", "employee_rejoin");
  const active = lifecycleActions({ isActive: true, permissions: p });
  assert.deepStrictEqual(active, { canResign: true, canRejoin: false });

  const inactive = lifecycleActions({ isActive: false, permissions: p });
  assert.deepStrictEqual(inactive, { canResign: false, canRejoin: true });
});

test("without the permission, neither action is offered", () => {
  assert.deepStrictEqual(lifecycleActions({ isActive: true, permissions: [] }), {
    canResign: false,
    canRejoin: false,
  });
  assert.deepStrictEqual(lifecycleActions({ isActive: false, permissions: [] }), {
    canResign: false,
    canRejoin: false,
  });
});

test("rejoin asks for the previous end date only when it is genuinely missing", () => {
  const knownEnd = { periods: [{ period_no: 1, period_state: "closed", ended_on: "2024-05-31" }] };
  assert.strictEqual(rejoinNeedsPreviousEnd(knownEnd), false);

  const unknownEnd = { periods: [{ period_no: 1, period_state: "closed", ended_on: null }] };
  assert.strictEqual(rejoinNeedsPreviousEnd(unknownEnd), true, "one of the 93 historical rows");

  assert.strictEqual(rejoinNeedsPreviousEnd(null), false);
  assert.strictEqual(rejoinNeedsPreviousEnd({ periods: [] }), false);
});

test("employment status reads Active or Resigned", () => {
  assert.strictEqual(employmentBadge(1).label, "Active");
  assert.strictEqual(employmentBadge(0).label, "Resigned");
});

/* ====================================================== duplicate person */
test("THE DUPLICATE WARNING NEVER BLOCKS, in any branch", () => {
  const withMatches = duplicateSummary({
    possible_duplicates: true,
    matches: [{ employee_id: 1, confidence: "high", suggested_action: "rejoin", is_active: false }],
  });
  assert.strictEqual(withMatches.blocking, false);

  const none = duplicateSummary({ possible_duplicates: false, matches: [] });
  assert.strictEqual(none.blocking, false);
  assert.strictEqual(none.show, false);

  assert.strictEqual(duplicateSummary(null).blocking, false);
  assert.strictEqual(duplicateSummary(undefined).show, false);
});

test("an inactive match is singled out, because that is where a second ID gets created", () => {
  const s = duplicateSummary({
    possible_duplicates: true,
    matches: [
      { employee_id: 1, confidence: "high", suggested_action: "review_already_employed", is_active: true },
      { employee_id: 2, confidence: "high", suggested_action: "rejoin", is_active: false },
    ],
  });
  assert.strictEqual(s.show, true);
  assert.strictEqual(s.rejoinable.length, 1);
  assert.strictEqual(s.rejoinable[0].employee_id, 2);
  assert.match(s.subheading, /use Rejoin/);
});

test("only-active matches say review rather than rejoin", () => {
  const s = duplicateSummary({
    possible_duplicates: true,
    matches: [
      { employee_id: 1, confidence: "medium", suggested_action: "review_already_employed", is_active: true },
    ],
  });
  assert.strictEqual(s.rejoinable.length, 0);
  assert.match(s.subheading, /still working/);
});
