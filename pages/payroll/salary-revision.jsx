import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import EmployeePicker from "../../components/payroll/EmployeePicker";
import SalaryRevisionForm from "../../components/payroll/SalaryRevisionForm";
import SalaryHistoryTable from "../../components/payroll/SalaryHistoryTable";
import usePayrollActor from "../../customHooks/usePayrollActor";
import useEmployeeSalaryRecord from "../../customHooks/useEmployeeSalaryRecord";
import {
  canAddSalary,
  canEditPendingSalary,
  canOpenRevisionScreen,
  canOverrideComponents,
} from "../../util/payrollAccess";
import { isOpeningSalary } from "../../util/salaryRevisionForm";
import { pendingRecord } from "../../util/salaryHistoryView";
import { formatEffectiveFrom, formatMoney } from "../../util/salaryView";

/**
 * M4 — Salary Revision & History.
 *
 * WHERE SALARY IS ENTERED. The one place in the application where a salary is
 * proposed or amended: pick an employee, see what they are on, propose what
 * they should be on, and read every revision there has ever been. The Employee
 * Master's Payroll section shows the same current figure and remains entirely
 * read-only — a second place to type a salary is a second salary.
 *
 * IT IS NOT WHERE SALARY IS AGREED. Everything proposed here lands PENDING,
 * including a proposal by an administrator, and it is approved or rejected on
 * Salary Approval by somebody else. Proposing a pay change and agreeing to it
 * are two decisions with two permissions, and collapsing them would make
 * `approve_salary_revision` decorative.
 *
 * THREE PERMISSIONS, EACH DOING ITS OWN JOB:
 *
 *   view_salary                       opens the screen, read-only
 *   add_salary                        the form for a new proposal
 *   edit_salary                       amending the PENDING one
 *   manual_salary_component_override  the manual breakup, and only that
 *
 * Somebody with only `view_salary` gets a perfectly useful screen: the current
 * salary and the full audited history, with no form. That is a state worth
 * having rather than a refusal.
 *
 * THE SCREEN NEVER DECIDES AN AMOUNT. Every figure it shows came from the
 * server — the preview endpoint, the resolver, or a stored record.
 */
function SalaryRevisionAndHistory() {
  const toast = useToast();
  const actor = usePayrollActor();

  const mayOpen = canOpenRevisionScreen(actor);
  const mayAdd = canAddSalary(actor);
  const mayEdit = canEditPendingSalary(actor);
  const mayOverride = canOverrideComponents(actor);

  const [employeeId, setEmployeeId] = useState(null);

  const { history, current, loading, loaded, denied, error, refresh } = useEmployeeSalaryRecord(
    employeeId,
    mayOpen
  );

  const isOpening = isOpeningSalary(history);
  const pending = pendingRecord(history);

  const onSaved = async (message) => {
    toast({ title: message, status: "success", duration: 5000, isClosable: true });
    // The history, the current record and the pending proposal all just
    // changed. Re-read them rather than patching state, so what is on screen
    // is what the server holds.
    await refresh();
  };

  const body = () => {
    if (!mayOpen) {
      return (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to view salary records. This screen needs View Employees and
          View Salary.
        </Alert>
      );
    }

    return (
      <Stack spacing={4}>
        <EmployeePicker selectedId={employeeId} onSelect={setEmployeeId} />

        {!employeeId ? (
          <Text fontSize="sm" color="gray.600">
            Select an employee to see their salary and propose a revision.
          </Text>
        ) : null}

        {employeeId && loading ? (
          <Stack direction="row" align="center" spacing={2}>
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.600">
              Loading salary record…
            </Text>
          </Stack>
        ) : null}

        {/* A refusal the server made, said as a refusal. */}
        {employeeId && denied ? (
          <Alert status="info" fontSize="sm">
            <AlertIcon />
            You do not have permission to view this employee&apos;s salary.
          </Alert>
        ) : null}

        {/* AN API FAILURE IS NOT AN EMPTY HISTORY. One of those is a record
            somebody has to create; the other is a server that did not answer,
            and HR would chase the wrong one. */}
        {employeeId && error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error} This is a problem reading the record — it does not mean no salary has been
            approved.
          </Alert>
        ) : null}

        {employeeId && loaded ? (
          <Stack spacing={4}>
            <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={3} py={2}>
              <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
                <Box minW="0">
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Current Approved Monthly Gross
                  </Text>
                  <Text fontSize="md" fontWeight="bold" color="gray.800">
                    {current ? formatMoney(current.monthly_gross) : "None approved yet"}
                  </Text>
                </Box>
                <Box minW="0">
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Effective From
                  </Text>
                  <Text fontSize="sm" color="gray.800">
                    {current ? formatEffectiveFrom(current.effective_from) : "—"}
                  </Text>
                </Box>
                <Box minW="0">
                  <Text fontSize="10px" textTransform="uppercase" color="gray.500">
                    Next proposal
                  </Text>
                  {/* One proposal at a time: while one is outstanding, the next
                      thing that happens is that somebody decides it. */}
                  <Badge
                    colorScheme={pending ? "orange" : isOpening ? "blue" : "purple"}
                    fontSize="9px"
                  >
                    {pending ? "Awaiting decision" : isOpening ? "Opening Salary" : "Revision"}
                  </Badge>
                </Box>
              </SimpleGrid>
            </Box>

            <CustomContainer
              title={
                pending
                  ? "Pending Proposal"
                  : isOpening
                  ? "Opening Salary"
                  : "Propose a Revision"
              }
              subtitle={
                pending
                  ? "An employee may have one salary proposal at a time. This one is amended, approved or rejected before another can be raised."
                  : "Calculated by the server. Everything proposed here is created as Pending and needs a separate approval."
              }
              smallHeader
            >
              <SalaryRevisionForm
                employeeId={employeeId}
                isOpening={isOpening}
                currentSalary={current}
                pending={pending}
                canAdd={mayAdd}
                canEdit={mayEdit}
                canOverride={mayOverride}
                onSaved={onSaved}
              />
            </CustomContainer>

            <CustomContainer
              title="Salary History"
              subtitle="Permanent and newest first. Nothing here is ever edited or deleted — a correction is a new revision."
              smallHeader
            >
              <SalaryHistoryTable history={history} current={current} />
            </CustomContainer>
          </Stack>
        ) : null}
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="Salary Revision & History">
      <CustomContainer
        title="Salary Revision & History"
        subtitle="Enter an opening salary or propose a revision. Approval happens on Salary Approval."
      >
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default SalaryRevisionAndHistory;
