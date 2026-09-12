import React from "react";
import { Badge, Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import {
  REGULARIZED_PUNCH_LABEL,
  canRegularize,
  dayIssue,
  otClaim,
  displayDate,
  formatMinutes,
  positionalPunches,
  shiftLabel,
  weekday,
} from "../../util/attendanceV2";

/**
 * Attendance Day Detail. Opened by tapping a card or row.
 *
 * Date + weekday, the shift, every punch with its POSITIONAL direction
 * (1 — 09:08 IN, 2 — 14:12 OUT, ...), then NRM / Worked / Short / OT, and
 * Approved OT only where there is any. A punch that came from an approved
 * regularization is marked "Missed Punch – Regularized".
 *
 * THE OT CLAIM is its own line, from the OT request state (never from the
 * attendance status): OT Available with a Request OT button, OT Request
 * Pending, OT Approved, or OT Rejected. `onRequestOt` is passed by My
 * Attendance only - an employee requests their own OT - and the button
 * appears only while the OT is AVAILABLE. Missing Punch stays a separate
 * action (Regularize) and a separate request.
 *
 * What is NOT here, on purpose: fixed Clk1-Clk4, separate In/Out fields,
 * late or early penalties, OT10/15/20/30, a lock, or a generic "Review
 * Required". The engine reports late and early minutes but they are not
 * charged, so they are not shown as if they were.
 *
 * The shift is READ-ONLY for the employee. `onEditShift` is passed only by
 * the HR/Admin screen, and only when the caller holds
 * `edit_attendance_date_shift` - and the backend checks that key again on
 * the request, so this prop is presentation, not security.
 */
function Row({ label, value, accent }) {
  return (
    <Flex justify="space-between" align="baseline" gap={3}>
      <Text fontSize="sm" color="gray.600">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="600" color={accent || "gray.800"}>
        {value}
      </Text>
    </Flex>
  );
}

export default function AttendanceDayDetail({ day, isOpen, onClose, onRegularize, onRequestOt, onEditShift }) {
  if (!day) return null;
  const issue = dayIssue(day);
  const punches = positionalPunches(day);
  const approvedOt = Number(day.approved_ot_minutes) || 0;
  const showRegularize = !!onRegularize && canRegularize(day);
  const ot = otClaim(day);
  const showRequestOt = !!onRequestOt && !!ot && ot.canRequest;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${displayDate(day.attendance_date)} · ${weekday(day.attendance_date)}`}
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end" wrap="wrap">
          {onEditShift ? (
            <Button size="sm" variant="outline" colorScheme="purple" onClick={() => onEditShift(day)}>
              Edit Shift
            </Button>
          ) : null}
          {showRegularize ? (
            <Button size="sm" colorScheme="purple" onClick={() => onRegularize(day)}>
              Regularize
            </Button>
          ) : null}
          {showRequestOt ? (
            <Button size="sm" colorScheme="blue" onClick={() => onRequestOt(day)}>
              Request OT
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={onClose}>
            Close
          </Button>
        </Flex>
      }
    >
      <Stack spacing={4}>
        {issue ? (
          <Badge colorScheme={issue.color} alignSelf="flex-start" fontSize="xs" px={2} py={1}>
            {issue.label}
          </Badge>
        ) : null}

        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Shift
          </Text>
          <Text fontSize="sm" fontWeight="600">
            {shiftLabel(day)}
          </Text>
        </Box>

        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>
            Punches
          </Text>
          {punches.length === 0 ? (
            <Text fontSize="sm" color="gray.500">
              No punches recorded
            </Text>
          ) : (
            <Stack spacing={1}>
              {punches.map((p) => (
                <Flex key={p.position} align="center" gap={3} fontSize="sm">
                  <Text color="gray.500" w="1.5em" textAlign="right">
                    {p.position}
                  </Text>
                  <Text fontFamily="mono" fontWeight="600">
                    {p.time}
                  </Text>
                  <Badge colorScheme={p.direction === "IN" ? "green" : "gray"} fontSize="10px">
                    {p.direction}
                  </Badge>
                  {p.regularized ? (
                    <Text fontSize="xs" color="orange.700">
                      {REGULARIZED_PUNCH_LABEL}
                    </Text>
                  ) : null}
                </Flex>
              ))}
            </Stack>
          )}
        </Box>

        <SimpleGrid columns={1} spacing={1} borderTopWidth="1px" borderColor="gray.100" pt={3}>
          <Row label="NRM" value={formatMinutes(day.nrm_minutes)} />
          <Row label="Worked" value={formatMinutes(day.worked_minutes)} />
          <Row
            label="Short"
            value={formatMinutes(day.shortage_minutes)}
            accent={Number(day.shortage_minutes) > 0 ? "red.600" : undefined}
          />
          <Row
            label="OT"
            value={formatMinutes(day.candidate_ot_minutes)}
            accent={Number(day.candidate_ot_minutes) > 0 ? "blue.600" : undefined}
          />
          {approvedOt > 0 ? (
            <Row label="Approved OT" value={formatMinutes(approvedOt)} accent="green.600" />
          ) : null}
        </SimpleGrid>

        {ot ? (
          <Box borderWidth="1px" borderColor={`${ot.color}.100`} bg={`${ot.color}.50`} borderRadius="md" px={3} py={2}>
            <Text fontSize="sm" fontWeight="600" color={`${ot.color}.700`}>
              {ot.label}
            </Text>
            {ot.detail ? (
              <Text fontSize="xs" color="gray.600">
                {ot.detail}
              </Text>
            ) : null}
          </Box>
        ) : null}
      </Stack>
    </CustomModal>
  );
}
