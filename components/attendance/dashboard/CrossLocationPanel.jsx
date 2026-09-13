import React from "react";
import { Box, Flex, Table, Tbody, Td, Text, Th, Thead, Tr } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";

/**
 * Cross-location attendance, and what it deliberately does NOT do.
 *
 * Somebody recorded IN at a branch other than their expected one is shown
 * here for VERIFICATION. Nothing is transferred: their assignment is not
 * rewritten, their staffing credit is not moved or duplicated, and no payroll
 * figure changes. At their scheduled location they remain a gap, distinct from
 * "no check-in"; at the receiving location they appear under additional
 * arrivals until somebody establishes where their duty actually lay.
 */
export default function CrossLocationPanel({ arrivals, additional }) {
  const rows = Array.isArray(arrivals) ? arrivals : [];
  const early = (additional && additional.early) || [];
  const noShift = (additional && additional.no_active_shift) || [];

  const empty = rows.length === 0 && early.length === 0 && noShift.length === 0;

  return (
    <CustomContainer title="Cross-location and additional arrivals" filledHeader size="xs">
      {empty ? (
        <Flex minH="100px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Nobody is recorded IN away from their expected location or outside an active shift.
          </Text>
        </Flex>
      ) : (
        <Box>
          {rows.length > 0 ? (
            <Box overflowX="auto" mb={2}>
              <Table size="sm" variant="simple">
                <Thead>
                  <Tr>
                    <Th fontSize="10px">Employee</Th>
                    <Th fontSize="10px">Expected</Th>
                    <Th fontSize="10px">Recorded</Th>
                    <Th fontSize="10px">At</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {rows.map((r) => (
                    <Tr key={r.employee_id}>
                      <Td fontSize="xs">
                        <Text noOfLines={1}>{r.employee_name}</Text>
                        <Text fontSize="9px" color="gray.500">
                          {r.designation_name}
                        </Text>
                      </Td>
                      <Td fontSize="xs">
                        <Text noOfLines={1}>{r.expected_outlet_name || "—"}</Text>
                      </Td>
                      <Td fontSize="xs">
                        <Text noOfLines={1}>{r.recorded_outlet_name || "—"}</Text>
                      </Td>
                      <Td fontSize="xs">{r.recorded_at || "—"}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          ) : null}

          {early.length > 0 ? (
            <Text fontSize="11px" color="gray.700" mb={1}>
              <strong>{early.length}</strong> recorded IN before their shift starts
              {early[0] && early[0].scheduled_start ? ` (earliest starts ${early[0].scheduled_start})` : ""}
            </Text>
          ) : null}
          {noShift.length > 0 ? (
            <Text fontSize="11px" color="gray.700">
              <strong>{noShift.length}</strong> still recorded IN with no active shift
            </Text>
          ) : null}

          <Text fontSize="10px" color="gray.500" mt={2}>
            Nobody is transferred, credited twice or reassigned here — these rows are for
            verification. Somebody still recorded IN after their shift is a follow-up item, not
            proof that they are present or that overtime has been approved.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
