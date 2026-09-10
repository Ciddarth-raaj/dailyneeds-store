import React, { useRef, useState } from "react";
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
  bankActions,
  bankGuidance,
  bankNameReviewOptions,
  bankReviewReasonValid,
  canReviewBankName,
  canOverrideDuplicateBank,
} from "../../util/hrStatus";

/**
 * Stage 0C / C3 — bank verification on the employee profile.
 *
 * Seven states, and the UI has to tell them apart honestly, because several
 * look like failure and mean very different things:
 *
 *   NAME_MISMATCH        an authorised reviewer decides, either way
 *   DUPLICATE_ACCOUNT    only an administrator, with a reason
 *   REJECTED             a reviewer already decided: correct the details
 *   FAILED               the check itself did not complete; retry is sensible
 *
 * THE NAME REVIEW, AND WHAT IT REPLACED. A MISMATCH verdict used to render as
 * a sentence saying it could not be confirmed by anybody - true of the old
 * endpoint, and a dead end on the screen: an employee who could not be paid,
 * and nothing to click. A bank returning a maiden name, a joint holder or a
 * different transliteration all land there and are all resolvable by somebody
 * looking at the account.
 *
 * So both verdicts open the same review, and the review offers the three
 * things a reviewer can actually decide - approve as the same person with a
 * reason, change the details, or reject the account. What the verdict still
 * changes is how firmly the modal warns before an approval, which is
 * `bankNameReviewOptions`' job rather than this component's.
 *
 * NEITHER OUTCOME QUIETLY RELEASES A PAYMENT. An approval is recorded as a
 * bank-name-mismatch override against the reviewer; a rejection leaves the
 * account not payroll-ready. The card goes on reporting `bank_payroll_ready`
 * exactly as the backend computes it.
 *
 * The account number is never rendered - only the masked value the API sends.
 * No fingerprint is displayed, and the other employee on a duplicate is named
 * by id and name only, never by their account.
 */
function BankCard({
  employeeId,
  /** Shown in the review, so a reviewer compares two names rather than one. */
  employeeName,
  bank,
  permissions,
  isAdmin,
  onChanged,
  /** Whether this user may edit the B3 bank fields, and how to open the editor. */
  canEditSensitive = false,
  onEditDetails,
}) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  // `busy` disables the buttons, but only after a re-render. Verification is
  // billed per call, so a second click that lands inside that gap must be
  // refused synchronously - state is too late.
  const inFlight = useRef(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reviewReason, setReviewReason] = useState("");
  const [reason, setReason] = useState("");

  if (!bank) return null;

  const status = bank.status;
  const verdict = (bank.verification && bank.verification.name_match_verdict) || null;

  // One shared decision, so the card and the editor cannot disagree about what
  // the next step is. Staleness needs no rule here: a changed account arrives
  // as PENDING, because `resolveEffectiveStatus` has already refused to let a
  // verification of the OLD account stand for the new one.
  const actions = bankActions({
    status,
    hasAccount: Boolean(bank.masked_account),
    permissions,
    isAdmin,
    canEditSensitive,
  });
  const mayReview = canReviewBankName({ status, permissions, isAdmin });
  const mayOverride = canOverrideDuplicateBank({ status, permissions, isAdmin });
  const review = bankNameReviewOptions({ employeeName, bank });

  const run = async (fn, successTitle) => {
    if (inFlight.current) return;
    inFlight.current = true;
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
      inFlight.current = false;
      setBusy(false);
      setReviewOpen(false);
      setOverrideOpen(false);
      setReviewReason("");
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
          {/* VERIFY WHAT IS ALREADY STORED. No account re-entry: the route
              takes an employee id and reads the account server-side, so an
              employee whose details predate C2 is verified without anybody
              retyping a number they cannot even see. Absent for VERIFIED - a
              healthy account should not invite another paid call - and absent
              when there is no account, where the next step is to add one. */}
          {actions.canVerifyExisting ? (
            <Button
              size="sm"
              colorScheme="purple"
              isLoading={busy}
              onClick={() => run(() => HrHelper.verifyBank(employeeId), "Bank verification run")}
            >
              {status === "FAILED" ? "Retry Verification" : "Verify Bank Details"}
            </Button>
          ) : null}

          {/* Add when there is nothing on file, Change when there is - and for
              NOT_PROVIDED this is the primary action, so it leads. */}
          {actions.canEditDetails && onEditDetails ? (
            <Button
              size="sm"
              variant={status === "NOT_PROVIDED" ? "solid" : "outline"}
              colorScheme={status === "NOT_PROVIDED" ? "purple" : "gray"}
              isDisabled={busy}
              onClick={onEditDetails}
            >
              {actions.editLabel}
            </Button>
          ) : null}

          {/* The way OUT of a name mismatch, for either verdict. Solid rather
              than outline: on a NAME_MISMATCH this is the next step, and the
              employee cannot be paid until somebody takes it. */}
          {mayReview ? (
            <Button size="sm" colorScheme="yellow" isDisabled={busy} onClick={() => setReviewOpen(true)}>
              Review Name Mismatch
            </Button>
          ) : null}

          {mayOverride ? (
            <Button size="sm" variant="outline" colorScheme="red" onClick={() => setOverrideOpen(true)}>
              Allow shared account (Admin)
            </Button>
          ) : null}
        </Stack>

        {/* A mismatch nobody on this screen may review is still not a dead
            end - it is somebody else's decision, and saying whose is more
            use than saying it cannot be done. */}
        {status === "NAME_MISMATCH" && !mayReview ? (
          <Text fontSize="xs" color="orange.700">
            This needs an authorised reviewer — Admin or Payroll — before this employee can be paid
            by bank transfer.
          </Text>
        ) : null}
      </Stack>

      {/* ------------------------------------------- the name-mismatch review
          Everything a reviewer needs in order to decide, on one screen: the
          two names side by side, the account they belong to, and what the
          comparison actually concluded. The old dialog showed the bank's name
          alone and asked for an optional note, which is not enough to decide
          on and not enough to answer for afterwards.

          Three ways out, and Change Bank Details is one of them: a mismatch
          is at least as often a mistyped account as a genuinely different
          person, and sending somebody back to the card to find that button
          would be the same dead end in a smaller form. */}
      <CustomModal
        isOpen={reviewOpen}
        onClose={() => setReviewOpen(false)}
        title="Review the name at the bank"
        size="lg"
        isCentered
        footer={
          <Stack direction={{ base: "column", sm: "row" }} spacing={2} w="100%" justify="flex-end">
            <Button variant="ghost" size="sm" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            {actions.canEditDetails && onEditDetails ? (
              <Button
                size="sm"
                variant="outline"
                isDisabled={busy}
                onClick={() => {
                  setReviewOpen(false);
                  onEditDetails();
                }}
              >
                Change Bank Details
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              colorScheme="red"
              isLoading={busy}
              isDisabled={!bankReviewReasonValid(reviewReason)}
              onClick={() =>
                run(
                  () => HrHelper.reviewBankName(employeeId, "REJECT_ACCOUNT", reviewReason.trim()),
                  "Bank account rejected"
                )
              }
            >
              Reject Bank Account
            </Button>
            <Button
              size="sm"
              colorScheme="yellow"
              isLoading={busy}
              isDisabled={!bankReviewReasonValid(reviewReason)}
              onClick={() =>
                run(
                  () => HrHelper.reviewBankName(employeeId, "APPROVE_SAME_PERSON", reviewReason.trim()),
                  "Approved as the same person"
                )
              }
            >
              Approve as Same Person
            </Button>
          </Stack>
        }
      >
        <Stack spacing={3} fontSize="sm">
          <Stack spacing={1}>
            <Text>
              Employee name: <strong>{review.employeeName || "not recorded"}</strong>
            </Text>
            <Text>
              Name at bank: <strong>{review.nameAtBank || "not returned"}</strong>
            </Text>
            <Text color="gray.600">
              Account {review.maskedAccount || "not on file"}
              {review.ifsc ? ` · ${review.ifsc}` : ""}
              {review.bankName ? ` · ${review.bankName}` : ""}
            </Text>
            <Text color={review.severe ? "red.600" : "orange.700"}>
              Result: {review.verdictLabel}
              {review.verdict ? ` (${review.verdict})` : ""}
            </Text>
          </Stack>

          <Alert status={review.severe ? "error" : "warning"} fontSize="sm" alignItems="flex-start">
            <AlertIcon />
            <Text>{review.approveWarning}</Text>
          </Alert>

          <Text color="gray.600">
            Whichever you choose is recorded against your name with the date, the time and the
            reason below. Approving is recorded as a bank-name-mismatch override.
          </Text>

          <Textarea
            size="sm"
            placeholder="Reason (required) — what did you check, and what did it show?"
            value={reviewReason}
            onChange={(e) => setReviewReason(e.target.value)}
          />
          {!bankReviewReasonValid(reviewReason) ? (
            <Text fontSize="xs" color="gray.500">
              A reason is required before either decision.
            </Text>
          ) : null}
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
