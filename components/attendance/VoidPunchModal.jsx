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
import AttendanceHelper from "../../helper/attendance";
import { apiMessage, displayDate, isOk } from "../../util/attendanceV2";

/**
 * Void Punch - the confirmation.
 *
 * Opened from the Employee Attendance Day Detail or the Punch Audit, for ONE
 * raw BIOMAX / IMPORT punch. It identifies the punch (employee, date and
 * time, source, punch id) read-only, asks for the mandatory reason, and
 * sends exactly `{ reason, source }` to `POST /attendance/raw/punches/:id/void`.
 * Nothing about the punch is editable here: the raw record stays as the
 * device or the import wrote it, and the server records the exclusion beside
 * it and recalculates the date.
 *
 * Shown only to a caller holding `void_attendance_punch` (the pages decide
 * that), and the server checks the key again. The backend validates
 * everything that matters - the reason, that the punch exists and is raw,
 * that it is not already voided, and that the date carries no pending
 * Attendance/OT request - and its message is shown as it is.
 *
 * `punch` is `{ biomax_punch_id, io_time, source, employee_name?,
 * user_id?, attendance_date? }`.
 */
const MIN_REASON = 5;

export default function VoidPunchModal({ punch, isOpen, onClose, onVoided }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!punch) return null;

  const reset = () => {
    setReason("");
    setError(null);
  };

  const close = () => {
    reset();
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
      const res = await AttendanceHelper.voidPunch({
        biomax_punch_id: punch.biomax_punch_id,
        reason: trimmed,
        source: punch.source,
      });
      if (!isOk(res)) {
        setError(apiMessage(res, "The punch could not be voided"));
        return;
      }
      reset();
      onVoided(res);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const date = punch.attendance_date || (punch.io_time ? String(punch.io_time).slice(0, 10) : "");
  const time = punch.io_time ? String(punch.io_time).slice(11, 16) : "";

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={close}
      title="Void Punch"
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end" wrap="wrap">
          <Button size="sm" variant="ghost" onClick={close} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="red" onClick={submit} isLoading={saving}>
            Void Punch
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        <Text fontSize="sm" color="gray.700">
          This punch will be excluded from attendance calculation. The raw punch is kept and
          shown as <Badge colorScheme="red">VOIDED</Badge> in the audit; the date is recalculated.
        </Text>

        <SimpleGrid columns={{ base: 1, sm: 2 }} spacing={3}>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
              Employee
            </Text>
            <Text fontSize="sm" fontWeight="600">
              {punch.employee_name || (punch.employee_id ? `Employee #${punch.employee_id}` : "—")}
              {punch.user_id ? (
                <Text as="span" fontWeight="400" color="gray.500">
                  {" "}
                  ({punch.user_id})
                </Text>
              ) : null}
            </Text>
          </Box>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
              Date / Time
            </Text>
            <Text fontSize="sm" fontWeight="600" fontFamily="mono">
              {displayDate(date)} {time}
            </Text>
          </Box>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
              Source
            </Text>
            <Badge colorScheme={punch.source === "IMPORT" ? "purple" : "blue"}>{punch.source}</Badge>
          </Box>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
              Punch ID
            </Text>
            <Text fontSize="sm" fontFamily="mono">
              #{punch.biomax_punch_id}
            </Text>
          </Box>
        </SimpleGrid>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Duplicate device punch, Wrong employee punch, Accidental terminal scan, Invalid imported punch"
          />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Required. Recorded with your name and the time of the void.
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
