import React, { useMemo, useState } from "react";
import { FormControl, FormErrorMessage, FormHelperText, FormLabel, Input, Select, Stack } from "@chakra-ui/react";
import { approverOptionLabel } from "../../../util/attendanceApproverSetup";

/**
 * One approver field: a type-to-narrow box over a native Select, so it works
 * the same on a phone as on a desk and needs no extra library. `employees`
 * is whatever the caller loaded - active only for a new assignment, resigned
 * included for the Replace flow's current approver. A blank option is always
 * offered for the optional levels; the required level shows "Select".
 */
export default function ApproverPicker({ label, value, onChange, employees, isRequired = false, error = null, helper = null, isDisabled = false, excludeIds = [] }) {
  const [query, setQuery] = useState("");
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    const excluded = new Set((excludeIds || []).map(Number));
    return (employees || []).filter((e) => {
      if (excluded.has(Number(e.employee_id)) && Number(e.employee_id) !== Number(value)) return false;
      if (!q) return true;
      return approverOptionLabel(e).toLowerCase().includes(q);
    });
  }, [employees, query, excludeIds, value]);

  return (
    <FormControl isRequired={isRequired} isInvalid={!!error} isDisabled={isDisabled}>
      <FormLabel fontSize="sm" mb={1}>{label}</FormLabel>
      <Stack spacing={1}>
        <Input size="sm" placeholder="Type a code or name to narrow the list" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select size="sm" value={value === null || value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}>
          <option value="">{isRequired ? "Select…" : "— None —"}</option>
          {shown.map((e) => (
            <option key={e.employee_id} value={e.employee_id}>{approverOptionLabel(e)}</option>
          ))}
        </Select>
      </Stack>
      {error ? <FormErrorMessage fontSize="xs">{error}</FormErrorMessage> : helper ? <FormHelperText fontSize="xs">{helper}</FormHelperText> : null}
    </FormControl>
  );
}
