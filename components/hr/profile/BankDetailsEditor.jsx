import React, { useState } from "react";
import { Alert, AlertIcon, Button, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../../CustomModal";
import { EditField, FieldGrid } from "./SectionCard";

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
 * was run against and compares it on every read, so a new account is
 * PENDING until somebody spends a verification on it. The modal says so
 * before the change, not after.
 *
 * Sensitive under B3 - `account_no`, `ifsc` and `bank_name` all are - so this
 * is only ever rendered for a caller who may edit them, and it saves through
 * POST /employee/updatedata.
 */
function BankDetailsEditor({ isOpen, onClose, bank = {}, onSave, saving }) {
  const [form, setForm] = useState({ account_no: "", ifsc: "", bank_name: "" });
  const [error, setError] = useState(null);

  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const close = () => {
    setForm({ account_no: "", ifsc: "", bank_name: "" });
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    const account = String(form.account_no || "").replace(/[\s-]/g, "");
    const ifsc = String(form.ifsc || "").replace(/\s/g, "").toUpperCase();

    // Refused here rather than by the provider: a half-entered account is a
    // stored value that silently fails every future verification.
    if (!/^\d{6,20}$/.test(account)) {
      setError("Enter the account number as digits only, between 6 and 20 of them.");
      return;
    }
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      setError("That IFSC does not look right. It is 4 letters, a zero, then 6 characters.");
      return;
    }

    const ok = await onSave({
      account_no: account,
      ifsc,
      bank_name: String(form.bank_name || "").trim(),
    });
    if (ok) close();
  };

  const footer = (
    <>
      <Button variant="ghost" mr={3} size="sm" onClick={close} isDisabled={saving}>
        Cancel
      </Button>
      <Button colorScheme="purple" size="sm" onClick={submit} isLoading={saving}>
        Save bank details
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
          The account number is stored for payroll and is never displayed in full again — only its
          last four digits.
        </Text>
      </Stack>
    </CustomModal>
  );
}

export default BankDetailsEditor;
