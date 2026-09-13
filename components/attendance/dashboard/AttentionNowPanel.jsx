import React from "react";
import { Badge, Box, Button, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { ATTENTION_TONE, attentionLink, elapsedLabel, tone } from "../../../util/attendanceDashboard";

/**
 * NEEDS ATTENTION NOW — what somebody has to look at, in the order to work it.
 *
 * IT IS NOT A NEW WORKFLOW AND NOT A QUEUE. Every row is an EXISTING state the
 * server already computes — a shift with no schedule row, no check-in after a
 * shift started, a punch recorded at another location or at a terminal nobody
 * has mapped, a regularization or OT claim waiting for a decision, an odd punch
 * count on a CLOSED attendance day. Clicking a row opens the screen that already
 * owns that action, and that screen checks its own permission exactly as it does
 * when reached from the menu. Nothing is approved, rejected, regularized or
 * edited here, and there is no button on this panel that changes any record.
 *
 * AN OWNER IS NAMED ONLY WHERE THE SYSTEM NAMES ONE. For a waiting approval
 * that is the approver on the request's own pending step. For an operational
 * item the system names nobody, so nobody is shown — a plausible-looking owner
 * would be an invention, and an invented owner is how a real person gets chased
 * for somebody else's task.
 *
 * THE ELAPSED TIME IS FOR ORDERING, not a penalty. "No check-in after shift
 * start" says how long the schedule has been uncovered; it says nothing about
 * why, and it is not lateness, misconduct or a deduction — none of which exist
 * in this data.
 */
export default function AttentionNowPanel({ items, total, truncated, onOpenAll, onOpenEmployee }) {
  const rows = Array.isArray(items) ? items : [];
  const count = total === undefined || total === null ? rows.length : total;

  return (
    <CustomContainer title="Needs attention now" filledHeader size="xs">
      {rows.length === 0 ? (
        <Flex minH="120px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Nothing is waiting on anybody right now.
          </Text>
        </Flex>
      ) : (
        <Box>
          <Box maxH="320px" overflowY="auto">
            {rows.map((item) => {
              const t = tone(ATTENTION_TONE[item.reason_key] || "gray");
              const link = attentionLink(item);
              const age = elapsedLabel(item.age_minutes);
              return (
                <Flex
                  key={`${item.reason_key}-${item.employee_id}-${item.attendance_date || ""}`}
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
                    <Text fontSize="10px" color="gray.600" noOfLines={2} lineHeight="1.3">
                      {item.outlet_name || "No outlet on record"} ·{" "}
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
