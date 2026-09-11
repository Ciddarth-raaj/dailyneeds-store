/**
 * Stage 0C / C3 — the rules the HR screens run on.
 *
 *   node --test util/hrStatus.test.js
 *
 * These mirror backend rules that must not drift. The three that matter most,
 * because getting any of them wrong is a real defect rather than a cosmetic
 * one:
 *
 *   a name mismatch must always have a way out - either verdict
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
  bankActions,
  bankNameReviewOptions,
  bankReviewReasonValid,
  canReviewBankName,
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
  for (const s of ["NOT_PROVIDED", "PENDING", "VERIFIED", "NAME_MISMATCH", "DUPLICATE_ACCOUNT",
                   "REJECTED", "FAILED"]) {
    assert.ok(bankBadge(s).label, `${s} needs a badge`);
  }
  assert.notStrictEqual(bankBadge("SOMETHING_NEW").label, "Verified");
});

test("EVERY NAME MISMATCH POINTS AT THE REVIEW, whichever verdict it carries", () => {
  // The regression this replaced: "it cannot be accepted", stated beside no
  // action at all, to the one person who had to get the employee paid.
  for (const verdict of ["REVIEW", "MISMATCH"]) {
    const guidance = bankGuidance("NAME_MISMATCH", verdict);
    assert.match(guidance, /Review/i, `${verdict} must send the reader to the review`);
    assert.ok(!/cannot be accepted/i.test(guidance), `${verdict} must not state a dead end`);
  }
  assert.match(bankGuidance("REJECTED"), /verify again/);
  assert.match(bankGuidance("DUPLICATE_ACCOUNT"), /still working/);
  assert.match(bankGuidance("VERIFIED"), /Ready for payroll/);
});

test("BOTH VERDICTS ARE REVIEWABLE by someone holding both keys", () => {
  for (const verdict of ["REVIEW", "MISMATCH"]) {
    assert.strictEqual(
      canReviewBankName({
        status: "NAME_MISMATCH",
        verdict,
        permissions: perms("confirm_bank_name_mismatch", "view_employee_sensitive"),
      }),
      true,
      `${verdict} must be reviewable`
    );
  }
});

test("reviewing needs BOTH keys, and only applies to a name mismatch", () => {
  assert.strictEqual(
    canReviewBankName({
      status: "NAME_MISMATCH",
      permissions: perms("confirm_bank_name_mismatch"),
    }),
    false,
    "sensitive access is required too"
  );
  for (const status of ["VERIFIED", "PENDING", "DUPLICATE_ACCOUNT", "REJECTED", "FAILED"]) {
    assert.strictEqual(
      canReviewBankName({
        status,
        permissions: perms("confirm_bank_name_mismatch", "view_employee_sensitive"),
      }),
      false,
      `there is nothing to review on ${status}`
    );
  }
  // The admin bypass the backend applies, applied here too.
  assert.strictEqual(canReviewBankName({ status: "NAME_MISMATCH", isAdmin: true }), true);
});

test("A HARD MISMATCH IS REVIEWABLE, BUT IT IS NOT TREATED THE SAME", () => {
  // Not blocked - blocking it was the defect - but a reviewer approving one
  // is told plainly that the bank named a different person, not a different
  // spelling.
  const severe = bankNameReviewOptions({
    employeeName: "Ramesh Kumar",
    bank: {
      masked_account: "XXXXXX6789",
      ifsc: "HDFC0001234",
      bank_name: "HDFC Bank",
      verification: { name_at_bank: "PRIYA SHARMA", name_match_verdict: "MISMATCH" },
    },
  });
  assert.strictEqual(severe.severe, true);
  assert.match(severe.approveWarning, /different person/);

  const near = bankNameReviewOptions({
    employeeName: "Ramesh Kumar",
    bank: { verification: { name_at_bank: "R KUMAR", name_match_verdict: "REVIEW" } },
  });
  assert.strictEqual(near.severe, false);
  assert.ok(!/different person/.test(near.approveWarning));
});

test("the review shows both names and the account, and never an account number", () => {
  const options = bankNameReviewOptions({
    employeeName: "Ramesh Kumar",
    bank: {
      masked_account: "XXXXXX6789",
      ifsc: "HDFC0001234",
      bank_name: "HDFC Bank",
      verification: { name_at_bank: "R KUMAR", name_match_verdict: "REVIEW" },
    },
  });
  assert.strictEqual(options.employeeName, "Ramesh Kumar");
  assert.strictEqual(options.nameAtBank, "R KUMAR");
  // Passed through exactly as the API sent it - nothing here reconstructs a
  // full account number, and there is nowhere for one to come from.
  assert.strictEqual(options.maskedAccount, "XXXXXX6789");
  assert.strictEqual(options.ifsc, "HDFC0001234");
  assert.strictEqual(options.verdict, "REVIEW");

  // A status that arrived without a verification must not throw or invent.
  const bare = bankNameReviewOptions({ employeeName: "A", bank: {} });
  assert.strictEqual(bare.nameAtBank, null);
  assert.strictEqual(bare.verdict, null);
  assert.strictEqual(bankNameReviewOptions().nameAtBank, null);
});

test("A REASON IS REQUIRED FOR EITHER DECISION, and whitespace is not a reason", () => {
  // The same three characters the backend requires, so the modal refuses
  // before spending a request rather than after.
  for (const bad of ["", "   ", "no", null, undefined]) {
    assert.strictEqual(bankReviewReasonValid(bad), false, `${JSON.stringify(bad)} is not a reason`);
  }
  assert.strictEqual(bankReviewReasonValid("Passbook checked"), true);
});

test("A REJECTED ACCOUNT IS NOT OFFERED ANOTHER PAID CHECK", () => {
  // A reviewer already looked at this exact account. Another provider call
  // buys the same answer; the way out is to correct the details.
  const rejected = bankActions({ status: "REJECTED", hasAccount: true, isAdmin: true });
  assert.strictEqual(rejected.canVerifyExisting, false);
  // And correcting them is still offered.
  assert.strictEqual(
    bankActions({ status: "REJECTED", hasAccount: true, isAdmin: true, canEditSensitive: true })
      .canEditDetails,
    true
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

/* ================================= C3: the list status-summary columns == */
const { aadhaarListBadge, bankListBadge, statusSummaryIndex } = require("./hrStatus");

test("the bank list badge reads operationally, one word per outcome", () => {
  assert.strictEqual(bankListBadge("VERIFIED", true).label, "Ready");
  assert.strictEqual(bankListBadge("NOT_PROVIDED", false).label, "Pending");
  assert.strictEqual(bankListBadge("PENDING", false).label, "Pending");
  assert.strictEqual(bankListBadge("NAME_MISMATCH", false).label, "Review");
  assert.strictEqual(bankListBadge("DUPLICATE_ACCOUNT", false).label, "Duplicate");
  assert.strictEqual(bankListBadge("FAILED", false).label, "Failed");
});

test("A DUPLICATE AND A FAILURE READ RED; ONLY A READY ACCOUNT READS GREEN", () => {
  assert.strictEqual(bankListBadge("DUPLICATE_ACCOUNT", false).colorScheme, "red");
  assert.strictEqual(bankListBadge("FAILED", false).colorScheme, "red");
  assert.strictEqual(bankListBadge("VERIFIED", true).colorScheme, "green");
  for (const s of ["NOT_PROVIDED", "PENDING", "NAME_MISMATCH", "DUPLICATE_ACCOUNT", "FAILED"]) {
    assert.notStrictEqual(bankListBadge(s, false).colorScheme, "green", `${s} must not read green`);
  }
});

test("NOT KNOWN IS NOT THE SAME AS NOT VERIFIED", () => {
  // The summary has not loaded, or was refused. Saying "Pending" would send
  // HR chasing 630 employees who may be perfectly fine.
  for (const missing of [undefined, null, ""]) {
    assert.strictEqual(bankListBadge(missing, false).label, "—");
    assert.strictEqual(bankListBadge(missing, false).unknown, true);
    assert.strictEqual(aadhaarListBadge(missing).label, "—");
    assert.strictEqual(aadhaarListBadge(missing).unknown, true);
  }
});

test("a known Aadhaar status still reads Verified or Pending", () => {
  assert.strictEqual(aadhaarListBadge("VERIFIED").label, "Verified");
  assert.strictEqual(aadhaarListBadge("PENDING").label, "Pending");
});

test("VERIFIED without readiness is never rendered as Ready", () => {
  // The backend derives one from the other so this should not occur; if it
  // ever does, the list must not tell anyone they can be paid.
  const b = bankListBadge("VERIFIED", false);
  assert.notStrictEqual(b.label, "Ready");
  assert.notStrictEqual(b.colorScheme, "green");
});

test("a status this build has never heard of is not quietly Ready", () => {
  assert.notStrictEqual(bankListBadge("SOMETHING_NEW", true).label, "Ready");
});

test("the summary merges by employee_id", () => {
  const index = statusSummaryIndex([
    { employee_id: 631, aadhaar_status: "VERIFIED", bank_status: "VERIFIED", bank_payroll_ready: true },
    { employee_id: 632, aadhaar_status: "PENDING", bank_status: "NOT_PROVIDED", bank_payroll_ready: false },
  ]);
  assert.strictEqual(index["631"].aadhaar_status, "VERIFIED");
  assert.strictEqual(index["631"].bank_payroll_ready, true);
  assert.strictEqual(index["632"].bank_status, "NOT_PROVIDED");
  assert.strictEqual(index["632"].bank_payroll_ready, false);
  // An employee the summary did not mention is simply unknown.
  assert.strictEqual(index["999"], undefined);
});

test("A REFUSED OR BROKEN SUMMARY IS AN EMPTY INDEX, NEVER A THROW", () => {
  // The employee list is useful without status columns and useless if a
  // status request can stop it rendering.
  for (const bad of [null, undefined, { code: 403, msg: "You do not have permission" }, "nonsense", 42]) {
    assert.deepStrictEqual(statusSummaryIndex(bad), {});
  }
  assert.deepStrictEqual(statusSummaryIndex([null, { no_id: 1 }, { employee_id: null }]), {});
});

test("the index carries the three status fields and nothing else", () => {
  const index = statusSummaryIndex([
    {
      employee_id: 1,
      aadhaar_status: "VERIFIED",
      bank_status: "VERIFIED",
      bank_payroll_ready: true,
      // Nothing like this is returned by the endpoint, and if it ever were,
      // it must not reach a component through here.
      account_last4: "6789",
      aadhaar_last4: "4321",
    },
  ]);
  assert.deepStrictEqual(Object.keys(index["1"]).sort(), [
    "aadhaar_status",
    "bank_payroll_ready",
    "bank_status",
  ]);
});

test("the HR-onboarding flag is carried through only when the server sent one", () => {
  // An older server, or one that cannot derive it, omits the key. That must
  // read as "not known" and never as "nothing outstanding" - the badge shows
  // nothing at all for the first and "Complete" for the second.
  const index = statusSummaryIndex([
    {
      employee_id: 1,
      aadhaar_status: "PENDING",
      bank_status: "NOT_PROVIDED",
      bank_payroll_ready: false,
      hr_onboarding_pending: true,
      hr_onboarding_missing: ["statutory", "bank"],
    },
    { employee_id: 2, aadhaar_status: "VERIFIED", bank_status: "VERIFIED", bank_payroll_ready: true },
  ]);
  assert.strictEqual(index["1"].hr_onboarding_pending, true);
  assert.deepStrictEqual(index["1"].hr_onboarding_missing, ["statutory", "bank"]);
  assert.ok(!("hr_onboarding_pending" in index["2"]), "an absent flag is absent, not false");
  assert.ok(!("hr_onboarding_missing" in index["2"]));
});
