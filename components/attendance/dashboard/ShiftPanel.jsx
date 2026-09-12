import React from "react";
import { Badge, Box, Flex, Table, Tbody, Td, Text, Th, Thead, Tooltip, Tr } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { PALETTE, ratePercent, rateDetail } from "../../../util/attendanceDashboard";

/**
 * Panel C - Shift-wise attendance, over the EFFECTIVE configured shifts.
 *
 * THE SHIFTS ARE THE ONES THAT ACTUALLY APPLIED ON THIS DATE, resolved by the
 * server through the dated assignment history and that shift's dated
 * configuration version - not whatever shift each employee happens to be on
 * today. Recalculating a March date under an April roster change is exactly
 * the defect the attendance engine's dated resolution exists to prevent, and
 * this panel inherits that.
 *
 * SETUP GAPS ARE A VISIBLE ROW, never a silent loss. An employee with no
 * assignment for the date, or whose shift has no schedule row for that
 * weekday, gets a row that NAMES the fault and is badged as a setup gap -
 * grouping them under a shift's own name would list them beside colleagues
 * whose roster is fine and hide the problem. The columns therefore still add
 * up to the whole population, which is asserted under the table.
 */
export default function ShiftPanel({ rows, total, isOpenDay, onOpenShift }) {
  const data = Array.isArray(rows) ? rows : [];
  const covered = data.reduce((a, r) => a + (Number(r.expected) || 0), 0);

  return (
    <CustomContainer title="Shift-wise Attendance" filledHeader size="xs">
      {data.length === 0 ? (
        <Flex minH="140px" align="center" justify="center">
          <Text fontSize="sm" color="gray.500">
            No shifts to show for these filters.
          </Text>
        </Flex>
      ) : (
        <Box overflowX="auto">
          <Table size="sm" variant="simple">
            <Thead>
              <Tr>
                <Th fontSize="10px" w="42%">
                  Shift
                </Th>
                <Th fontSize="10px" isNumeric>
                  Expected
                </Th>
                <Th fontSize="10px" isNumeric>
                  In
                </Th>
                <Th fontSize="10px" isNumeric>
                  {isOpenDay ? "Not in" : "Absent"}
                </Th>
                <Th fontSize="10px" isNumeric>
                  Rate
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {data.map((row) => (
                <Tr
                  key={`${row.work_shift_id}-${row.shift_label}`}
                  _hover={{ bg: "gray.50", cursor: "pointer" }}
                  onClick={() => onOpenShift(row)}
                  bg={row.setup_gap ? "orange.50" : undefined}
                >
                  <Td fontSize="xs">
                    <Flex align="center" gap={1} wrap="wrap">
                      {/* The gap rows carry the whole explanation of the fault
                          ("2-10 - no schedule row for this weekday"), so they
                          wrap rather than truncate. */}
                      <Text noOfLines={3} lineHeight="1.25">
                        {row.shift_label}
                      </Text>
                      {row.setup_gap ? (
                        <Badge colorScheme="orange" fontSize="9px">
                          setup gap
                        </Badge>
                      ) : null}
                    </Flex>
                  </Td>
                  <Td fontSize="xs" isNumeric color="gray.600">
                    {row.expected}
                  </Td>
                  <Td fontSize="xs" isNumeric fontWeight="600" color={PALETTE.green.fg}>
                    {row.checked_in}
                  </Td>
                  <Td fontSize="xs" isNumeric color={isOpenDay ? "orange.600" : PALETTE.red.fg}>
                    {isOpenDay ? row.not_yet_checked_in : row.absent}
                  </Td>
                  <Td fontSize="xs" isNumeric>
                    <Tooltip label={rateDetail(row.check_in_rate)} hasArrow>
                      <Text as="span" fontWeight="600">
                        {ratePercent(row.check_in_rate)}
                      </Text>
                    </Tooltip>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          <Text fontSize="10px" color="gray.500" mt={2}>
            {covered} of {total} applicable employees are covered by these rows
            {covered === total ? " — nobody is missing from this breakdown." : "."} Employees whose
            shift could not be resolved appear as a setup gap rather than being dropped.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
