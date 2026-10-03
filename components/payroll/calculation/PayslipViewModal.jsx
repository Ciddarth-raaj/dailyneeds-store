import React, { useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";

import PayrunCalculationHelper from "../../../helper/payrunCalculation";
import PayslipDetail from "../../payslip/PayslipDetail";
import { describeApiResult, KIND } from "../../../util/salaryApiError";
import { notificationBadge, viewBadge, formatViewedAt } from "../../../util/payrunCalculation";

/**
 * VIEW PAYSLIP (payroll / admin) - the published payslip exactly as the
 * employee sees it in the Mini App: the frozen snapshot, not the live
 * calculation. The server applies the branch scope and the sensitive-field
 * filter (UAN / PF / ESI numbers are absent for a viewer without that
 * permission).
 */
function PayslipViewModal({ isOpen, onClose, target, year, month }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!isOpen || !target) return undefined;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setData(null);
    PayrunCalculationHelper.getPayslip({ year, month, employee_id: target.employee_id })
      .then((body) => {
        if (cancelled) return;
        const outcome = describeApiResult(body);
        if (outcome.kind !== KIND.OK) setError(outcome.message);
        else setData(body);
      })
      .catch(() => !cancelled && setError("The payslip could not be loaded. Please try again."))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isOpen, target, year, month]);

  const payslip = data && data.payslip;
  const latest = data && data.notifications && data.notifications[0];
  const n = payslip ? notificationBadge({ notification_status: latest ? latest.result : "NOT_ATTEMPTED" }) : null;
  const v = payslip ? viewBadge({ viewed: Boolean(payslip.first_viewed_at), first_viewed_at: payslip.first_viewed_at }) : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent mx={4}>
        <ModalHeader>Payslip{target ? ` — ${target.employee_name || target.employee_id}` : ""}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading ? (
            <Stack direction="row" align="center" spacing={2}>
              <Spinner size="sm" />
              <Text fontSize="sm">Loading the payslip…</Text>
            </Stack>
          ) : null}
          {error ? (
            <Alert status="error" fontSize="sm">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}
          {data && !payslip ? (
            <Alert status="info" fontSize="sm">
              <AlertIcon />
              No payslip is published for this employee and month.
            </Alert>
          ) : null}
          {payslip ? (
            <Stack spacing={3}>
              <Stack direction="row" spacing={2} flexWrap="wrap">
                <Badge colorScheme="blue">Payslip Published</Badge>
                {n ? <Badge colorScheme={n.scheme}>{n.label}</Badge> : null}
                {v ? <Badge colorScheme={v.scheme} variant="outline">{v.label}</Badge> : null}
              </Stack>
              <Text fontSize="xs" color="gray.600">
                Version {payslip.payslip_version} · published {formatViewedAt(payslip.published_at)} ·{" "}
                {payslip.template_version}
                {payslip.last_viewed_at ? ` · last viewed ${formatViewedAt(payslip.last_viewed_at)}` : ""}
              </Text>
              <PayslipDetail snapshot={payslip.snapshot} />
              {data.notifications && data.notifications.length > 0 ? (
                <Stack spacing={1}>
                  <Text fontSize="sm" fontWeight="semibold">
                    Telegram notifications
                  </Text>
                  {data.notifications.map((a) => (
                    <Text key={a.attempt_no} fontSize="xs" color="gray.700">
                      #{a.attempt_no} {a.trigger_type === "RETRY" ? "Retry" : "Publish"} · {a.result}
                      {a.failure_code ? ` (${a.failure_code})` : ""} · {formatViewedAt(a.attempted_at)}
                    </Text>
                  ))}
                </Stack>
              ) : null}
              {data.versions && data.versions.length > 1 ? (
                <Text fontSize="xs" color="gray.600">
                  {data.versions.length - 1} earlier archived version
                  {data.versions.length - 1 === 1 ? "" : "s"} kept for the audit.
                </Text>
              ) : null}
            </Stack>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Button size="sm" onClick={onClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default PayslipViewModal;
