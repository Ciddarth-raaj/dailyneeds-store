import React from "react";
import { Divider, Stack } from "@chakra-ui/react";
import {
  FieldGrid,
  FieldGroup,
  HoursMinutesField,
  SelectField,
  ToggleField,
} from "./fields";
import { MISSED_CLOCK_IN_TREATMENT_OPTIONS } from "../../util/workShiftForm";

/**
 * Tab 2 — General.
 *
 * Two rules that decide what a day counts as when the punches do not tell the
 * whole story, and like everything else in Phase 1 they are recorded, not
 * applied: no attendance is processed from this screen.
 *
 * HOURS ARE TYPED, MINUTES ARE STORED. Half-day and full-day minimums are
 * entered HH:MM because that is how the business states them ("a full day is
 * 08:00"), and `util/workShiftForm.js` converts them to the minutes the
 * backend's columns hold.
 */
function GeneralTab({ form, errors = {}, onChange }) {
  const missedOff = !form.missed_clock_in_rule_enabled;
  const minimumHoursOff = !form.minimum_hours_rule_enabled;

  return (
    <Stack spacing={5}>
      <FieldGroup
        title="Missed Clock-In Attendance"
        description="What a day counts as when an employee worked but no clock-in was recorded."
      >
        <Stack spacing={3}>
          <ToggleField
            label="Enable missed clock-in attendance"
            name="missed_clock_in_rule_enabled"
            value={form.missed_clock_in_rule_enabled}
            onChange={onChange}
          />
          <FieldGrid columns={{ base: 1, md: 2 }}>
            <SelectField
              label="Treatment"
              name="missed_clock_in_treatment"
              value={form.missed_clock_in_treatment}
              options={MISSED_CLOCK_IN_TREATMENT_OPTIONS}
              onChange={onChange}
              isDisabled={missedOff}
            />
          </FieldGrid>
        </Stack>
      </FieldGroup>

      <Divider />

      <FieldGroup
        title="Minimum Working Hours"
        description="How much of the day has to be worked to count as a half or a full day."
      >
        <Stack spacing={3}>
          <ToggleField
            label="Enable Half/Full-Day Minimum Hours"
            name="minimum_hours_rule_enabled"
            value={form.minimum_hours_rule_enabled}
            onChange={onChange}
          />
          <FieldGrid columns={{ base: 1, md: 2 }}>
            <HoursMinutesField
              label="Half-Day Minimum Hours"
              name="minimum_half_day_hours"
              value={form.minimum_half_day_hours}
              error={errors.minimum_half_day_hours}
              onChange={onChange}
              isDisabled={minimumHoursOff}
            />
            <HoursMinutesField
              label="Full-Day Minimum Hours"
              name="minimum_full_day_hours"
              value={form.minimum_full_day_hours}
              error={errors.minimum_full_day_hours}
              onChange={onChange}
              isDisabled={minimumHoursOff}
            />
          </FieldGrid>
        </Stack>
      </FieldGroup>
    </Stack>
  );
}

export default GeneralTab;
