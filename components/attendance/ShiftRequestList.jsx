import React from "react";
import {
  Badge,
  Box,
  Flex,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";
import { displayDate, displayDateTime, shiftLabel, shiftRequestStatus, weekday } from "../../util/attendanceV2";

/**
 * THE SHIFT REQUESTS TAB - the dates this employee asked to work another
 * shift on, and what came of each.
 *
 * THE THIRD MIRROR of the Correction and OT tabs, over the same one read:
 * every field here is one the server put on the day
 * (`shift_change_state`, `shift_change_reason`, `shift_change_decided_at`,
 * `shift_change_rejection_remarks`), and there is no arithmetic in this file
 * at all.
 *
 * IT RAISES NOTHING. Unlike the other two tabs there is no button here: a
 * shift request is for a date the employee chooses, not one the engine has
 * flagged, so it is raised from "Request a shift change" above with the date
 * as a field. That is also why a date nobody asked about is not a row -
 * there is no "still needs one" case for a shift.
 *
 * AND IT DECIDES NOTHING ABOUT THE DAY. A pending request is not an issue
 * with the date: the day goes on being calculated under the employee's
 * ordinary shift until the final approval, which is why no attendance status
 * appears on this tab.
 */
function StatusBadge({ status }) {
  return (
    <Badge colorScheme={status.color} fontSize="10px" whiteSpace="nowrap">
      {status.label}
    </Badge>
  );
}

function Reasons({ status }) {
  if (!status.reason && !status.rejectionReason) return null;
  return (
    <Stack spacing={0.5} mt={1}>
      {status.reason ? (
        <Text fontSize="10px" color="gray.600">
          Reason: {status.reason}
        </Text>
      ) : null}
      {status.rejectionReason ? (
        <Text fontSize="10px" color="red.600">
          Rejected: {status.rejectionReason}
        </Text>
      ) : null}
    </Stack>
  );
}

function Timestamps({ status }) {
  if (!status.requestedAt && !status.decidedAt) return null;
  return (
    <Text fontSize="10px" color="gray.500">
      {status.requestedAt ? `Submitted ${displayDateTime(status.requestedAt)}` : null}
      {status.requestedAt && status.decidedAt ? " · " : null}
      {status.decidedAt ? `Decided ${displayDateTime(status.decidedAt)}` : null}
    </Text>
  );
}

/**
 * The shift the day was calculated under.
 *
 * On an APPROVED request that IS the requested shift, because the override
 * is in force; while it is pending it is still the employee's normal one.
 * The row shows the day's own shift rather than naming the requested one
 * from an id the browser cannot resolve to a name.
 */
const dayShift = (day) => shiftLabel(day) || "—";

export default function ShiftRequestList({ days, loading, onSelect }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6} justify="center">
        <Spinner size="sm" color="purple.500" />
        <Text fontSize="sm" color="gray.600">Loading…</Text>
      </Flex>
    );
  }
  if (!days || days.length === 0) {
    return (
      <Text fontSize="sm" color="gray.600" py={4}>
        You have not requested a shift change this month.
      </Text>
    );
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {days.map((day) => {
          const status = shiftRequestStatus(day);
          return (
            <Box key={day.attendance_date} borderWidth="1px" borderRadius="md" borderColor="gray.200" bg="white" shadow="sm" p={3}>
              <Flex justify="space-between" align="center" gap={2}>
                <Box as="button" type="button" textAlign="left" onClick={() => onSelect(day)}>
                  <Text fontWeight="600" fontSize="sm" color="purple.700">
                    {displayDate(day.attendance_date)}
                    <Text as="span" color="gray.500" fontWeight="400">
                      {" · "}
                      {weekday(day.attendance_date)}
                    </Text>
                  </Text>
                </Box>
                <StatusBadge status={status} />
              </Flex>
              <Text fontSize="xs" color="gray.600">
                {dayShift(day)}
              </Text>
              <Reasons status={status} />
              <Timestamps status={status} />
            </Box>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <Table size="sm" variant="simple">
        <Thead bg="gray.50">
          <Tr>
            <Th>Date</Th>
            <Th>Shift for the date</Th>
            <Th>Status</Th>
            <Th>Reason</Th>
            <Th>Submitted / Decided</Th>
          </Tr>
        </Thead>
        <Tbody>
          {days.map((day) => {
            const status = shiftRequestStatus(day);
            return (
              <Tr
                key={day.attendance_date}
                cursor="pointer"
                _hover={{ bg: "purple.50" }}
                onClick={() => onSelect(day)}
              >
                <Td whiteSpace="nowrap">
                  {displayDate(day.attendance_date)}
                  <Text as="span" color="gray.500">{` · ${weekday(day.attendance_date)}`}</Text>
                </Td>
                <Td fontSize="xs">{dayShift(day)}</Td>
                <Td><StatusBadge status={status} /></Td>
                <Td fontSize="xs" maxW="280px">
                  <Reasons status={status} />
                </Td>
                <Td fontSize="xs" whiteSpace="nowrap">
                  <Timestamps status={status} />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}
