import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import { SectionCard } from "./SectionCard";
import useCurrentSalary from "../../../customHooks/useCurrentSalary";
import { presentCurrentSalary } from "../../../util/salaryView";

/**
 * M3 — section 7 of the employee master: Payroll. READ-ONLY.
 *
 * It shows the currently effective APPROVED salary and nothing else: the
 * summary, the four-component structure, what the employee contributes, what
 * the employer contributes on top, and the monthly CTC those produce.
 *
 * THERE IS NO WAY TO CHANGE PAY ON THIS CARD, and that is the point of it
 * rather than an omission. No Edit, no Save, no revision, no approval, no
 * component override, no bulk upload - those are Payroll's own screens and
 * later modules. A second place to type a salary is a second salary.
 *
 * EVERY FIGURE COMES FROM THE M2 RESOLVER. `GET /hr/salary/employee/:id/current`
 * answers with the latest approved revision effective on or before today, so a
 * pending proposal, a rejected one and a future-dated one are all absent by
 * construction - not filtered out here. Nothing on this card is recalculated
 * in the browser, and the legacy `new_employee.salary` column is not read at
 * all; the Employee Master stopped writing it in M1 and does not show it.
 *
 * FOUR STATES, TOLD APART ON PURPOSE:
 *
 *   no permission    a neutral no-access line, and NO request is made - see
 *                    `useCurrentSalary`
 *   loading          a compact spinner
 *   error            "could not be loaded", said as a failure. It must never
 *                    read as "no approved salary": one of those is a record
 *                    somebody still has to create, the other is a server that
 *                    did not answer, and HR would chase the wrong one.
 *   no salary        "No approved salary available." NOT ₹0.00 - nothing
 *                    approved and a salary of nothing are different facts.
 *
 * AND PENDING IS NOT ZERO EITHER. Where the backend could not resolve a
 * statutory figure it says so with a named reason; the cell reads "Pending"
 * with that reason underneath rather than inventing a contribution. See
 * `util/salaryView.js`.
 */

/** One label/figure pair. Pending and Not applicable are styled as answers. */
function Amount({ label, cell, emphasis = false }) {
  if (!cell) return null;
  const tone =
    cell.kind === "pending"
      ? "orange.600"
      : cell.kind === "not_applicable"
      ? "gray.500"
      : "gray.800";

  return (
    <Box minW="0">
      <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
        {label}
      </Text>
      <Text
        fontSize={emphasis ? "lg" : "sm"}
        fontWeight={emphasis ? "bold" : "medium"}
        color={tone}
        wordBreak="break-word"
      >
        {cell.text}
      </Text>
      {cell.reason ? (
        <Text fontSize="10px" color="gray.500" mt={0.5}>
          {cell.reason}
        </Text>
      ) : null}
    </Box>
  );
}

/** A titled group of figures. Two columns on a phone, four on a desktop. */
function Group({ title, columns = { base: 2, md: 4 }, children }) {
  return (
    <Box>
      <Text fontSize="11px" fontWeight="bold" color="gray.600" mb={1.5}>
        {title}
      </Text>
      <SimpleGrid columns={columns} spacingX={4} spacingY={3}>
        {children}
      </SimpleGrid>
    </Box>
  );
}

function PayrollSection({ employeeId, canView = false }) {
  const { current, loading, loaded, denied, error } = useCurrentSalary(employeeId, canView);
  const view = presentCurrentSalary(current);

  const body = () => {
    if (loading) {
      return (
        <Stack direction="row" align="center" spacing={2} py={1}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">
            Loading current salary…
          </Text>
        </Stack>
      );
    }

    // A refusal the server made rather than one this screen predicted. Said as
    // a refusal, never as an empty record.
    if (denied) {
      return (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to view this employee&apos;s salary.
        </Alert>
      );
    }

    /* AN API FAILURE IS NOT AN EMPTY SALARY. Rule 18 of M3, and the reason
       this branch exists at all: both would otherwise render the same
       sentence, and HR would go looking for a salary to enter when what
       actually happened is that the read failed. */
    if (error) {
      return (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          The current salary could not be loaded. This is a problem reading it — it does not mean
          no salary has been approved. Please try again.
        </Alert>
      );
    }

    if (!employeeId) {
      return (
        <Text fontSize="sm" color="gray.600">
          The employee record could not be identified, so no salary was requested.
        </Text>
      );
    }

    if (loaded && !view) {
      return (
        <Text fontSize="sm" color="gray.600">
          No approved salary available.
        </Text>
      );
    }

    if (!view) return null;

    return (
      <Stack spacing={4}>
        {/* ------------------------------------------ A. Salary Summary -- */}
        <Group title="Salary Summary" columns={{ base: 2, md: 4 }}>
          <Amount label="Monthly Gross" cell={view.summary.monthly_gross} />
          {/* Gross / 26, taken from the backend's own `daily_salary`: the
              divisor is a payroll rule and belongs where the rule lives. */}
          <Amount label="Daily Salary (Gross / 26)" cell={view.summary.daily_salary} />
          <Box minW="0">
            <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500">
              Effective From
            </Text>
            <Text fontSize="sm" fontWeight="medium" color="gray.800">
              {view.summary.effective_from || "not recorded"}
            </Text>
          </Box>
          {view.summary.status ? (
            <Box minW="0">
              <Text
                fontSize="10px"
                textTransform="uppercase"
                letterSpacing="0.04em"
                color="gray.500"
              >
                Status
              </Text>
              <Badge colorScheme="green" variant="subtle" fontSize="9px">
                {view.summary.status}
              </Badge>
            </Box>
          ) : null}
        </Group>

        {/* ---------------------------------------- B. Salary Structure -- */}
        <Group title="Salary Structure">
          {view.structure.map((row) => (
            <Amount key={row.label} label={row.label} cell={row.cell} />
          ))}
        </Group>

        {/* ------------------------------------- C. Employee Deductions -- */}
        <Group title="Employee Deductions" columns={{ base: 2, md: 4 }}>
          {view.employeeDeductions.map((row) => (
            <Amount key={row.label} label={row.label} cell={row.cell} />
          ))}
        </Group>

        {/* --------------------------------- D. Employer Contributions -- */}
        <Group title="Employer Contributions" columns={{ base: 2, md: 5 }}>
          {view.employerContributions.map((row) => (
            <Amount key={row.label} label={row.label} cell={row.cell} />
          ))}
        </Group>

        {/* -------------------------------------------- E. Monthly CTC -- */}
        <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={3} py={2}>
          <Amount label="Monthly CTC" cell={view.ctc} emphasis />
        </Box>
      </Stack>
    );
  };

  return (
    <SectionCard
      title="Payroll"
      subtitle="Current approved salary. Read-only — salary is entered, revised and approved from the Payroll menu."
      canView={canView}
      deniedMessage="You do not have permission to view this employee's salary."
    >
      {body()}
    </SectionCard>
  );
}

export default PayrollSection;
