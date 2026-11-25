import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Divider,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { clock, deviceFreshness, feedWarning, formatAge, tone } from "../../../util/attendanceDashboard";

/**
 * Panel F - Recent Punches & Device Sync.
 *
 * DIRECTION IS NOT GUESSED. The attendance engine pairs punches POSITIONALLY
 * over a whole attendance day (1st IN, 2nd OUT, 3rd IN...) and deliberately
 * ignores the terminal's own flag, which the Biomax schema documents as "NOT a
 * direction flag" - staff routinely press the wrong side of a device. This
 * panel is a bounded tail of the latest frames ACROSS employees, so it does
 * not hold a whole day for anybody and cannot establish a position. It
 * therefore says "Punch" and links to the employee's own day, which does hold
 * the whole day and does show IN and OUT.
 *
 * AN EXCLUDED PUNCH IS LABELLED AND COUNTED NOWHERE. A voided punch is shown
 * for diagnosis with a strikethrough and a badge; it takes no part in any
 * check-in figure on this screen.
 *
 * A QUIET DEVICE IS NOT AN OFFLINE DEVICE. Freshness is the terminal's contact
 * with the receiver - any contact, including its own polls - and never whether
 * employees happened to punch. Where there is no recorded contact the badge
 * says "Sync unknown"; it never claims a device is down.
 *
 * THE BADGE IS THE SERVER'S PER-DATE VERDICT, NOT A BROWSER TIMER. An earlier
 * version called a terminal stale after sixty minutes of silence - a threshold
 * invented in this file, which nothing in the system defines and which made
 * the badge depend on when the page happened to be opened. It now shows
 * whether the SERVER could confirm delivery for the selected attendance day,
 * decided against that day's own cutoff, with the last contact time beside it
 * as plain information.
 *
 * TWO TIMESTAMPS, TWO MEANINGS, NEVER CONFLATED. `observed_at` is when the
 * terminal readings were taken - NOW - and today's contact is not evidence
 * that a punch from three weeks ago was delivered. The claim about the
 * selected date is the coverage verdict, and it is labelled as such.
 *
 * WHEN THE FEED CANNOT BE VOUCHED FOR, THE PANEL SAYS SO, and says what it
 * means for the numbers: absence is being withheld for those locations rather
 * than reported.
 */
export default function RecentPunchesPanel({ data, error, onOpenEmployee }) {
  const punches = (data && data.punches) || [];
  const devices = (data && data.devices) || [];
  const warning = data ? feedWarning(data.coverage, data.coverage_available) : null;

  return (
    <CustomContainer title="Recent Punches & Device Sync" filledHeader size="xs">
      {/* A FAILED REQUEST IS NOT AN EMPTY FEED. */}
      {error ? (
        <Alert status="error" fontSize="11px" borderRadius="md" mb={2} py={2}>
          <AlertIcon boxSize="14px" />
          {error}
        </Alert>
      ) : null}
      {data && data.punches_available === false ? (
        <Alert status="error" fontSize="11px" borderRadius="md" mb={2} py={2}>
          <AlertIcon boxSize="14px" />
          The punches for this day could not be read. This is not an empty feed.
        </Alert>
      ) : null}
      {warning ? (
        <Alert status="warning" fontSize="11px" borderRadius="md" mb={2} py={2}>
          <AlertIcon boxSize="14px" />
          {warning}
        </Alert>
      ) : null}

      <Box overflowX="auto" maxH="220px" overflowY="auto">
        {punches.length === 0 ? (
          <Flex minH="90px" align="center" justify="center">
            <Text fontSize="sm" color="gray.500" textAlign="center" px={3}>
              {error || (data && data.punches_available === false)
                ? "Punches could not be loaded for this day."
                : "No punches were recorded for this attendance day and these filters."}
            </Text>
          </Flex>
        ) : (
          <Table size="sm" variant="simple">
            <Thead position="sticky" top={0} bg="white" zIndex={1}>
              <Tr>
                <Th fontSize="10px">Employee</Th>
                <Th fontSize="10px">Punch</Th>
                <Th fontSize="10px">Terminal / Location</Th>
              </Tr>
            </Thead>
            <Tbody>
              {punches.map((p) => (
                <Tr
                  key={p.punch_id}
                  _hover={p.employee_id ? { bg: "gray.50", cursor: "pointer" } : undefined}
                  onClick={p.employee_id ? () => onOpenEmployee(p) : undefined}
                >
                  <Td fontSize="xs" maxW="130px">
                    <Text noOfLines={1} textDecoration={p.excluded ? "line-through" : undefined}>
                      {p.employee_name}
                    </Text>
                    {p.excluded ? (
                      <Tooltip label={p.excluded_reason} hasArrow>
                        <Badge colorScheme="red" fontSize="9px">
                          excluded
                        </Badge>
                      </Tooltip>
                    ) : null}
                  </Td>
                  <Td fontSize="xs" whiteSpace="nowrap">
                    <Tooltip
                      label={`Punched ${p.io_time} · received by the server ${p.received_at}. Direction is shown on the employee's own day screen, which holds the whole day.`}
                      hasArrow
                    >
                      <Box>
                        <Text>{clock(p.io_time)}</Text>
                        <Text fontSize="9px" color="gray.500">
                          {p.direction === "PUNCH" ? "Punch" : p.direction}
                        </Text>
                      </Box>
                    </Tooltip>
                  </Td>
                  <Td fontSize="xs" maxW="140px">
                    <Text noOfLines={1}>{p.device_label || "Unknown terminal"}</Text>
                    <Text fontSize="9px" color="gray.500" noOfLines={1}>
                      {p.outlet_name || "Location not on record"}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>

      <Divider my={2} />

      <Text fontSize="10px" fontWeight="600" color="gray.600" mb={1}>
        Terminal freshness
      </Text>
      {devices.length === 0 ? (
        <Text fontSize="11px" color="gray.500">
          No attendance terminals are on record.
        </Text>
      ) : (
        <Flex direction="column" gap="3px">
          {devices.map((d) => {
            const f = deviceFreshness(d);
            return (
              <Flex key={d.biomax_device_id} align="center" justify="space-between" gap={2}>
                <Flex align="center" gap={2} minW={0}>
                  <Box w="7px" h="7px" borderRadius="full" bg={tone(f.color).chart} flexShrink={0} />
                  <Text fontSize="11px" color="gray.700" noOfLines={1}>
                    {d.label}
                    {d.outlet_name ? ` · ${d.outlet_name}` : ""}
                  </Text>
                </Flex>
                <Tooltip
                  label={`${f.detail} Last contact with the receiver: ${
                    d.last_seen_at || "never recorded"
                  }. Last punch received: ${
                    d.last_punch_at || "never recorded"
                  }. These are observed NOW; the badge is whether delivery for the SELECTED attendance day could be confirmed. A terminal with no punches is not necessarily offline.`}
                  hasArrow
                >
                  <Text fontSize="10px" color={f.warn ? "orange.600" : "gray.500"} flexShrink={0}>
                    {f.label}
                  </Text>
                </Tooltip>
              </Flex>
            );
          })}
        </Flex>
      )}
      <Text fontSize="10px" color="gray.500" mt={2}>
        Punches are the ones the attendance engine dated to this attendance day, so an overnight
        punch appears under the shift date it belongs to. The badge is whether delivery for that
        day could be confirmed, decided against the day&rsquo;s own cutoff and not a timer; terminal
        readings are observed now{data && data.observed_at ? ` (${data.observed_at})` : ""} and are
        not evidence about a past date. No online/offline status is inferred from an absence of
        employee punches.
      </Text>
    </CustomContainer>
  );
}
