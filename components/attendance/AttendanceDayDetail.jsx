import React from "react";
import { Badge, Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import { ExplainTooltip } from "./AttendanceDayList";
import {
  PUNCH_STATUS,
  PUNCH_STATUS_COLOR,
  PUNCH_STATUS_LABEL,
  REGULARIZED_PUNCH_LABEL,
  canRegularizeAttendance,
  regularizeBlockedReason,
  dayIssue,
  presentBadge,
  dayPunchRows,
  otClaim,
  displayDate,
  formatMinutes,
  timingMinutes,
  shiftLabel,
  weekday,
  shortExplanation,
  otExplanation,
} from "../../util/attendanceV2";
import {
  PAID_NOT_WORKED,
  dayPermission,
  canRequestPermissionForDay,
  permissionSourceLabel,
  permissionStateColor,
  permissionStateLabel,
  permissionWindowLabel,
} from "../../util/attendancePermission";

/**
 * Attendance Day Detail. Opened by tapping a card or row.
 *
 * Date + weekday, the shift, every punch with its POSITIONAL direction
 * (1 — 09:08 IN, 2 — 14:12 OUT, ...), then NRM / Worked / Short / OT, and
 * Approved OT only where there is any. A punch that came from an approved
 * regularization is marked "Missed Punch – Regularized".
 *
 * EVERY RAW PUNCH IS SHOWN, counted or not. A punch the engine ignored as a
 * duplicate within ten minutes, or that an authorized person voided, stays
 * in the list - visually distinct, with no position (it is not paired) and
 * its status and reason - because the audit trail is the point: a manager
 * looking at a day must be able to see what the device recorded and what
 * was excluded from it. Only the USED and REGULARIZED punches carry a
 * position and take part in NRM / Worked / Short / OT.
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
 * PERMISSION is its own block and never a Worked figure. The window(s)
 * management allowed are listed with their state and origin, and the minutes
 * of them that actually covered a shortage are shown as "Paid permission –
 * not worked". Worked stays exactly what the punches produced. A day fully
 * covered reads "Present / Full Pay". `onRequestPermission` is passed by My
 * Attendance when the employee holds `raise_attendance_permission_request`.
 *
 * The shift is READ-ONLY for the employee. `onEditShift` is passed only by
 * the HR/Admin screen, and only when the caller holds
 * `edit_attendance_date_shift` - and the backend checks that key again on
 * the request, so this prop is presentation, not security.
 *
 * REGULARIZE is ONE action for every supported correction. It appears when
 * the day allows any of them: a Missing Punch day, or - only where
 * `allowLunchRegularization` is passed (the HR/Admin screen, with
 * `raise_attendance_regularization_for_others`) - a complete day whose lunch
 * punches can be regularized. The form it opens lets the user choose the
 * correction; the backend checks everything again.
 *
 * VOID PUNCH is the same shape: `onVoidPunch` is passed only by the HR/Admin
 * screen, only when the caller holds `void_attendance_punch`, and the
 * compact action appears beside a raw BIOMAX / IMPORT punch only - never on
 * a REGULARIZED punch (that is the approval workflow's) and never on a punch
 * that is already VOIDED. The backend checks the key again.
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

function PunchStatusBadge({ punch }) {
  if (punch.regularized) {
    // A manual punch from an approved regularization (a missing punch or a
    // missed break) - never mistaken for one the device recorded.
    return (
      <Flex align="center" gap={1}>
        <Badge colorScheme="purple" fontSize="10px" title="Manual punch added by an approved regularization">
          Manual
        </Badge>
        <Text fontSize="xs" color="orange.700">
          {REGULARIZED_PUNCH_LABEL}
        </Text>
      </Flex>
    );
  }
  if (!punch.excluded) return null;
  return (
    <Badge colorScheme={PUNCH_STATUS_COLOR[punch.effective_status] || "gray"} fontSize="10px" title={punch.reason || ""}>
      {PUNCH_STATUS_LABEL[punch.effective_status] || punch.effective_status}
    </Badge>
  );
}

export default function AttendanceDayDetail({
  day,
  isOpen,
  onClose,
  onRegularize,
  allowLunchRegularization = false,
  onRequestOt,
  onEditShift,
  onVoidPunch,
  onRequestPermission,
}) {
  if (!day) return null;
  const permission = dayPermission(day);
  // The issue, or an explicit Present on a Present/Absent Only day.
  const issue = dayIssue(day) || presentBadge(day);
  const punches = dayPunchRows(day);
  const approvedOt = Number(day.approved_ot_minutes) || 0;
  const showRegularize =
    !!onRegularize && canRegularizeAttendance(day, { allowLunch: allowLunchRegularization });
  // A correction the day would allow, in a payroll-locked month: said, not offered.
  const regularizeBlocked = onRegularize
    ? regularizeBlockedReason(day, { allowLunch: allowLunchRegularization })
    : null;
  const ot = otClaim(day);
  const showRequestOt = !!onRequestOt && !!ot && ot.canRequest;
  // Not offered on a Present/Absent Only date: nothing is short to forgive.
  const showRequestPermission = !!onRequestPermission && canRequestPermissionForDay(day);

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
          {regularizeBlocked ? (
            <Button size="sm" colorScheme="purple" isDisabled title={regularizeBlocked}>
              Regularize · {regularizeBlocked}
            </Button>
          ) : null}
          {showRequestPermission ? (
            <Button size="sm" variant="outline" colorScheme="teal" onClick={() => onRequestPermission(day)}>
              Request Permission
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
                <Flex
                  key={`${p.effective_status}-${p.punch_id}-${p.io_time}`}
                  align="center"
                  gap={3}
                  fontSize="sm"
                  wrap="wrap"
                  opacity={p.excluded ? 0.6 : 1}
                >
                  <Text color="gray.500" w="1.5em" textAlign="right">
                    {p.position === null ? "–" : p.position}
                  </Text>
                  <Text
                    fontFamily="mono"
                    fontWeight="600"
                    textDecoration={p.effective_status === PUNCH_STATUS.VOIDED ? "line-through" : "none"}
                    color={p.excluded ? "gray.500" : undefined}
                  >
                    {p.time}
                  </Text>
                  {p.direction ? (
                    <Badge colorScheme={p.direction === "IN" ? "green" : "gray"} fontSize="10px">
                      {p.direction}
                    </Badge>
                  ) : null}
                  <PunchStatusBadge punch={p} />
                  {p.excluded && p.reason && p.effective_status === PUNCH_STATUS.VOIDED ? (
                    <Text fontSize="xs" color="gray.500" title={p.void && p.void.voided_at ? `Voided ${p.void.voided_at}` : ""}>
                      {p.reason}
                    </Text>
                  ) : null}
                  {onVoidPunch && p.void_able ? (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="red"
                      ml="auto"
                      onClick={() =>
                        onVoidPunch({
                          biomax_punch_id: p.punch_id,
                          io_time: p.io_time,
                          source: p.source,
                          attendance_date: day.attendance_date,
                          employee_id: day.employee_id,
                        })
                      }
                    >
                      Void Punch
                    </Button>
                  ) : null}
                </Flex>
              ))}
            </Stack>
          )}
          {punches.some((p) => p.excluded) ? (
            <Text fontSize="xs" color="gray.500" mt={1}>
              Ignored and voided punches are kept for audit and do not count towards the day.
            </Text>
          ) : null}
        </Box>

        <SimpleGrid columns={1} spacing={1} borderTopWidth="1px" borderColor="gray.100" pt={3}>
          <Row label="NRM" value={timingMinutes(day, day.nrm_minutes)} />
          <Row label="Worked" value={timingMinutes(day, day.worked_minutes)} />
          <Row
            label="Short"
            value={
              <ExplainTooltip lines={shortExplanation(day)}>{timingMinutes(day, day.shortage_minutes)}</ExplainTooltip>
            }
            accent={Number(day.shortage_minutes) > 0 ? "red.600" : undefined}
          />
          <Row
            label="OT"
            value={
              <ExplainTooltip lines={otExplanation(day)}>{formatMinutes(day.candidate_ot_minutes)}</ExplainTooltip>
            }
            accent={Number(day.candidate_ot_minutes) > 0 ? "blue.600" : undefined}
          />
          {approvedOt > 0 ? (
            <Row label="Approved OT" value={formatMinutes(approvedOt)} accent="green.600" />
          ) : null}
        </SimpleGrid>

        {permission ? (
          <Box borderWidth="1px" borderColor="teal.100" bg="teal.50" borderRadius="md" px={3} py={2}>
            <Flex justify="space-between" align="center" gap={2} wrap="wrap">
              <Text fontSize="sm" fontWeight="600" color="teal.800">
                Permission
              </Text>
              {permission.payLabel ? (
                <Badge colorScheme="green" fontSize="10px">
                  {permission.payLabel}
                </Badge>
              ) : null}
            </Flex>
            <Stack spacing={1} mt={1}>
              {permission.windows.map((w) => (
                <Flex key={w.attendance_permission_id || permissionWindowLabel(w)} gap={2} align="center" wrap="wrap" fontSize="sm">
                  <Text fontFamily="mono" fontWeight="600">
                    {permissionWindowLabel(w)}
                  </Text>
                  <Badge colorScheme={permissionStateColor(w)} fontSize="10px">
                    {permissionStateLabel(w)}
                  </Badge>
                  <Text fontSize="xs" color="gray.600">
                    {permissionSourceLabel(w)}
                    {w.reason ? ` · ${w.reason}` : ""}
                  </Text>
                </Flex>
              ))}
            </Stack>
            {permission.appliedMinutes > 0 ? (
              <Text fontSize="sm" mt={1}>
                <Text as="span" color="gray.600">
                  {PAID_NOT_WORKED}:{" "}
                </Text>
                <Text as="span" fontWeight="700">
                  {formatMinutes(permission.appliedMinutes)}
                </Text>
              </Text>
            ) : null}
            {permission.uncoveredNote ? (
              <Text fontSize="xs" color="gray.600" mt={1}>
                {permission.uncoveredNote}
              </Text>
            ) : null}
          </Box>
        ) : null}

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
