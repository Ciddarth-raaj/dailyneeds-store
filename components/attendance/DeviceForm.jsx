import React from "react";
import {
  FormControl,
  FormHelperText,
  FormLabel,
  Input,
  Select,
  Stack,
  Textarea,
} from "@chakra-ui/react";

/**
 * Add Device - the Cloud ID, a label, and the FIRST location period.
 *
 * Effective From is asked for every time and has no default: the confirmed
 * devices were seeded from 01-09-2026 by the migration, and that date is
 * theirs, not a rule. The Cloud ID is typed EXACTLY as the device shows it;
 * the letter O and the digit 0 are different characters and both occur in
 * the real inventory.
 */
export default function DeviceForm({ value, onChange, outlets, disabled = false }) {
  const set = (field) => (e) => onChange({ ...value, [field]: e.target.value });
  return (
    <Stack spacing={4} maxW="560px">
      <FormControl isRequired isDisabled={disabled}>
        <FormLabel>Cloud ID</FormLabel>
        <Input value={value.dev_id} onChange={set("dev_id")} fontFamily="mono" placeholder="As printed on the device screen" autoComplete="off" />
        <FormHelperText>Exactly as shown on the terminal. Letter O and digit 0 are different. It cannot be edited later; a replacement unit is added as a new device.</FormHelperText>
      </FormControl>
      <FormControl isRequired isDisabled={disabled}>
        <FormLabel>Device Label</FormLabel>
        <Input value={value.label} onChange={set("label")} placeholder="e.g. Warehouse - G2" />
      </FormControl>
      <FormControl isRequired isDisabled={disabled}>
        <FormLabel>Location</FormLabel>
        <Select value={value.outlet_id} onChange={set("outlet_id")} placeholder="Choose an outlet">
          {outlets.map((o) => (
            <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>
          ))}
        </Select>
        <FormHelperText>Where punches from this device happen. Several devices may share one location.</FormHelperText>
      </FormControl>
      <FormControl isRequired isDisabled={disabled}>
        <FormLabel>Effective From</FormLabel>
        <Input type="datetime-local" value={value.effective_from} onChange={set("effective_from")} />
        <FormHelperText>Punches from this time onward resolve to this location. No default: choose it every time.</FormHelperText>
      </FormControl>
      <FormControl isDisabled={disabled}>
        <FormLabel>Notes</FormLabel>
        <Textarea value={value.notes} onChange={set("notes")} rows={2} />
      </FormControl>
    </Stack>
  );
}

/** 'YYYY-MM-DDTHH:MM' from a datetime-local input -> the API's 'YYYY-MM-DD HH:MM'. */
export function toApiDateTime(local) {
  if (!local) return "";
  return String(local).replace("T", " ");
}
