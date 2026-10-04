import React, { useState } from "react";
import {
  Button,
  Stack,
  Text,
  Input,
  Select,
  Alert,
  AlertIcon,
  FormControl,
  FormLabel,
  FormHelperText,
  Textarea,
  useToast,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import HrHelper from "../../helper/hr";
import { rejoinNeedsPreviousEnd } from "../../util/hrStatus";
import {
  joiningDateBounds,
  joiningDateWindowError,
  historicalCorrectionBounds,
  historicalCorrectionDateError,
  correctionReasonError,
  CORRECTION_REASON_MIN,
} from "../../util/joiningDateWindow";
import { displayDate } from "../../util/displayDate";

/**
 * Stage 0C / C3 — resign and rejoin.
 *
 * Both are deliberately explicit, because both are easy to do by accident and
 * awkward to undo. Neither deletes anything: resigning closes the current
 * period and leaves the employee's whole history in place, and rejoining opens
 * a NEW period under the SAME permanent employee ID.
 *
 * NO DATE IS EVER INVENTED. Every date comes from HR. Where the backend needs
 * a previous end date it could not determine - one of the 93 historical closed
 * periods with no recorded end - the field appears with an explanation rather
 * than being quietly defaulted to today.
 */

const REASONS = [
  { value: "personal", label: "Personal" },
  { value: "better_opportunity", label: "Better opportunity" },
  { value: "relocation", label: "Relocation" },
  { value: "performance", label: "Performance" },
  { value: "misconduct", label: "Misconduct" },
  { value: "other", label: "Other" },
];

export function ResignModal({ isOpen, onClose, employee, onDone }) {
  const toast = useToast();
  const [date, setDate] = useState("");
  const [reasonType, setReasonType] = useState("personal");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    setError(null);
    if (!date) {
      setError("A last working date is required.");
      return;
    }
    setBusy(true);
    try {
      const res = await HrHelper.resignEmployee(employee.employee_id, {
        resignation_date: date,
        reason_type: reasonType,
        reason: reason || undefined,
      });
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "Could not record the resignation.");
        return;
      }
      toast({ title: "Resignation recorded", status: "success", duration: 4000 });
      setDate("");
      setReason("");
      onDone();
      onClose();
    } catch (err) {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record resignation — ${employee.employee_name}`}
      size="md"
      isCentered
      footer={
        <>
          <Button variant="ghost" mr={3} size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="red" size="sm" isLoading={busy} onClick={submit}>
            Record resignation
          </Button>
        </>
      }
    >
      <Stack spacing={3} fontSize="sm">
        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          Employee ID {employee.employee_id} is kept. If they return, use Rejoin on this same ID.
        </Alert>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Last working date</FormLabel>
          <Input type="date" size="sm" value={date} onChange={(e) => setDate(e.target.value)} />
          <FormHelperText>Cannot be in the future, or before this period began.</FormHelperText>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Select size="sm" value={reasonType} onChange={(e) => setReasonType(e.target.value)}>
            {REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Note (optional)</FormLabel>
          <Input size="sm" value={reason} onChange={(e) => setReason(e.target.value)} />
        </FormControl>
      </Stack>
    </CustomModal>
  );
}

export function RejoinModal({ isOpen, onClose, employee, lifecycle, onDone }) {
  const toast = useToast();
  const [date, setDate] = useState("");
  const [previousEnd, setPreviousEnd] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const needsPreviousEnd = rejoinNeedsPreviousEnd(lifecycle);

  const submit = async () => {
    setError(null);
    if (!date) {
      setError("A joining date is required.");
      return;
    }
    // The rejoin date is a joining date being recorded, so the same entry
    // window applies - 30 days either side of today (IST). The API refuses it
    // too; this only says it before the request.
    const windowError = joiningDateWindowError(date);
    if (windowError) {
      setError(windowError);
      return;
    }
    if (needsPreviousEnd && !previousEnd) {
      setError("The previous period's end date is required before a new one can be opened.");
      return;
    }
    setBusy(true);
    try {
      const res = await HrHelper.rejoinEmployee(employee.employee_id, {
        date_of_joining: date,
        ...(needsPreviousEnd ? { previous_ended_on: previousEnd } : {}),
      });
      if (res && res.code && res.code !== 200) {
        setError(res.msg || "Could not record the rejoining.");
        return;
      }
      toast({
        title: `Rejoined on employee ID ${employee.employee_id}`,
        status: "success",
        duration: 4000,
      });
      setDate("");
      setPreviousEnd("");
      onDone();
      onClose();
    } catch (err) {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Rejoin — ${employee.employee_name}`}
      size="md"
      isCentered
      footer={
        <>
          <Button variant="ghost" mr={3} size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme="green" size="sm" isLoading={busy} onClick={submit}>
            Record rejoining
          </Button>
        </>
      }
    >
      <Stack spacing={3} fontSize="sm">
        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          This opens a new employment period under the same employee ID {employee.employee_id}. Their
          earlier service history is kept.
        </Alert>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Joining date</FormLabel>
          <Input
            type="date"
            size="sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            {...joiningDateBounds()}
          />
        </FormControl>
        {needsPreviousEnd ? (
          <FormControl isRequired>
            <FormLabel fontSize="sm">Date they previously left</FormLabel>
            <Input
              type="date"
              size="sm"
              value={previousEnd}
              onChange={(e) => setPreviousEnd(e.target.value)}
            />
            <FormHelperText>
              Their previous period has no recorded end date, so a new one cannot be opened without it.
              Enter the real date — it is not guessed for you.
            </FormHelperText>
          </FormControl>
        ) : null}
      </Stack>
    </CustomModal>
  );
}

/**
 * HISTORICAL JOINING-DATE CORRECTION - its own action, never part of New
 * Employee, Rejoin or the ordinary Employment Details edit.
 *
 * Offered only to a holder of `employee_joining_date_historical_correction`
 * (with `employee_edit`). An OLD date may be chosen - a genuine historical
 * correction, or a legacy employee's missing date - but never one later than
 * today + 30, and never without a reason. The server re-decides all of it
 * from the caller's own key and records the old date, the new date, the
 * reason, the user and the time on the lifecycle timeline.
 */
export function HistoricalJoiningDateModal({ isOpen, onClose, employee, currentJoiningDate, onDone }) {
  const toast = useToast();
  const [date, setDate] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const close = () => {
    setDate("");
    setReason("");
    setError(null);
    onClose();
  };

  const submit = async () => {
    setError(null);
    const dateError = historicalCorrectionDateError(date);
    if (dateError) return setError(dateError);
    const reasonError = correctionReasonError(reason);
    if (reasonError) return setError(reasonError);
    setBusy(true);
    try {
      const res = await HrHelper.correctJoiningDate(employee.employee_id, date, reason.trim());
      if (res && res.code && res.code !== 200) {
        setError(String(res.msg || "The joining date was not changed.").replace(/^ValidationError:\s*/, ""));
        return;
      }
      toast({ title: "Historical joining-date correction recorded", status: "success", duration: 4000 });
      close();
      onDone();
    } catch (err) {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={close}
      title={`Historical joining-date correction — ${employee.employee_name}`}
      size="md"
      isCentered
      footer={
        <>
          <Button variant="ghost" mr={3} size="sm" onClick={close}>
            Cancel
          </Button>
          <Button
            colorScheme="orange"
            size="sm"
            isLoading={busy}
            isDisabled={!date || Boolean(correctionReasonError(reason))}
            onClick={submit}
          >
            Save historical correction
          </Button>
        </>
      }
    >
      <Stack spacing={3} fontSize="sm">
        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          This is a HISTORICAL CORRECTION. It may set a joining date older than 30 days, for example to
          correct a long-standing record or fill in a missing one. The old date, the new date, your
          reason and your name are recorded on the employee&apos;s timeline.
        </Alert>
        <Text>
          Current joining date: <b>{currentJoiningDate ? displayDate(currentJoiningDate) : "not recorded"}</b>
        </Text>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Correct joining date</FormLabel>
          <Input
            type="date"
            size="sm"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            {...historicalCorrectionBounds()}
          />
          <FormHelperText>Any past date; not more than 30 days after today.</FormHelperText>
        </FormControl>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Correction reason</FormLabel>
          <Textarea
            size="sm"
            rows={3}
            maxLength={500}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Appointment letter on file shows 01-Jun-2015"
          />
          <FormHelperText>Required — at least {CORRECTION_REASON_MIN} characters. Saved to the audit.</FormHelperText>
        </FormControl>
      </Stack>
    </CustomModal>
  );
}

export default { ResignModal, RejoinModal, HistoricalJoiningDateModal };
