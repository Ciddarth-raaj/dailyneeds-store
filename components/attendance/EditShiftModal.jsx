import React, { useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Button, Flex, FormControl, FormLabel, Select, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import { apiMessage, displayDate, isOk, shiftLabel, weekday } from "../../util/attendanceV2";

/**
 * Single-date Edit Shift. The finalized UX is three things: the current
 * shift, a dropdown for the new one, Save.
 *
 * No date range, no effective-from or effective-to, no reason field, no bulk
 * option. Saving changes THIS attendance date only - not the employee's
 * current shift, not the day before, not the day after - and the backend
 * recalculates the date in the same transaction. The audit (employee, date,
 * old shift, new shift, who, when) is the override row the backend writes.
 *
 * Rendered only for a caller holding `edit_attendance_date_shift`; the
 * backend requires the same key on both requests this makes.
 */
export default function EditShiftModal({ day, employeeId, isOpen, onClose, onSaved }) {
  const [options, setOptions] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [shiftId, setShiftId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    let cancelled = false;
    setError(null);
    setShiftId("");
    setLoadingOptions(true);
    (async () => {
      try {
        const res = await AttendanceV2Helper.getDateShiftOptions();
        if (cancelled) return;
        if (isOk(res) && Array.isArray(res.options)) setOptions(res.options);
        else {
          setOptions([]);
          setError(apiMessage(res, "The shift list could not be loaded"));
        }
      } catch (err) {
        if (!cancelled) setError("Could not reach the server. Please try again.");
      } finally {
        if (!cancelled) setLoadingOptions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  if (!day) return null;

  const save = async () => {
    setError(null);
    if (!shiftId) {
      setError("Choose the new shift");
      return;
    }
    setSaving(true);
    try {
      const res = await AttendanceV2Helper.setDateShift({
        employee_id: Number(employeeId),
        attendance_date: day.attendance_date,
        work_shift_id: Number(shiftId),
      });
      if (!isOk(res)) {
        setError(apiMessage(res));
        return;
      }
      onSaved(res);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Shift · ${displayDate(day.attendance_date)} · ${weekday(day.attendance_date)}`}
      size="sm"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" onClick={save} isLoading={saving} isDisabled={loadingOptions}>
            Save
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Current Shift
          </Text>
          <Text fontSize="sm" fontWeight="600">
            {shiftLabel(day)}
          </Text>
        </Box>
        <FormControl isRequired>
          <FormLabel fontSize="sm">New Shift</FormLabel>
          <Select
            placeholder={loadingOptions ? "Loading shifts…" : "Select shift"}
            value={shiftId}
            onChange={(e) => setShiftId(e.target.value)}
            isDisabled={loadingOptions}
          >
            {options
              .filter((o) => Number(o.work_shift_id) !== Number(day.work_shift_id))
              .map((o) => (
                <option key={o.work_shift_id} value={o.work_shift_id}>
                  {o.shift_code} — {o.shift_name}
                </option>
              ))}
          </Select>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Changes this date only. The employee&apos;s current shift and other dates are not affected.
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
