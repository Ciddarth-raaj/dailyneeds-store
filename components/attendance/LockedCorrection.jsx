import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
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
import { apiMessage, isOk, lockedCorrectionView } from "../../util/attendanceV2";

/**
 * LOCKED-PERIOD CORRECTION - the pieces the existing Regularize Attendance
 * flow shows on a payroll-locked date. Not a separate module:
 *
 *   LockedCorrectionBlock   (its own file, no API import) the Day Detail's
 *                           display of the correction: before / after
 *                           attendance and the OT impact (no money)
 *   AuthorizeLockedCorrectionModal   the separate authorisation, reason required
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
          through its normal approval chain. The payroll month stays locked and the locked payroll is not changed;
          only the attendance and OT are corrected.
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
