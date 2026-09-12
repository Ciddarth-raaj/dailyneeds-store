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
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import {
  apiMessage,
  displayDate,
  formatOtClock,
  isOk,
  positionalPunches,
  shiftLabel,
  weekday,
} from "../../util/attendanceV2";

/**
 * Request OT. Opened from a day whose OT is AVAILABLE.
 *
 * Date, shift and punches are shown for context; the Calculated OT is the
 * engine's figure and is READ-ONLY - there is no input for a duration
 * anywhere on this form, and the request body carries the date and the
 * reason only. The backend recalculates the date itself when the request is
 * submitted and stores its own candidate; whatever a client might send as
 * minutes is refused.
 *
 * On success the day shows "OT Request Pending"; the approval chain then
 * decides it, and only a final approval makes it "OT Approved".
 */
export default function OtRequestForm({ day, isOpen, onClose, onSubmitted }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!day) return null;
  const punches = positionalPunches(day);
  const date = day.attendance_date;
  const calculatedOt = formatOtClock(day.candidate_ot_minutes);

  const reset = () => {
    setReason("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (reason.trim().length < 5) {
      setError("Enter a reason for the overtime");
      return;
    }
    setSaving(true);
    try {
      const res = await AttendanceV2Helper.raiseMyOtRequest({
        attendance_date: date,
        reason: reason.trim(),
      });
      if (!isOk(res)) {
        setError(apiMessage(res));
        return;
      }
      reset();
      onSubmitted(res);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Request OT"
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" onClick={submit} isLoading={saving}>
            Submit
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Date
          </Text>
          <Text fontSize="sm" fontWeight="600">
            {displayDate(date)} · {weekday(date)}
          </Text>
        </Box>

        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Shift
          </Text>
          <Text fontSize="sm">{shiftLabel(day)}</Text>
        </Box>

        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Punches
          </Text>
          <Stack spacing={1}>
            {punches.map((p) => (
              <Flex key={p.position} align="center" gap={3} fontSize="sm">
                <Text color="gray.500" w="1.5em" textAlign="right">
                  {p.position}
                </Text>
                <Text fontFamily="mono" fontWeight="600">
                  {p.time}
                </Text>
                <Badge colorScheme={p.direction === "IN" ? "green" : "gray"} fontSize="10px">
                  {p.direction}
                </Badge>
              </Flex>
            ))}
          </Stack>
        </Box>

        <Box borderWidth="1px" borderColor="blue.100" bg="blue.50" borderRadius="md" px={3} py={2}>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Calculated OT (read only)
          </Text>
          <Text fontSize="lg" fontWeight="700" color="blue.700" fontFamily="mono">
            {calculatedOt}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Calculated by the system from your punches and shift. It cannot be changed here.
          </Text>
        </Box>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why the extra hours were worked"
          />
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
