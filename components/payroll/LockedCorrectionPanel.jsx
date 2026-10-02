import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Spinner,
  Stack,
  Switch,
  Text,
} from "@chakra-ui/react";
import AttendanceV2Helper from "../../helper/attendanceV2";
import { SettleLockedCorrectionModal } from "../attendance/LockedCorrection";
import usePermissions from "../../customHooks/usePermissions";
import { apiMessage, displayDate, isOk, lockedEventView } from "../../util/attendanceV2";

/**
 * LOCKED-PERIOD ATTENDANCE CORRECTIONS, for Payroll.
 *
 * Each row is one correction event on a payroll-locked date: its payroll
 * difference priced on that month's frozen payrun, its direction (payable to /
 * recoverable from the employee) and its adjustment status. Nothing here
 * changes a payrun: Payroll applies the difference through the existing
 * adjustment fields of a LATER month, then marks it settled here.
 *
 * Shown to `view_payroll` / `process_payroll`; Mark settled needs
 * `process_payroll`. The backend filters to the caller's outlet scope and
 * re-checks every key.
 */
export default function LockedCorrectionPanel() {
  const canView = usePermissions(["view_payroll", "process_payroll"]);
  const canSettle = usePermissions(["process_payroll"]);
  const [rows, setRows] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settling, setSettling] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceV2Helper.listLockedCorrections(showAll ? {} : { adjustment_status: "PENDING_ADJUSTMENT" });
      if (!isOk(res)) {
        setError(apiMessage(res, "Locked-period corrections could not be loaded"));
        return;
      }
      setRows((res.corrections || []).map(lockedEventView));
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [canView, showAll]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canView) return null;

  return (
    <Box mt={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
      <Flex justify="space-between" align="center" gap={2} wrap="wrap" mb={2}>
        <Text fontWeight="600" fontSize="sm">
          Locked-period attendance corrections
        </Text>
        <Flex align="center" gap={2}>
          <Text fontSize="xs" color="gray.600">
            Show settled
          </Text>
          <Switch size="sm" isChecked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        </Flex>
      </Flex>
      {error ? (
        <Alert status="error" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}
      {loading ? (
        <Spinner size="sm" />
      ) : rows.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          {showAll ? "No locked-period corrections." : "No differences pending adjustment."}
        </Text>
      ) : (
        <Stack spacing={2}>
          {rows.map((r) => (
            <Flex key={r.id} gap={3} align="center" wrap="wrap" fontSize="sm" borderTopWidth="1px" borderColor="gray.100" pt={2}>
              <Box minW="180px">
                <Text fontWeight="600">{r.employee_name || `Employee ${r.employee_id}`}</Text>
                <Text fontSize="xs" color="gray.600">
                  {displayDate(r.attendance_date)} · {r.type === "REVOKE" ? "Revoke" : "Correction"}
                </Text>
              </Box>
              <Text fontWeight="700">{r.amount_label}</Text>
              <Badge colorScheme={r.direction_color} fontSize="10px">
                {r.direction_label}
              </Badge>
              <Badge colorScheme={r.adjustment_status === "PENDING_ADJUSTMENT" ? "orange" : "gray"} fontSize="10px">
                {r.adjustment_label}
              </Badge>
              {r.applied ? (
                <Text fontSize="xs" color="gray.600">
                  {r.applied.month} · {r.applied.note}
                </Text>
              ) : null}
              {canSettle && r.adjustment_status === "PENDING_ADJUSTMENT" ? (
                <Button size="xs" variant="outline" ml="auto" onClick={() => setSettling(r)}>
                  Mark settled
                </Button>
              ) : null}
            </Flex>
          ))}
        </Stack>
      )}
      <Text fontSize="10px" color="gray.500" mt={2}>
        Priced on the locked month&apos;s frozen payrun; PF/ESI not recomputed. Settle through Arrears (payable) or a
        recovery component (recoverable) in a later month, then mark it settled.
      </Text>
      {canSettle ? (
        <SettleLockedCorrectionModal
          event={settling}
          isOpen={!!settling}
          onClose={() => setSettling(null)}
          onSettled={async () => {
            setSettling(null);
            await load();
          }}
        />
      ) : null}
    </Box>
  );
}
