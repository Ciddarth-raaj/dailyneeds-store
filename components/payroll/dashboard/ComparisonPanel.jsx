import React from "react";
import { Box, Flex, Select, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { direction, formatINR, shortMonthLabel } from "../../../util/payrollDashboard";

/**
 * PAYROLL COMPARISON: the selected month against another payroll month, under
 * the same Location / Department / Designation filters. Every value and the
 * difference are the server's; the arrow only reads the sign.
 */
const ARROW = { up: "▲", down: "▼", flat: "" };
const TONE = { up: "green.600", down: "red.600", flat: "gray.500" };

export default function ComparisonPanel({ comparison, choices, compareKey, onCompareChange }) {
  if (!comparison) return null;
  const fmt = (m, v) => (v === null || v === undefined ? "—" : m.money ? formatINR(v) : v);
  const count = comparison.metrics.find((m) => m.key === "EMPLOYEE_COUNT");
  const compareEmpty = count && Number(count.compare) === 0;
  return (
    <CustomContainer
      title="Payroll Comparison"
      subtitle={comparison.base.label}
      size="xs"
      filledHeader
      rightSection={
        <Flex align="center" gap={2}>
          <Text fontSize="xs" color="gray.600" display={{ base: "none", md: "block" }}>
            Compare with
          </Text>
          <Select size="xs" w="150px" bg="white" value={compareKey} onChange={(e) => onCompareChange(e.target.value)} aria-label="Compare with month">
            {(choices || []).map((c) => (
              <option key={c.key} value={c.key}>
                {c.label}
              </option>
            ))}
          </Select>
        </Flex>
      }
    >
      {compareEmpty ? (
        <Text fontSize="xs" color="orange.700" bg="orange.50" px={3} py={2} borderRadius="md" mb={2}>
          {comparison.compare.label} has no payroll for these filters - its figures read as zero.
        </Text>
      ) : null}
      <Box overflowX="auto">
        <Table size="sm">
          <Thead>
            <Tr>
              <Th>Metric</Th>
              <Th isNumeric title={comparison.base.label}>{shortMonthLabel(comparison.base.year, comparison.base.month)}</Th>
              <Th isNumeric title={comparison.compare.label}>{shortMonthLabel(comparison.compare.year, comparison.compare.month)}</Th>
              <Th isNumeric>Change</Th>
            </Tr>
          </Thead>
          <Tbody>
            {comparison.metrics.map((m) => {
              const dir = direction(m.difference);
              return (
                <Tr key={m.key}>
                  <Td fontSize="sm" whiteSpace="nowrap">{m.label}</Td>
                  <Td isNumeric fontSize="sm">
                    {m.tracked ? fmt(m, m.base) : <Text as="span" color="gray.400">Not tracked</Text>}
                  </Td>
                  <Td isNumeric fontSize="sm">
                    {m.tracked ? fmt(m, m.compare) : "—"}
                  </Td>
                  <Td isNumeric fontSize="sm" color={TONE[dir]} fontWeight="600" whiteSpace="nowrap">
                    {m.tracked && dir !== "flat" ? (
                      <>
                        {ARROW[dir]} {dir === "up" ? "+" : ""}
                        {fmt(m, m.difference)}
                        {m.percent !== null && m.percent !== undefined ? (
                          <Text as="span" fontSize="xs" fontWeight="400" ml={1}>
                            ({m.percent > 0 ? "+" : ""}
                            {m.percent}%)
                          </Text>
                        ) : null}
                      </>
                    ) : (
                      "—"
                    )}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </CustomContainer>
  );
}
