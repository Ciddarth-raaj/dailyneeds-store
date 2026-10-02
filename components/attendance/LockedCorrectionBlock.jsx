import React from "react";
import { Badge, Box, Button, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { formatMinutes, lockedCorrectionView } from "../../util/attendanceV2";

/**
 * LOCKED-PERIOD CORRECTION, DISPLAY ONLY - for the Day Detail: status,
 * authorisation, the FULL immutable history (each approval / revoke event
 * with its old vs corrected attendance and its own difference), and ONE
 * outstanding adjustment - the derived net of the unsettled events. Mark
 * settled is offered only when that net is not zero.
 *
 * DELIBERATELY IMPORTS NO API HELPER. The Telegram Mini App renders the Day
 * Detail and must never reach the authenticated API; the actions (authorise,
 * settle) live in `LockedCorrection.jsx` and are passed in as callbacks by the
 * screens that may use them.
 */

function Line({ label, value }) {
  return (
    <Flex justify="space-between" gap={3} fontSize="xs">
      <Text color="gray.600">{label}</Text>
      <Text fontWeight="600" textAlign="right">
        {value === null || value === undefined || value === "" ? "—" : value}
      </Text>
    </Flex>
  );
}

function Attendance({ title, calc }) {
  return (
    <Box borderWidth="1px" borderColor="gray.100" borderRadius="md" px={2} py={1}>
      <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
        {title}
      </Text>
      {calc ? (
        <Stack spacing={0}>
          <Text fontSize="xs" fontFamily="mono">
            {calc.punches || "—"}
          </Text>
          <Line label="Worked" value={formatMinutes(calc.worked)} />
          <Line label="Break" value={formatMinutes(calc.break_charged)} />
          <Line label="OT eligible" value={formatMinutes(calc.ot_eligible)} />
          <Line label="Approved OT" value={formatMinutes(calc.approved_ot)} />
        </Stack>
      ) : (
        <Text fontSize="xs">—</Text>
      )}
    </Box>
  );
}

export function LockedCorrectionBlock({ day, onSettle }) {
  const view = lockedCorrectionView(day);
  if (!view) return null;
  return (
    <Box borderWidth="1px" borderColor={`${view.color}.200`} bg={`${view.color}.50`} borderRadius="md" px={3} py={2}>
      <Flex justify="space-between" align="center" gap={2} wrap="wrap">
        <Text fontSize="sm" fontWeight="600">
          Locked payroll period
        </Text>
        <Badge colorScheme={view.color} fontSize="10px">
          {view.label}
        </Badge>
      </Flex>
      {view.authorised_by ? (
        <Stack spacing={0} mt={1}>
          <Line label="Authorised by" value={view.authorised_by} />
          <Line label="Authorised at" value={view.authorised_at} />
          <Line label="Authorisation reason" value={view.authorisation_reason} />
        </Stack>
      ) : null}
      {view.events.map((e) => (
        <Box key={e.id} mt={2} pt={2} borderTopWidth="1px" borderColor={`${view.color}.100`}>
          <Text fontSize="xs" fontWeight="600">
            {e.type === "REVOKE" ? "Correction revoked" : "Correction approved"} · {e.occurred_at}
            {e.reason ? ` · ${e.reason}` : ""}
          </Text>
          <SimpleGrid columns={2} spacing={2} mt={1}>
            <Attendance title={e.type === "REVOKE" ? "Before revoke" : "Old attendance"} calc={e.old} />
            <Attendance title={e.type === "REVOKE" ? "After revoke" : "Corrected attendance"} calc={e.corrected} />
          </SimpleGrid>
          <Flex mt={1} gap={2} align="center" wrap="wrap">
            <Text fontSize="sm" fontWeight="700">
              {e.amount_label}
            </Text>
            <Badge colorScheme={e.direction_color} fontSize="10px">
              {e.direction_label}
            </Badge>
            <Badge colorScheme={e.adjustment_status === "SETTLED" ? "green" : "gray"} fontSize="10px">
              {e.display_label}
            </Badge>
          </Flex>
          {e.applied ? (
            <Text fontSize="xs" color="gray.600">
              Settled in {e.applied.month} by {e.applied.by || "—"} · {e.applied.note}
            </Text>
          ) : null}
        </Box>
      ))}
      {view.outstanding && view.events.length > 0 ? (
        <Flex mt={2} pt={2} borderTopWidth="1px" borderColor={`${view.color}.100`} gap={2} align="center" wrap="wrap">
          <Text fontSize="xs" fontWeight="600">
            Outstanding adjustment
          </Text>
          {view.outstanding.actionable ? (
            <>
              <Text fontSize="sm" fontWeight="700">
                {view.outstanding.amount_label}
              </Text>
              <Badge colorScheme={view.outstanding.direction_color} fontSize="10px">
                {view.outstanding.direction_label}
              </Badge>
              <Badge colorScheme="orange" fontSize="10px">
                Pending adjustment
              </Badge>
              {onSettle ? (
                <Button
                  size="xs"
                  variant="outline"
                  ml="auto"
                  onClick={() =>
                    onSettle({
                      request_id: view.request_id,
                      amount_label: view.outstanding.amount_label,
                      direction_label: view.outstanding.direction_label,
                    })
                  }
                >
                  Mark settled
                </Button>
              ) : null}
            </>
          ) : (
            <Text fontSize="xs" color="gray.700">
              {view.outstanding.label}
            </Text>
          )}
        </Flex>
      ) : null}
      <Text fontSize="10px" color="gray.500" mt={1}>
        The locked payroll is not changed. The difference is settled manually by Payroll in a later month; PF/ESI are not
        recomputed.
      </Text>
    </Box>
  );
}
