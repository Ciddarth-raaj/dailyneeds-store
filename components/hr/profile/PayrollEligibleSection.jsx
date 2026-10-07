import React, { useState } from "react";
import { Alert, AlertIcon, Badge, Button, Stack, Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";

/**
 * Whether this employee is paid through DnDS payroll.
 *
 * WHAT `No` MEANS - "Salary Not Applicable" - said on the card. The employee
 * is left out of the payroll population: not listed on Payrun Initialization
 * or Calculation & Review, not counted Ready, Blocked or Attendance Needs
 * Action, not initialized, calculated, paid, given a payslip or put in any
 * payroll report, for every month not already initialized. A month that was
 * already initialized keeps its payrun.
 *
 * WHAT IT DOES NOT MEAN: resigned, inactive or exempt from attendance. The
 * employee stays active in the Employee Master and in attendance, and the
 * card says so, because "Payroll Eligible: No" beside an Active badge is
 * easily read as a termination.
 *
 * ADMINISTRATORS ONLY, AND THE UI IS NOT THE CONTROL. Everybody who may see
 * the profile sees the value; only an administrator is offered the switch,
 * and the server enforces the same rule on `user_type = 2` directly - the
 * same door as Attendance Required.
 */
function PayrollEligibleSection({ value, isAdmin = false, onChange, saving = false }) {
  const [pending, setPending] = useState(false);
  const eligible = value !== false;

  const toggle = async () => {
    setPending(true);
    try {
      await onChange(!eligible);
    } finally {
      setPending(false);
    }
  };

  return (
    <SectionCard
      title="Payroll Eligible"
      badge={
        <Badge colorScheme={eligible ? "green" : "orange"} variant="subtle" fontSize="9px">
          {eligible ? "Yes" : "No — Salary Not Applicable"}
        </Badge>
      }
    >
      <Stack spacing={3} fontSize="sm">
        {eligible ? (
          <Text color="gray.600">
            This employee is paid through DnDS payroll and appears in Payrun Initialization and
            Calculation &amp; Review as usual.
          </Text>
        ) : (
          <>
            <Text color="gray.600">
              Salary is not applicable to this employee. They are left out of payroll entirely: not
              listed or counted in Payrun Initialization or Calculation &amp; Review, not initialized,
              calculated or paid, and not included in payslips or payroll reports. A month already
              initialized before this was set keeps its payrun.
            </Text>
            <Alert status="info" fontSize="xs" borderRadius="md">
              <AlertIcon />
              This employee remains active, and their attendance works as normal. Payroll Eligible =
              No is not a resignation or an inactive status.
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
            {eligible ? "Set Payroll Eligible to No (Salary Not Applicable)" : "Set Payroll Eligible to Yes"}
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

export default PayrollEligibleSection;
