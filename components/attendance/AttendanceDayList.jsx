import React from "react";
import {
  Badge,
  Box,
  Flex,
  SimpleGrid,
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
  dayIssue,
  displayDate,
  formatMinutes,
  punchSummary,
  shiftLabel,
  weekday,
} from "../../util/attendanceV2";

/**
 * The month, one entry per date: cards on a phone, a compact table on a
 * desktop. Both are the SAME data and the same tap: the whole card or row
 * opens the Day Detail. There is no separate View button.
 *
 * Punches are rendered dynamically - `09:18 → 14:23 → 15:49 → 22:02` - from
 * the day's effective punch list, however long it is. No Clk1-Clk4 columns.
 *
 * A normal FINAL day has no badge. Only the six agreed issue labels appear,
 * and "Review Required" is not one of them.
 */
function IssueBadge({ day }) {
  const issue = dayIssue(day);
  if (!issue) return null;
  return (
    <Badge colorScheme={issue.color} fontSize="10px" whiteSpace="nowrap">
      {issue.label}
    </Badge>
  );
}

function Metric({ label, value, accent }) {
  return (
    <Box>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="600" color={accent || "gray.800"}>
        {value}
      </Text>
    </Box>
  );
}

function DayCard({ day, onSelect }) {
  const punches = punchSummary(day);
  return (
    <Box
      as="button"
      type="button"
      textAlign="left"
      w="100%"
      borderWidth="1px"
      borderRadius="md"
      borderColor="gray.200"
      bg="white"
      shadow="sm"
      p={3}
      onClick={() => onSelect(day)}
      _hover={{ borderColor: "purple.300" }}
      _active={{ bg: "purple.50" }}
    >
      <Stack spacing={2}>
        <Flex justify="space-between" align="center" gap={2}>
          <Text fontWeight="600" fontSize="sm" color="purple.700">
            {displayDate(day.attendance_date)}
            <Text as="span" color="gray.500" fontWeight="400">
              {" · "}
              {weekday(day.attendance_date)}
            </Text>
          </Text>
          <IssueBadge day={day} />
        </Flex>
        <Text fontSize="sm" color={punches ? "gray.800" : "gray.400"} fontFamily="mono">
          {punches || "No punches"}
        </Text>
        <Text fontSize="xs" color="gray.600">
          {shiftLabel(day)}
        </Text>
        <SimpleGrid columns={4} spacing={2}>
          <Metric label="NRM" value={formatMinutes(day.nrm_minutes)} />
          <Metric label="Worked" value={formatMinutes(day.worked_minutes)} />
          <Metric
            label="Short"
            value={formatMinutes(day.shortage_minutes)}
            accent={Number(day.shortage_minutes) > 0 ? "red.600" : undefined}
          />
          <Metric
            label="OT"
            value={formatMinutes(day.candidate_ot_minutes)}
            accent={Number(day.candidate_ot_minutes) > 0 ? "blue.600" : undefined}
          />
        </SimpleGrid>
      </Stack>
    </Box>
  );
}

function DayTable({ days, onSelect }) {
  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <Table size="sm" variant="simple">
        <Thead bg="gray.50">
          <Tr>
            <Th>Date</Th>
            <Th>Day</Th>
            <Th>Punches</Th>
            <Th>Shift</Th>
            <Th isNumeric>NRM</Th>
            <Th isNumeric>Worked</Th>
            <Th isNumeric>Short</Th>
            <Th isNumeric>OT</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {days.map((day) => (
            <Tr
              key={day.attendance_date}
              cursor="pointer"
              onClick={() => onSelect(day)}
              _hover={{ bg: "purple.50" }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(day);
                }
              }}
            >
              <Td whiteSpace="nowrap">{displayDate(day.attendance_date)}</Td>
              <Td>{weekday(day.attendance_date)}</Td>
              <Td fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                {punchSummary(day) || <Text as="span" color="gray.400">—</Text>}
              </Td>
              <Td fontSize="xs">{shiftLabel(day)}</Td>
              <Td isNumeric>{formatMinutes(day.nrm_minutes)}</Td>
              <Td isNumeric>{formatMinutes(day.worked_minutes)}</Td>
              <Td isNumeric color={Number(day.shortage_minutes) > 0 ? "red.600" : undefined}>
                {formatMinutes(day.shortage_minutes)}
              </Td>
              <Td isNumeric color={Number(day.candidate_ot_minutes) > 0 ? "blue.600" : undefined}>
                {formatMinutes(day.candidate_ot_minutes)}
              </Td>
              <Td>
                <IssueBadge day={day} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}

export default function AttendanceDayList({ days, loading, onSelect }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6} justify="center">
        <Spinner size="sm" color="purple.500" />
        <Text fontSize="sm" color="gray.600">
          Loading attendance…
        </Text>
      </Flex>
    );
  }
  if (!days || days.length === 0) {
    return (
      <Text fontSize="sm" color="gray.600" py={4}>
        No attendance for this period.
      </Text>
    );
  }
  if (isMobile) {
    return (
      <Stack spacing={2}>
        {days.map((day) => (
          <DayCard key={day.attendance_date} day={day} onSelect={onSelect} />
        ))}
      </Stack>
    );
  }
  return <DayTable days={days} onSelect={onSelect} />;
}
