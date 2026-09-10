import React from "react";
import { Alert, AlertIcon, Stack } from "@chakra-ui/react";
import { FieldGrid, FieldGroup, MinutesField, ToggleField } from "./fields";
import { REQUIRE_EXISTING_PUNCH_TOOLTIP } from "../../util/workShiftForm";

/**
 * Tab 3 — Regularization.
 *
 * SETTINGS ONLY. The request-and-approval workflow is not built in Phase 1;
 * this records how it will behave when it is, which is why the tab says so
 * out loud rather than implying a feature that is not there.
 *
 * ONE GATE, THEN A SECOND. Everything is disabled while Attendance
 * Regularization is off, and the monthly limit is enabled only when
 * Regularization Control is on — which is exactly the pairing the backend
 * refuses to save half of: control on without a limit of at least 1 is a
 * validation error, not a default.
 *
 * THE LIMIT IS A COUNT, NOT A DEADLINE. It is how many TIMES PER MONTH an
 * employee may regularize; the label and the helper text both say so, because
 * "limit" beside a regularization screen reads just as easily as "how many
 * days back you may go".
 */
function RegularizationTab({ form, errors = {}, onChange }) {
  const regularizationOff = !form.regularization_allowed;
  const limitDisabled = regularizationOff || !form.regularization_control_enabled;

  return (
    <Stack spacing={5}>
      <Alert status="info" fontSize="xs" borderRadius="md">
        <AlertIcon />
        These settings are recorded for the attendance regularization workflow. The
        request and approval screens are a later phase.
      </Alert>

      <FieldGroup
        title="Regularization"
        description="Whether employees may correct their own attendance, and under what limits."
      >
        <Stack spacing={3}>
          <ToggleField
            label="Attendance Regularization Allowed"
            name="regularization_allowed"
            value={form.regularization_allowed}
            onChange={onChange}
          />
          <ToggleField
            label="Enable Regularization Control"
            name="regularization_control_enabled"
            value={form.regularization_control_enabled}
            onChange={onChange}
            isDisabled={regularizationOff}
            help="Caps how often an employee may regularize."
          />
          <FieldGrid columns={{ base: 1, md: 2 }}>
            <MinutesField
              label="Regularization Limit per Month (times per month)"
              name="regularization_limit_per_month"
              value={form.regularization_limit_per_month}
              error={errors.regularization_limit_per_month}
              onChange={onChange}
              isDisabled={limitDisabled}
              placeholder="e.g. 3"
              help="The number of times in a month an employee may regularize."
            />
          </FieldGrid>
          <ToggleField
            label="Require Existing Punch"
            name="regularization_require_existing_punch"
            value={form.regularization_require_existing_punch}
            onChange={onChange}
            isDisabled={regularizationOff}
            hint={REQUIRE_EXISTING_PUNCH_TOOLTIP}
          />
          <ToggleField
            label="Requires Approval"
            name="regularization_requires_approval"
            value={form.regularization_requires_approval}
            onChange={onChange}
            isDisabled={regularizationOff}
          />
        </Stack>
      </FieldGroup>
    </Stack>
  );
}

export default RegularizationTab;
