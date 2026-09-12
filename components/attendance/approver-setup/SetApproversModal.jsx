import React, { useEffect, useState } from "react";
import { Alert, AlertIcon, Badge, Box, Button, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../../CustomModal";
import ApproverPicker from "./ApproverPicker";
import { LEVELS, validateApproverForm } from "../../../util/attendanceApproverSetup";

/**
 * Set Approvers - the ONE form for both the bulk action and the single edit.
 *
 * Always the three explicit fields: First Level, Second Level, Final
 * Approver. Final is required; the other two may be left blank and stay
 * visible as blanks. `employees` are the SELECTED employees (one for an
 * edit, many for a bulk set) so the self-approval rule can be checked here
 * before the server checks it again. On a SINGLE edit the employee is kept
 * out of the pickers; on a BULK set they are not, because a selected Store
 * Manager may still be First Level Approver for the rest of the selection -
 * the server skips that one employee's own row and reports it.
 *
 * `onSave(body)` resolves with the server's answer; a bulk answer with
 * failures is shown in full here rather than summarised as success.
 */
export default function SetApproversModal({ isOpen, onClose, employees, initial, approverOptions, onSave, mode = "bulk" }) {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});
  const [warnings, setWarnings] = useState([]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [serverError, setServerError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setValues({
      first_level_approver_employee_id: initial ? initial.first_level_approver_employee_id : null,
      second_level_approver_employee_id: initial ? initial.second_level_approver_employee_id : null,
      final_approver_employee_id: initial ? initial.final_approver_employee_id : null,
    });
    setErrors({});
    setWarnings([]);
    setResult(null);
    setServerError(null);
  }, [isOpen, initial]);

  const employeeIds = (employees || []).map((e) => Number(e.employee_id));
  const single = mode === "single" && employees && employees.length === 1 ? employees[0] : null;

  const save = async () => {
    const verdict = validateApproverForm(values, employeeIds);
    setErrors(verdict.errors);
    setWarnings(verdict.warnings || []);
    if (!verdict.ok) return;
    setSaving(true);
    setServerError(null);
    try {
      const res = await onSave(verdict.body);
      if (!res || (res.code !== 200 && res.code !== undefined)) {
        setServerError((res && (Array.isArray(res.errors) ? res.errors.join("; ") : res.msg)) || "The approvers could not be saved");
        return;
      }
      setResult(res);
    } catch (err) {
      setServerError("Could not reach the server. Nothing was saved.");
    } finally {
      setSaving(false);
    }
  };

  const done = result && (mode === "single" || result.failed_count !== undefined);
  const failed = result && Array.isArray(result.failed) ? result.failed : [];

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => (saving ? null : onClose(!!result))}
      title={mode === "single" ? "Edit Approvers" : "Set Approvers"}
      size="lg"
      footer={
        <Stack direction="row" spacing={3}>
          <Button size="sm" variant="ghost" onClick={() => onClose(!!result)} isDisabled={saving}>{done ? "Close" : "Cancel"}</Button>
          {!done ? (
            <Button size="sm" colorScheme="purple" onClick={save} isLoading={saving} loadingText="Saving">Save Approvers</Button>
          ) : null}
        </Stack>
      }
    >
      <Stack spacing={4}>
        {single ? (
          <Box borderWidth="1px" borderRadius="md" p={3} bg="gray.50">
            <Text fontSize="sm" fontWeight="600">{single.employee_name} <Text as="span" color="gray.500" fontWeight="400">· Emp Code {single.employee_id}</Text></Text>
            <Text fontSize="xs" color="gray.600">{[single.store_name, single.designation_name].filter(Boolean).join(" · ") || "—"}</Text>
          </Box>
        ) : (
          <Text fontSize="sm">
            Setting approvers for <Badge colorScheme="purple">{employeeIds.length}</Badge> selected employee{employeeIds.length === 1 ? "" : "s"}. Each employee is validated on its own.
          </Text>
        )}

        {!done ? (
          <SimpleGrid columns={{ base: 1, md: 1 }} spacing={3}>
            {LEVELS.map(({ key, label, required }) => (
              <ApproverPicker
                key={key}
                label={label}
                isRequired={required}
                value={values[key]}
                onChange={(id) => setValues((v) => ({ ...v, [key]: id }))}
                employees={approverOptions}
                excludeIds={single ? employeeIds : []}
                error={errors[key] || null}
                helper={required ? "The final authority. Only this approval fully approves a request." : "Optional. Leave blank to skip this level."}
                isDisabled={saving}
              />
            ))}
          </SimpleGrid>
        ) : null}

        {!done && warnings.length > 0 ? (
          <Alert status="warning" fontSize="xs" borderRadius="md" alignItems="flex-start"><AlertIcon /><Stack spacing={0}>{warnings.map((w) => <Text key={w}>{w}</Text>)}</Stack></Alert>
        ) : null}

        {serverError ? <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{serverError}</Alert> : null}

        {done && mode === "single" ? (
          <Alert status="success" fontSize="sm" borderRadius="md"><AlertIcon />Approvers saved.</Alert>
        ) : null}
        {done && mode !== "single" ? (
          <Stack spacing={2}>
            <Alert status={failed.length === 0 ? "success" : result.success_count > 0 ? "warning" : "error"} fontSize="sm" borderRadius="md">
              <AlertIcon />
              {failed.length === 0
                ? `Approvers set for ${result.success_count} employee${result.success_count === 1 ? "" : "s"}.`
                : `Approvers set for ${result.success_count} employee${result.success_count === 1 ? "" : "s"}; ${failed.length} failed and ${failed.length === 1 ? "was" : "were"} not changed.`}
            </Alert>
            {failed.length > 0 ? (
              <Stack spacing={1}>
                {failed.map((f) => {
                  const emp = (employees || []).find((e) => Number(e.employee_id) === Number(f.employee_id));
                  return (
                    <Text key={f.employee_id} fontSize="xs" color="red.700">
                      {emp ? `${emp.employee_name} (${f.employee_id})` : `Employee ${f.employee_id}`}: {(f.errors || [f.message]).join("; ")}
                    </Text>
                  );
                })}
              </Stack>
            ) : null}
          </Stack>
        ) : null}
      </Stack>
    </CustomModal>
  );
}
