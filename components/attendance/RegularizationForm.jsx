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
  Input,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import {
  apiMessage,
  calendarDateFor,
  displayDate,
  isOk,
  positionalPunches,
  weekday,
} from "../../util/attendanceV2";

/**
 * Missing Punch Regularization. Opened from a Missing Punch day.
 *
 * The date and the existing punches are shown READ-ONLY - they are the
 * device's record and this form has no way to change them; the request body
 * carries only the missing punch time and the reason. Where the new punch
 * falls (IN or OUT) is decided by the backend after chronological ordering,
 * so the form does not ask.
 *
 * The backend validates everything that matters - the reason, the date, the
 * time landing on this date under the shift's cutoff, and that no request is
 * already open - and its message is shown as it is. On success the day shows
 * "Regularization Pending"; if the corrected day creates OT, that OT rides
 * the SAME request.
 */
export default function RegularizationForm({ day, isOpen, onClose, onSubmitted }) {
  const [time, setTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!day) return null;
  const punches = positionalPunches(day);
  const date = day.attendance_date;

  const reset = () => {
    setTime("");
    setReason("");
    setError(null);
  };

  const submit = async () => {
    setError(null);
    if (!/^\d{2}:\d{2}$/.test(time)) {
      setError("Enter the missing punch time");
      return;
    }
    setSaving(true);
    try {
      const body = {
        attendance_date: date,
        punch_time: `${calendarDateFor(day, time)} ${time}:00`,
        reason: reason.trim(),
      };
      const res = await AttendanceV2Helper.raiseMyRegularization(body);
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
      title="Regularize Missing Punch"
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
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Existing punches (read only)
          </Text>
          {punches.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              None
            </Text>
          ) : (
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
          )}
        </Box>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Missing Punch Time</FormLabel>
          <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          <Text fontSize="xs" color="gray.500" mt={1}>
            Whether it is an IN or an OUT is worked out from the order of the punches.
          </Text>
        </FormControl>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why the punch is missing"
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
