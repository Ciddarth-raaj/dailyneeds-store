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
  Select,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";

import {
  RESET_REASON_OPTIONS,
  RESET_REMARK_MAX,
  resetFormProblem,
} from "../../../util/payrunCalculation";

/**
 * RESET CALCULATION - the confirmation, for one employee or a selection.
 *
 * IT SAYS EXACTLY WHO AND WHICH MONTH. A single reset names the employee and
 * their ID; a bulk one gives the count. The payroll month is always shown,
 * because resetting the right person in the wrong month is the mistake this
 * dialog exists to stop.
 *
 * A REASON IS REQUIRED, AND OTHER NEEDS A REMARK. The button stays disabled
 * until the form is valid - and the server refuses the request anyway if it
 * is not, so this is a convenience rather than the rule.
 *
 * IT SAYS WHAT IS KEPT. A reset discards only the generated calculation;
 * somebody about to press it should not have to wonder whether attendance,
 * the Salary Master or the adjustments they typed go with it.
 */
function ResetCalculationModal({ isOpen, onClose, onConfirm, target, monthLabel, busy }) {
  const [reason, setReason] = useState("");
  const [remark, setRemark] = useState("");

  /* A fresh form every time the dialog opens: a reason chosen for one
     employee must never carry silently into the next reset. */
  useEffect(() => {
    if (isOpen) {
      setReason("");
      setRemark("");
    }
  }, [isOpen]);

  const rows = (target && target.rows) || [];
  const individual = target && target.mode === "INDIVIDUAL";
  const single = rows[0];
  const problem = resetFormProblem({ reason, remark });

  return (
    <Modal isOpen={isOpen} onClose={busy ? () => {} : onClose} size="lg" isCentered>
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Reset Calculation</ModalHeader>
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

            <Alert status="warning" fontSize="sm" alignItems="flex-start">
              <AlertIcon />
              <Text>
                This removes the generated payroll calculation for{" "}
                {individual ? "this employee" : "these employees"} in {monthLabel} only, and returns{" "}
                {individual ? "them" : "each of them"} to Not Calculated so payroll can be calculated
                again from the current data. Attendance, punches, OT and regularisation, the Salary
                Master, the Employee Master, statutory and bank details, adjustments and this
                month&rsquo;s pay type are not changed. Approved &amp; Locked employees are never
                reset.
              </Text>
            </Alert>

            <FormControl isRequired>
              <FormLabel fontSize="sm">Reset reason</FormLabel>
              <Select
                size="sm"
                placeholder="Choose a reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                isDisabled={busy}
              >
                {RESET_REASON_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </FormControl>

            <FormControl isRequired={reason === "OTHER"}>
              <FormLabel fontSize="sm">Remark</FormLabel>
              <Textarea
                size="sm"
                value={remark}
                maxLength={RESET_REMARK_MAX}
                onChange={(e) => setRemark(e.target.value)}
                placeholder={reason === "OTHER" ? "Required for Other" : "Optional"}
                isDisabled={busy}
              />
              <FormHelperText fontSize="xs">
                {reason === "OTHER" ? "Required when the reason is Other. " : ""}
                Recorded on the audit with your name and the time.
              </FormHelperText>
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
              colorScheme="red"
              isDisabled={problem !== null}
              isLoading={busy}
              title={problem || undefined}
              onClick={() => onConfirm({ reason, remark: remark.trim() })}
            >
              {individual ? "Reset Calculation" : `Reset ${rows.length} Calculation${rows.length === 1 ? "" : "s"}`}
            </Button>
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default ResetCalculationModal;
