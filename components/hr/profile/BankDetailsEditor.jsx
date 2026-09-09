import React, { useRef, useState } from "react";
import { Alert, AlertIcon, Button, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../../CustomModal";
import { EditField, FieldGrid } from "./SectionCard";
import { bankGuidance } from "../../../util/hrStatus";

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
  const [form, setForm] = useState({ account_no: "", ifsc: "", bank_name: "" });
  const [error, setError] = useState(null);
  /** A save that landed while its verification did not. */
  const [outcome, setOutcome] = useState(null);
  const inFlight = useRef(false);

  const set = (name, value) => {
    // Changing the details is the explicit act that lifts an indeterminate
    // hold: whatever may or may not have been checked, it was not this.
    setOutcome((o) => (o && o.indeterminate ? { ...o, indeterminate: false } : o));
    setForm((f) => ({ ...f, [name]: value }));
  };

  /** An outcome that must not lead straight to another paid check. */
  const held = Boolean(outcome && outcome.indeterminate);

  const close = () => {
    setForm({ account_no: "", ifsc: "", bank_name: "" });
    setError(null);
    setOutcome(null);
    inFlight.current = false;
    onClose();
  };

  /** Local checks, so a half-entered account never reaches the provider. */
  const validated = () => {
    const account = String(form.account_no || "").replace(/[\s-]/g, "");
    const ifsc = String(form.ifsc || "").replace(/\s/g, "").toUpperCase();

    if (!/^\d{6,20}$/.test(account)) {
      setError("Enter the account number as digits only, between 6 and 20 of them.");
      return null;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setError("That IFSC does not look right. It is 4 letters, a zero, then 6 characters.");
      return null;
    }
    return { account_no: account, ifsc, bank_name: String(form.bank_name || "").trim() };
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
        isDisabled={held}
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
          <EditField label="IFSC" name="ifsc" value={form.ifsc} onChange={set} />
          <EditField label="Bank name" name="bank_name" value={form.bank_name} onChange={set} />
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
