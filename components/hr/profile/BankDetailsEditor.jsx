import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AlertIcon, Button, Spinner, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../../CustomModal";
import { EditField, FieldGrid } from "./SectionCard";
import HrHelper from "../../../helper/hr";
import { bankGuidance } from "../../../util/hrStatus";

/** Four letters, a zero, then six alphanumerics - the backend's rule exactly. */
const IFSC_PATTERN = /^[A-Z]{4}0[A-Z0-9]{6}$/;

/** Long enough that typing straight through is one lookup, not eleven. */
const IFSC_DEBOUNCE_MS = 500;

/**
 * Stage 0C / C3 — entering or changing the account C2 verifies against.
 *
 * WHY THIS EXISTS. C2 verifies whatever account is on the employee master; it
 * does not capture one. The only screen that could enter an account number was
 * the old employee form, and removing that left bank verification unusable for
 * every new hire - a verified-nothing. This is the missing half.
 *
 * CHANGING THE ACCOUNT INVALIDATES THE VERIFICATION, and that is by design
 * rather than a side effect worth hiding: C2 fingerprints the account a check
 * was run against and compares it on every read, so a new account is PENDING
 * until somebody spends a verification on it. The modal says so before the
 * change, not after.
 *
 * =========================== SAVE AND VERIFY ARE ONE ACTION, NOT ONE CALL ===
 *
 * For a user who may do both, the primary button saves and then verifies,
 * because "add an account" and "find out whether it is real" are one job and
 * splitting them across two screens is what made this feel unfinished.
 *
 * They remain two BACKEND operations, called in sequence, and that is
 * deliberate: the sensitive update and the paid provider check have different
 * permissions, different audit entries and different failure modes, and fusing
 * them server-side for the sake of one button would make each harder to reason
 * about. The orchestration lives here, where a partial outcome can be
 * explained.
 *
 * The entered account number is NEVER sent to the verification call. That route
 * takes an employee id and reads the stored account server-side, which is what
 * makes the fingerprint meaningful.
 *
 * ============================================== A PARTIAL SUCCESS IS SAID ===
 *
 * If the save succeeds and the verification does not verify, the account IS
 * SAVED. Telling the user the save failed would be a lie that costs them the
 * account number a second time. The modal stays open, says plainly that the
 * details were saved, shows the outcome the backend actually returned, and
 * offers a correction - which saves the corrected details first, then verifies
 * those.
 *
 * ===================================== THE BRANCH CODE FILLS THE FORM IN ====
 *
 * A complete IFSC is resolved to its bank and branch, and both fields are
 * READ-ONLY: they are derived from the code rather than typed beside it, so
 * the bank name stored can never belong to a different branch than the code
 * stored. Editing the code clears them at once, because a resolved name
 * belongs to the code it came from.
 *
 * That lookup is NOT the paid check. It goes to the local IFSC master, which
 * the backend answers from its own table for six months at a time; Sandbox is
 * never called from the browser, and no account number is involved. It is
 * debounced and fires on blur, so typing eleven characters is one request
 * rather than eleven.
 *
 * An unknown code blocks saving, because an account nothing can be paid into
 * is not worth storing. A lookup that could not be MADE does not block, and
 * says so in those words: an outage in a reference lookup is no reason HR
 * cannot record an account, and a correct IFSC must never be called wrong.
 *
 * ============================================ THE PAID CALL IS PROTECTED ====
 *
 * Verification costs money per call. The primary button is disabled for the
 * whole sequence, and an in-flight ref refuses a second submit that slips past
 * a re-render or a double click. Nothing here runs from an effect.
 */
function BankDetailsEditor({
  isOpen,
  onClose,
  bank = {},
  /** Save only. Resolves truthy when the save succeeded. */
  onSave,
  /**
   * Save, then verify the stored account. Resolves:
   *   { saved: true,  verified: true,  status }
   *   { saved: true,  verified: false, status?, message? }  - partial success
   *   { saved: false, message? }                            - nothing saved
   *   { saved: null,  message? }                            - unknown, see page
   */
  onSaveAndVerify,
  /** Whether this user may run the paid check as well as save. */
  canVerify = false,
  saving,
}) {
  const [form, setForm] = useState({ account_no: "", ifsc: "" });
  const [error, setError] = useState(null);
  /** A save that landed while its verification did not. */
  const [outcome, setOutcome] = useState(null);
  const inFlight = useRef(false);

  /**
   * What the branch code resolved to.
   *
   *   idle         nothing to say yet - too short, or just edited
   *   checking     a lookup is in flight
   *   ok           bank_name and branch_name are the provider's or the cache's
   *   invalid      no such branch code. A typo, and correctable
   *   unavailable  the lookup could not be made. NOT a typo
   */
  const [ifscState, setIfscState] = useState({ status: "idle" });
  /** The last code actually looked up, so one code is never looked up twice. */
  const lookedUp = useRef(null);
  const lookupSeq = useRef(0);

  const set = (name, value) => {
    // Changing the details is the explicit act that lifts an indeterminate
    // hold: whatever may or may not have been checked, it was not this.
    setOutcome((o) => (o && o.indeterminate ? { ...o, indeterminate: false } : o));
    if (name === "ifsc") {
      // A RESOLVED BANK AND BRANCH BELONG TO THE CODE THEY CAME FROM. The
      // moment the code changes they are stale, and showing them beside a
      // different code invites saving one bank's name against another's
      // account. They go immediately, not when the next lookup answers.
      setIfscState({ status: "idle" });
    }
    setForm((f) => ({ ...f, [name]: value }));
  };

  /** An outcome that must not lead straight to another paid check. */
  const held = Boolean(outcome && outcome.indeterminate);

  const close = () => {
    setForm({ account_no: "", ifsc: "" });
    setError(null);
    setOutcome(null);
    setIfscState({ status: "idle" });
    lookedUp.current = null;
    inFlight.current = false;
    onClose();
  };

  /** Upper-case, no spaces - the shape the backend keys its master on. */
  const normalIfsc = String(form.ifsc || "").replace(/[\s-]/g, "").toUpperCase();
  const ifscComplete = IFSC_PATTERN.test(normalIfsc);

  /**
   * Resolve a complete branch code to its bank and branch.
   *
   * NOT THE PAID CALL. This is the IFSC master lookup, which the backend
   * answers from its own table for six months at a time; the Penny-Less
   * verification is a different route and is spent only by the primary
   * button. The two must not be confused, which is why nothing here touches
   * `inFlight`.
   *
   * Guarded by `lookedUp` so that a re-render, a blur after a debounce has
   * already fired, or a blur on an unchanged field cannot ask twice.
   */
  const resolveIfsc = useCallback(async (code) => {
    if (!IFSC_PATTERN.test(code) || lookedUp.current === code) return;
    lookedUp.current = code;

    const seq = ++lookupSeq.current;
    setIfscState({ status: "checking" });
    let res;
    try {
      res = await HrHelper.lookupIfsc(code);
    } catch (err) {
      // A failed request is not evidence about the code.
      if (seq === lookupSeq.current) {
        lookedUp.current = null;
        setIfscState({ status: "unavailable", message: "The bank lookup could not be reached." });
      }
      return;
    }
    // A slower earlier lookup must not overwrite a later one.
    if (seq !== lookupSeq.current) return;

    const code_ = res && Number(res.code);
    if (code_ === 200 && res.bank_name && res.branch_name) {
      // `stale` means the backend served its cached row because the provider
      // could not be reached to re-confirm it. It is still the answer - a
      // branch does not move often - so it fills the form and saves normally.
      setIfscState({
        status: "ok",
        bank_name: res.bank_name,
        branch_name: res.branch_name,
        stale: Boolean(res.stale),
      });
      return;
    }
    if (code_ === 404 || code_ === 422) {
      setIfscState({ status: "invalid", message: (res && res.msg) || "Invalid IFSC — please check the code" });
      return;
    }
    // Anything else - provider down, timed out, not configured - leaves the
    // code unjudged, so a correct IFSC is never called wrong.
    //
    // Note what reaching here MEANS: the backend serves its cached row when
    // the provider is unreachable, so this is a code it has never resolved
    // AND cannot resolve now. There is no bank name to be had, which is why
    // it holds the save rather than storing the account with a blank one.
    lookedUp.current = null;
    setIfscState({
      status: "unavailable",
      message: (res && res.msg) || "The bank lookup is unavailable just now.",
    });
  }, []);

  /**
   * Look the code up once it is complete, after a short pause.
   *
   * Debounced rather than per keystroke: eleven characters typed straight
   * through would otherwise be eleven requests, and the first ten of them
   * about codes nobody entered.
   */
  useEffect(() => {
    if (!isOpen || !ifscComplete || lookedUp.current === normalIfsc) return undefined;
    const timer = setTimeout(() => resolveIfsc(normalIfsc), IFSC_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [isOpen, ifscComplete, normalIfsc, resolveIfsc]);

  /** Leaving the field asks immediately rather than waiting out the debounce. */
  const onIfscBlur = () => {
    if (ifscComplete) resolveIfsc(normalIfsc);
  };

  /** Local checks, so a half-entered account never reaches the provider. */
  const validated = () => {
    const account = String(form.account_no || "").replace(/[\s-]/g, "");
    const ifsc = String(form.ifsc || "").replace(/\s/g, "").toUpperCase();

    if (!/^\d{6,20}$/.test(account)) {
      setError("Enter the account number as digits only, between 6 and 20 of them.");
      return null;
    }
    if (!IFSC_PATTERN.test(ifsc)) {
      setError("That IFSC does not look right. It is 4 letters, a zero, then 6 characters.");
      return null;
    }
    if (ifscState.status === "invalid") {
      // The provider says there is no such branch. Saving it would store an
      // account nothing can ever be paid into.
      setError(ifscState.message || "Invalid IFSC — please check the code");
      return null;
    }
    if (ifscState.status === "checking" || ifscState.status === "idle") {
      // `idle` with a complete code means the debounce has not fired yet -
      // pasting a code and clicking straight away. Ask for it now rather than
      // saving an account with no bank name against it.
      if (ifscState.status === "idle") resolveIfsc(ifsc);
      setError("Still checking that IFSC — one moment.");
      return null;
    }
    if (ifscState.status === "unavailable") {
      // Saving now would store an account with no bank name against it, and
      // the record would keep that gap long after the outage ended.
      setError(
        "The bank lookup could not be reached, so the bank name is not known yet. Try again in a moment — the details are not saved without it."
      );
      return null;
    }

    // `bank_name` is whatever the lookup resolved, never anything typed: the
    // field is read-only precisely so that the stored bank name is the one
    // that belongs to the stored branch code. When the lookup could not be
    // made it is left empty rather than guessed.
    return {
      account_no: account,
      ifsc,
      bank_name: ifscState.status === "ok" ? ifscState.bank_name : "",
    };
  };

  const submit = async () => {
    // A second click while the first is still running would spend a second
    // paid verification. `saving` disables the button; this refuses anything
    // that gets past it anyway.
    if (inFlight.current) return;
    // A verification whose fate is unknown must not be repeated on a whim.
    if (held) return;

    setError(null);
    const values = validated();
    if (!values) return;

    inFlight.current = true;
    try {
      if (!canVerify) {
        const ok = await onSave(values);
        if (ok) close();
        return;
      }

      const result = await onSaveAndVerify(values);

      if (result && result.saved && result.verified) {
        // The only path that closes: saved, and the account is real and theirs.
        close();
        return;
      }

      // Everything else keeps the modal open with the account still typed, so
      // a correction is one edit away rather than a re-entry.
      setOutcome(result || { saved: false });
    } finally {
      inFlight.current = false;
    }
  };

  const primaryLabel = canVerify ? "Verify & Save Bank Details" : "Save Bank Details";

  /**
   * The one line under the IFSC field. Small on purpose - the answer is the
   * two filled fields below it; this only says how they got there.
   *
   * "Unavailable" is worded so that nobody reads it as a verdict on the code
   * they typed.
   */
  const ifscHelp = {
    idle: null,
    checking: (
      <Text as="span" color="gray.600">
        <Spinner size="xs" mr={1} /> Checking IFSC…
      </Text>
    ),
    ok: (
      <Text as="span" color={ifscState.stale ? "orange.600" : "green.600"}>
        ✓ {ifscState.bank_name}
        {ifscState.stale ? " — from the saved branch list; the bank lookup could not be reached to re-check it." : ""}
      </Text>
    ),
    invalid: (
      <Text as="span" color="red.600">
        {ifscState.message || "Invalid IFSC — please check the code"}
      </Text>
    ),
    unavailable: (
      <Text as="span" color="orange.600">
        {ifscState.message || "The bank lookup is unavailable just now."} This is not a problem with the
        code — please try again in a moment rather than saving without a bank name.
      </Text>
    ),
  }[ifscState.status];

  /**
   * What holds the primary action.
   *
   *   invalid      the provider says there is no such branch. An account
   *                nothing can be paid into is not worth storing.
   *   checking     worth the half second rather than saving a blank.
   *   unavailable  nothing to fill the bank name in WITH. The backend serves
   *                its cached row whenever the provider is unreachable, so
   *                reaching here means the code has never been resolved and
   *                cannot be now - and saving would put an account on the
   *                employee with no bank name against it, which is the one
   *                outcome worse than asking HR to try again. A cached answer,
   *                stale or not, arrives as `ok` and saves normally.
   */
  const ifscBlocks =
    ifscState.status === "invalid" ||
    ifscState.status === "checking" ||
    ifscState.status === "unavailable";

  const footer = (
    <>
      <Button variant="ghost" mr={3} size="sm" onClick={close} isDisabled={saving}>
        {outcome && outcome.saved ? "Done" : "Cancel"}
      </Button>
      <Button
        colorScheme="purple"
        size="sm"
        onClick={submit}
        isLoading={saving}
        isDisabled={held || ifscBlocks}
      >
        {outcome && outcome.saved ? "Save & verify again" : primaryLabel}
      </Button>
    </>
  );

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={close}
      title={bank.masked_account ? "Change bank details" : "Add bank details"}
      footer={footer}
      size="md"
      isCentered
    >
      <Stack spacing={4}>
        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}

        {/* ------------- saved, but whether a check was spent is unknown */}
        {outcome && outcome.indeterminate ? (
          <Alert status="warning" fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Stack spacing={1}>
              <Text fontWeight="bold">
                The bank details were saved. The check did not report back.
              </Text>
              <Text>{outcome.message}</Text>
              <Text color="gray.600">
                Changing the details above re-enables saving.
              </Text>
            </Stack>
          </Alert>
        ) : null}

        {/* ------------------------------------------- a partial success */}
        {outcome && outcome.saved === true && !outcome.indeterminate ? (
          <Alert status="warning" fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Stack spacing={1}>
              <Text fontWeight="bold">
                The bank details were saved. The verification did not pass.
              </Text>
              {/* The backend's own words, never an invented provider reason. */}
              <Text>
                {outcome.message ||
                  (outcome.status ? bankGuidance(outcome.status, outcome.verdict) : null) ||
                  "The check did not confirm this account."}
              </Text>
              <Text color="gray.600">
                The account above is stored. Correct it and save again if it is wrong, or close
                this and deal with the result on the bank card.
              </Text>
            </Stack>
          </Alert>
        ) : null}

        {outcome && outcome.saved === false ? (
          <Alert status="error" fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Text>
              {outcome.message || "The bank details could not be saved, so nothing was verified."}
            </Text>
          </Alert>
        ) : null}

        {outcome && outcome.saved === null ? (
          <Alert status="warning" fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Text>
              {outcome.message ||
                "The connection failed and it is not certain whether the details were saved. The bank card has been refreshed - check it before trying again."}
            </Text>
          </Alert>
        ) : null}

        {bank.masked_account ? (
          <Alert status="warning" fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Text>
              This employee&apos;s account is currently <strong>{bank.masked_account}</strong>.
              Saving a different account sets the bank status back to <strong>Pending</strong> — the
              existing verification describes the old account and will no longer apply, so the new
              one has to be verified again.
            </Text>
          </Alert>
        ) : null}

        <FieldGrid columns={{ base: 1 }}>
          <EditField
            label="Account number"
            name="account_no"
            value={form.account_no}
            onChange={set}
            help="Digits only. Entered once and never shown again in full."
          />
          <EditField
            label="IFSC"
            name="ifsc"
            value={form.ifsc}
            onChange={set}
            onBlur={onIfscBlur}
            help={ifscHelp}
          />
          {/* Derived, not entered: both come from the branch code above, so
              the bank name stored is always the one that belongs to it. */}
          <EditField
            label="Bank name"
            name="bank_name"
            value={ifscState.status === "ok" ? ifscState.bank_name : ""}
            onChange={() => {}}
            isReadOnly
          />
          <EditField
            label="Branch"
            name="branch_name"
            value={ifscState.status === "ok" ? ifscState.branch_name : ""}
            onChange={() => {}}
            isReadOnly
            help="From the IFSC. Shown to confirm the branch; not stored on the employee."
          />
        </FieldGrid>

        <Text fontSize="xs" color="gray.600">
          {canVerify
            ? "Saving stores the account and then runs the bank check against it. The account number is stored for payroll and is never displayed in full again — only its last four digits."
            : "The account number is stored for payroll and is never displayed in full again — only its last four digits."}
        </Text>
      </Stack>
    </CustomModal>
  );
}

export default BankDetailsEditor;
