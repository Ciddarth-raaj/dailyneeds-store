import React from "react";
import { Badge, Box, Divider, Flex, SimpleGrid, Spinner, Stack, Text } from "@chakra-ui/react";
import { displayDateTime } from "../../util/attendanceV2";
import { otCard } from "../../util/telegramAttendance";

/**
 * MY OT, as a phone shows it: one card per date with overtime, READ-ONLY.
 * The employee requests nothing - the attendance engine sends eligible OT
 * for approval by itself - so no card is a tap target any more; each says
 * where its OT is (on its way, Pending Approval, Approved, Rejected, Closed).
 *
 * THE SAME CARD LANGUAGE AS CORRECTIONS - a rounded tile, the date and
 * weekday on the left, a state badge on the right, the whole tile the tap
 * target - so the two tabs read as one app. What is inside differs because
 * an OT date has more to say: the shift, the punch summary, Worked / NRM and
 * the system-calculated Eligible OT.
 *
 * ================================= EVERY FIGURE IS THE SERVER'S ===========
 *
 * A CLOSED date is not a rejected one. "Closed – Payroll Locked" is its own
 * grey state with the period's reason beneath it; "Rejected" is red and
 * carries the approver's own remarks. The two are never printed as each
 * other - see `otRequestStatus` in `util/attendanceV2.js`.
 *
 * `otCard` builds the row from the calculated day the month read returned,
 * through the shared web helpers. Eligible OT is `candidate_ot_minutes`;
 * Requested is the candidate the SERVER stored on the request; Approved is
 * `approved_ot_minutes`; the state is `ot_claim_state`. NOTHING IS DERIVED
 * FROM THE PUNCH SUMMARY DISPLAYED ABOVE IT - the punches are context for a
 * human, and there is no arithmetic in this component at all.
 *
 * A date whose attendance is still in question says its OT goes to approval
 * once the correction is complete (`blocked_reason`).
 */
function Field({ label, value, accent }) {
  return (
    <Box minW={0}>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight={accent ? "700" : "600"} color={accent || "gray.800"} noOfLines={1}>
        {value}
      </Text>
    </Box>
  );
}

export default function TelegramOtDateList({ days, loading, highlight }) {
  if (loading) {
    return (
      <Flex justify="center" py={10}>
        <Spinner size="lg" color="purple.400" />
      </Flex>
    );
  }

  if (!days || days.length === 0) {
    return (
      <Box textAlign="center" py={10} px={4}>
        <Text fontSize="lg" fontWeight="600">
          No overtime this month
        </Text>
        <Text fontSize="sm" color="gray.500" mt={2}>
          Days with overtime will appear here once they are complete.
        </Text>
      </Box>
    );
  }

  return (
    <Stack spacing={3}>
      {days.map((day) => {
        const card = otCard(day);
        const isHint = highlight && card.attendance_date === highlight;
        return (
          <Box
            key={card.attendance_date}
            textAlign="left"
            w="100%"
            p={4}
            borderWidth="1px"
            borderRadius="xl"
            borderColor={isHint ? "purple.400" : "gray.200"}
            boxShadow={isHint ? "0 0 0 2px var(--chakra-colors-purple-100)" : "sm"}
            bg="white"
          >
            <Stack spacing={3}>
              <Flex align="center" justify="space-between" gap={3}>
                <Box minW={0}>
                  <Text fontSize="md" fontWeight="700" noOfLines={1}>
                    {card.title}
                  </Text>
                  <Text fontSize="xs" color="gray.500">
                    {card.weekday} · {card.shift}
                  </Text>
                </Box>
                <Badge
                  colorScheme={card.color}
                  borderRadius="full"
                  px={3}
                  py={1}
                  fontSize="10px"
                  textTransform="none"
                  whiteSpace="nowrap"
                >
                  {card.label}
                </Badge>
              </Flex>

              <Text fontSize="sm" fontFamily="mono" color={card.punches ? "gray.700" : "gray.400"} noOfLines={1}>
                {card.punches || "No punches"}
              </Text>

              <SimpleGrid columns={3} spacing={2}>
                <Field label="Worked" value={card.worked} />
                <Field label="NRM" value={card.nrm} />
                <Field label="Eligible OT" value={card.eligible_ot} accent="blue.700" />
              </SimpleGrid>

              {card.state === "NOT_REQUESTED" || card.state === "NOT_RAISED" ? null : (
                <>
                  <Divider />
                  <Stack spacing={1}>
                    <Text fontSize="xs" color="gray.700">
                      Sent for approval: <strong>{card.requested_ot}</strong>
                      {card.approved_ot ? ` · Approved ${card.approved_ot}` : null}
                    </Text>
                    {/* An approver's refusal ... */}
                    {card.rejection_reason ? (
                      <Text fontSize="xs" color="red.600">
                        Rejected: {card.rejection_reason}
                      </Text>
                    ) : null}
                    {/* ... and a shut payroll month, which is not one. */}
                    {card.closure_reason ? (
                      <Text fontSize="xs" color="gray.600">
                        Closed: {card.closure_reason}
                      </Text>
                    ) : null}
                    {card.requested_at ? (
                      <Text fontSize="10px" color="gray.500">
                        Sent {displayDateTime(card.requested_at)}
                      </Text>
                    ) : null}
                    {card.decided_at ? (
                      <Text fontSize="10px" color="gray.500">
                        Decided {displayDateTime(card.decided_at)}
                      </Text>
                    ) : null}
                  </Stack>
                </>
              )}

              {card.blocked_reason ? (
                <Text fontSize="xs" fontWeight="700" color="orange.700">
                  {card.blocked_reason}
                </Text>
              ) : card.next_step ? (
                <Text fontSize="xs" color="blue.700">
                  {card.next_step}
                </Text>
              ) : null}
            </Stack>
          </Box>
        );
      })}
    </Stack>
  );
}
