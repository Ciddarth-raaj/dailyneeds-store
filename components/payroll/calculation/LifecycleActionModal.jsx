import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormControl,
  FormHelperText,
  FormLabel,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";

/**
 * PUBLISH PAYSLIP - the confirmation, for one employee or a selection. It
 * names the month and who and says what publishing does, with an optional
 * reason and remark for the audit.
 *
 * Unlock and Unpublish have no dialog: they act on the click
 * (`PayrunCalculation.jsx#openLifecycle`).
 */
const COPY = {
  PUBLISH: {
    title: "Publish Payslip",
    confirm: "Publish Payslip",
    confirmMany: "Publish Payslips",
    reasonRequired: false,
    text:
      "Publishing releases the payslip to the employee. An immutable payslip is frozen from the approved figures " +
      "(nothing is recalculated) and appears in the employee's Telegram Mini App under My Payslips. " +
      "The employee gets a Telegram message saying it is available - the message carries no salary figure. " +
      "A Telegram failure or a missing Telegram link does not undo publication; use Retry Notification. " +
      "An employee whose salary, attendance or adjustments changed since the calculation is refused and must be unlocked and recalculated.",
  },
};
const REASON_MIN = 5;
const MAX = 500;

function LifecycleActionModal({ isOpen, onClose, onConfirm, target, monthLabel, busy }) {
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setRemark("");
    }
  }, [isOpen]);

  const copy = COPY[(target && target.action) || "PUBLISH"];
  const rows = (target && target.rows) || [];
  const individual = target && target.mode === "INDIVIDUAL";
  const single = rows[0];
  const missingReason = copy.reasonRequired && reason.trim().length < REASON_MIN;

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>{copy.title}</ModalHeader>
        <ModalCloseButton isDisabled={busy} />
        <ModalBody>
          <Stack spacing={4}>
            <Stack spacing={1} fontSize="sm">
              {individual && single ? (
                <>
                  <Text>
                    <strong>Employee:</strong> {single.employee_name || "—"}
                  </Text>
                  <Text>
                    <strong>Employee ID:</strong> {single.employee_id}
                  </Text>
                </>
              ) : (
                <Text>
                  <strong>Selected employees:</strong> {rows.length}
                </Text>
              )}
              <Text>
                <strong>Payroll month:</strong> {monthLabel}
              </Text>
            </Stack>
            <Alert status="info" fontSize="sm" alignItems="flex-start">
              <AlertIcon />
              <Text>{copy.text}</Text>
            </Alert>
            <FormControl isRequired={copy.reasonRequired}>
              <FormLabel fontSize="sm">Reason</FormLabel>
              <Textarea
                size="sm"
                value={reason}
                maxLength={MAX}
                onChange={(e) => setReason(e.target.value)}
                placeholder={copy.reasonRequired ? "Required" : "Optional"}
                isDisabled={busy}
              />
              {copy.reasonRequired ? (
                <FormHelperText fontSize="xs">At least {REASON_MIN} characters.</FormHelperText>
              ) : null}
            </FormControl>
            <FormControl>
              <FormLabel fontSize="sm">Remark</FormLabel>
              <Textarea
                size="sm"
                value={remark}
                maxLength={MAX}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Optional"
                isDisabled={busy}
              />
              <FormHelperText fontSize="xs">Recorded on the audit with your name and the time.</FormHelperText>
            </FormControl>
          </Stack>
        </ModalBody>
        <ModalFooter>
          <Stack direction="row" spacing={2}>
            <Button size="sm" variant="ghost" onClick={onClose} isDisabled={busy}>
              Cancel
            </Button>
            <Button
              size="sm"
              colorScheme={target && target.action === "PUBLISH" ? "blue" : "orange"}
              isDisabled={missingReason}
              isLoading={busy}
              onClick={() => onConfirm({ reason: reason.trim(), remark: remark.trim() })}
            >
              {individual ? copy.confirm : `${copy.confirmMany || copy.confirm} (${rows.length})`}
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default LifecycleActionModal;
