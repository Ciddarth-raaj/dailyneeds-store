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
  Tooltip,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";
import { ExplainTooltip } from "./AttendanceDayList";
import {
  OT_AUTOMATIC_NOTE,
  displayDate,
  displayDateTime,
  formatMinutes,
  formatOtClock,
  otBlockedReason,
  otExplanation,
  otRequestStatus,
  punchSummary,
  shiftLabel,
  weekday,
} from "../../util/attendanceV2";

/**
 * THE OT APPROVALS TAB - one row per date of the loaded month that has OT.
 *
 * ================================================= NOBODY REQUESTS OT ======
 *
 * The attendance engine finds eligible OT on a closed day and the system
 * raises it for approval by itself; the employee files nothing, so this tab
 * has no Request OT button. Each row says where that OT is: about to be sent
 * (`OT_AUTOMATIC_NOTE`), Pending Approval, Approved, Rejected, or Closed –
 * Payroll Locked (which is deliberately NOT a Rejected: an approver refusing
 * and a payroll month being shut are different events).
 *
 * ==================================== EVERY FIGURE ON IT IS THE BACKEND'S ==
 *
 * Eligible OT is `candidate_ot_minutes`, the engine's own number on the day;
 * "Sent for approval" is `ot_requested_minutes`, the figure on the pending
 * OT record (it follows the engine while nobody has decided it); Approved OT
 * is `approved_ot_minutes`. Worked and NRM are the day's. Nothing here is
 * derived from the punch times shown beside them.
 *
 * A date whose attendance is still in question - a missing punch, or a
 * correction nobody has decided - says so (`otBlockedReason`): its OT goes
 * to approval once the corrected day is settled, again with no request.
 */
function StatusBadge({ status }) {
  return (
    <Badge colorScheme={status.color} fontSize="10px" whiteSpace="nowrap">
      {status.label}
    </Badge>
  );
}

/**
 * The one line an approved shift change earns on this tab.
 *
 * It is NOT an OT request and there is none to link to: the approval happened
 * under Shift, and this says so rather than leaving a green "Approved" badge
 * on a row the employee never filed. Any OT outside the approved shift goes
 * to approval automatically, like every other day's.
 */
const EXCESS_SENTENCE = {
  AVAILABLE: (m) => `${formatOtClock(m)} outside the approved shift goes to approval automatically`,
  REQUEST_PENDING: (m) => `${formatOtClock(m)} outside the approved shift is awaiting approval`,
  // Note the second argument: the APPROVED sentence prints the backend's own
  // approved component, not the claimable figure - a later correction can
  // clamp one without moving the other.
  APPROVED: (m, approved) => `${formatOtClock(approved)} outside the approved shift was also approved`,
  REJECTED: (m) => `${formatOtClock(m)} outside the approved shift was rejected`,
  CLOSED_AT_PAYROLL_LOCK: (m) => `${formatOtClock(m)} outside the approved shift: Closed – Payroll Locked`,
};

function ShiftAuthorisation({ status, day }) {
  if (status.key !== "APPROVED_VIA_SHIFT_CHANGE") return null;
  const claimable = Math.max(0, Math.trunc(Number(day.ot_claimable_minutes) || 0));
  const excessState = day.ot_excess_state || (claimable > 0 ? "AVAILABLE" : "NONE");
  const approvedExcess = Math.max(0, Math.trunc(Number(day.ot_request_approved_minutes) || 0));
  const sentence =
    claimable > 0 && EXCESS_SENTENCE[excessState]
      ? EXCESS_SENTENCE[excessState](claimable, approvedExcess)
      : null;
  return (
    <>
      <Text fontSize="10px" color="green.700">
        Approved by your shift change{status.authorisingRequestId ? ` (request #${status.authorisingRequestId})` : ""}
        {sentence ? "" : " · no OT request needed"}
      </Text>
      {/*
        THE EXCESS IS A SECOND FACT, not a replacement for the first. A
        closed or rejected remainder is printed in its own colour beside the
        green line rather than turning the whole date grey - those approved
        hours were approved before the month closed and are still payable.
      */}
      {sentence ? (
        <Text
          fontSize="10px"
          color={excessState === "CLOSED_AT_PAYROLL_LOCK" || excessState === "REJECTED" ? "gray.600" : "blue.700"}
        >
          {sentence}
        </Text>
      ) : null}
    </>
  );
}

/**
 * The reason an employee gave, and the reason it came back.
 *
 * A REJECTION AND A CLOSURE ARE PRINTED DIFFERENTLY because they are not
 * the same event: `rejectionReason` is an approver's remarks on this claim,
 * `closureReason` is the payroll month having been locked. Only one is ever
 * set (`otRequestStatus` decides which), and a closure never appears under
 * the word "Rejected".
 */
function Reasons({ status }) {
  if (!status.reason && !status.rejectionReason && !status.closureReason) return null;
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
      {status.closureReason ? (
        <Text fontSize="10px" color="gray.600">
          Closed: {status.closureReason}
        </Text>
      ) : null}
    </Stack>
  );
}

/** Submitted / decided, in the words the approval screens already use. */
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
 * What happens next, in place of an action: a blocked date says why, an OT
 * not yet in the approval queue says it is on its way. There is no button -
 * an employee never requests OT.
 */
function RowNote({ day, status }) {
  const blocked = otBlockedReason(day);
  if (blocked) {
    return (
      <Tooltip hasArrow label={blocked} fontSize="xs">
        <Text fontSize="10px" color="orange.700" fontWeight="600">
          {blocked}
        </Text>
      </Tooltip>
    );
  }
  if (status.key === "NOT_RAISED") {
    // Calculated, but a rule keeps it out of approval - and says which.
    return (
      <Text fontSize="10px" color="gray.600">
        {status.notRaisedDetail}
      </Text>
    );
  }
  if (status.key === "NOT_REQUESTED") {
    return (
      <Text fontSize="10px" color="blue.700">
        {OT_AUTOMATIC_NOTE}
      </Text>
    );
  }
  return <Text fontSize="10px" color="gray.400">—</Text>;
}

function OtCard({ day, onSelect }) {
  const status = otRequestStatus(day);
  const punches = punchSummary(day);
  return (
    <Box borderWidth="1px" borderRadius="md" borderColor="gray.200" bg="white" shadow="sm" p={3}>
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
        <Text fontSize="xs" color="gray.600">
          {shiftLabel(day)}
        </Text>
        <Text fontSize="sm" color={punches ? "gray.800" : "gray.400"} fontFamily="mono">
          {punches || "No punches"}
        </Text>
        <SimpleGrid columns={3} spacing={2}>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase">NRM</Text>
            <Text fontSize="sm" fontWeight="600">{formatMinutes(day.nrm_minutes)}</Text>
          </Box>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase">Worked</Text>
            <Text fontSize="sm" fontWeight="600">{formatMinutes(day.worked_minutes)}</Text>
          </Box>
          <Box>
            <Text fontSize="10px" color="gray.500" textTransform="uppercase">Eligible OT</Text>
            <Text fontSize="sm" fontWeight="700" color="blue.700" fontFamily="mono">
              <ExplainTooltip lines={otExplanation(day)}>
                {formatOtClock(day.candidate_ot_minutes)}
              </ExplainTooltip>
            </Text>
          </Box>
        </SimpleGrid>
        {status.key !== "NOT_REQUESTED" && status.key !== "NOT_RAISED" ? (
          <Text fontSize="xs" color="gray.700">
            Sent for approval: <strong>{formatOtClock(status.minutes)}</strong>
            {status.key === "APPROVED" ? ` · Approved ${formatOtClock(day.approved_ot_minutes)}` : null}
          </Text>
        ) : null}
        <ShiftAuthorisation status={status} day={day} />
        <Reasons status={status} />
        <Timestamps status={status} />
        <Box>
          <RowNote day={day} status={status} />
        </Box>
      </Stack>
    </Box>
  );
}

function OtTable({ days, onSelect }) {
  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <Table size="sm" variant="simple" sx={{ "th, td": { px: 2, py: 1.5 } }}>
        <Thead bg="gray.50">
          <Tr>
            <Th fontSize="10px">Date</Th>
            <Th fontSize="10px">Shift</Th>
            <Th fontSize="10px">Punches</Th>
            <Th fontSize="10px" isNumeric>Worked / NRM</Th>
            <Th fontSize="10px" isNumeric>Eligible OT</Th>
            <Th fontSize="10px">Status</Th>
            <Th fontSize="10px" textAlign="right">Next</Th>
          </Tr>
        </Thead>
        <Tbody>
          {days.map((day) => {
            const status = otRequestStatus(day);
            return (
              <Tr key={day.attendance_date} _hover={{ bg: "purple.50" }}>
                <Td whiteSpace="nowrap" fontSize="xs">
                  <Box
                    as="button"
                    type="button"
                    color="purple.700"
                    fontWeight="600"
                    onClick={() => onSelect(day)}
                  >
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
                <Td isNumeric fontSize="xs" whiteSpace="nowrap">
                  {formatMinutes(day.worked_minutes)} / {formatMinutes(day.nrm_minutes)}
                </Td>
                {/* The engine's eligible OT. Never recomputed from the punches
                    in the column to its left. */}
                <Td isNumeric fontSize="xs" whiteSpace="nowrap" fontWeight="700" color="blue.700" fontFamily="mono">
                  <ExplainTooltip lines={otExplanation(day)}>
                    {formatOtClock(day.candidate_ot_minutes)}
                  </ExplainTooltip>
                  {status.key !== "NOT_REQUESTED" && status.key !== "NOT_RAISED" ? (
                    <Text fontSize="10px" color="gray.600" fontFamily="body" fontWeight="400">
                      For approval {formatOtClock(status.minutes)}
                      {status.key === "APPROVED" ? ` · Approved ${formatOtClock(day.approved_ot_minutes)}` : null}
                    </Text>
                  ) : null}
                </Td>
                <Td>
                  <StatusBadge status={status} />
                  <ShiftAuthorisation status={status} day={day} />
                  <Reasons status={status} />
                  <Timestamps status={status} />
                </Td>
                <Td textAlign="right">
                  <RowNote day={day} status={status} />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export default function OtRequestList({ days, loading, onSelect }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6} justify="center">
        <Spinner size="sm" color="purple.500" />
        <Text fontSize="sm" color="gray.600">Loading OT…</Text>
      </Flex>
    );
  }
  if (!days || days.length === 0) {
    return (
      <Text fontSize="sm" color="gray.600" py={4}>
        No overtime on any day of this month.
      </Text>
    );
  }
  if (isMobile) {
    return (
      <Stack spacing={2}>
        {days.map((day) => (
          <OtCard key={day.attendance_date} day={day} onSelect={onSelect} />
        ))}
      </Stack>
    );
  }
  return <OtTable days={days} onSelect={onSelect} />;
}
