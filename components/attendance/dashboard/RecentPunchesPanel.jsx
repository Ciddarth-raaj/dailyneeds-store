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
 * A QUIET DEVICE IS NOT AN OFFLINE DEVICE. Freshness is read from the
 * terminal's `last_seen_at` - any contact with the receiver, including its own
 * polls - and never from whether employees happened to punch. Where the
 * receiver has no record of a contact at all, the badge says "Sync unknown";
 * it never claims a device is down, because nothing in the data supports that.
 *
 * WHEN THE FEED CANNOT BE VOUCHED FOR, THE PANEL SAYS SO. If no terminal has
 * been heard from recently, a warning appears - because in that case a missing
 * check-in may be a fact about the feed rather than about a person, and the
 * rest of this dashboard should be read with that in mind.
 */
export default function RecentPunchesPanel({ data, onOpenEmployee }) {
  const punches = (data && data.punches) || [];
  const devices = (data && data.devices) || [];
  const warning = feedWarning(devices);

  return (
    <CustomContainer title="Recent Punches & Device Sync" filledHeader size="xs">
      {warning ? (
        <Alert status="warning" fontSize="11px" borderRadius="md" mb={2} py={2}>
          <AlertIcon boxSize="14px" />
          {warning}
        </Alert>
      ) : null}

      <Box overflowX="auto" maxH="220px" overflowY="auto">
        {punches.length === 0 ? (
          <Flex minH="90px" align="center" justify="center">
            <Text fontSize="sm" color="gray.500">
              No punches have been received for this view.
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
                  label={`Last contact with the receiver: ${
                    d.last_seen_at || "never recorded"
                  }. Last punch received: ${
                    d.last_punch_at || "never recorded"
                  } (${formatAge(d.last_punch_age_minutes)}). A terminal with no punches is not necessarily offline.`}
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
        Freshness is the terminal&rsquo;s last contact with the receiver, not whether anybody
        punched. No online/offline status is inferred from an absence of employee punches.
      </Text>
    </CustomContainer>
  );
}
