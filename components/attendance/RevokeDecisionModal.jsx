import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import { apiMessage, displayDate, formatOtClock, isOk, levelLabel, roleLabel } from "../../util/attendanceV2";

/**
 * ADMINISTRATORS ONLY: revoke an Attendance or OT request's decision.
 *
 * A revocation VOIDS the request - it becomes CANCELLED and never comes back
 * to a queue. It is not reopened: its approval steps keep their decisions as
 * history. The date is recalculated without it - for OT the approved minutes
 * stop reaching payroll, for an attendance correction the punch stops
 * counting - and the employee can raise a FRESH request for the date, which
 * starts a new approval chain. All of that is stated before it is done,
 * because this screen cannot undo it.
 *
 * THIS IS PRESENTATION. The page only opens it for an administrator on a
 * request the server marked `revocable`; the endpoint checks the account, the
 * request and the payroll lock for itself.
 */
const MIN_REASON = 5;

const Field = ({ label, children }) => (
  <Box>
    <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
      {label}
    </Text>
    <Text as="div" fontSize="sm" fontWeight="600">
      {children}
    </Text>
  </Box>
);

const TYPE_LABEL = { REGULARIZATION: "Attendance", REGULARIZATION_WITH_OT: "Attendance", OT: "OT" };

export default function RevokeDecisionModal({ target, isOpen, onClose, onRevoked }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!target) return null;
  const { row } = target;
  const isOt = row.request_type === "OT";
  // The stage that DECIDED the request, for the confirmation: the rejection,
  // or the last approval. The server works this out for itself.
  const chainSteps = row.chain || [];
  const step =
    chainSteps.find((st) => st.decision === "REJECTED") ||
    [...chainSteps].reverse().find((st) => st.decision === "APPROVED") ||
    chainSteps[chainSteps.length - 1] ||
    {};

  const close = () => {
    setReason("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    const trimmed = reason.trim();
    if (trimmed.length < MIN_REASON) {
      setError(`A reason of at least ${MIN_REASON} characters is required`);
      return;
    }
    setSaving(true);
    try {
      const res = await AttendanceV2Helper.revokeApproval(row.attendance_approval_request_id, { reason: trimmed });
      if (!isOk(res)) {
        setError(apiMessage(res, "The decision could not be revoked"));
        return;
      }
      setReason("");
      onRevoked(res);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const approver =
    step.approver_employee_id !== null && step.approver_employee_id !== undefined
      ? `${step.approver_name || `Employee ${step.approver_employee_id}`}${step.approval_level ? ` · ${levelLabel(step.approval_level)}` : ""}`
      : roleLabel(step.approver_role);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={close}
      title="Revoke Decision"
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end" wrap="wrap">
          <Button size="sm" variant="ghost" onClick={close} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="red" onClick={submit} isLoading={saving} isDisabled={reason.trim().length < MIN_REASON}>
            Revoke Decision
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <Field label="Employee">{row.employee_name || row.employee_id}</Field>
          <Field label="Date">{displayDate(row.attendance_date)}</Field>
          <Field label="Request type">{TYPE_LABEL[row.request_type] || row.request_type} · #{row.attendance_approval_request_id}</Field>
          <Field label="Stage / approver level">
            Stage {step.stage_no} of {row.total_stages} · {approver}
          </Field>
          <Field label="Current decision">
            <Badge colorScheme={row.status === "APPROVED" ? "green" : row.status === "REJECTED" ? "red" : "purple"}>{row.status}</Badge>
            {step.decided_by_name ? (
              <Text as="span" fontWeight="400" color="gray.600"> by {step.decided_by_name}</Text>
            ) : null}
          </Field>
          {isOt ? <Field label="Approved OT">{formatOtClock(row.approved_ot_minutes)}</Field> : null}
        </SimpleGrid>

        <Alert status="warning" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Box>
            Request #{row.attendance_approval_request_id} will be <b>cancelled</b>. It will not come back for
            approval, and its approval history is kept as it is.{" "}
            {isOt
              ? "Its OT stops reaching payroll, and the day shows OT as Not Requested again."
              : "Its punch stops counting on the day."}{" "}
            The date is recalculated now. The employee can then raise a fresh request, which starts a new
            approval chain. The original decision and your reason are kept in the audit.
          </Box>
        </Alert>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Revoke reason</FormLabel>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Approved by mistake - wrong employee / wrong date"
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Required. Recorded with your name and the time of the revocation.
          </Text>
        </FormControl>

        {error ? (
          <Alert status="error" fontSize="sm" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}
      </Stack>
    </CustomModal>
  );
}
