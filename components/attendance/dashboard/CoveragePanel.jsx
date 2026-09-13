import React from "react";
import { Alert, AlertIcon, Badge, Box, Flex, Table, Tbody, Td, Text, Th, Thead, Tooltip, Tr } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { PALETTE, deliveryBadge } from "../../../util/attendanceDashboard";

/**
 * Location-and-role coverage — the main comparison.
 *
 * One row per location × role: expected now, recorded IN against that
 * schedule, and the gap. Roles are the real designations on the employee
 * master; nothing is grouped by guesswork, and a recorded-IN cashier is not
 * described as an operating counter, because nothing in this data says so.
 *
 * Every count opens its exact filtered list.
 */
export default function CoveragePanel({ rows, onOpen }) {
  const data = Array.isArray(rows) ? rows : [];

  return (
    <CustomContainer title="Coverage by location and role" filledHeader size="xs">
      {data.length === 0 ? (
        <Flex minH="120px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            No employees are scheduled right now for these filters.
          </Text>
        </Flex>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th fontSize="10px" w="46%">
                  Location / role
                </Th>
                <Th fontSize="10px" isNumeric>
                  Expected
                </Th>
                <Th fontSize="10px" isNumeric>
                  In
                </Th>
                <Th fontSize="10px" isNumeric>
                  Gap
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((row) => {
                const badge = deliveryBadge(row.delivery);
                return (
                  <Tr
                    key={`${row.store_id}-${row.designation_id}`}
                    _hover={{ bg: "gray.50", cursor: "pointer" }}
                    onClick={() => onOpen(row)}
                    title="Show these employees"
                  >
                    <Td fontSize="xs">
                      <Text noOfLines={2} lineHeight="1.25">
                        {row.outlet_name} — {row.designation_name}
                      </Text>
                      {badge.warn ? (
                        <Tooltip label="Figures for this location understate attendance." hasArrow>
                          <Badge colorScheme="orange" fontSize="9px" mt="2px">
                            {badge.label}
                          </Badge>
                        </Tooltip>
                      ) : null}
                    </Td>
                    <Td fontSize="xs" isNumeric color="gray.700">
                      {row.expected_now}
                    </Td>
                    <Td fontSize="xs" isNumeric fontWeight="600" color={PALETTE.green.fg}>
                      {row.recorded_in}
                      {/* RECORDED IN SOMEWHERE, BUT NOT HERE. Shown beside this
                          location's figure and never inside it: an IN whose place
                          nobody can establish is not cover of this outlet. */}
                      {Number(row.recorded_in_location_unverified) > 0 ? (
                        <Tooltip
                          label="Recorded IN, but the punch location is not established — not counted as cover of this location."
                          hasArrow
                        >
                          <Text fontSize="9px" color="gray.500" fontWeight="400">
                            +{row.recorded_in_location_unverified} unverified
                          </Text>
                        </Tooltip>
                      ) : null}
                    </Td>
                    <Td
                      fontSize="xs"
                      isNumeric
                      fontWeight={row.gap > 0 ? "700" : "400"}
                      color={row.gap > 0 ? PALETTE.amber.fg : "gray.400"}
                    >
                      {row.gap}
                    </Td>
                  </Tr>
                );
              })}
            </Tbody>
          </Table>

          {data.some((r) => r.reconciles === false) ? (
            <Alert status="error" fontSize="xs" mt={2} borderRadius="md">
              <AlertIcon />
              A row does not add up to its expected headcount. Please report this.
            </Alert>
          ) : null}

          <Text fontSize="10px" color="gray.500" mt={2}>
            Expected = employees whose shift interval contains this moment. In = recorded IN at
            that location, and only where the punch location is established. Gap = the rest,
            broken down in the detail list — it is “not recorded IN against schedule”, not absence
            and not a confirmed shortage. A recorded IN does not mean somebody is at a counter.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
