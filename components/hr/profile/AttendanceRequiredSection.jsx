import React, { useState } from "react";
import { Alert, AlertIcon, Badge, Button, Stack, Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";

/**
 * Whether biometric attendance is expected of this employee.
 *
 * WHAT `No` MEANS, said on the card rather than left to be discovered. Some
 * active, paid employees are simply not expected to punch. For them the
 * absence of a punch is evidence of nothing: no shift is required for
 * attendance purposes, no "No Shift" is reported, no missing-punch exception
 * or missing-minute deduction is raised, they are out of the Punch Audit
 * review queue and out of the attention counts, and payroll pays the month
 * at its base days rather than at zero.
 *
 * WHAT IT DOES NOT MEAN: resigned, inactive, payroll-inactive, or salary
 * stopped. The card says so in as many words, because "Attendance Required:
 * No" beside an Active badge is exactly the kind of thing somebody will
 * otherwise read as a termination.
 *
 * ADMINISTRATORS ONLY, AND THE UI IS NOT THE CONTROL. Everybody who may see
 * the profile sees the value; only an administrator is offered the switch.
 * The server enforces the same rule on `user_type = 2` directly
 * (`middlewares/admin_only.js`) rather than through a permission key,
 * because a key is grantable and HR must not hold it - so hiding the button
 * is a courtesy, not the boundary.
 */
function AttendanceRequiredSection({ value, isAdmin = false, onChange, saving = false }) {
  const [pending, setPending] = useState(false);
  const required = value !== false;

  const toggle = async () => {
    setPending(true);
    try {
      await onChange(!required);
    } finally {
      setPending(false);
    }
  };

  return (
    <SectionCard
      title="Attendance Required"
      badge={
        <Badge colorScheme={required ? "green" : "purple"} variant="subtle" fontSize="9px">
          {required ? "Yes" : "No"}
        </Badge>
      }
    >
      <Stack spacing={3} fontSize="sm">
        {required ? (
          <Text color="gray.600">
            Biometric attendance is expected. The ordinary attendance rules apply: a shift is
            required, missing punches are raised for review, and shortfalls are deducted.
          </Text>
        ) : (
          <>
            <Text color="gray.600">
              Biometric attendance is not expected of this employee. No shift is required for
              attendance purposes, no missing punch or missing hours is raised, they are excluded
              from the Punch Audit review queue and from attendance attention counts, and payroll
              does not deduct for the absence of punches.
            </Text>
            <Alert status="info" fontSize="xs" borderRadius="md">
              <AlertIcon />
              This employee remains active, payroll-eligible and paid. Attendance Required = No is
              not a resignation, an inactive status or a salary stop.
            </Alert>
          </>
        )}

        {isAdmin ? (
          <Button
            size="xs"
            variant="outline"
            alignSelf="flex-start"
            onClick={toggle}
            isLoading={pending || saving}
          >
            {required ? "Set Attendance Required to No" : "Set Attendance Required to Yes"}
          </Button>
        ) : (
          <Text fontSize="10px" color="gray.500">
            Only an administrator can change this.
          </Text>
        )}
      </Stack>
    </SectionCard>
  );
}

export default AttendanceRequiredSection;
