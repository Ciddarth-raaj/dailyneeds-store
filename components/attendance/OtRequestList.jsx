import React from "react";
import {
  Badge,
  Box,
  Button,
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
  canRequestOt,
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
 * THE OT REQUESTS TAB - one row per OT-requestable date of the loaded month.
 *
 * ==================================== EVERY FIGURE ON IT IS THE BACKEND'S ==
 *
 * Eligible OT is `candidate_ot_minutes`, the engine's own number on the day
 * `/attendance/me` returned; Requested OT is `ot_requested_minutes`, the
 * candidate the SERVER recalculated and stored when the request was
 * submitted; Approved OT is `approved_ot_minutes`. Worked and NRM are the
 * day's. NOTHING HERE IS DERIVED FROM THE PUNCH TIMES SHOWN BESIDE THEM -
 * the punches are context for a human, not an input to a calculation, and
 * there is no arithmetic in this file at all.
 *
 * The status is `otRequestStatus`, which reads `ot_claim_state` - the state
 * of the actual request row - and maps it onto the four request words
 * everything else in this system uses: Not Requested, Pending, Approved,
 * Rejected - plus Closed – Payroll Locked, which is deliberately NOT a
 * Rejected. An approver rejecting a claim and a payroll month being shut
 * are different events and are shown as different states.
 *
 * =========================================== THE CORRECTION DEPENDENCY =====
 *
 * A date whose attendance is still in question - a missing punch, or a
 * correction nobody has decided - offers no Request OT button and says
 * "Complete attendance correction first." instead. That is
 * `otBlockedReason`, and it is the SCREEN's explanation of a refusal the
 * backend makes anyway: `raiseOtRequest` refuses an open request on the date
 * and refuses a day that is not a complete FINAL one. Removing the check
 * here would change the message, not the outcome.
 *
 * Correction Requests and OT Requests remain SEPARATE records: nothing on
 * this tab raises, edits or decides a correction, and the button it does
 * offer opens `OtRequestForm`, whose body is a date and a reason.
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
 * on a row the employee never filed. `RowAction` still offers Request OT when
 * some of the day fell outside the approved shift - that part follows the
 * ordinary path.
 */
const EXCESS_SENTENCE = {
  AVAILABLE: (m) => `${formatOtClock(m)} outside the approved shift is still to be requested`,
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
 * The one action a row can offer. A blocked date shows the sentence instead
 * of a button - never a button that would be refused on submit.
 */
function RowAction({ day, onRequestOt }) {
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
  if (!canRequestOt(day)) return <Text fontSize="10px" color="gray.400">—</Text>;
  return (
    <Button
      size="xs"
      colorScheme="purple"
      fontWeight="600"
      whiteSpace="nowrap"
      onClick={(e) => {
        e.stopPropagation();
        onRequestOt(day);
      }}
    >
      Request OT
    </Button>
  );
}

function OtCard({ day, onSelect, onRequestOt }) {
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
        {status.key !== "NOT_REQUESTED" ? (
          <Text fontSize="xs" color="gray.700">
            Requested OT: <strong>{formatOtClock(status.minutes)}</strong>
            {status.key === "APPROVED" ? ` · Approved ${formatOtClock(day.approved_ot_minutes)}` : null}
          </Text>
        ) : null}
        <ShiftAuthorisation status={status} day={day} />
        <Reasons status={status} />
        <Timestamps status={status} />
        <Box>
          <RowAction day={day} onRequestOt={onRequestOt} />
        </Box>
      </Stack>
    </Box>
  );
}

function OtTable({ days, onSelect, onRequestOt }) {
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
            <Th fontSize="10px" textAlign="right">Action</Th>
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
                  {status.key !== "NOT_REQUESTED" ? (
                    <Text fontSize="10px" color="gray.600" fontFamily="body" fontWeight="400">
                      Requested {formatOtClock(status.minutes)}
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
                  <RowAction day={day} onRequestOt={onRequestOt} />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}

export default function OtRequestList({ days, loading, onSelect, onRequestOt }) {
  const isMobile = useBreakpointValue({ base: true, md: false });

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6} justify="center">
        <Spinner size="sm" color="purple.500" />
        <Text fontSize="sm" color="gray.600">Loading OT requests…</Text>
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
          <OtCard key={day.attendance_date} day={day} onSelect={onSelect} onRequestOt={onRequestOt} />
        ))}
      </Stack>
    );
  }
  return <OtTable days={days} onSelect={onSelect} onRequestOt={onRequestOt} />;
}
