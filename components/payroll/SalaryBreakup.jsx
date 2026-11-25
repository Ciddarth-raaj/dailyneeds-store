import React from "react";
import { Box, SimpleGrid, Stack, Text } from "@chakra-ui/react";

/**
 * M4 — a salary structure, rendered. The one renderer all three Payroll
 * surfaces use: the preview, a history row's detail, and a pending proposal on
 * the approval screen.
 *
 * IT TAKES A PRESENTED VIEW, NOT A RECORD. What comes in is the output of
 * `util/salaryView.js#presentCurrentSalary` - the same presenter the Employee
 * Master's Payroll card uses - so the rules about what a figure reads as are
 * decided once, in a module with no React in it, and are the same rules on
 * every screen that shows pay.
 *
 * THREE ANSWERS, NOT TWO, and this is the whole reason the cells carry a
 * `kind` rather than a string:
 *
 *   an amount        the backend resolved it
 *   Not applicable   the employee is not in that scheme; nothing is outstanding
 *   Pending          the backend could NOT resolve it, and said why. NEVER 0 -
 *                    a contribution nobody has worked out and a contribution
 *                    of zero are different facts, and printing the second for
 *                    the first understates both what the employee is owed and
 *                    what the employer will pay.
 *
 * NOTHING IS CALCULATED HERE. Not a sum, not a percentage, not the daily
 * salary. Every number was produced by `utils/salary_engine.js`.
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
        fontSize={emphasis ? "md" : "sm"}
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

/** A titled group of figures. Two columns on a phone, more on a desktop. */
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

/**
 * The five approved groups, in the approved order.
 *
 * The same five the Employee Master shows, because they describe the same
 * thing: summary, structure, what the employee loses, what the employer adds,
 * and the CTC those two produce.
 */
function SalaryBreakup({ view, compact = false }) {
  if (!view) return null;

  return (
    <Stack spacing={compact ? 3 : 4}>
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
      </Group>

      <Group title="Salary Structure">
        {view.structure.map((rowItem) => (
          <Amount key={rowItem.label} label={rowItem.label} cell={rowItem.cell} />
        ))}
      </Group>

      <Group title="Employee Deductions" columns={{ base: 2, md: 4 }}>
        {view.employeeDeductions.map((rowItem) => (
          <Amount key={rowItem.label} label={rowItem.label} cell={rowItem.cell} />
        ))}
      </Group>

      <Group title="Employer Contributions" columns={{ base: 2, md: 5 }}>
        {view.employerContributions.map((rowItem) => (
          <Amount key={rowItem.label} label={rowItem.label} cell={rowItem.cell} />
        ))}
      </Group>

      <Box borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="gray.50" px={3} py={2}>
        <Amount label="Monthly CTC" cell={view.ctc} emphasis />
      </Box>
    </Stack>
  );
}

export { Amount, Group };
export default SalaryBreakup;
