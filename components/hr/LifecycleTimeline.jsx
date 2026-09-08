import React from "react";
import { Box, Stack, Text, Badge, Divider } from "@chakra-ui/react";

/**
 * Stage 0C / C3 — employment periods and the events that produced them.
 *
 * Read-only. The point of this panel is that a rejoin does NOT overwrite
 * history: periods 1, 2, 3 stand side by side under one permanent employee
 * ID, and HR can see the whole service record at a glance.
 *
 * Periods a backfill could not date are marked rather than hidden - there are
 * 518 such rows historically, and pretending they are complete would be worse
 * than showing "not recorded".
 */

const EVENT_LABEL = {
  period_opened: "Joined",
  period_closed: "Left",
  resignation_voided: "Resignation voided",
  period_corrected: "Period corrected",
};

const REASON_LABEL = {
  initial_join: "first joining",
  rejoin: "rejoined",
  resignation: "resignation",
};

function LifecycleTimeline({ lifecycle }) {
  if (!lifecycle || !Array.isArray(lifecycle.periods)) return null;

  const { periods, events } = lifecycle;

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Text fontWeight="bold" mb={3}>
        Employment history
      </Text>

      {periods.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No employment periods recorded yet.
        </Text>
      ) : (
        <Stack spacing={3}>
          {periods.map((p) => (
            <Box key={p.period_no} fontSize="sm">
              <Stack direction="row" align="center" spacing={2}>
                <Text fontWeight="semibold">Period {p.period_no}</Text>
                <Badge colorScheme={p.period_state === "open" ? "green" : "gray"}>
                  {p.period_state === "open" ? "Current" : "Ended"}
                </Badge>
                {Number(p.needs_review) === 1 ? (
                  <Badge colorScheme="orange">Needs review</Badge>
                ) : null}
              </Stack>
              <Text color="gray.600">
                {p.joined_on || "joining date not recorded"}
                {" → "}
                {p.period_state === "open" ? "present" : p.ended_on || "end date not recorded"}
              </Text>
            </Box>
          ))}
        </Stack>
      )}

      {Array.isArray(events) && events.length ? (
        <>
          <Divider my={3} />
          <Text fontWeight="semibold" fontSize="sm" mb={2}>
            Events
          </Text>
          <Stack spacing={1} fontSize="sm" color="gray.600">
            {events.map((e) => (
              <Text key={e.event_id}>
                {EVENT_LABEL[e.event_type] || e.event_type}
                {e.reason ? ` — ${REASON_LABEL[e.reason] || e.reason}` : ""}
              </Text>
            ))}
          </Stack>
        </>
      ) : null}
    </Box>
  );
}

export default LifecycleTimeline;
