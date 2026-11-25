import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Stack,
  Text,
} from "@chakra-ui/react";

import PayrunCalculationHelper from "../../../helper/payrunCalculation";
import { buildExportZip, runPayslipExport, zipName } from "../../../util/payslipExport";

/**
 * DOWNLOAD PAYSLIPS - the published payslips of the employees shown (or of
 * the selection), as one ZIP of PDFs.
 *
 * THE SERVER DECIDES WHO. The dialog first asks the server for the plan - the
 * published payslips inside the active filters and the caller's branches,
 * narrowed by the selection when there is one - and then fetches exactly
 * those, 25 at a time. Each batch is re-resolved by the server against the
 * same filters. The count the dialog shows is the server's, not the screen's.
 *
 * IT CHANGES NOTHING. The PDFs are rendered from the frozen published
 * snapshots, and the employees' "viewed" record - which says the EMPLOYEE
 * opened their payslip - is not touched by an export.
 *
 * NOTHING IS SILENTLY LEFT OUT. A batch that fails twice is listed by name
 * with a Retry; an employee the server declined is listed with the reason;
 * and a ZIP that is not complete is named _INCOMPLETE and carries a report.
 * A complete export downloads by itself.
 */
function PayslipExportModal({ isOpen, onClose, year, month, monthLabel, filters, selectionIds = null, rows = [] }) {
  const [phase, setPhase] = useState("planning"); // planning | ready | running | done | error
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [message, setMessage] = useState(null);
  const cancelRef = useRef(false);

  const names = new Map(rows.map((r) => [Number(r.employee_id), `${r.employee_id} - ${r.employee_name || ""}`.trim()]));
  const nameOf = (id) => names.get(Number(id)) || String(id);

  useEffect(() => {
    if (!isOpen) return undefined;
    let stale = false;
    cancelRef.current = false;
    setPhase("planning");
    setPlan(null);
    setResult(null);
    setMessage(null);
    PayrunCalculationHelper.planPayslipExport({ year, month, filters, employee_ids: selectionIds })
      .then((body) => {
        if (stale) return;
        if (!body || body.code !== 200 || !Array.isArray(body.employee_ids)) {
          setPhase("error");
          setMessage((body && body.msg) || "The export could not be prepared. Please try again.");
          return;
        }
        setPlan(body);
        setPhase("ready");
      })
      .catch(() => {
        if (stale) return;
        setPhase("error");
        setMessage("The export could not be prepared. Please try again.");
      });
    return () => {
      stale = true;
      cancelRef.current = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const download = async (r) => {
    // Loaded only when somebody actually exports, not with the payrun page.
    const { default: JSZip } = await import("jszip");
    const blob = await buildExportZip(JSZip, { result: r, year, month, nameOf });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = zipName(year, month, r.complete);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  const run = async (ids, previous = null) => {
    cancelRef.current = false;
    setPhase("running");
    setProgress({ done: 0, total: ids.length });
    const r = await runPayslipExport({
      plan: { employee_ids: ids, batch_size: plan.batch_size },
      fetchBatch: (batch) => PayrunCalculationHelper.exportPayslipBatch({ year, month, filters, employee_ids: batch }),
      onProgress: (p) => setProgress({ done: p.done, total: p.total }),
      isCancelled: () => cancelRef.current,
    });
    // A retry adds to what the first run already produced.
    const merged = previous
      ? {
          ...r,
          files: [...previous.files, ...r.files],
          skipped: [...previous.skipped, ...r.skipped],
          total: previous.total,
        }
      : r;
    merged.complete = !merged.cancelled && merged.failed.length === 0 && merged.skipped.length === 0;
    setResult(merged);
    setPhase("done");
    if (merged.complete) await download(merged);
  };

  const close = () => {
    cancelRef.current = true;
    setResult(null); // let the PDFs be garbage-collected
    onClose();
  };

  const what = selectionIds ? "selected employees" : "employees shown";

  return (
    <Modal isOpen={isOpen} onClose={close} size="lg" closeOnOverlayClick={phase !== "running"}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader fontSize="md">Download Payslips — {monthLabel}</ModalHeader>
        {phase !== "running" ? <ModalCloseButton /> : null}
        <ModalBody>
          {phase === "planning" ? <Text fontSize="sm">Finding the published payslips…</Text> : null}
          {phase === "error" ? (
            <Alert status="error" fontSize="sm">
              <AlertIcon />
              {message}
            </Alert>
          ) : null}
          {phase === "ready" && plan ? (
            plan.count === 0 ? (
              <Text fontSize="sm">No published payslips among the {what}.</Text>
            ) : (
              <Stack spacing={2} fontSize="sm">
                <Text>
                  <strong>{plan.count}</strong> published payslip{plan.count === 1 ? "" : "s"} for the {what},
                  as one ZIP of PDFs.
                </Text>
                <Text color="gray.600" fontSize="xs">
                  The same PDFs the employees receive. Downloading them does not mark any payslip as viewed.
                </Text>
              </Stack>
            )
          ) : null}
          {phase === "running" ? (
            <Stack spacing={2}>
              <Text fontSize="sm" aria-live="polite" data-testid="export-progress">
                Preparing payslips {progress.done} / {progress.total}…
              </Text>
              <Progress value={progress.total ? (100 * progress.done) / progress.total : 0} size="sm" colorScheme="purple" />
            </Stack>
          ) : null}
          {phase === "done" && result ? (
            <Stack spacing={3} fontSize="sm" data-testid="export-result">
              {result.complete ? (
                <Alert status="success" fontSize="sm">
                  <AlertIcon />
                  Downloaded {zipName(year, month, true)} — {result.files.length} payslip
                  {result.files.length === 1 ? "" : "s"}.
                </Alert>
              ) : (
                <Alert status="warning" fontSize="sm" alignItems="flex-start">
                  <AlertIcon />
                  <Box>
                    <Text fontWeight="600">
                      {result.files.length} of {result.total} payslips are ready. The export is incomplete.
                    </Text>
                    {result.cancelled ? <Text>The export was cancelled.</Text> : null}
                  </Box>
                </Alert>
              )}
              {result.failed.length ? (
                <Box data-testid="export-failed">
                  <Text fontWeight="600" color="red.600">
                    Could not be generated ({result.failed.length}):
                  </Text>
                  <Text fontSize="xs" color="gray.700" maxHeight="96px" overflowY="auto" borderWidth="1px" borderRadius="md" px={2} py={1} mt={1}>
                    {result.failed.map(nameOf).join(", ")}
                  </Text>
                </Box>
              ) : null}
              {result.skipped.length ? (
                <Box data-testid="export-skipped">
                  <Text fontWeight="600" color="orange.700">
                    Not exported ({result.skipped.length}) — no longer published, or outside the filters:
                  </Text>
                  <Text fontSize="xs" color="gray.700" maxHeight="96px" overflowY="auto" borderWidth="1px" borderRadius="md" px={2} py={1} mt={1}>
                    {result.skipped.map((s) => nameOf(s.employee_id)).join(", ")}
                  </Text>
                </Box>
              ) : null}
            </Stack>
          ) : null}
        </ModalBody>
        <ModalFooter>
          <Stack direction="row" spacing={2}>
            {phase === "ready" && plan && plan.count > 0 ? (
              <Button size="sm" colorScheme="purple" onClick={() => run(plan.employee_ids)}>
                Download ZIP ({plan.count})
              </Button>
            ) : null}
            {phase === "running" ? (
              <Button size="sm" variant="outline" onClick={() => { cancelRef.current = true; }}>
                Cancel
              </Button>
            ) : null}
            {phase === "done" && result && result.failed.length ? (
              <Button size="sm" colorScheme="purple" onClick={() => run(result.failed, { ...result, failed: [] })}>
                Retry failed ({result.failed.length})
              </Button>
            ) : null}
            {phase === "done" && result && !result.complete && result.files.length ? (
              <Button size="sm" variant="outline" onClick={() => download(result)}>
                Download the {result.files.length} ready (incomplete ZIP + report)
              </Button>
            ) : null}
            {phase !== "running" ? (
              <Button size="sm" variant="ghost" onClick={close}>
                Close
              </Button>
            ) : null}
          </Stack>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

export default PayslipExportModal;
