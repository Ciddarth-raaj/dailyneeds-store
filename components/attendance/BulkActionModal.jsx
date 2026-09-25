import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Progress,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import AttendanceV2Helper from "../../helper/attendanceV2";
import { apiMessage, displayDate, isOk } from "../../util/attendanceV2";
import { BULK_ACTION, chunk, confirmTitle, mergeBulkResults, reasonError, reasonRequired } from "../../util/approvalBulk";

/**
 * BULK Approve / Reject / Revoke - confirm, run, report.
 *
 * NOT A SECOND WORKFLOW. The ids go to `/attendance/approvals/bulk`, which
 * puts each one through the same single-record action the row's own buttons
 * use; every rule is checked there, per record. This screen states how many
 * requests will be actioned, asks for the one reason Reject and Revoke need,
 * sends the selection in turns of a few dozen, and then shows what happened
 * to each: done, skipped (a rule said no - with the rule) or failed (it moved
 * underneath, or could not be reached). Nothing that succeeded is undone by a
 * later refusal.
 */
const EFFECT = {
  APPROVE: () => "Each request is approved at its current stage, exactly as its own Approve button would.",
  REJECT: () => "Each request is rejected and closed. The same reason is recorded on every one of them.",
  REVOKE: (type, status) =>
    type === "SHIFT_CHANGE" && status === "REJECTED"
      ? "Each rejected shift request is reopened: the rejection is withdrawn and it goes back to Pending at the stage that rejected it, for that approver to decide again. One the shift request rules would refuse now (another shift request for the date, an HR block, too old) is skipped."
      : type === "SHIFT_CHANGE"
      ? "Each approved shift request is cancelled - it does not go back to Pending. Its one-day shift stops applying, the date is recalculated on the normal shift, and any OT that shift authorised is removed. One with an OT request on the date is skipped - revoke that OT first."
      : type === "OT"
      ? "Each OT request is cancelled - it does not go back to Pending. Its OT stops reaching payroll, the day shows OT as Not Requested again, and the employee can raise a fresh request."
      : "Each request is cancelled - it does not go back to Pending. Its punch stops counting, the date is recalculated, and the employee can raise a fresh request.",
};

const OUTCOME_COLOR = { SUCCEEDED: "green", SKIPPED: "orange", FAILED: "red" };

export default function BulkActionModal({ target, isOpen, onClose, onFinished, describeRow }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(null);
  const [report, setReport] = useState(null);

  if (!target) return null;
  const { action, type, status, items } = target;
  const running = progress !== null && report === null;

  const reset = () => {
    setReason("");
    setError(null);
    setProgress(null);
    setReport(null);
  };
  const close = () => {
    if (running) return;
    const finished = report;
    reset();
    onClose();
    if (finished) onFinished(finished);
  };

  const run = async () => {
    const problem = reasonError(action, reason);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const parts = [];
    const batches = chunk(items);
    setProgress({ done: 0, total: items.length });
    for (const batch of batches) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const body = await AttendanceV2Helper.bulkApprovals({
          action,
          request_type: type,
          items: batch,
          reason: reason.trim() || undefined,
        });
        parts.push(isOk(body) ? { ok: true, body } : { ok: false, items: batch, message: apiMessage(body, "The server refused this part of the selection") });
      } catch (err) {
        parts.push({ ok: false, items: batch, message: "Could not reach the server" });
      }
      setProgress((p) => ({ ...p, done: Math.min(p.total, p.done + batch.length) }));
    }
    setReport(mergeBulkResults(parts));
  };

  const verb = action === BULK_ACTION.APPROVE ? "Approve" : action === BULK_ACTION.REJECT ? "Reject" : "Revoke";

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={close}
      title={report ? `${verb}: results` : confirmTitle(action, items.length, type)}
      size="lg"
      bodyProps={{ p: 4 }}
      footer={
        report ? (
          <Flex w="100%" justify="flex-end">
            <Button size="sm" colorScheme="purple" onClick={close}>Done</Button>
          </Flex>
        ) : (
          <Flex gap={2} w="100%" justify="flex-end" wrap="wrap">
            <Button size="sm" variant="ghost" onClick={close} isDisabled={running}>Cancel</Button>
            <Button
              size="sm"
              colorScheme={action === BULK_ACTION.APPROVE ? "green" : "red"}
              onClick={run}
              isLoading={running}
              isDisabled={reasonRequired(action) && reason.trim().length < 5}
            >
              {verb} {items.length}
            </Button>
          </Flex>
        )
      }
    >
      {report ? (
        <Stack spacing={3}>
          <SimpleGrid columns={3} spacing={2}>
            {[
              ["Successful", report.summary.succeeded, "green"],
              ["Skipped", report.summary.skipped, "orange"],
              ["Failed", report.summary.failed, "red"],
            ].map(([label, n, color]) => (
              <Box key={label} borderWidth="1px" borderRadius="md" p={2} textAlign="center">
                <Text fontSize="2xl" fontWeight="700" color={`${color}.600`}>{n}</Text>
                <Text fontSize="xs" color="gray.600">{label}</Text>
              </Box>
            ))}
          </SimpleGrid>
          {report.problems.length > 0 ? (
            <Box maxH="320px" overflowY="auto" borderWidth="1px" borderRadius="md">
              {report.problems.map((r) => (
                <Flex key={r.request_id} gap={2} p={2} borderBottomWidth="1px" borderColor="gray.100" align="flex-start">
                  <Badge colorScheme={OUTCOME_COLOR[r.outcome] || "gray"} fontSize="10px" mt="2px">{r.outcome === "SKIPPED" ? "Skipped" : "Failed"}</Badge>
                  <Box fontSize="sm">
                    <Text fontWeight="600">
                      #{r.request_id}
                      {describeRow ? ` · ${describeRow(r)}` : ""}
                      {r.attendance_date ? ` · ${displayDate(r.attendance_date)}` : ""}
                    </Text>
                    <Text color="gray.700">{r.message}</Text>
                  </Box>
                </Flex>
              ))}
            </Box>
          ) : (
            <Text fontSize="sm" color="green.700">Every selected request was actioned.</Text>
          )}
        </Stack>
      ) : (
        <Stack spacing={4}>
          <Alert status={action === BULK_ACTION.APPROVE ? "info" : "warning"} fontSize="sm" borderRadius="md" alignItems="flex-start">
            <AlertIcon />
            <Box>
              <b>{items.length}</b> selected request{items.length === 1 ? "" : "s"}. {EFFECT[action](type, status)} Each one is checked
              on its own - permission, payroll lock, its current state - and one that cannot be actioned is skipped and
              reported without stopping the rest.
            </Box>
          </Alert>
          {reasonRequired(action) || action === BULK_ACTION.APPROVE ? (
            <FormControl isRequired={reasonRequired(action)}>
              <FormLabel fontSize="sm">
                {action === BULK_ACTION.REJECT ? "Rejection reason" : action === BULK_ACTION.REVOKE ? "Revoke reason" : "Remarks (optional)"}
              </FormLabel>
              <Textarea
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                isDisabled={running}
                placeholder={reasonRequired(action) ? "Recorded on every selected request" : "Optional - recorded on every approval"}
              />
            </FormControl>
          ) : null}
          {running ? (
            <Box>
              <Text fontSize="xs" color="gray.600" mb={1}>Processing {progress.done} of {progress.total}…</Text>
              <Progress size="sm" colorScheme="purple" value={(progress.done / Math.max(1, progress.total)) * 100} />
            </Box>
          ) : null}
          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}
        </Stack>
      )}
    </CustomModal>
  );
}
