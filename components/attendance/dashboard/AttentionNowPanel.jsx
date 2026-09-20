import React from "react";
import { Badge, Box, Button, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import {
  ATTENTION_TONE,
  attentionGroups,
  attentionLink,
  elapsedLabel,
  tone,
} from "../../../util/attendanceDashboard";

/**
 * NEEDS ATTENTION NOW — what somebody has to look at, in the order to work it.
 *
 * IT IS ABOUT TODAY, AND ONLY TODAY. Every row on this panel is a live state
 * on the current IST business date: a shift with no schedule row, no check-in
 * after a shift started, a punch recorded at another location or at a terminal
 * nobody has mapped, a regularization or OT claim waiting for a decision.
 *
 * COMPLETED-DAY ATTENDANCE EXCEPTIONS ARE NOT HERE. An odd punch count on a
 * finished day is real work, and the MISSING ATTENDANCE REPORT is the screen
 * that owns it — it lists those days and the 06:00 job chases them. This panel
 * used to carry them too, and that is what made it confusing: two workflows in
 * one list, and the reader deciding row by row which one they were in. Dating
 * the row made that legible without making it one job, so the rows are gone
 * rather than labelled. Nothing is lost; nobody has to look here to find them.
 *
 * IT IS NOT A NEW WORKFLOW AND NOT A QUEUE. Every row is an EXISTING state the
 * server already computes. Clicking a row opens the screen that already owns
 * that action, and that screen checks its own permission exactly as it does
 * when reached from the menu. Nothing is approved, rejected, regularized or
 * edited here, and there is no button on this panel that changes any record.
 *
 * IT IS GROUPED BY LOCATION, because that is how the work is owned. A flat list
 * of names spanning eight branches is not a work list: whoever is reading it is
 * responsible for one or two of them and their first act is to scan for their
 * own. So each group is headed by its outlet and its count.
 *
 * THE GROUPING IS THE SERVER'S, and this panel does not invent one. The groups
 * are built from the same rows, under the same filters and the same search,
 * that produced the totals beside them, so a heading's count cannot disagree
 * with the panel it sits in. `attentionGroups` falls back to a single group
 * only when a server sends no grouping at all.
 *
 * NOBODY APPEARS TWICE. An employee belongs to exactly one group — the roaming
 * heading if their duty is not tied to one outlet, otherwise their own outlet,
 * otherwise "no outlet on record". Somebody with two separate things waiting on
 * them keeps both rows, under that one heading: those are two pieces of work,
 * and merging them would hide one.
 *
 * AN OWNER IS NAMED ONLY WHERE THE SYSTEM NAMES ONE. For a waiting approval
 * that is the approver on the request's own pending step. For an operational
 * item the system names nobody, so nobody is shown — a plausible-looking owner
 * would be an invention, and an invented owner is how a real person gets chased
 * for somebody else's task.
 *
 * NO ROW CARRIES A DATE, because every row has the same one. An earlier
 * version chipped the attendance date onto rows that were not about today;
 * with the panel scoped to the current business date there is no such row, and
 * a date repeated on every line is a date nobody reads.
 *
 * THE ELAPSED TIME IS FOR ORDERING, not a penalty. "No check-in after shift
 * start" says how long the schedule has been uncovered; it says nothing about
 * why, and it is not lateness, misconduct or a deduction — none of which exist
 * in this data.
 */
export default function AttentionNowPanel({
  items,
  groups,
  total,
  truncated,
  onOpenAll,
  onOpenEmployee,
}) {
  const rows = Array.isArray(items) ? items : [];
  const grouped = attentionGroups(groups, rows);
  const count = total === undefined || total === null ? rows.length : total;

  return (
    <CustomContainer title="Needs attention now" filledHeader size="xs">
      {grouped.length === 0 ? (
        <Flex minH="120px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Nothing is waiting on anybody right now.
          </Text>
        </Flex>
      ) : (
        <Box>
          <Box maxH="320px" overflowY="auto">
            {grouped.map((group) => (
              <Box key={group.group_key}>
                {/*
                  The heading is sticky so the reader always knows whose list
                  they are scrolling through — the one thing a grouped list can
                  lose that a flat one never had.
                */}
                <Flex
                  px={3}
                  py={1.5}
                  align="center"
                  justify="space-between"
                  gap={2}
                  bg="gray.100"
                  position="sticky"
                  top={0}
                  zIndex={1}
                  borderBottomWidth="1px"
                  borderColor="gray.200"
                >
                  <Text
                    fontSize="10px"
                    fontWeight="700"
                    color="#1B2A5B"
                    textTransform="uppercase"
                    letterSpacing="0.04em"
                    noOfLines={1}
                  >
                    {group.outlet_name}
                  </Text>
                  <Badge fontSize="9px" colorScheme={group.works_all_locations ? "purple" : "gray"}>
                    {group.count}
                  </Badge>
                </Flex>

                {(group.items || []).map((item) => {
                  const t = tone(ATTENTION_TONE[item.reason_key] || "gray");
                  const link = attentionLink(item);
                  const age = elapsedLabel(item.age_minutes);
                  return (
                    <Flex
                      key={`${group.group_key}-${item.reason_key}-${item.employee_id}-${
                        item.attendance_date || ""
                      }`}
                      px={3}
                      py={2}
                      borderBottomWidth="1px"
                      borderColor="gray.100"
                      align="flex-start"
                      justify="space-between"
                      gap={2}
                      _hover={{ bg: "gray.50", cursor: link ? "pointer" : "default" }}
                      onClick={() => (link ? onOpenEmployee(item, link) : null)}
                    >
                      <Box minW={0} flex="1">
                        <Flex align="center" gap={2} wrap="wrap">
                          <Badge
                            fontSize="9px"
                            bg={t.bg}
                            color={t.fg}
                            borderWidth="1px"
                            borderColor={t.border}
                          >
                            {item.reason}
                          </Badge>
                          {age ? (
                            <Text fontSize="10px" color="gray.500">
                              {age}
                            </Text>
                          ) : null}
                        </Flex>
                        <Text fontSize="xs" fontWeight="600" color="#1B2A5B" noOfLines={1} mt={1}>
                          {item.employee_name}
                        </Text>
                        {/*
                          The outlet is already the heading, so the row carries
                          the role and the detail instead of repeating it.
                        */}
                        <Text fontSize="10px" color="gray.600" noOfLines={2} lineHeight="1.3">
                          {item.designation_name || "No role on record"}
                          {item.detail ? ` — ${item.detail}` : ""}
                        </Text>
                        {item.owner_name ? (
                          <Text fontSize="10px" color="gray.500" mt={0.5}>
                            With {item.owner_name}
                          </Text>
                        ) : null}
                      </Box>
                      {link ? (
                        <Text fontSize="10px" color="purple.600" whiteSpace="nowrap" mt={1}>
                          {link.label} →
                        </Text>
                      ) : null}
                    </Flex>
                  );
                })}
              </Box>
            ))}
          </Box>
          <Flex px={3} py={2} align="center" justify="space-between" gap={2} wrap="wrap">
            <Text fontSize="10px" color="gray.500">
              {truncated
                ? `Showing ${rows.length} of ${count}. Every item opens the screen that owns it; nothing is decided here.`
                : "Every item opens the screen that owns it; nothing is decided here."}
            </Text>
            {truncated ? (
              <Button size="xs" variant="outline" onClick={onOpenAll}>
                See all {count}
              </Button>
            ) : null}
          </Flex>
        </Box>
      )}
    </CustomContainer>
  );
}
