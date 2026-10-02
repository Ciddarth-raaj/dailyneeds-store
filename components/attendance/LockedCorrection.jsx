import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
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
import { apiMessage, isOk, lockedCorrectionView } from "../../util/attendanceV2";

/**
 * LOCKED-PERIOD CORRECTION - the pieces the existing Regularize Attendance
 * flow shows on a payroll-locked date. Not a separate module:
 *
 *   LockedCorrectionBlock   (its own file, no API import) the Day Detail's
 *                           display of the correction and its difference
 *   AuthorizeLockedCorrectionModal   the separate authorisation, reason required
 *   SettleLockedCorrectionModal      Payroll marks a difference settled
 *
 * Every action is re-checked by the backend (key, outlet scope, separation of
 * duties, states); these only decide what to render.
 */

export function AuthorizeLockedCorrectionModal({ day, isOpen, onClose, onAuthorized }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const view = lockedCorrectionView(day);
  if (!day || !view) return null;

  const submit = async () => {
    setError(null);
    if (reason.trim().length < 5) {
      setError("An authorisation reason of at least 5 characters is required");
      return;
    }
    setSaving(true);
    try {
      const res = await AttendanceV2Helper.authorizeLockedCorrection(view.request_id, reason.trim());
      if (!isOk(res)) {
        setError(apiMessage(res));
        return;
      }
      setReason("");
      onAuthorized(res);
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
      title="Authorize locked-period correction"
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" onClick={submit} isLoading={saving}>
            Authorize
          </Button>
        </Flex>
      }
    >
      <Stack spacing={3}>
        <Text fontSize="sm">
          {day.attendance_date} is in a payroll-locked month. Authorising lets request #{view.request_id} continue
          through its normal approval chain. The payroll month stays locked; any payroll difference is recorded for
          manual settlement.
        </Text>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Authorisation reason</FormLabel>
          <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
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

export function SettleLockedCorrectionModal({ event, isOpen, onClose, onSettled }) {
  const [month, setMonth] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  if (!event) return null;

  const submit = async () => {
    setError(null);
    const m = /^(\d{4})-(\d{2})$/.exec(month);
    if (!m) {
      setError("Choose the payroll month the adjustment was made in");
      return;
    }
    if (note.trim().length < 5) {
      setError("Say how it was settled (which adjustment) - at least 5 characters");
      return;
    }
    setSaving(true);
    try {
      const res = await AttendanceV2Helper.settleLockedCorrection(event.id, {
        applied_payroll_year: Number(m[1]),
        applied_payroll_month: Number(m[2]),
        applied_note: note.trim(),
      });
      if (!isOk(res)) {
        setError(apiMessage(res));
        return;
      }
      setMonth("");
      setNote("");
      onSettled(res);
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
      title="Mark difference settled"
      size="sm"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Cancel
          </Button>
          <Button size="sm" colorScheme="purple" onClick={submit} isLoading={saving}>
            Mark settled
          </Button>
        </Flex>
      }
    >
      <Stack spacing={3}>
        <Text fontSize="sm">
          {event.amount_label} · {event.direction_label}
        </Text>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Settled in payroll month</FormLabel>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        </FormControl>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Settlement note</FormLabel>
          <Textarea
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. Shortage recovery in October payrun"
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
