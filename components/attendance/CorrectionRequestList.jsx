import React from "react";
import {
  Badge,
  Box,
  Button,
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
import {
  canRegularize,
  correctionRequestStatus,
  dayIssue,
  displayDate,
  displayDateTime,
  punchSummary,
  shiftLabel,
  weekday,
} from "../../util/attendanceV2";

/**
 * THE CORRECTION REQUESTS TAB - the dates of the loaded month that need an
 * attendance correction or already have one, and what came of it.
 *
 * The state is `correctionRequestStatus`, read off `correction_state` - the
 * REQUEST row the backend puts beside each day - and the attendance badge
 * beside it is `dayIssue`, the same mapping the month list uses. Neither is
 * decided here. Regularize is offered on exactly the days `canRegularize`
 * allows, which is the existing rule, and the form it opens is the existing
 * `RegularizationForm`.
 *
 * This tab raises no OT and shows none: a correction and an OT claim are two
 * separate records with two separate workflows, and mixing them on one row
 * is what the split was made to avoid.
 */
function StatusBadge({ status }) {
  return (
    <Badge colorScheme={status.color} fontSize="10px" whiteSpace="nowrap">
      {status.label}
    </Badge>
  );
}

function Detail({ status }) {
  return (
    <Stack spacing={0.5} mt={1}>
      {status.reason ? (
        <Text fontSize="10px" color="gray.600">Reason: {status.reason}</Text>
      ) : null}
      {status.rejectionReason ? (
        <Text fontSize="10px" color="red.600">Rejected: {status.rejectionReason}</Text>
      ) : null}
      {status.requestedAt || status.decidedAt ? (
        <Text fontSize="10px" color="gray.500">
          {status.requestedAt ? `Submitted ${displayDateTime(status.requestedAt)}` : null}
          {status.requestedAt && status.decidedAt ? " · " : null}
          {status.decidedAt ? `Decided ${displayDateTime(status.decidedAt)}` : null}
        </Text>
      ) : null}
    </Stack>
  );
}

function RowAction({ day, onRegularize }) {
  if (!canRegularize(day)) return <Text fontSize="10px" color="gray.400">—</Text>;
  return (
    <Button
      size="xs"
      colorScheme="purple"
      fontWeight="600"
      whiteSpace="nowrap"
      onClick={(e) => {
        e.stopPropagation();
        onRegularize(day);
      }}
    >
      Regularize
    </Button>
  );
}

function IssueBadge({ day }) {
  const issue = dayIssue(day);
  if (!issue) return null;
  return (
    <Badge colorScheme={issue.color} fontSize="10px" whiteSpace="nowrap">
      {issue.label}
    </Badge>
  );
}

export default function CorrectionRequestList({ days, loading, onSelect, onRegularize }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6} justify="center">
        <Spinner size="sm" color="purple.500" />
        <Text fontSize="sm" color="gray.600">Loading correction requests…</Text>
      </Flex>
    );
  }
  if (!days || days.length === 0) {
    return (
      <Text fontSize="sm" color="gray.600" py={4}>
        No attendance corrections for this month.
      </Text>
    );
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {days.map((day) => {
          const status = correctionRequestStatus(day);
          return (
            <Box key={day.attendance_date} borderWidth="1px" borderRadius="md" borderColor="gray.200" bg="white" shadow="sm" p={3}>
              <Stack spacing={2}>
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
                <Text fontSize="xs" color="gray.600">{shiftLabel(day)}</Text>
                <Text fontSize="sm" fontFamily="mono" color={punchSummary(day) ? "gray.800" : "gray.400"}>
                  {punchSummary(day) || "No punches"}
                </Text>
                <IssueBadge day={day} />
                <Detail status={status} />
                <Box>
                  <RowAction day={day} onRegularize={onRegularize} />
                </Box>
              </Stack>
            </Box>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <Table size="sm" variant="simple" sx={{ "th, td": { px: 2, py: 1.5 } }}>
        <Thead bg="gray.50">
          <Tr>
            <Th fontSize="10px">Date</Th>
            <Th fontSize="10px">Shift</Th>
            <Th fontSize="10px">Punches</Th>
            <Th fontSize="10px">Attendance</Th>
            <Th fontSize="10px">Request Status</Th>
            <Th fontSize="10px" textAlign="right">Action</Th>
          </Tr>
        </Thead>
        <Tbody>
          {days.map((day) => {
            const status = correctionRequestStatus(day);
            return (
              <Tr key={day.attendance_date} _hover={{ bg: "purple.50" }}>
                <Td whiteSpace="nowrap" fontSize="xs">
                  <Box as="button" type="button" color="purple.700" fontWeight="600" onClick={() => onSelect(day)}>
                    {displayDate(day.attendance_date)}
                  </Box>
                  <Text fontSize="10px" color="gray.500">{weekday(day.attendance_date)}</Text>
                </Td>
                <Td fontSize="xs" color="gray.600" maxW="160px" isTruncated title={shiftLabel(day)}>
                  {shiftLabel(day)}
                </Td>
                <Td fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                  {punchSummary(day) || <Text as="span" color="gray.400">—</Text>}
                </Td>
                <Td><IssueBadge day={day} /></Td>
                <Td>
                  <StatusBadge status={status} />
                  <Detail status={status} />
                </Td>
                <Td textAlign="right">
                  <RowAction day={day} onRegularize={onRegularize} />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}
