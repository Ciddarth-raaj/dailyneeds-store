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
import { apiMessage, displayDate, isOk, lockedEventView, outstandingView } from "../../util/attendanceV2";

/**
 * LOCKED-PERIOD ATTENDANCE CORRECTIONS, for Payroll.
 *
 * ACTIONABLE: one row per correction REQUEST whose OUTSTANDING adjustment -
 * the derived net of its unsettled events - is not zero, with its direction
 * (payable to / recoverable from the employee). A correction revoked before
 * settlement nets to zero and is not listed here at all. "Show history" lists
 * every immutable event (approval / revoke) with its own difference and
 * status, with no actions. Nothing here changes a payrun: Payroll applies the
 * net through the existing adjustment fields of a LATER month, then marks the
 * request settled here.
 *
 * Shown to `view_payroll` / `process_payroll`; Mark settled needs
 * `process_payroll`. The backend filters to the caller's outlet scope and
 * re-checks every key.
 */
export default function LockedCorrectionPanel() {
  const canView = usePermissions(["view_payroll", "process_payroll"]);
  const canSettle = usePermissions(["process_payroll"]);
  const [outstanding, setOutstanding] = useState([]);
  const [history, setHistory] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settling, setSettling] = useState(null);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceV2Helper.listLockedCorrections();
      if (!isOk(res)) {
        setError(apiMessage(res, "Locked-period corrections could not be loaded"));
        return;
      }
      setOutstanding(
        (res.outstanding || []).map((o) => ({
          ...outstandingView(o),
          request_id: o.attendance_approval_request_id,
          employee_id: o.employee_id,
          employee_name: o.employee_name,
          attendance_date: o.attendance_date,
        }))
      );
      setHistory((res.corrections || []).map(lockedEventView));
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    load();
  }, [load]);

  if (!canView) return null;

  return (
    <Box mt={4} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
      <Flex justify="space-between" align="center" gap={2} wrap="wrap" mb={2}>
        <Flex align="center" gap={2}>
          <Text fontWeight="600" fontSize="sm">
            Locked-period attendance corrections
          </Text>
          {outstanding.length > 0 ? (
            <Badge colorScheme="orange" fontSize="10px">
              {outstanding.length} pending
            </Badge>
          ) : null}
        </Flex>
        <Flex align="center" gap={2}>
          <Text fontSize="xs" color="gray.600">
            Show history
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
      ) : outstanding.length === 0 ? (
        <Text fontSize="sm" color="gray.500">
          No adjustments outstanding.
        </Text>
      ) : (
        <Stack spacing={2}>
          {outstanding.map((r) => (
            <Flex key={r.request_id} gap={3} align="center" wrap="wrap" fontSize="sm" borderTopWidth="1px" borderColor="gray.100" pt={2}>
              <Box minW="180px">
                <Text fontWeight="600">{r.employee_name || `Employee ${r.employee_id}`}</Text>
                <Text fontSize="xs" color="gray.600">
                  {displayDate(r.attendance_date)} · Request #{r.request_id}
                </Text>
              </Box>
              <Text fontWeight="700">{r.amount_label}</Text>
              <Badge colorScheme={r.direction_color} fontSize="10px">
                {r.direction_label}
              </Badge>
              <Badge colorScheme="orange" fontSize="10px">
                Pending adjustment
              </Badge>
              {canSettle ? (
                <Button size="xs" variant="outline" ml="auto" onClick={() => setSettling(r)}>
                  Mark settled
                </Button>
              ) : null}
            </Flex>
          ))}
        </Stack>
      )}
      {showAll ? (
        <Box mt={3}>
          <Text fontSize="xs" fontWeight="600" color="gray.600" mb={1}>
            History (every event, as recorded)
          </Text>
          {history.length === 0 ? (
            <Text fontSize="xs" color="gray.500">
              No locked-period corrections.
            </Text>
          ) : (
            <Stack spacing={1}>
              {history.map((e) => (
                <Flex key={e.id} gap={2} fontSize="xs" wrap="wrap" align="center">
                  <Text minW="160px">
                    {e.employee_name || `Employee ${e.employee_id}`} · {displayDate(e.attendance_date)}
                  </Text>
                  <Text>{e.type === "REVOKE" ? "Revoke" : "Approval"}</Text>
                  <Text fontWeight="600">{e.amount_label}</Text>
                  <Badge colorScheme={e.direction_color} fontSize="9px">
                    {e.direction_label}
                  </Badge>
                  <Badge fontSize="9px">{e.adjustment_label}</Badge>
                  {e.applied ? <Text color="gray.600">{e.applied.month}</Text> : null}
                </Flex>
              ))}
            </Stack>
          )}
        </Box>
      ) : null}
      <Text fontSize="10px" color="gray.500" mt={2}>
        Net of each correction&apos;s unsettled events, priced on the locked month&apos;s frozen payrun; PF/ESI not
        recomputed. Settle through Arrears (payable) or a recovery component (recoverable) in a later month, then mark
        it settled. A correction revoked before settlement nets to zero and needs nothing.
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
