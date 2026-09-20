import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
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
import { ChevronRightIcon, ChevronDownIcon } from "@chakra-ui/icons";
import CustomContainer from "../../CustomContainer";
import { PALETTE, deliveryBadge, groupCoverageByOutlet } from "../../../util/attendanceDashboard";

/**
 * Location-and-role coverage — the main comparison, collapsed store-wise.
 *
 * WHY IT IS AN ACCORDION. The server sends one row per location × role, which
 * is the grain the drilldown needs: "Warehouse / GRN Executive" is the exact
 * list a manager opens. As a screen it was unreadable — eight outlets times a
 * dozen designations is a hundred rows, and finding your own branch meant
 * scrolling past everybody else's. So each location is one parent row carrying
 * its Expected, In and Gap, and its roles sit underneath it, hidden until
 * asked for.
 *
 * EVERY LOCATION STARTS CLOSED. Not "all but the worst one": an accordion that
 * opens something on load teaches the reader that the open one is special, and
 * the next person to glance at the screen reads a pre-selected outlet as the
 * one that needs them. The reader opens what they are responsible for.
 *
 * OPENING ONE DOES NOT OPEN THE REST. The state is a set of open keys and a
 * click toggles exactly one, so two outlets can be compared side by side and
 * neither is closed by opening the other.
 *
 * THE PARENT TOTALS ARE THE CHILD ROWS, ADDED UP — `groupCoverageByOutlet`,
 * summing the very rows drawn beneath it, and never the snapshot's own
 * headline figures. A second source would be a second answer, and the first
 * time a filter narrowed one and not the other a parent would disagree with
 * the rows it is sitting on. This also makes the filters free: rows arrive
 * already filtered in SQL, so a designation filter yields parents that total
 * only the matching roles, and a single-outlet filter yields one parent row —
 * closed, like every other, never a flat list again.
 *
 * ROAMING EMPLOYEES ARE NOT IN THIS TABLE. An employee whose duty is not tied
 * to one outlet is not in `rostered` on the server, so no sum here can include
 * one. They are reported beneath it, under their own name, because a headcount
 * that shrank for an invisible reason is worse than one that says why.
 *
 * Every role row still opens its exact filtered list. The parent row does not:
 * clicking it opens and closes the group, which is the one thing a reader
 * expects a chevron to do.
 */
export default function CoveragePanel({ rows, roaming, onOpen }) {
  const groups = groupCoverageByOutlet(rows);
  const [openKeys, setOpenKeys] = useState(() => new Set());

  const toggle = (key) => {
    setOpenKeys((current) => {
      const next = new Set(current);
      // Exactly one key moves. Everything else keeps the state the reader put
      // it in — including other open outlets.
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const roamingTotal = roaming && Number(roaming.total) > 0 ? roaming : null;

  return (
    <CustomContainer title="Coverage by location and role" filledHeader size="xs">
      {groups.length === 0 ? (
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
              {groups.map((group) => {
                const open = openKeys.has(group.group_key);
                const badge = deliveryBadge(group.delivery);
                const Chevron = open ? ChevronDownIcon : ChevronRightIcon;

                return (
                  <React.Fragment key={group.group_key}>
                    {/* THE PARENT. Heavier than its children on purpose: this is
                        the row somebody scans for, and the three numbers are
                        readable without opening anything. */}
                    <Tr
                      data-testid="coverage-outlet-row"
                      data-outlet-key={group.group_key}
                      role="button"
                      tabIndex={0}
                      aria-expanded={open}
                      aria-label={`${group.outlet_name}, ${open ? "collapse" : "expand"} roles`}
                      bg="gray.50"
                      _hover={{ bg: "gray.100", cursor: "pointer" }}
                      onClick={() => toggle(group.group_key)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggle(group.group_key);
                        }
                      }}
                      title={open ? "Hide roles" : "Show roles"}
                    >
                      <Td fontSize="xs">
                        <Flex align="center" gap={1.5}>
                          <Chevron color="gray.600" aria-hidden="true" />
                          <Text fontWeight="700" color="#1B2A5B" noOfLines={1}>
                            {group.outlet_name}
                          </Text>
                          <Text fontSize="9px" color="gray.500" whiteSpace="nowrap">
                            {group.roles.length} {group.roles.length === 1 ? "role" : "roles"}
                          </Text>
                        </Flex>
                        {badge.warn ? (
                          <Tooltip label="Figures for this location understate attendance." hasArrow>
                            <Badge colorScheme="orange" fontSize="9px" mt="2px">
                              {badge.label}
                            </Badge>
                          </Tooltip>
                        ) : null}
                      </Td>
                      <Td fontSize="xs" isNumeric fontWeight="700" color="gray.700">
                        {group.expected_now}
                      </Td>
                      <Td fontSize="xs" isNumeric fontWeight="700" color={PALETTE.green.fg}>
                        {group.recorded_in}
                        {group.recorded_in_location_unverified > 0 ? (
                          <Tooltip
                            label="Recorded IN, but the punch location is not established — not counted as cover of this location."
                            hasArrow
                          >
                            <Text fontSize="9px" color="gray.500" fontWeight="400">
                              +{group.recorded_in_location_unverified} unverified
                            </Text>
                          </Tooltip>
                        ) : null}
                      </Td>
                      <Td
                        fontSize="xs"
                        isNumeric
                        fontWeight={group.gap > 0 ? "800" : "500"}
                        color={group.gap > 0 ? PALETTE.amber.fg : "gray.400"}
                      >
                        {group.gap}
                      </Td>
                    </Tr>

                    {/* THE ROLES. Rendered only while the group is open — not
                        hidden with CSS — so a closed outlet contributes nothing
                        to the page for a reader or a screen reader to wade
                        through. Each one still opens its own filtered list. */}
                    {open
                      ? group.roles.map((row) => (
                          <Tr
                            key={`${group.group_key}-${row.designation_id}`}
                            data-testid="coverage-role-row"
                            data-outlet-key={group.group_key}
                            _hover={{ bg: "gray.50", cursor: "pointer" }}
                            onClick={() => onOpen(row)}
                            title="Show these employees"
                          >
                            <Td fontSize="xs" pl={8}>
                              <Text noOfLines={2} lineHeight="1.25" color="gray.700">
                                {row.designation_name}
                              </Text>
                            </Td>
                            <Td fontSize="xs" isNumeric color="gray.700">
                              {row.expected_now}
                            </Td>
                            <Td fontSize="xs" isNumeric fontWeight="600" color={PALETTE.green.fg}>
                              {row.recorded_in}
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
                        ))
                      : null}
                  </React.Fragment>
                );
              })}

              {/* NOT AN OUTLET, AND DELIBERATELY BELOW THE RULE. These employees
                  are counted in no location above, which is the whole point of
                  the flag; showing the figure here means the reader can see that
                  the outlet totals are short by exactly these people on purpose.
                  It has no roles to open because the snapshot reports it as one
                  population, so there is no chevron to invite a click. */}
              {roamingTotal ? (
                <Tr data-testid="coverage-roaming-row" borderTopWidth="2px" borderColor="gray.300">
                  <Td fontSize="xs">
                    <Text fontWeight="700" color="purple.700" noOfLines={1}>
                      {roamingTotal.label || "All Locations / Roaming"}
                    </Text>
                    <Text fontSize="9px" color="gray.500">
                      Counted in no outlet above
                    </Text>
                  </Td>
                  <Td fontSize="xs" isNumeric fontWeight="700" color="gray.700">
                    {roamingTotal.expected_now}
                  </Td>
                  <Td fontSize="xs" isNumeric fontWeight="700" color={PALETTE.green.fg}>
                    {roamingTotal.recorded_in}
                  </Td>
                  <Td
                    fontSize="xs"
                    isNumeric
                    fontWeight={roamingTotal.gap > 0 ? "800" : "500"}
                    color={roamingTotal.gap > 0 ? PALETTE.amber.fg : "gray.400"}
                  >
                    {roamingTotal.gap}
                  </Td>
                </Tr>
              ) : null}
            </Tbody>
          </Table>

          {groups.some((g) => g.reconciles === false) ? (
            <Alert status="error" fontSize="xs" mt={2} borderRadius="md">
              <AlertIcon />
              A row does not add up to its expected headcount. Please report this.
            </Alert>
          ) : null}

          <Text fontSize="10px" color="gray.500" mt={2}>
            Each location totals its own roles — open one to see them. Expected = employees whose
            shift interval contains this moment. In = recorded IN at that location, and only where
            the punch location is established. Gap = the rest, broken down in the detail list — it
            is “not recorded IN against schedule”, not absence and not a confirmed shortage. A
            recorded IN does not mean somebody is at a counter.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
