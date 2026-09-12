import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Divider,
  FormControl,
  FormErrorMessage,
  FormLabel,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import SalaryBreakup from "./SalaryBreakup";
import { presentQueueDetail, presentQueueRow } from "../../util/salaryApprovalQueue";

/**
 * M4 — one pending proposal, as an approver reads it.
 *
 * THERE IS NO EDIT CONTROL ON THIS CARD, AND THAT IS THE DESIGN. If a
 * submitted salary is wrong, the approver REJECTS it with a reason and the
 * salary-entry user corrects it on Salary Revision & History. An approver who
 * could also amend a figure would be able to rewrite a proposal and agree to
 * it in the same visit — the four-eyes rule defeated from the other end,
 * leaving an audit trail that names one person twice and flags nothing.
 *
 * SO THE ONLY TWO ACTIONS ARE APPROVE AND REJECT. No gross field, no component
 * field, no effective-date picker, no reason to re-type except the rejection's
 * own.
 *
 * A REJECTION NEEDS A REASON, and the field is required here as well as on the
 * server. It is the one piece of writing an approver does, and a refusal
 * nobody explained is a proposal that will be re-submitted unchanged.
 *
 * OWN PROPOSALS ARE SHOWN, EXPLAINED, AND NOT APPROVABLE. `own_proposal` is
 * the server's own answer, and the server refuses the approval regardless of
 * what this card does with it. Reject stays available: withdrawing your own
 * proposal is a normal thing to need, and only self-APPROVAL is blocked.
 */
function PendingProposalCard({ item, canApprove, canReject, onApprove, onReject, busy }) {
  const row = presentQueueRow(item);
  const detail = presentQueueDetail(item);

  const [open, setOpen] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(null);

  if (!row) return null;

  const submitRejection = () => {
    if (reason.trim() === "") {
      setReasonError("A reason is required to reject a salary revision.");
      return;
    }
    setReasonError(null);
    onReject(row.salary_id, reason.trim());
  };

  return (
    <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white" p={3}>
      {/* ------------------------------------------------------ who and where */}
      <Stack direction="row" align="center" spacing={2} flexWrap="wrap">
        <Badge colorScheme="purple" fontSize="10px">
          {row.employee_id}
        </Badge>
        <Text fontSize="sm" fontWeight="bold">
          {row.employee_name || "Name not recorded"}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {row.outlet_name || "Outlet not recorded"}
          {" · "}
          {row.designation_name || "Designation not recorded"}
        </Text>
        <Badge variant="outline" colorScheme="gray" fontSize="9px">
          {row.source_label}
        </Badge>
        {row.manual_override ? (
          <Badge colorScheme="purple" fontSize="9px">
            Manual breakup
          </Badge>
        ) : null}
      </Stack>

      {/* ------------------------------------------------- from what, to what */}
      <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3} mt={3}>
        <Box minW="0">
          <Text fontSize="10px" textTransform="uppercase" color="gray.500">
            Current Gross
          </Text>
          <Text fontSize="sm" color="gray.800">
            {/* An opening salary has nothing to compare against, and the card
                says so rather than printing ₹0.00. */}
            {row.is_opening ? "No approved salary yet" : row.current_monthly_gross}
          </Text>
        </Box>
        <Box minW="0">
          <Text fontSize="10px" textTransform="uppercase" color="gray.500">
            Proposed Gross
          </Text>
          <Text fontSize="sm" fontWeight="bold" color="gray.800">
            {row.proposed_monthly_gross}
          </Text>
        </Box>
        <Box minW="0">
          <Text fontSize="10px" textTransform="uppercase" color="gray.500">
            Difference
          </Text>
          {row.difference ? (
            <Text fontSize="sm" fontWeight="medium" color={row.difference.tone}>
              {row.difference.amount}
              {row.difference.percentage ? ` (${row.difference.percentage})` : ""}
            </Text>
          ) : (
            <Text fontSize="sm" color="gray.500">
              —
            </Text>
          )}
        </Box>
        <Box minW="0">
          <Text fontSize="10px" textTransform="uppercase" color="gray.500">
            Effective From
          </Text>
          <Text fontSize="sm" color="gray.800">
            {row.effective_from}
          </Text>
        </Box>
      </SimpleGrid>

      {row.revision_reason ? (
        <Text fontSize="xs" color="gray.700" mt={2}>
          <Text as="span" color="gray.500">
            Reason:{" "}
          </Text>
          {row.revision_reason}
        </Text>
      ) : null}

      <Text fontSize="10px" color="gray.500" mt={1}>
        Raised by {row.created_by_name || (row.created_by ? `Employee ${row.created_by}` : "not recorded")}
        {row.audit && row.audit[0] && row.audit[0].at ? ` on ${row.audit[0].at}` : ""}
      </Text>

      {/* ------------------------------------------------------ the detail -- */}
      <Stack direction="row" spacing={2} mt={3} flexWrap="wrap">
        <Button size="xs" variant="ghost" colorScheme="purple" onClick={() => setOpen(!open)}>
          {open ? "Hide full breakup" : "Review full breakup"}
        </Button>
      </Stack>

      {open && detail ? (
        <Stack spacing={3} mt={3}>
          <Divider />
          <SalaryBreakup view={detail.proposed} compact />
          {row.manual_override ? (
            <Box>
              <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                Manual override reason
              </Text>
              <Text fontSize="sm" color="gray.800">
                {row.override_reason || "not recorded"}
              </Text>
            </Box>
          ) : null}
          {detail.current ? (
            <Text fontSize="xs" color="gray.600">
              Replacing {detail.current.monthly_gross} effective {detail.current.effective_from}.
            </Text>
          ) : null}
        </Stack>
      ) : null}

      {/* ---------------------------------------------------- the decision -- */}
      <Divider my={3} />

      {row.own_proposal ? (
        <Alert status="info" fontSize="xs" mb={2}>
          <AlertIcon />
          You raised this proposal, so you cannot approve it — it needs a different approver. You
          can still reject it to withdraw it.
        </Alert>
      ) : null}

      {rejecting ? (
        <Stack spacing={2}>
          <FormControl isInvalid={Boolean(reasonError)} isRequired>
            <FormLabel fontSize="xs">Rejection Reason</FormLabel>
            <Textarea
              size="sm"
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this proposal being refused?"
            />
            <FormErrorMessage fontSize="xs">{reasonError}</FormErrorMessage>
          </FormControl>
          <Stack direction="row" spacing={2}>
            <Button size="sm" colorScheme="red" onClick={submitRejection} isLoading={busy} loadingText="Rejecting">
              Confirm rejection
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setRejecting(false);
                setReason("");
                setReasonError(null);
              }}
              isDisabled={busy}
            >
              Cancel
            </Button>
          </Stack>
        </Stack>
      ) : (
        <Stack direction="row" spacing={2}>
          <Button
            size="sm"
            colorScheme="green"
            onClick={() => onApprove(row.salary_id)}
            isLoading={busy}
            loadingText="Approving"
            isDisabled={!canApprove || row.own_proposal || busy}
          >
            Approve
          </Button>
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            onClick={() => setRejecting(true)}
            isDisabled={!canReject || busy}
          >
            Reject
          </Button>
        </Stack>
      )}
    </Box>
  );
}

export default PendingProposalCard;
