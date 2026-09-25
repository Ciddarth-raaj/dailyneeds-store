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
 * ADMINISTRATORS ONLY: revoke ONE stage decision of an Attendance or OT
 * request.
 *
 * What it does is stated before it is done, because it cannot be undone by
 * the same screen: the decision on this stage AND every later stage goes back
 * to pending, the request reopens at this stage, and the date is
 * recalculated - for OT the approved minutes stop reaching payroll, for an
 * attendance correction the proposed punch stops counting, until someone
 * approves it again. The original decision is kept in the revocation audit.
 *
 * THIS IS PRESENTATION. The page only opens it for an administrator on a step
 * the server marked `revocable`; the endpoint checks the account, the stage,
 * the payroll lock and the request's state for itself.
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
  const { row, step } = target;
  const isOt = row.request_type === "OT";
  const later = (row.chain || []).filter((st) => Number(st.stage_no) > Number(step.stage_no));

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
      const res = await AttendanceV2Helper.revokeApproval(row.attendance_approval_request_id, {
        stage_no: step.stage_no,
        reason: trimmed,
      });
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
            <Badge colorScheme={step.decision === "APPROVED" ? "green" : "red"}>{step.decision}</Badge>
            {step.decided_by_name ? (
              <Text as="span" fontWeight="400" color="gray.600"> by {step.decided_by_name}</Text>
            ) : null}
          </Field>
          {isOt ? <Field label="Approved OT">{formatOtClock(row.approved_ot_minutes)}</Field> : null}
        </SimpleGrid>

        <Alert status="warning" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Box>
            Stage {step.stage_no}
            {later.length > 0 ? ` and every later stage (${later.map((st) => st.stage_no).join(", ")})` : ""} go back to
            pending, and the request reopens at stage {step.stage_no}.{" "}
            {isOt
              ? "Its approved OT stops reaching payroll until it is approved again."
              : "The proposed punch stops counting until it is approved again."}{" "}
            The date is recalculated now. The original decision is kept in the audit.
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
