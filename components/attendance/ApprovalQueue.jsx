import React, { useState } from "react";
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
  Textarea,
  Th,
  Thead,
  Tr,
  useBreakpointValue,
} from "@chakra-ui/react";
import {
  clock,
  decisionLabel,
  displayDate,
  displayDateTime,
  formatMinutes,
  formatOtClock,
  levelLabel,
  roleLabel,
  stageLabel,
  weekday,
} from "../../util/attendanceV2";

/**
 * The approval queue used by BOTH Attendance Approval (kind REGULARIZATION)
 * and OT Approval (kind OT): one screen, rows that EXPAND INLINE. A compact
 * table on a desktop, cards on a phone; the whole row or card is the tap
 * target and there is no separate detail page.
 *
 * WHAT IS NEVER HERE. No input for OT minutes: the eligible OT is the
 * engine's figure and the decision endpoint takes none. An attendance
 * approval shows no OT figure at all - attendance approval corrects
 * attendance only, and any OT the corrected day earns is the employee's to
 * request separately. Approve / Reject appear only on a row the backend
 * marked actionable for this approver; history rows have no actions.
 */
const positional = (punches) =>
  (Array.isArray(punches) ? punches : []).map((p, i) => ({
    position: i + 1,
    time: clock(p.io_time),
    direction: i % 2 === 0 ? "IN" : "OUT",
    regularized: p.source === "REGULARIZED",
  }));

function Punches({ punches }) {
  const list = positional(punches);
  if (list.length === 0) return <Text fontSize="sm" color="gray.500">None</Text>;
  return (
    <Stack spacing={1}>
      {list.map((p) => (
        <Flex key={p.position} align="center" gap={2} fontSize="sm">
          <Text color="gray.500" w="1.5em" textAlign="right">{p.position}</Text>
          <Text fontFamily="mono" fontWeight="600">{p.time}</Text>
          <Badge colorScheme={p.direction === "IN" ? "green" : "gray"} fontSize="10px">{p.direction}</Badge>
        </Flex>
      ))}
    </Stack>
  );
}

function Field({ label, children }) {
  return (
    <Box>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">{label}</Text>
      <Box fontSize="sm" fontWeight="600">{children}</Box>
    </Box>
  );
}

/**
 * Who a stage is addressed to. An employee-level stage (Attendance Approver
 * Setup) names the snapshotted person and their level; a role-based stage,
 * historical or fallback, names the role as before.
 */
const stageApproverLabel = (st) =>
  st.approver_employee_id !== null && st.approver_employee_id !== undefined
    ? `${st.approver_name || `Employee ${st.approver_employee_id}`}${st.approval_level ? ` · ${levelLabel(st.approval_level)}` : ""}`
    : roleLabel(st.approver_role);

function Chain({ chain, current }) {
  return (
    <Stack spacing={1}>
      {(chain || []).map((st) => (
        <Flex key={st.stage_no} align="center" gap={2} fontSize="xs" wrap="wrap">
          <Badge
            colorScheme={st.decision === "APPROVED" ? "green" : st.decision === "REJECTED" ? "red" : st.decision === "SKIPPED" ? "gray" : Number(st.stage_no) === Number(current) ? "purple" : "gray"}
            fontSize="10px"
          >
            {st.stage_no}
          </Badge>
          <Text>{stageApproverLabel(st)}</Text>
          <Text color="gray.500">{st.decision === "PENDING" ? (Number(st.stage_no) === Number(current) ? "current" : "waiting") : st.decision.toLowerCase()}</Text>
          {st.decided_by_name ? <Text color="gray.600">by {st.decided_by_name}</Text> : null}
          {st.decided_at ? <Text color="gray.500">{displayDateTime(st.decided_at)}</Text> : null}
          {st.remarks ? <Text color="gray.600">“{st.remarks}”</Text> : null}
        </Flex>
      ))}
    </Stack>
  );
}

const shiftText = (row) =>
  row.shift_name
    ? row.shift_in_time && row.shift_out_time
      ? `${row.shift_name} (${clock(row.shift_in_time)}–${clock(row.shift_out_time)})`
      : row.shift_name
    : row.shift_code || "—";

function Detail({ row, kind, onDecide, deciding }) {
  const [remarks, setRemarks] = useState("");
  const isOt = kind === "OT";
  return (
    <Stack spacing={3}>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={3}>
        <Field label="Employee">{row.employee_name || row.employee_id}{row.outlet_name ? <Text as="span" color="gray.500" fontWeight="400"> · {row.outlet_name}</Text> : null}</Field>
        <Field label="Date">{displayDate(row.attendance_date)} · {weekday(row.attendance_date)}</Field>
        <Field label="Shift">{shiftText(row)}</Field>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <Field label={isOt ? "Punches" : "Existing punches"}><Punches punches={row.effective_punches} /></Field>
        {!isOt ? (
          <Field label="Proposed missing punch">
            <Text fontFamily="mono" color="orange.700">{row.proposed_punch_time ? clock(row.proposed_punch_time) : "—"}</Text>
            <Text fontSize="xs" color="gray.500" fontWeight="400">IN or OUT is decided by its position once added.</Text>
          </Field>
        ) : (
          <Field label="Eligible OT (read only)">
            <Text fontFamily="mono" fontSize="lg" color="blue.700">{formatOtClock(row.eligible_ot_minutes)}</Text>
            {Number(row.claimed_ot_minutes) !== Number(row.eligible_ot_minutes) ? (
              <Text fontSize="xs" color="gray.500" fontWeight="400">Claimed {formatOtClock(row.claimed_ot_minutes)}; the approval is limited to what the system finds eligible.</Text>
            ) : null}
          </Field>
        )}
      </SimpleGrid>

      <Field label="Employee reason"><Text fontWeight="400">{row.reason || "—"}</Text></Field>

      <SimpleGrid columns={{ base: 3, md: 4 }} spacing={3}>
        <Field label="NRM">{formatMinutes(row.nrm_minutes)}</Field>
        <Field label="Worked">{formatMinutes(row.worked_minutes)}</Field>
        <Field label="Shortage">{formatMinutes(row.shortage_minutes)}</Field>
        {isOt && row.status === "APPROVED" ? <Field label="Approved OT">{formatOtClock(row.approved_ot_minutes)}</Field> : null}
      </SimpleGrid>

      <Field label={row.status === "PENDING" ? "Approval chain · current stage" : "Approval chain"}>
        <Text fontSize="xs" color="purple.700" mb={1}>{stageLabel(row)}</Text>
        <Chain chain={row.chain} current={row.current_stage_no} />
      </Field>

      {row.status !== "PENDING" ? (
        <Field label="Decision">
          <Text color={row.status === "APPROVED" ? "green.700" : "red.700"}>{decisionLabel(row)}</Text>
          <Text fontSize="xs" color="gray.500" fontWeight="400">
            {row.decided_by_name ? `${row.decided_by_name} · ` : ""}{displayDateTime(row.decided_at)}
          </Text>
        </Field>
      ) : null}

      {row.status === "PENDING" && row.actionable && onDecide ? (
        <Box borderTopWidth="1px" borderColor="gray.100" pt={3}>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide" mb={1}>Remarks</Text>
          <Textarea size="sm" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional" />
          <Flex gap={2} mt={2} justify="flex-end" wrap="wrap">
            <Button size="sm" colorScheme="red" variant="outline" isLoading={deciding === "REJECTED"} isDisabled={!!deciding} onClick={() => onDecide(row, "REJECTED", remarks)}>
              Reject
            </Button>
            <Button size="sm" colorScheme="green" isLoading={deciding === "APPROVED"} isDisabled={!!deciding} onClick={() => onDecide(row, "APPROVED", remarks)}>
              Approve
            </Button>
          </Flex>
        </Box>
      ) : row.status === "PENDING" && row.not_actionable_reason ? (
        <Text fontSize="xs" color="gray.500">{row.not_actionable_reason}</Text>
      ) : null}
    </Stack>
  );
}

const summaryPunches = (row) => positional(row.effective_punches).map((p) => p.time).join(" → ") || "—";

export default function ApprovalQueue({ rows, kind, loading, onDecide, deciding }) {
  const isMobile = useBreakpointValue({ base: true, md: false });
  const [open, setOpen] = useState(null);
  const isOt = kind === "OT";
  const toggle = (id) => setOpen((current) => (current === id ? null : id));
  const history = rows.length > 0 && rows.every((r) => r.status !== "PENDING");

  if (loading) {
    return (
      <Flex align="center" gap={2} py={6} justify="center">
        <Spinner size="sm" color="purple.500" />
        <Text fontSize="sm" color="gray.600">Loading…</Text>
      </Flex>
    );
  }
  if (!rows || rows.length === 0) {
    return <Text fontSize="sm" color="gray.600" py={4}>Nothing here.</Text>;
  }

  if (isMobile) {
    return (
      <Stack spacing={2}>
        {rows.map((row) => {
          const id = row.attendance_approval_request_id;
          const expanded = open === id;
          return (
            <Box key={id} borderWidth="1px" borderRadius="md" borderColor={expanded ? "purple.300" : "gray.200"} bg="white" shadow="sm" p={3}>
              <Box as="button" type="button" textAlign="left" w="100%" onClick={() => toggle(id)} aria-expanded={expanded}>
                <Flex justify="space-between" align="center" gap={2}>
                  <Text fontWeight="600" fontSize="sm" color="purple.700">{row.employee_name || row.employee_id}</Text>
                  {row.status === "PENDING" ? (
                    <Badge colorScheme={row.actionable ? "purple" : "gray"} fontSize="10px">{stageLabel(row)}</Badge>
                  ) : (
                    <Badge colorScheme={row.status === "APPROVED" ? "green" : "red"} fontSize="10px">{decisionLabel(row)}</Badge>
                  )}
                </Flex>
                <Text fontSize="xs" color="gray.600">{displayDate(row.attendance_date)} · {weekday(row.attendance_date)} · {shiftText(row)}</Text>
                <Text fontSize="xs" fontFamily="mono" color="gray.700">{summaryPunches(row)}</Text>
                {isOt ? (
                  <Text fontSize="xs" color="blue.700" fontWeight="600">Eligible OT {formatOtClock(row.eligible_ot_minutes)}{row.status === "APPROVED" ? ` · Approved ${formatOtClock(row.approved_ot_minutes)}` : ""}</Text>
                ) : (
                  <Text fontSize="xs" color="orange.700" fontWeight="600">Proposed {row.proposed_punch_time ? clock(row.proposed_punch_time) : "—"}</Text>
                )}
                <Text fontSize="xs" color="gray.600" noOfLines={expanded ? undefined : 1}>{row.reason}</Text>
                <Text fontSize="10px" color="gray.500">Submitted {displayDateTime(row.submitted_at)}</Text>
              </Box>
              {expanded ? (
                <Box mt={3} pt={3} borderTopWidth="1px" borderColor="gray.100">
                  <Detail row={row} kind={kind} onDecide={onDecide} deciding={deciding && deciding.id === id ? deciding.decision : null} />
                </Box>
              ) : null}
            </Box>
          );
        })}
      </Stack>
    );
  }

  return (
    <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
      <Table size="sm" variant="simple">
        <Thead bg="gray.50">
          <Tr>
            <Th>Employee</Th>
            <Th>Date</Th>
            <Th>Shift</Th>
            {isOt ? <Th isNumeric>Worked</Th> : <Th>Existing Punches</Th>}
            {isOt ? <Th isNumeric>{history ? "Eligible / Claimed OT" : "Eligible OT"}</Th> : <Th>Proposed Missing Punch</Th>}
            {isOt && history ? <Th isNumeric>Approved OT</Th> : null}
            <Th>{isOt ? "Employee Reason" : "Reason"}</Th>
            <Th>{history ? "Decided" : "Submitted On"}</Th>
            <Th>{history ? "Final Status" : "Action"}</Th>
          </Tr>
        </Thead>
        <Tbody>
          {rows.map((row) => {
            const id = row.attendance_approval_request_id;
            const expanded = open === id;
            const columns = 8 + (isOt && history ? 1 : 0);
            return (
              <React.Fragment key={id}>
                <Tr cursor="pointer" onClick={() => toggle(id)} _hover={{ bg: "purple.50" }} bg={expanded ? "purple.50" : undefined} role="button" tabIndex={0} aria-expanded={expanded}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(id); } }}>
                  <Td whiteSpace="nowrap">{row.employee_name || row.employee_id}</Td>
                  <Td whiteSpace="nowrap">{displayDate(row.attendance_date)}</Td>
                  <Td fontSize="xs">{shiftText(row)}</Td>
                  {isOt ? <Td isNumeric>{formatMinutes(row.worked_minutes)}</Td> : <Td fontFamily="mono" fontSize="xs" whiteSpace="nowrap">{summaryPunches(row)}</Td>}
                  {isOt ? (
                    <Td isNumeric fontFamily="mono">{formatOtClock(row.eligible_ot_minutes)}{history && Number(row.claimed_ot_minutes) !== Number(row.eligible_ot_minutes) ? ` / ${formatOtClock(row.claimed_ot_minutes)}` : ""}</Td>
                  ) : (
                    <Td fontFamily="mono" color="orange.700">{row.proposed_punch_time ? clock(row.proposed_punch_time) : "—"}</Td>
                  )}
                  {isOt && history ? <Td isNumeric fontFamily="mono">{row.status === "APPROVED" ? formatOtClock(row.approved_ot_minutes) : "—"}</Td> : null}
                  <Td fontSize="xs" maxW="260px"><Text noOfLines={1}>{row.reason}</Text></Td>
                  <Td fontSize="xs" whiteSpace="nowrap">{history ? `${row.decided_by_name || "—"} · ${displayDateTime(row.decided_at)}` : displayDateTime(row.submitted_at)}</Td>
                  <Td>
                    {row.status === "PENDING" ? (
                      <Badge colorScheme={row.actionable ? "purple" : "gray"} fontSize="10px">{row.actionable ? "Decide" : stageLabel(row)}</Badge>
                    ) : (
                      <Badge colorScheme={row.status === "APPROVED" ? "green" : "red"} fontSize="10px">{decisionLabel(row)}</Badge>
                    )}
                  </Td>
                </Tr>
                {expanded ? (
                  <Tr>
                    <Td colSpan={columns} bg="gray.50">
                      <Detail row={row} kind={kind} onDecide={onDecide} deciding={deciding && deciding.id === id ? deciding.decision : null} />
                    </Td>
                  </Tr>
                ) : null}
              </React.Fragment>
            );
          })}
        </Tbody>
      </Table>
    </Box>
  );
}
