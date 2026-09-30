import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
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
import { apiMessage, isOk } from "../../util/attendanceV2";
import { PAID_NOT_WORKED, requestBody } from "../../util/attendancePermission";

const EMPTY_WINDOW = { from_time: "", to_time: "", to_shift_end: false };

/**
 * Request Permission - to leave early, come in late, or be away for part of
 * one date's shift WITHOUT a salary deduction, if the approval chain agrees.
 *
 * For YOURSELF (`raise_attendance_permission_request`): the body names no
 * employee - the backend takes it from the session. The times are clock
 * times inside that date's scheduled shift; the server places them in the
 * shift, refuses a window outside it, and decides - on every calculation -
 * how much of it actually covers a shortage. The request walks your ordinary
 * attendance approval chain, and until it is finally approved nothing is
 * paid for it.
 *
 * `employeeId` / `employeeName` turn it into a request raised FOR an
 * employee (`raise_attendance_permission_for_others`), which the server
 * checks against your outlet scope.
 */
export default function PermissionRequestForm({ isOpen, onClose, onSubmitted, defaultDate = "", employeeId = null, employeeName = null }) {
  const [date, setDate] = useState(defaultDate || "");
  const [windows, setWindows] = useState([{ ...EMPTY_WINDOW }]);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) setDate(defaultDate || "");
  }, [isOpen, defaultDate]);

  const reset = () => {
    setWindows([{ ...EMPTY_WINDOW }]);
    setReason("");
    setError(null);
  };

  const setWindow = (i, patch) => setWindows((list) => list.map((w, j) => (j === i ? { ...w, ...patch } : w)));

  const submit = async () => {
    setError(null);
    const built = requestBody({ attendance_date: date, windows, reason, employee_id: employeeId });
    if (built.error) {
      setError(built.error);
      return;
    }
    setSaving(true);
    try {
      const res = employeeId
        ? await AttendanceV2Helper.raisePermissionRequestFor(built.body)
        : await AttendanceV2Helper.raiseMyPermissionRequest(built.body);
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
      title={employeeName ? `Request Permission for ${employeeName}` : "Request Permission"}
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="teal" onClick={submit} isLoading={saving}>
            Submit
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        <Text fontSize="xs" color="gray.600">
          {PAID_NOT_WORKED}: an approved permission forgives the shortage inside the window. It never changes your
          punches, your shift or your overtime.
        </Text>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Date</FormLabel>
          <Input size="sm" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </FormControl>

        {windows.map((w, i) => (
          // eslint-disable-next-line react/no-array-index-key
          <Box key={i} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
            <Flex gap={3} wrap="wrap" align="flex-end">
              <FormControl w="auto" isRequired>
                <FormLabel fontSize="xs">From</FormLabel>
                <Input size="sm" type="time" value={w.from_time} onChange={(e) => setWindow(i, { from_time: e.target.value })} />
              </FormControl>
              <FormControl w="auto" isRequired={!w.to_shift_end} isDisabled={w.to_shift_end}>
                <FormLabel fontSize="xs">To</FormLabel>
                <Input size="sm" type="time" value={w.to_time} onChange={(e) => setWindow(i, { to_time: e.target.value })} />
              </FormControl>
              <Checkbox size="sm" isChecked={w.to_shift_end} onChange={(e) => setWindow(i, { to_shift_end: e.target.checked })}>
                Until my shift ends
              </Checkbox>
              {windows.length > 1 ? (
                <Button size="xs" variant="ghost" colorScheme="red" onClick={() => setWindows((list) => list.filter((_, j) => j !== i))}>
                  Remove
                </Button>
              ) : null}
            </Flex>
          </Box>
        ))}
        {windows.length < 2 ? (
          <Button size="xs" variant="link" colorScheme="teal" alignSelf="flex-start" onClick={() => setWindows((list) => [...list, { ...EMPTY_WINDOW }])}>
            + Another window on the same day (e.g. a late start and an early finish)
          </Button>
        ) : null}

        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea size="sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why you need the time" />
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
