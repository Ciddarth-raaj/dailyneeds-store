import React from "react";
import { Badge, Box, Flex, SimpleGrid, Stack, Text } from "@chakra-ui/react";
import { formatMinutes, lockedCorrectionView } from "../../util/attendanceV2";

/**
 * LOCKED-PERIOD CORRECTION, DISPLAY ONLY - for the Day Detail: status,
 * authorisation, and the full immutable history of approval / revoke events,
 * each with the attendance before and after and how worked time, break and OT
 * moved. ATTENDANCE AND OT ONLY: no money, and the locked payroll is not
 * changed.
 *
 * DELIBERATELY IMPORTS NO API HELPER. The Telegram Mini App renders the Day
 * Detail and must never reach the authenticated API; the authorise action
 * lives in `LockedCorrection.jsx` and is passed in by the screens that may
 * use it.
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

export function LockedCorrectionBlock({ day }) {
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
          <Text fontSize="xs" mt={1} fontWeight="600">
            {e.impact_label}
          </Text>
        </Box>
      ))}
      <Text fontSize="10px" color="gray.500" mt={1}>
        Attendance and OT only. The locked payroll is not changed.
      </Text>
    </Box>
  );
}
