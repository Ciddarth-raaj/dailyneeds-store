/**
 * Stage 0C / C3 — how HR screens read the backend's status values.
 *
 * Every decision the HR UI makes about what to show and which action to offer
 * lives here as a pure function, for two reasons. There is no React test
 * runner in this repo, so logic left inside a component is logic that cannot
 * be tested; and these rules mirror backend rules that must not drift - a
 * MISMATCH that became confirmable in the UI would be a real defect even
 * though the backend would still refuse it.
 *
 * NOTHING HERE INVENTS AUTHORITY. The backend remains the only enforcement.
 * These helpers decide what to *offer*, so that HR is not shown a button that
 * is certain to fail.
 */

/* ------------------------------------------------------------- Aadhaar -- */

/**
 * VERIFIED or PENDING, and nothing else. PENDING is the absence of an Aadhaar,
 * not a stored state, so an employee who predates C2 reads PENDING correctly
 * with no backfill.
 */
function aadhaarBadge(status) {
  return String(status).toUpperCase() === "VERIFIED"
    ? { label: "Verified", colorScheme: "green" }
    : { label: "Pending", colorScheme: "orange" };
}

/** Aadhaar is preferred, never required: creation is never blocked by it. */
const aadhaarBlocksCreate = () => false;

/**
 * What the OTP result tells HR to do next. The backend already decided this
 * (`next_action`); this maps it to a sentence and a button rather than
 * re-deriving it.
 */
function aadhaarOutcome(decision) {
  if (!decision) return null;
  const action = decision.next_action;
  if (action === "already_employed") {
    return {
      kind: "already_employed",
      tone: "error",
      employeeId: decision.existing_employee && decision.existing_employee.employee_id,
      title: "This Aadhaar already belongs to a current employee",
      detail:
        "Do not create a second record. Open that employee instead - one person keeps one employee ID for life.",
      cta: "Open employee",
    };
  }
  if (action === "rejoin") {
    const existing = decision.existing_employee || {};
    return {
      kind: "rejoin",
      tone: "warning",
      employeeId: existing.employee_id,
      lastEndedOn: existing.last_ended_on || null,
      title: `This person already has employee ID ${existing.employee_id}`,
      detail: existing.last_ended_on
        ? `They left on ${existing.last_ended_on}. Use Rejoin on that ID rather than creating a new one.`
        : "They have left. Use Rejoin on that ID rather than creating a new one.",
      cta: "Rejoin this employee",
    };
  }
  return {
    kind: "create",
    tone: "success",
    title: "Aadhaar verified",
    detail: "No existing employee holds this Aadhaar. Continue creating the employee.",
    cta: "Continue",
  };
}

/* ---------------------------------------------------------------- bank -- */

const BANK_BADGES = {
  NOT_PROVIDED: { label: "No account", colorScheme: "gray" },
  PENDING: { label: "Not verified", colorScheme: "orange" },
  VERIFIED: { label: "Verified", colorScheme: "green" },
  NAME_MISMATCH: { label: "Name needs review", colorScheme: "yellow" },
  DUPLICATE_ACCOUNT: { label: "Duplicate account", colorScheme: "red" },
  // A reviewer looked at the mismatch and turned the account down. Red, and
  // not "Failed": the check itself succeeded, a person decided against it.
  REJECTED: { label: "Rejected", colorScheme: "red" },
  FAILED: { label: "Failed", colorScheme: "red" },
};

function bankBadge(status) {
  return BANK_BADGES[String(status).toUpperCase()] || BANK_BADGES.PENDING;
}

/** Shown wherever a status is genuinely not known yet, rather than known-bad. */
const UNKNOWN_BADGE = { label: "—", colorScheme: "gray", unknown: true };

/**
 * The employee LIST's version of the bank badge: shorter, and operational
 * rather than descriptive. On a list of 630 people the question is "can this
 * person be paid, and if not who do I have to chase", so the labels answer
 * that in one word.
 *
 *   VERIFIED and payroll ready   Ready
 *   NOT_PROVIDED / PENDING       Pending      HR chases the employee
 *   NAME_MISMATCH               Review       an authorised user decides
 *   DUPLICATE_ACCOUNT           Duplicate    probably a typo; an admin decides
 *   REJECTED                    Rejected     a reviewer turned the account down
 *   FAILED                      Failed       the bank said no
 *
 * `undefined` is not a status. When the summary has not loaded, or could not
 * be loaded, this says so with a neutral dash instead of guessing Pending -
 * "not verified" and "not known" are different facts, and only one of them
 * is somebody's job.
 *
 * VERIFIED without readiness cannot happen (the backend derives one from the
 * other) but is deliberately not rendered as Ready if it ever does: claiming
 * somebody can be paid is the one mistake worth being cautious about.
 */
function bankListBadge(status, payrollReady) {
  if (status === undefined || status === null || status === "") return UNKNOWN_BADGE;

  switch (String(status).toUpperCase()) {
    case "VERIFIED":
      return payrollReady
        ? { label: "Ready", colorScheme: "green" }
        : { label: "Review", colorScheme: "yellow" };
    case "NOT_PROVIDED":
    case "PENDING":
      return { label: "Pending", colorScheme: "orange" };
    case "NAME_MISMATCH":
      return { label: "Review", colorScheme: "yellow" };
    case "DUPLICATE_ACCOUNT":
      return { label: "Duplicate", colorScheme: "red" };
    case "REJECTED":
      return { label: "Rejected", colorScheme: "red" };
    case "FAILED":
      return { label: "Failed", colorScheme: "red" };
    default:
      // A status this build has never heard of is not quietly Ready.
      return { label: "Review", colorScheme: "yellow" };
  }
}

/** The list's Aadhaar badge, with the same "not known is not Pending" rule. */
function aadhaarListBadge(status) {
  if (status === undefined || status === null || status === "") return UNKNOWN_BADGE;
  return aadhaarBadge(status);
}

/**
 * Index a status-summary response by employee_id, for merging into a list.
 *
 * A failed or refused summary is an empty index, never a thrown error: the
 * employee list is useful without status columns and useless if it does not
 * render, so the columns degrade and the list does not.
 */
function statusSummaryIndex(summary) {
  const index = {};
  if (!Array.isArray(summary)) return index;
  for (const row of summary) {
    if (!row || row.employee_id === undefined || row.employee_id === null) continue;
    const entry = {
      aadhaar_status: row.aadhaar_status,
      bank_status: row.bank_status,
      bank_payroll_ready: Boolean(row.bank_payroll_ready),
    };
    // The HR-onboarding flag is DERIVED by the backend from the statutory and
    // bank sections, and a server that cannot derive it omits it. Carried
    // through only when it is actually there, so "not answered" stays
    // distinguishable from "nothing outstanding" - the badge shows nothing at
    // all for the first and "Complete" for the second.
    if (row.hr_onboarding_pending !== undefined && row.hr_onboarding_pending !== null) {
      entry.hr_onboarding_pending = Boolean(row.hr_onboarding_pending);
      entry.hr_onboarding_missing = Array.isArray(row.hr_onboarding_missing)
        ? row.hr_onboarding_missing
        : [];
    }
    index[String(row.employee_id)] = entry;
  }
  return index;
}

/**
 * A one-line explanation of what HR should do about the current bank state.
 * Deliberately actionable rather than descriptive: "Not verified" tells HR
 * nothing they cannot see from the badge.
 */
function bankGuidance(status, verdict) {
  switch (String(status).toUpperCase()) {
    case "NOT_PROVIDED":
      return "Add an account number and IFSC on this employee, then verify.";
    case "PENDING":
      return "The account on file has not been verified since it was last changed.";
    case "VERIFIED":
      return "The account exists and the name matches. Ready for payroll.";
    case "NAME_MISMATCH":
      // BOTH VERDICTS SEND THE READER TO THE SAME PLACE: Review. Saying "it
      // cannot be accepted" beside no action was the old dead end, and a hard
      // mismatch is routinely a maiden name or a joint account rather than
      // the wrong person.
      return verdict === "MISMATCH"
        ? "The bank returned a different name. Review it: approve it as the same person with a reason, correct the details, or reject the account."
        : "The name is close but not identical. Review it before this employee can be paid by bank transfer.";
    case "DUPLICATE_ACCOUNT":
      return "Another employee who is still working is already verified against this same account. Check for a typo before an administrator allows it.";
    case "REJECTED":
      return "A reviewer rejected this account, so it cannot be paid to. Enter the correct details and verify again.";
    case "FAILED":
      return "The last check did not succeed. Review the details and try again.";
    default:
      return "";
  }
}

/**
 * May THIS user be offered the name-mismatch REVIEW?
 *
 * BOTH VERDICTS QUALIFY, and that is the change. The old rule excluded a
 * MISMATCH because the backend refused to confirm one - which was true, and
 * left the screen stating a rule beside no action at all for exactly the
 * employees who most needed one. A bank returning a maiden name, a joint
 * holder's name, or a different transliteration all arrive as MISMATCH.
 *
 * The review is the way out for both: approve as the same person with a
 * stated reason, correct the details, or reject the account. What the verdict
 * still changes is how loudly the screen says to be careful - see
 * `bankNameReviewOptions` - not whether anybody may look.
 *
 * An admin reaches this through the `user_type = 2` bypass the backend
 * applies, the same as everywhere else.
 */
function canReviewBankName({ status, permissions = [], isAdmin = false }) {
  if (String(status).toUpperCase() !== "NAME_MISMATCH") return false;
  if (isAdmin) return true;
  return has(permissions, "confirm_bank_name_mismatch") && has(permissions, "view_employee_sensitive");
}

/**
 * What the review modal shows, and what it must ask for.
 *
 * The facts a reviewer needs in order to decide are the ones the old
 * confirmation dialog left out: who the employee is according to HR, who the
 * bank says the account belongs to, which account is being talked about, and
 * what the comparison actually concluded. Everything here is already on the
 * status response - no account number is reconstructed, and the masked value
 * is passed through exactly as the API sent it.
 *
 * `severe` is the one thing the verdict still decides. A hard MISMATCH is not
 * blocked, but a reviewer approving one should be told plainly that the bank
 * named a different person, rather than being walked through the same wording
 * as a near-miss spelling.
 */
function bankNameReviewOptions({ employeeName, bank = {} } = {}) {
  const verification = bank.verification || {};
  const verdict = String(verification.name_match_verdict || "").toUpperCase();
  const severe = verdict === "MISMATCH";
  return {
    employeeName: employeeName || null,
    nameAtBank: verification.name_at_bank || null,
    maskedAccount: bank.masked_account || null,
    ifsc: bank.ifsc || null,
    bankName: bank.bank_name || null,
    verdict: verdict || null,
    severe,
    verdictLabel: severe
      ? "The bank returned a different name"
      : "The name is close but not identical",
    approveWarning: severe
      ? "The bank named a different person, not a different spelling. Approve this only if you have seen evidence that the account is genuinely theirs - a passbook, a cheque leaf, or a bank letter."
      : "Approve only if you are satisfied the account belongs to this employee.",
  };
}

/**
 * A review reason has to be a reason.
 *
 * The backend requires three characters for either decision; asking for the
 * same thing here means the modal refuses before spending a request, and
 * means the two cannot drift into disagreeing about what counts as stated.
 */
function bankReviewReasonValid(reason) {
  return String(reason === null || reason === undefined ? "" : reason).trim().length >= 3;
}

/**
 * May this user be offered the duplicate-account override?
 *
 * Granted to nobody by design, so in practice this is an administrator
 * through the user_type 2 bypass. Holding `confirm_bank_name_mismatch` is
 * explicitly NOT enough - a different decision by a different person.
 */
function canOverrideDuplicateBank({ status, permissions = [], isAdmin = false }) {
  if (String(status).toUpperCase() !== "DUPLICATE_ACCOUNT") return false;
  if (isAdmin) return true;
  return (
    has(permissions, "override_duplicate_bank_account") && has(permissions, "view_employee_sensitive")
  );
}

/** May this user run the paid Penny-Less check? */
function canVerifyBank({ permissions = [], isAdmin = false }) {
  if (isAdmin) return true;
  return has(permissions, "verify_employee_bank") && has(permissions, "view_employee_sensitive");
}

/**
 * Which bank actions to offer, given the backend's own status.
 *
 * One place, so the card and the editor cannot disagree about what the next
 * step is - and so the permission rules are stated once. It composes
 * `canVerifyBank` rather than restating it.
 *
 * THE STATUS IS THE BACKEND'S, AND IS NOT SECOND-GUESSED. In particular
 * staleness is already folded in: `resolveEffectiveStatus` downgrades a
 * verification whose fingerprint no longer matches the stored account to
 * PENDING, with `bank_payroll_ready` false. So "changed account needs
 * verifying again" needs no rule here - it arrives as PENDING like any other
 * unverified account, which is exactly why a changed account can never carry
 * the old VERIFIED forward.
 *
 * `canVerifyExisting` is deliberately false for VERIFIED. A healthy verified
 * account should not invite another paid provider call as part of normal work;
 * re-verification happens because the account CHANGED, and a changed account is
 * no longer VERIFIED.
 */
function bankActions({
  status,
  hasAccount,
  permissions = [],
  isAdmin = false,
  canEditSensitive = false,
}) {
  const s = String(status || "").toUpperCase();
  const mayVerify = canVerifyBank({ permissions, isAdmin });
  const account = Boolean(hasAccount);

  return {
    // Adding and changing are the same editor and the same B3 permission; only
    // the wording differs, because changing an account has consequences that
    // adding one does not.
    canEditDetails: Boolean(canEditSensitive),
    editLabel: account ? "Change Bank Details" : "Add Bank Details",

    // Verify what is already stored - no re-entry. Only where there is
    // something to verify, only for somebody who may, and never for an account
    // that is already healthy.
    //
    // REJECTED is excluded for the opposite reason to VERIFIED: a reviewer
    // has already looked at this exact account and turned it down, so another
    // paid call would buy the same answer. The way out of REJECTED is to
    // enter the correct details, which re-fingerprints the account and brings
    // Verify back on its own.
    canVerifyExisting:
      mayVerify && account && s !== "NOT_PROVIDED" && s !== "VERIFIED" && s !== "REJECTED",

    // Inside the editor: save, then verify, in one action. Needs both
    // permissions; with only the sensitive-edit one the editor saves and stops,
    // rather than offering a button that would predictably 403.
    editorVerifies: Boolean(canEditSensitive) && mayVerify,
  };
}

/* ----------------------------------------------------------- lifecycle -- */

/** Active employees resign; inactive ones rejoin. Never both. */
function lifecycleActions({ isActive, permissions = [], isAdmin = false }) {
  return {
    canResign: Boolean(isActive) && (isAdmin || has(permissions, "employee_resign")),
    canRejoin: !isActive && (isAdmin || has(permissions, "employee_rejoin")),
  };
}

/**
 * Rejoin needs the previous period's end date only when the backend does not
 * already know it - the 93 historical rows with an unknown end. Asking for it
 * unconditionally would be noise; inventing it would be worse.
 */
function rejoinNeedsPreviousEnd(lifecycle) {
  if (!lifecycle || !Array.isArray(lifecycle.periods) || lifecycle.periods.length === 0) {
    return false;
  }
  const latest = lifecycle.periods[lifecycle.periods.length - 1];
  return latest.period_state === "closed" && !latest.ended_on;
}

/* -------------------------------------------------- duplicate warning -- */

const CONFIDENCE = {
  high: { label: "Very likely the same person", colorScheme: "red" },
  medium: { label: "Possibly the same person", colorScheme: "orange" },
  low: { label: "Similar name only", colorScheme: "gray" },
};

const confidenceBadge = (confidence) => CONFIDENCE[String(confidence).toLowerCase()] || CONFIDENCE.low;

/**
 * The duplicate check is ADVISORY. This returns what to show, and always
 * permits the create - `blocking` is false in every branch, deliberately, so
 * that a fuzzy name match can never stop HR hiring somebody.
 */
function duplicateSummary(result) {
  if (!result || !result.possible_duplicates || !Array.isArray(result.matches) || result.matches.length === 0) {
    return { show: false, blocking: false, matches: [], rejoinable: [] };
  }
  const matches = result.matches;
  const rejoinable = matches.filter((m) => m.suggested_action === "rejoin");
  return {
    show: true,
    blocking: false,
    matches,
    rejoinable,
    heading: "Possible existing employee found. Review before creating a new employee ID.",
    // The inactive ones are the important half: that is where a second
    // employee ID would otherwise be created for somebody who should rejoin.
    subheading: rejoinable.length
      ? "One of these has left. If it is the same person, use Rejoin rather than creating a new record."
      : "These employees are still working. Check this is not the same person.",
  };
}

/* ------------------------------------------------------------- shared -- */

const has = (permissions, key) =>
  Array.isArray(permissions) && permissions.some((p) => (p && p.permission_key) === key);

/** Employment status as the list and profile show it. */
const employmentBadge = (status) =>
  Number(status) === 1
    ? { label: "Active", colorScheme: "green" }
    : { label: "Resigned", colorScheme: "gray" };

module.exports = {
  aadhaarBadge,
  aadhaarListBadge,
  aadhaarBlocksCreate,
  aadhaarOutcome,
  bankBadge,
  bankListBadge,
  statusSummaryIndex,
  bankGuidance,
  canReviewBankName,
  bankNameReviewOptions,
  bankReviewReasonValid,
  canOverrideDuplicateBank,
  canVerifyBank,
  bankActions,
  lifecycleActions,
  rejoinNeedsPreviousEnd,
  confidenceBadge,
  duplicateSummary,
  employmentBadge,
  has,
};
