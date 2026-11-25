import React from "react";
import { Divider, Stack } from "@chakra-ui/react";
import {
  FieldGrid,
  FieldGroup,
  MinutesField,
  SelectField,
  ToggleField,
} from "./fields";
import { ROUNDING_METHOD_OPTIONS } from "../../util/workShiftForm";

/**
 * Tab 1 — Lateness, Early Out & OT.
 *
 * Four blocks of settings for engines that do not exist yet: nothing on this
 * screen calculates pay, and nothing the backend stores from it does either.
 * Phase 1 records the configuration payroll will later read.
 *
 * THE TWO OT BLOCKS GATE THEIR OWN FIELDS. With OT Allowed off, the minimum,
 * the rounding and the daily cap are disabled rather than removed — the values
 * are still on the row, and hiding them would make "what is this shift's cap"
 * unanswerable without turning OT on and possibly saving that by accident.
 */
function LatenessOvertimeTab({ form, errors = {}, onChange }) {
  const otOff = !form.overtime_allowed;
  const preOtOff = !form.pre_shift_overtime_allowed;

  return (
    <Stack spacing={5}>
      <FieldGroup
        title="Lateness"
        description="How a late arrival is treated once the grace period is used up."
      >
        <FieldGrid>
          <MinutesField
            label="Grace Minutes"
            name="late_grace_minutes"
            value={form.late_grace_minutes}
            error={errors.late_grace_minutes}
            onChange={onChange}
          />
          <MinutesField
            label="Late Deduction Interval Minutes"
            name="late_deduction_interval_minutes"
            value={form.late_deduction_interval_minutes}
            error={errors.late_deduction_interval_minutes}
            onChange={onChange}
          />
          <MinutesField
            label="Deduct Minutes"
            name="late_deduct_minutes"
            value={form.late_deduct_minutes}
            error={errors.late_deduct_minutes}
            onChange={onChange}
          />
        </FieldGrid>
        <Stack spacing={2} mt={3}>
          <ToggleField
            label="Do Not Deduct Grace Minutes"
            name="late_exclude_grace_from_deduction"
            value={form.late_exclude_grace_from_deduction}
            onChange={onChange}
          />
          <ToggleField
            label="Lateness Offset OT"
            name="late_offset_against_overtime"
            value={form.late_offset_against_overtime}
            onChange={onChange}
          />
        </Stack>
      </FieldGroup>

      <Divider />

      <FieldGroup
        title="Early Out"
        description="The same treatment, applied to leaving before the shift ends."
      >
        <FieldGrid>
          <MinutesField
            label="Grace Minutes"
            name="early_exit_grace_minutes"
            value={form.early_exit_grace_minutes}
            error={errors.early_exit_grace_minutes}
            onChange={onChange}
          />
          <MinutesField
            label="Early-Out Deduction Interval Minutes"
            name="early_exit_deduction_interval_minutes"
            value={form.early_exit_deduction_interval_minutes}
            error={errors.early_exit_deduction_interval_minutes}
            onChange={onChange}
          />
          <MinutesField
            label="Deduct Minutes"
            name="early_exit_deduct_minutes"
            value={form.early_exit_deduct_minutes}
            error={errors.early_exit_deduct_minutes}
            onChange={onChange}
          />
        </FieldGrid>
        <Stack spacing={2} mt={3}>
          <ToggleField
            label="Early-Out Offset OT"
            name="early_exit_offset_against_overtime"
            value={form.early_exit_offset_against_overtime}
            onChange={onChange}
          />
        </Stack>
      </FieldGroup>

      <Divider />

      <FieldGroup
        title="Post-Shift OT"
        description="Time worked after the shift's Out time."
      >
        <Stack spacing={3}>
          <ToggleField
            label="OT Allowed"
            name="overtime_allowed"
            value={form.overtime_allowed}
            onChange={onChange}
            help="With this off, the settings below are kept but not applied."
          />
          <FieldGrid>
            <MinutesField
              label="Minimum OT Minutes"
              name="overtime_minimum_minutes"
              value={form.overtime_minimum_minutes}
              error={errors.overtime_minimum_minutes}
              onChange={onChange}
              isDisabled={otOff}
            />
            <SelectField
              label="Rounding Method"
              name="overtime_rounding_method"
              value={form.overtime_rounding_method}
              options={ROUNDING_METHOD_OPTIONS}
              onChange={onChange}
              isDisabled={otOff}
            />
            <MinutesField
              label="Rounding Interval Minutes"
              name="overtime_rounding_interval_minutes"
              value={form.overtime_rounding_interval_minutes}
              error={errors.overtime_rounding_interval_minutes}
              onChange={onChange}
              isDisabled={otOff}
            />
            <MinutesField
              label="Maximum OT Minutes / Day"
              name="maximum_ot_minutes_per_day"
              value={form.maximum_ot_minutes_per_day}
              error={errors.maximum_ot_minutes_per_day}
              onChange={onChange}
              isDisabled={otOff}
              placeholder="No cap"
              help="Leave empty for no cap."
            />
          </FieldGrid>
          <ToggleField
            label="Exclude Minimum OT"
            name="overtime_minimum_excluded"
            value={form.overtime_minimum_excluded}
            onChange={onChange}
            isDisabled={otOff}
            help="The minimum is not paid: only the minutes beyond it count. 39 minutes on a 20-minute minimum pays 19; under 20 pays nothing."
          />
          <ToggleField
            label="Minimum OT Threshold Only"
            name="overtime_minimum_threshold_only"
            value={form.overtime_minimum_threshold_only}
            onChange={onChange}
            isDisabled={otOff || Boolean(form.overtime_minimum_excluded)}
            help="With Exclude Minimum OT off: the minimum decides whether OT qualifies, rather than acting as a floor on the amount paid."
          />
        </Stack>
      </FieldGroup>

      <Divider />

      <FieldGroup
        title="Pre-Shift OT"
        description="Time worked before the shift's In time."
      >
        <Stack spacing={3}>
          <ToggleField
            label="Pre-Shift OT Allowed"
            name="pre_shift_overtime_allowed"
            value={form.pre_shift_overtime_allowed}
            onChange={onChange}
          />
          <FieldGrid>
            <MinutesField
              label="Minimum OT Minutes"
              name="pre_shift_overtime_minimum_minutes"
              value={form.pre_shift_overtime_minimum_minutes}
              error={errors.pre_shift_overtime_minimum_minutes}
              onChange={onChange}
              isDisabled={preOtOff}
            />
            <SelectField
              label="Rounding Method"
              name="pre_shift_overtime_rounding_method"
              value={form.pre_shift_overtime_rounding_method}
              options={ROUNDING_METHOD_OPTIONS}
              onChange={onChange}
              isDisabled={preOtOff}
            />
            <MinutesField
              label="Rounding Interval Minutes"
              name="pre_shift_overtime_rounding_interval_minutes"
              value={form.pre_shift_overtime_rounding_interval_minutes}
              error={errors.pre_shift_overtime_rounding_interval_minutes}
              onChange={onChange}
              isDisabled={preOtOff}
            />
          </FieldGrid>
          <ToggleField
            label="Exclude Minimum OT"
            name="pre_shift_overtime_minimum_excluded"
            value={form.pre_shift_overtime_minimum_excluded}
            onChange={onChange}
            isDisabled={preOtOff}
            help="Only the early minutes beyond the minimum count: 25 minutes early on a 10-minute minimum pays 15."
          />
        </Stack>
      </FieldGroup>
    </Stack>
  );
}

export default LatenessOvertimeTab;
