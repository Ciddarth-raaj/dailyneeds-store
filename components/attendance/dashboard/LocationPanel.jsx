import React from "react";
import { Box, Flex, Table, Tbody, Td, Text, Th, Thead, Tooltip, Tr } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { PALETTE, ratePercent, rateDetail } from "../../../util/attendanceDashboard";

/**
 * Panel B - Outlet / Warehouse attendance.
 *
 * REAL LOCATION HEADCOUNTS, and the percentage NEVER travels without its
 * counts. Every row shows Checked In, the applicable total, and the rate - and
 * the tooltip spells the pair out again - so "62%" can always be read back to
 * "13 of 21". A rate with no visible denominator is the easiest way for a
 * dashboard to mislead, and the denominator is on the row.
 *
 * AN OUTLET THAT EMPLOYS NOBODY SHOWS A DASH, not 0%. `ratePercent` decides
 * that centrally; a zero denominator is an absence of people, not a failure of
 * attendance.
 *
 * A bar is drawn from the rate, but it is decoration on top of the number
 * rather than the only way to read the row - the counts are text.
 */
export default function LocationPanel({ rows, isOpenDay, onOpenLocation }) {
  const data = Array.isArray(rows) ? rows : [];

  return (
    <CustomContainer title="Outlet / Warehouse Attendance" filledHeader size="xs">
      {data.length === 0 ? (
        <Flex minH="140px" align="center" justify="center">
          <Text fontSize="sm" color="gray.500">
            No locations to show for these filters.
          </Text>
        </Flex>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th fontSize="10px">Location</Th>
                <Th fontSize="10px" isNumeric>
                  In
                </Th>
                <Th fontSize="10px" isNumeric>
                  Of
                </Th>
                <Th fontSize="10px" isNumeric>
                  Rate
                </Th>
                <Th fontSize="10px" isNumeric>
                  {isOpenDay ? "Not in" : "Absent"}
                </Th>
                <Th fontSize="10px" isNumeric>
                  Action
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((row) => (
                <Tr
                  key={row.store_id === null ? "none" : row.store_id}
                  _hover={{ bg: "gray.50", cursor: "pointer" }}
                  onClick={() => onOpenLocation(row)}
                >
                  <Td fontSize="xs" maxW="150px">
                    <Text noOfLines={1}>{row.outlet_name}</Text>
                    <Box mt="3px" h="3px" bg="gray.100" borderRadius="full" overflow="hidden">
                      <Box
                        h="100%"
                        w={`${row.check_in_rate && row.check_in_rate.available ? row.check_in_rate.percent : 0}%`}
                        bg={PALETTE.green.chart}
                      />
                    </Box>
                  </Td>
                  <Td fontSize="xs" isNumeric fontWeight="600" color={PALETTE.green.fg}>
                    {row.checked_in}
                  </Td>
                  <Td fontSize="xs" isNumeric color="gray.600">
                    {row.total}
                  </Td>
                  <Td fontSize="xs" isNumeric>
                    <Tooltip label={rateDetail(row.check_in_rate)} hasArrow>
                      <Text as="span" fontWeight="600">
                        {ratePercent(row.check_in_rate)}
                      </Text>
                    </Tooltip>
                  </Td>
                  <Td fontSize="xs" isNumeric color={isOpenDay ? "orange.600" : PALETTE.red.fg}>
                    {isOpenDay ? row.not_yet_checked_in : row.absent}
                  </Td>
                  <Td fontSize="xs" isNumeric color="orange.600">
                    {row.need_action}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Text fontSize="10px" color="gray.500" mt={2}>
            Rate = Checked In ÷ applicable employees at that location for this date. The denominator
            is the “Of” column.
            {isOpenDay
              ? " While the day is open, the fifth column is “Not in” (shift started, no punch yet) rather than confirmed absence."
              : ""}
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
