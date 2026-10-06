import React from "react";
import { Box, Flex, SimpleGrid, Skeleton, Text, Tooltip } from "@chakra-ui/react";
import { compactINR, monthStatusMeta } from "../../../util/payrollDashboard";

/**
 * The twelve payroll months of the financial year. Each shows its state (a
 * coloured dot and the label in the tooltip) and, once anything is calculated,
 * the stored gross. Clicking a month reloads the whole dashboard for it.
 */
export default function MonthStrip({ months, selected, onSelect, loading }) {
  if (loading && !months) {
    return (
      <SimpleGrid columns={{ base: 3, md: 6 }} spacing={2}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton key={i} height="34px" borderRadius="md" />
        ))}
      </SimpleGrid>
    );
  }
  return (
    <SimpleGrid columns={{ base: 3, md: 6 }} spacing={2} role="tablist" aria-label="Payroll month">
      {(months || []).map((m) => {
        const meta = monthStatusMeta(m.status);
        const active = selected && selected.year === m.year && selected.month === m.month;
        const future = m.status === "FUTURE";
        const detail = `${meta.label}${m.initialized ? ` · ${m.initialized} initialized · ${m.calculated} calculated · ${m.approved} approved` : ""}`;
        return (
          <Tooltip key={`${m.year}-${m.month}`} label={detail} hasArrow openDelay={300}>
            <Box
              as="button"
              type="button"
              role="tab"
              aria-selected={active}
              aria-label={`${m.label}: ${detail}`}
              onClick={() => onSelect({ year: m.year, month: m.month })}
              px={3}
              py={1.5}
              borderWidth={active ? "2px" : "1px"}
              borderColor={active ? "purple.500" : "gray.200"}
              bg={active ? "purple.50" : "white"}
              borderRadius="md"
              opacity={future ? 0.6 : 1}
              _hover={{ borderColor: "purple.300" }}
            >
              <Flex align="center" justify="space-between" gap={2}>
                <Flex align="center" gap={2} minW={0}>
                  <Box w="8px" h="8px" borderRadius="full" bg={meta.color} flexShrink={0} />
                  <Text fontSize="sm" fontWeight={active ? "700" : "500"} isTruncated>
                    {m.label}
                  </Text>
                </Flex>
                <Text fontSize="xs" color="gray.600" fontWeight="600">
                  {m.gross === null || m.gross === undefined ? "—" : compactINR(m.gross)}
                </Text>
              </Flex>
            </Box>
          </Tooltip>
        );
      })}
    </SimpleGrid>
  );
}
