import React, { useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Button, FormControl, FormErrorMessage, FormLabel, Select, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../../CustomModal";
import ApproverPicker from "./ApproverPicker";
import AttendanceApproverSetupHelper from "../../../helper/attendanceApproverSetup";
import { LEVEL_LABEL, replacePreviewSummary, validateReplaceForm, isOk, apiMessage } from "../../../util/attendanceApproverSetup";

/**
 * Replace Approver - one approver by another, at one level, everywhere.
 *
 * Current Approver | Approval Level | New Approver, then CONFIRM against the
 * server's preview: how many employee mappings and how many undecided
 * pending Regularization / OT steps will move. The current approver list
 * includes resigned people, because removing them is the point; the new
 * approver list is active employees only. Approved and rejected steps and
 * closed requests are never touched - the server refuses to, and the
 * confirmation says so.
 */
export default function ReplaceApproverModal({ isOpen, onClose, activeOptions, onReplaced }) {
  const [currentOptions, setCurrentOptions] = useState([]);
  const [form, setForm] = useState({ current_approver_employee_id: null, approval_level: "", new_approver_employee_id: null });
  const [errors, setErrors] = useState({});
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setForm({ current_approver_employee_id: null, approval_level: "", new_approver_employee_id: null });
    setErrors({});
    setPreview(null);
    setError(null);
    setResult(null);
    (async () => {
      try {
        // Current approvers first (anyone named on a mapping or a pending
        // step, active or not); every employee including inactive as the
        // wider fallback, so a resigned approver can always be found.
        const [current, all] = await Promise.all([
          AttendanceApproverSetupHelper.currentApprovers(),
          AttendanceApproverSetupHelper.options({ include_inactive: true }),
        ]);
        const named = isOk(current) && Array.isArray(current.approvers) ? current.approvers : [];
        const rest = isOk(all) && Array.isArray(all.employees) ? all.employees.filter((e) => !named.some((n) => n.employee_id === e.employee_id)) : [];
        setCurrentOptions([...named, ...rest]);
      } catch (err) {
        setCurrentOptions([]);
      }
    })();
  }, [isOpen]);

  const set = (key, value) => { setForm((f) => ({ ...f, [key]: value })); setPreview(null); };

  const loadPreview = async () => {
    const verdict = validateReplaceForm(form);
    setErrors(verdict.errors);
    if (!verdict.ok) return;
    setBusy(true);
    setError(null);
    try {
      const res = await AttendanceApproverSetupHelper.replace({ ...verdict.body, preview: true });
      if (!isOk(res)) { setError(apiMessage(res, "The replacement could not be checked")); return; }
      setPreview(res);
    } catch (err) {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    const verdict = validateReplaceForm(form);
    if (!verdict.ok) { setErrors(verdict.errors); return; }
    setBusy(true);
    setError(null);
    try {
      const res = await AttendanceApproverSetupHelper.replace({ ...verdict.body, preview: false });
      if (!isOk(res)) { setError(apiMessage(res, "The replacement could not be applied")); return; }
      setResult(res);
      if (onReplaced) onReplaced(res);
    } catch (err) {
      setError("Could not reach the server. Nothing was changed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => (busy ? null : onClose(!!result))}
      title="Replace Approver"
      size="lg"
      footer={
        <Stack direction="row" spacing={3}>
          <Button size="sm" variant="ghost" onClick={() => onClose(!!result)} isDisabled={busy}>{result ? "Close" : "Cancel"}</Button>
          {!result && !preview ? <Button size="sm" colorScheme="purple" onClick={loadPreview} isLoading={busy}>Review Changes</Button> : null}
          {!result && preview ? <Button size="sm" colorScheme="red" onClick={confirm} isLoading={busy} loadingText="Replacing">Confirm Replace</Button> : null}
        </Stack>
      }
    >
      <Stack spacing={4}>
        {!result ? (
          <>
            <ApproverPicker
              label="Current Approver"
              isRequired
              value={form.current_approver_employee_id}
              onChange={(id) => set("current_approver_employee_id", id)}
              employees={currentOptions}
              error={errors.current_approver_employee_id || null}
              helper="Includes resigned / inactive approvers, so they can be removed."
              isDisabled={busy}
            />
            <FormControl isRequired isInvalid={!!errors.approval_level} isDisabled={busy}>
              <FormLabel fontSize="sm" mb={1}>Approval Level</FormLabel>
              <Select size="sm" value={form.approval_level} onChange={(e) => set("approval_level", e.target.value)}>
                <option value="">Select…</option>
                {Object.keys(LEVEL_LABEL).map((k) => <option key={k} value={k}>{LEVEL_LABEL[k]}</option>)}
              </Select>
              {errors.approval_level ? <FormErrorMessage fontSize="xs">{errors.approval_level}</FormErrorMessage> : null}
            </FormControl>
            <ApproverPicker
              label="New Approver"
              isRequired
              value={form.new_approver_employee_id}
              onChange={(id) => set("new_approver_employee_id", id)}
              employees={activeOptions}
              error={errors.new_approver_employee_id || null}
              helper="Active employees only."
              isDisabled={busy}
            />
          </>
        ) : null}

        {preview && !result ? (
          <Box borderWidth="1px" borderColor="orange.200" bg="orange.50" borderRadius="md" p={3}>
            <Text fontSize="sm" fontWeight="600" mb={1}>Confirm replacement</Text>
            <Text fontSize="sm">{replacePreviewSummary(preview)}</Text>
            {preview.skipped_setups && preview.skipped_setups.length > 0 ? (
              <Text fontSize="xs" color="orange.800" mt={1}>{preview.skipped_setups.length} mapping{preview.skipped_setups.length === 1 ? "" : "s"} will be left unchanged because the new approver would become their own approver.</Text>
            ) : null}
            {preview.skipped_steps && preview.skipped_steps.length > 0 ? (
              <Text fontSize="xs" color="orange.800" mt={1}>{preview.skipped_steps.length} pending step{preview.skipped_steps.length === 1 ? "" : "s"} will be left unchanged because the new approver is the subject or raiser of that request.</Text>
            ) : null}
          </Box>
        ) : null}

        {result ? (
          <Alert status="success" fontSize="sm" borderRadius="md" alignItems="flex-start">
            <AlertIcon />
            <Box>
              <Text>Replaced on {result.setups_updated} employee mapping{result.setups_updated === 1 ? "" : "s"} and {result.pending_steps_updated} pending step{result.pending_steps_updated === 1 ? "" : "s"}.</Text>
              <Text fontSize="xs" color="gray.600">The new approver now sees those requests as pending with them; the previous approver no longer does. The change is recorded in the audit.</Text>
            </Box>
          </Alert>
        ) : null}

        {error ? <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{error}</Alert> : null}
      </Stack>
    </CustomModal>
  );
}
