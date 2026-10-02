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
  Radio,
  RadioGroup,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import {
  CORRECTION,
  CORRECTION_LABEL,
  apiMessage,
  calendarDateFor,
  displayDate,
  isOk,
  positionalPunches,
  regularizationCorrections,
  weekday,
} from "../../util/attendanceV2";

/** Longest reason the backend stores. */
const MAX_REASON = 500;

/**
 * Regularise Attendance - THE ONE regularisation form, for every supported
 * correction. Opened from the Regularize action in the Day Detail.
 *
 * The date and the existing punches are shown READ-ONLY - they are the
 * device's record and this form has no way to change them. The correction
 * is chosen from what the day allows (`regularizationCorrections`):
 *
 *   Missing Punch          a Missing Punch day: the missing punch time and
 *                          the reason. Where it falls (IN or OUT) is decided
 *                          by the backend after chronological ordering, so
 *                          the form does not ask.
 *   Missing Lunch Punches  a complete day such as 10:09 -> 22:04 whose
 *                          employee took lunch without punching: Lunch OUT,
 *                          Lunch IN, the reason and optional remarks. Offered
 *                          only when raising for an employee (`employeeId`,
 *                          manager/HR); never on the employee's own screen.
 *
 * Both are the SAME REGULARIZATION request through the same approval chain.
 * After approval the punches join the day as regularized manual punches
 * (10:09 IN -> 14:00 OUT -> 15:00 IN -> 22:04 OUT) and the ordinary engine
 * recalculates it; the device punches are never changed.
 *
 * The backend validates everything that matters - the reason, the date, the
 * times landing on this date under the shift's cutoff, the lunch sequence,
 * that no request is already open, the permission and the payroll lock - and
 * its message is shown as it is. On success the day shows "Regularization
 * Pending".
 */
export default function RegularizationForm({ day, isOpen, onClose, onSubmitted, employeeId = null }) {
  const [correction, setCorrection] = useState(null);
  const [time, setTime] = useState("");
  const [lunchOut, setLunchOut] = useState("");
  const [lunchIn, setLunchIn] = useState("");
  const [reason, setReason] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!day) return null;
  const punches = positionalPunches(day);
  const date = day.attendance_date;
  // Missing Lunch Punches is manager/HR only: offered when raising FOR an
  // employee, which the backend also gates on the for-others permission.
  const corrections = regularizationCorrections(day, { allowLunch: !!employeeId });
  const firstAvailable = corrections.find((c) => c.available) || corrections[0];
  const chosen =
    corrections.find((c) => c.key === correction && c.available) || firstAvailable;
  const isLunch = chosen.key === CORRECTION.MISSING_LUNCH_PUNCHES;

  const reset = () => {
    setCorrection(null);
    setTime("");
    setLunchOut("");
    setLunchIn("");
    setReason("");
    setRemarks("");
    setError(null);
  };

  const finish = (res) => {
    if (!isOk(res)) {
      setError(apiMessage(res));
      return;
    }
    reset();
    onSubmitted(res);
  };

  const submitLunch = async () => {
    if (!/^\d{2}:\d{2}$/.test(lunchOut) || !/^\d{2}:\d{2}$/.test(lunchIn)) {
      setError("Enter the Lunch OUT and Lunch IN times");
      return;
    }
    // The correction type is the default reason; remarks ride the same field,
    // since the request stores one reason.
    const base = reason.trim() || CORRECTION_LABEL[CORRECTION.MISSING_LUNCH_PUNCHES];
    const fullReason = remarks.trim() ? `${base} - Remarks: ${remarks.trim()}` : base;
    if (fullReason.length > MAX_REASON) {
      setError(`Reason and remarks together may be at most ${MAX_REASON} characters`);
      return;
    }
    setSaving(true);
    try {
      finish(
        await AttendanceV2Helper.raiseRegularization({
          requested_for_employee_id: employeeId,
          attendance_date: date,
          break_out_time: `${calendarDateFor(day, lunchOut)} ${lunchOut}:00`,
          break_in_time: `${calendarDateFor(day, lunchIn)} ${lunchIn}:00`,
          reason: fullReason,
        })
      );
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const submit = async () => {
    setError(null);
    if (day.payroll_locked) {
      setError("Payroll month locked");
      return;
    }
    if (!chosen.available) {
      setError(chosen.hint);
      return;
    }
    if (isLunch) {
      await submitLunch();
      return;
    }
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
      // Your own attendance through the self route; an employee's through the
      // HR raise, which names them. The same request either way.
      finish(
        employeeId
          ? await AttendanceV2Helper.raiseRegularization({ requested_for_employee_id: employeeId, ...body })
          : await AttendanceV2Helper.raiseMyRegularization(body)
      );
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
      title="Regularize Attendance"
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

        {corrections.length > 1 ? (
          <FormControl isRequired>
            <FormLabel fontSize="sm">Correction Type</FormLabel>
            <RadioGroup value={chosen.key} onChange={(value) => setCorrection(value)}>
              <Stack spacing={1}>
                {corrections.map((c) => (
                  <Radio key={c.key} value={c.key} isDisabled={!c.available} size="sm">
                    <Text as="span" fontSize="sm">
                      {c.label}
                    </Text>
                    {!c.available ? (
                      <Text as="span" fontSize="xs" color="gray.500">
                        {" "}
                        · {c.hint}
                      </Text>
                    ) : null}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </FormControl>
        ) : null}

        {isLunch ? (
          <Box>
            <Flex gap={3}>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Lunch OUT</FormLabel>
                <Input type="time" value={lunchOut} onChange={(e) => setLunchOut(e.target.value)} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Lunch IN</FormLabel>
                <Input type="time" value={lunchIn} onChange={(e) => setLunchIn(e.target.value)} />
              </FormControl>
            </Flex>
            <Text fontSize="xs" color="gray.500" mt={1}>
              Both must fall between an existing IN and the OUT after it. They are added as regularized manual
              punches after approval; the device punches are not changed.
            </Text>
          </Box>
        ) : (
          <FormControl isRequired>
            <FormLabel fontSize="sm">Missing Punch Time</FormLabel>
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            <Text fontSize="xs" color="gray.500" mt={1}>
              Whether it is an IN or an OUT is worked out from the order of the punches.
            </Text>
          </FormControl>
        )}

        <FormControl isRequired={!isLunch}>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea
            rows={isLunch ? 2 : 3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={isLunch ? CORRECTION_LABEL[CORRECTION.MISSING_LUNCH_PUNCHES] : "Why the punch is missing"}
          />
        </FormControl>

        {isLunch ? (
          <FormControl>
            <FormLabel fontSize="sm">Remarks</FormLabel>
            <Textarea rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          </FormControl>
        ) : null}

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
