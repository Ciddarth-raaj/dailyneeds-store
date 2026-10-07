import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Box, Button, ButtonGroup, HStack, Stack, Text } from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";

export const PAYROLL_ELIGIBLE_HELP = "No excludes this employee from future payroll months. Attendance remains active.";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = ({ year, month }) => `${MONTHS[Number(month) - 1] || month} ${year}`;
const yesNo = (v) => (v ? "Yes" : "No");

/**
 * Payroll Eligible [ Yes / No ].
 *
 * No leaves the employee out of every payroll month NOT YET INITIALIZED: not
 * listed, counted (Ready / Blocked / Attendance Needs Action), initialized,
 * paid or given a payslip. A month already initialized keeps its payrun and
 * can still be calculated, approved and published. Attendance, the Employee
 * Master record and the active status are untouched.
 *
 * ADMINISTRATORS ONLY, AND THE UI IS NOT THE CONTROL. Everybody who may see
 * the profile sees the value; only an administrator gets the Yes / No
 * control, and the server enforces `user_type = 2` itself - the same door as
 * Attendance Required. Every change is written to the server's audit table
 * (old value, new value, who, when), shown below the control.
 *
 * `loadDetails` returns the server read (`initialized_months`, `history`).
 * Yes -> No first re-reads it, so the warning about already-initialized
 * months is current, not whatever the card loaded earlier.
 */
function PayrollEligibleSection({ value, isAdmin = false, onChange, saving = false, loadDetails }) {
  const [pending, setPending] = useState(false);
  const [details, setDetails] = useState(null);
  const [confirmMonths, setConfirmMonths] = useState(null);
  const eligible = value !== false;

  const refresh = useCallback(async () => {
    if (!loadDetails) return null;
    try {
      const res = await loadDetails();
      if (res && res.code === 200) {
        setDetails(res);
        return res;
      }
    } catch (err) {
      // The value itself comes from the profile; the extras are a courtesy.
    }
    return null;
  }, [loadDetails]);

  useEffect(() => {
    refresh();
  }, [refresh, value]);

  const save = async (next) => {
    setPending(true);
    try {
      await onChange(next);
    } finally {
      setPending(false);
      setConfirmMonths(null);
    }
  };

  const choose = async (next) => {
    if (next === eligible || pending || saving) return;
    if (!next) {
      setPending(true);
      const fresh = await refresh();
      setPending(false);
      const months = (fresh && fresh.initialized_months) || [];
      if (months.length) {
        setConfirmMonths(months);
        return;
      }
    }
    await save(next);
  };

  const history = (details && details.history) || [];

  return (
    <SectionCard title="Payroll Eligible">
      <Stack spacing={3} fontSize="sm">
        <HStack spacing={3}>
          {isAdmin ? (
            <ButtonGroup size="xs" isAttached variant="outline">
              <Button
                colorScheme={eligible ? "green" : "gray"}
                variant={eligible ? "solid" : "outline"}
                aria-pressed={eligible}
                onClick={() => choose(true)}
                isDisabled={pending || saving || confirmMonths !== null}
              >
                Yes
              </Button>
              <Button
                colorScheme={!eligible ? "orange" : "gray"}
                variant={!eligible ? "solid" : "outline"}
                aria-pressed={!eligible}
                onClick={() => choose(false)}
                isDisabled={pending || saving || confirmMonths !== null}
              >
                No
              </Button>
            </ButtonGroup>
          ) : (
            <Text fontWeight="semibold">{yesNo(eligible)}</Text>
          )}
        </HStack>

        <Text color="gray.600" fontSize="xs">
          {PAYROLL_ELIGIBLE_HELP}
        </Text>

        {confirmMonths ? (
          <Alert status="warning" fontSize="xs" borderRadius="md" alignItems="flex-start">
            <AlertIcon />
            <Box>
              <Text>
                This employee is already initialized for {confirmMonths.map(monthLabel).join(", ")}. Those
                months are not affected: they stay in payroll and can still be calculated, approved and
                published. No applies to payroll months not yet initialized.
              </Text>
              <HStack mt={2} spacing={2}>
                <Button size="xs" colorScheme="orange" onClick={() => save(false)} isLoading={pending || saving}>
                  Set to No
                </Button>
                <Button size="xs" variant="ghost" onClick={() => setConfirmMonths(null)} isDisabled={pending || saving}>
                  Cancel
                </Button>
              </HStack>
            </Box>
          </Alert>
        ) : null}

        {!isAdmin ? (
          <Text fontSize="10px" color="gray.500">
            Only an administrator can change this.
          </Text>
        ) : null}

        {history.length ? (
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase" mb={1}>
              Change history
            </Text>
            <Stack spacing={0.5}>
              {history.map((h) => (
                <Text key={h.audit_id} fontSize="xs" color="gray.600">
                  {h.changed_at}: {yesNo(h.old_value)} → {yesNo(h.new_value)}
                  {h.changed_by_name ? ` by ${h.changed_by_name}` : h.changed_by ? ` by employee ${h.changed_by}` : ""}
                </Text>
              ))}
            </Stack>
          </Box>
        ) : null}
      </Stack>
    </SectionCard>
  );
}

export default PayrollEligibleSection;
