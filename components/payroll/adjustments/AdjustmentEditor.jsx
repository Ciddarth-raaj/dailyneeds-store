import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  FormLabel,
  Input,
  SimpleGrid,
  Stack,
  Text,
} from "@chakra-ui/react";

import CustomModal from "../../CustomModal";

/**
 * PAYRUN > ADJUSTMENTS — manual entry for ONE employee.
 *
 * THE SAME RULES AS THE IMPORT, ENFORCED IN THE SAME PLACE. This form does no
 * validation of its own beyond leaving the boxes as free text: the server runs
 * the SAME `parseAmount` the spreadsheet importer runs, so a negative Advance
 * Recovery typed here is refused in the same words as one in a file, and a
 * zero means "no value" in both. A friendlier numeric check in the browser is
 * how the two paths start accepting different things.
 *
 * AN EMPTY BOX CLEARS THE COMPONENT, which is what makes an adjustment
 * reversible before the month is locked — and the form says so, because
 * "leave it blank to remove it" is not guessable.
 *
 * THE COMPONENT LIST COMES FROM THE SERVER. This form renders whatever
 * `/payrun/adjustments/components` returned, in that order, with the server's
 * labels and the server's note about what each one does. A list hard-coded
 * here would be a second declaration of V1.
 *
 * BALANCE ADVANCE IS MARKED AS HAVING NO PAY EFFECT, on the field itself. It
 * is the one box where a number does nothing to the money, and somebody
 * filling six boxes has no way to know that from the label.
 */
function AdjustmentEditor({ isOpen, onClose, row, components, onSave, busy, disabled }) {
  const [values, setValues] = useState({});
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen || !row) return;
    const next = {};
    (components || []).forEach((component) => {
      const amount = row.amounts ? row.amounts[component.key] : 0;
      next[component.key] = amount ? String(amount) : "";
    });
    setValues(next);
    setRemarks(row.remarks || "");
    setError(null);
  }, [isOpen, row, components]);

  if (!row) return null;

  const submit = async () => {
    setError(null);
    /*
     * EVERY COMPONENT IS SENT, and a blank one is sent as `null`. Sending only
     * the boxes somebody touched would make it impossible to REMOVE an
     * adjustment from this form: the server leaves a component it was not told
     * about exactly as it is, which is the right rule for a partial import and
     * the wrong one for a form showing all six boxes.
     */
    const amounts = {};
    (components || []).forEach((component) => {
      const text = String(values[component.key] ?? "").trim();
      amounts[component.key] = text === "" ? null : text;
    });

    const result = await onSave({ amounts, remarks });
    if (result && result.error) {
      setError(result.error);
      return;
    }
    onClose();
  };

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Adjustments — ${row.employee_name || row.employee_id}`}
      size="lg"
    >
      <Stack spacing={3} p={1}>
        <Text fontSize="xs" color="gray.600">
          {row.employee_id} · {row.location || "—"} · this month only.
        </Text>

        {disabled ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            This payroll month is locked. Adjustments cannot be changed.
          </Alert>
        ) : null}

        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}

        <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
          {(components || []).map((component) => (
            <Stack key={component.key} spacing={1}>
              <FormLabel fontSize="xs" mb={0}>
                {component.label}
                {component.kind === "INFORMATIONAL" ? " (no pay effect)" : ""}
              </FormLabel>
              <Input
                size="sm"
                inputMode="decimal"
                value={values[component.key] ?? ""}
                placeholder="0"
                isDisabled={disabled || busy}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [component.key]: e.target.value }))
                }
                aria-label={component.label}
              />
              <Text fontSize="10px" color="gray.500">
                {component.help}
              </Text>
            </Stack>
          ))}
        </SimpleGrid>

        <Stack spacing={1}>
          <FormLabel fontSize="xs" mb={0}>
            Remarks
          </FormLabel>
          <Input
            size="sm"
            value={remarks}
            isDisabled={disabled || busy}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Why this adjustment was made"
            aria-label="Remarks"
          />
        </Stack>

        <Text fontSize="xs" color="gray.600">
          Leave a box blank to remove that adjustment. A blank or zero value is not a confirmation that
          this employee has no adjustment — use <b>Confirm No Adjustment</b> for that.
        </Text>

        <Stack direction={{ base: "column", md: "row" }} spacing={2} justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="purple"
            onClick={submit}
            isLoading={busy}
            isDisabled={disabled}
          >
            Save Adjustments
          </Button>
        </Stack>
      </Stack>
    </CustomModal>
  );
}

export default AdjustmentEditor;
