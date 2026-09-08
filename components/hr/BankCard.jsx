import React, { useState } from "react";
import {
  Box,
  Button,
  Stack,
  Text,
  Alert,
  AlertIcon,
  Input,
  Textarea,
  useToast,
  Divider,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import { BankBadge } from "./StatusBadges";
import HrHelper from "../../helper/hr";
import {
  bankGuidance,
  canConfirmBankName,
  canOverrideDuplicateBank,
  canVerifyBank,
} from "../../util/hrStatus";

/**
 * Stage 0C / C3 — bank verification on the employee profile.
 *
 * Six states, and the UI has to tell them apart honestly, because two of them
 * look like failure but mean very different things:
 *
 *   NAME_MISMATCH with a REVIEW verdict   a human may accept it
 *   NAME_MISMATCH with a MISMATCH verdict nobody may accept it
 *   DUPLICATE_ACCOUNT                     only an administrator, with a reason
 *
 * The account number is never rendered - only the masked value the API sends.
 * No fingerprint is displayed, and the other employee on a duplicate is named
 * by id and name only, never by their account.
 */
function BankCard({ employeeId, bank, permissions, isAdmin, onChanged }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");

  if (!bank) return null;

  const status = bank.status;
  const verdict = (bank.verification && bank.verification.name_match_verdict) || null;

  const mayVerify = canVerifyBank({ permissions, isAdmin });
  const mayConfirm = canConfirmBankName({ status, verdict, permissions });
  const mayOverride = canOverrideDuplicateBank({ status, permissions, isAdmin });

  const run = async (fn, successTitle) => {
    setBusy(true);
    try {
      const res = await fn();
      if (res && res.code && res.code !== 200) {
        toast({ title: res.msg || "That did not work", status: "error", duration: 6000 });
      } else {
        toast({ title: successTitle, status: "success", duration: 4000 });
        onChanged();
      }
    } catch (err) {
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setBusy(false);
      setConfirmOpen(false);
      setOverrideOpen(false);
      setNote("");
      setReason("");
    }
  };

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Stack spacing={3}>
        <Stack direction="row" align="center" justify="space-between">
          <Text fontWeight="bold">Bank</Text>
          <BankBadge status={status} />
        </Stack>

        <Text fontSize="sm" color="gray.600">
          {bankGuidance(status, verdict)}
        </Text>

        <Stack spacing={1} fontSize="sm">
          {bank.masked_account ? (
            <Text>
              Account <strong>{bank.masked_account}</strong>
              {bank.ifsc ? ` · ${bank.ifsc}` : ""}
              {bank.bank_name ? ` · ${bank.bank_name}` : ""}
            </Text>
          ) : (
            <Text color="gray.500">No account on file.</Text>
          )}
          {bank.verification && bank.verification.name_at_bank ? (
            <Text>
              Name at bank: <strong>{bank.verification.name_at_bank}</strong>
            </Text>
          ) : null}
          <Text color={bank.bank_payroll_ready ? "green.600" : "gray.600"}>
            {bank.bank_payroll_ready
              ? "Ready to be paid by bank transfer."
              : "Not yet ready for payroll by bank transfer."}
          </Text>
          {bank.stale ? (
            <Text color="orange.600">
              The account details changed since the last check, so the previous verification no longer
              applies.
            </Text>
          ) : null}
        </Stack>

        {status === "DUPLICATE_ACCOUNT" && Array.isArray(bank.duplicate_of) && bank.duplicate_of.length ? (
          <Alert status="error" fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Stack spacing={0}>
              <Text fontWeight="bold">Already used by another active employee</Text>
              {bank.duplicate_of.map((d) => (
                <Text key={d.employee_id}>
                  {d.employee_name} (ID {d.employee_id})
                  {d.verified_on ? ` — verified ${d.verified_on}` : ""}
                </Text>
              ))}
            </Stack>
          </Alert>
        ) : null}

        <Divider />

        <Stack direction={{ base: "column", sm: "row" }} spacing={2}>
          {mayVerify ? (
            <Button
              size="sm"
              colorScheme="purple"
              isLoading={busy}
              isDisabled={status === "NOT_PROVIDED"}
              onClick={() => run(() => HrHelper.verifyBank(employeeId), "Bank verification run")}
            >
              {status === "VERIFIED" || status === "FAILED" ? "Re-verify" : "Verify account"}
            </Button>
          ) : null}

          {mayConfirm ? (
            <Button size="sm" variant="outline" colorScheme="yellow" onClick={() => setConfirmOpen(true)}>
              Confirm the name
            </Button>
          ) : null}

          {mayOverride ? (
            <Button size="sm" variant="outline" colorScheme="red" onClick={() => setOverrideOpen(true)}>
              Allow shared account (Admin)
            </Button>
          ) : null}
        </Stack>

        {status === "NAME_MISMATCH" && verdict === "MISMATCH" ? (
          <Text fontSize="xs" color="red.600">
            This one cannot be confirmed by anybody — the bank named a different person.
          </Text>
        ) : null}
      </Stack>

      <CustomModal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Confirm the name at the bank"
        size="md"
        isCentered
        footer={
          <>
            <Button variant="ghost" mr={3} size="sm" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="yellow"
              size="sm"
              isLoading={busy}
              onClick={() => run(() => HrHelper.confirmBankName(employeeId, note), "Name confirmed")}
            >
              Confirm
            </Button>
          </>
        }
      >
        <Stack spacing={3} fontSize="sm">
          <Text>
            The bank returned <strong>{bank.verification && bank.verification.name_at_bank}</strong>, which
            is close to but not identical with this employee&apos;s name. Confirm only if you are satisfied
            the account is theirs.
          </Text>
          <Textarea
            size="sm"
            placeholder="Optional note — what did you check?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </Stack>
      </CustomModal>

      <CustomModal
        isOpen={overrideOpen}
        onClose={() => setOverrideOpen(false)}
        title="Allow two employees to share this account"
        size="md"
        isCentered
        footer={
          <>
            <Button variant="ghost" mr={3} size="sm" onClick={() => setOverrideOpen(false)}>
              Cancel
            </Button>
            <Button
              colorScheme="red"
              size="sm"
              isLoading={busy}
              isDisabled={reason.trim().length < 3}
              onClick={() =>
                run(() => HrHelper.overrideDuplicateBank(employeeId, reason.trim()), "Shared account allowed")
              }
            >
              Allow it
            </Button>
          </>
        }
      >
        <Stack spacing={3} fontSize="sm">
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            This is an exceptional administrator action. It is recorded against your name and cannot be
            done quietly.
          </Alert>
          <Text>
            The usual cause of a duplicate is a mistyped account number. Allow this only for a genuinely
            shared account — a spouse&apos;s account, or a worker with none of their own.
          </Text>
          <Input
            size="sm"
            placeholder="Reason (required)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </Stack>
      </CustomModal>
    </Box>
  );
}

export default BankCard;
