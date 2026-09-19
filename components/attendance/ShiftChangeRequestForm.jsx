import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import { apiMessage, displayDate, formatMinutes, isOk, weekday } from "../../util/attendanceV2";

/**
 * REQUEST ANOTHER SHIFT FOR ONE DATE.
 *
 * A REQUEST, and the wording on this form says so in as many words: nothing
 * an employee does here changes any shift. The request goes to their approval
 * chain and only the last required approval makes the requested shift apply -
 * to that ONE date. The next day is their normal shift again, their permanent
 * shift is untouched, and their salary is untouched.
 *
 * ONLY A LONGER SHIFT MAY BE ASKED FOR, and the dropdown offers only those:
 * the server answers with the shifts that run that weekday and whose working
 * hours exceed the employee's own. That is a convenience - the same rule is
 * re-derived server-side when the form is submitted, so a hand-made request
 * is refused with the same sentence the dropdown's emptiness would have said.
 *
 * The current shift is READ-ONLY. It is resolved for the chosen date from the
 * employee's dated history, not from whatever they happen to be on today.
 */
export default function ShiftChangeRequestForm({ isOpen, onClose, onSubmitted, defaultDate = "" }) {
  const [date, setDate] = useState(defaultDate);
  const [reason, setReason] = useState("");
  const [options, setOptions] = useState([]);
  const [base, setBase] = useState(null);
  const [workShiftId, setWorkShiftId] = useState("");
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const reset = () => {
    setReason("");
    setWorkShiftId("");
    setOptions([]);
    setBase(null);
    setError(null);
  };

  const loadOptions = useCallback(async (forDate) => {
    if (!forDate) {
      setOptions([]);
      setBase(null);
      return;
    }
    setLoadingOptions(true);
    setError(null);
    try {
      const res = await AttendanceV2Helper.getMyShiftChangeOptions(forDate);
      if (!isOk(res)) {
        setOptions([]);
        setBase(null);
        setError(apiMessage(res, "The shifts for that date could not be loaded"));
        return;
      }
      setBase(res.base || null);
      setOptions(Array.isArray(res.options) ? res.options : []);
      setWorkShiftId("");
    } catch (err) {
      setOptions([]);
      setBase(null);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setDate(defaultDate);
      loadOptions(defaultDate);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, defaultDate]);

  const onDateChange = (value) => {
    setDate(value);
    loadOptions(value);
  };

  const submit = async () => {
    setError(null);
    if (!date) {
      setError("Choose the date you want to work another shift on");
      return;
    }
    if (!workShiftId) {
      setError("Choose the shift you are asking for");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Enter a reason for the request");
      return;
    }
    setSaving(true);
    try {
      const res = await AttendanceV2Helper.raiseMyShiftChange({
        attendance_date: date,
        work_shift_id: Number(workShiftId),
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

  const baseLabel = base
    ? `${base.shift_code || base.shift_name || "—"}${base.in_time && base.out_time ? ` (${String(base.in_time).slice(0, 5)}–${String(base.out_time).slice(0, 5)})` : ""}`
    : "—";

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => {
        reset();
        onClose();
      }}
      title="Request a shift change for one day"
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" onClick={submit} isLoading={saving}>
            Submit request
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Date</FormLabel>
          <Input type="date" size="sm" value={date} onChange={(e) => onDateChange(e.target.value)} />
          {date ? (
            <Text fontSize="xs" color="gray.500" mt={1}>
              {displayDate(date)} · {weekday(date)}
            </Text>
          ) : null}
        </FormControl>

        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Your shift for that date (read only)
          </Text>
          <Text fontSize="sm" fontWeight="600">
            {loadingOptions ? <Spinner size="xs" /> : baseLabel}
          </Text>
          {base && base.nrm_minutes !== null && base.nrm_minutes !== undefined ? (
            <Text fontSize="xs" color="gray.500">
              Normal working time {formatMinutes(base.nrm_minutes)} — and it stays your normal working time for pay,
              whichever shift is approved.
            </Text>
          ) : null}
        </Box>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Requested shift</FormLabel>
          <Select
            size="sm"
            placeholder={loadingOptions ? "Loading…" : "Choose a shift"}
            value={workShiftId}
            onChange={(e) => setWorkShiftId(e.target.value)}
            isDisabled={loadingOptions || options.length === 0}
          >
            {options.map((o) => (
              <option key={o.work_shift_id} value={o.work_shift_id}>
                {o.shift_code || o.shift_name} ({String(o.in_time).slice(0, 5)}–{String(o.out_time).slice(0, 5)}) ·{" "}
                {formatMinutes(o.nrm_minutes)}
              </option>
            ))}
          </Select>
          {!loadingOptions && date && options.length === 0 ? (
            <Text fontSize="xs" color="gray.600" mt={1}>
              There is no longer shift available for that date. A shift change for one day can only be requested for a
              shift with longer working hours than your normal shift; a shorter or equal one is a change to your regular
              schedule and has to be arranged with HR.
            </Text>
          ) : null}
        </FormControl>

        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why you need the different shift that day"
          />
        </FormControl>

        <Alert status="info" fontSize="xs" borderRadius="md">
          <AlertIcon />
          This is a request. The shift changes only after every required approval, and only for this one date — the next
          day is your normal shift again. Your regular working time still decides your regular pay; the extra hours are
          overtime.
        </Alert>

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
