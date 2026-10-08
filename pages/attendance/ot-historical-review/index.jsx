import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertDescription,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  SimpleGrid,
  Stack,
  Stat,
  StatHelpText,
  StatLabel,
  StatNumber,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, isOk } from "../../../util/attendanceV2";
import {
  PAYROLL_LABEL,
  actionLabel,
  confirmationSummary,
  isCreatable,
  keyOf,
  selectedItems,
} from "../../../util/otHistoricalReview";

/**
 * HISTORICAL OT REVIEW.
 *
 * Calculated OT dated before the automatic-OT cutover never reached
 * approval. This screen PREVIEWS it (read only: every date with calculated
 * OT, its existing approval, its payroll status and the proposed action, and
 * what the real OT sync would do), and lets an authorised administrator
 * create PENDING OT for the dates they select. It approves and pays nothing:
 * the OT walks the employee's normal approval chain, and in a locked or
 * published month an approval settles in a later payroll as Prior-Month OT.
 */
function HistoricalOtReview() {
  const toast = useToast();
  const [range, setRange] = useState({ from_date: "", to_date: "" });
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);
  const [batches, setBatches] = useState([]);

  const loadBatches = useCallback(async () => {
    try {
      const res = await AttendanceV2Helper.listHistoricalOtBatches();
      if (isOk(res)) setBatches(Array.isArray(res.batches) ? res.batches : []);
    } catch (err) {
      // The history is secondary; the preview still works without it.
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await AttendanceV2Helper.previewHistoricalOt(range);
      if (!isOk(res)) {
        setPreview(null);
        setError(apiMessage(res, "The preview could not be loaded"));
      } else {
        setPreview(res);
        setRange({ from_date: res.from_date, to_date: res.to_date });
        setSelected(new Set());
      }
    } catch (err) {
      setPreview(null);
      setError(apiMessage(err && err.response ? err.response.data : null, "Could not reach the server. Please try again."));
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
    loadBatches();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lines = useMemo(() => (preview && Array.isArray(preview.lines) ? preview.lines : []), [preview]);
  const creatable = useMemo(() => lines.filter(isCreatable), [lines]);
  const pending = confirmationSummary(lines, selected);

  const toggle = (line) =>
    setSelected((current) => {
      const next = new Set(current);
      const key = keyOf(line);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  const toggleAll = () =>
    setSelected((current) => (current.size === creatable.length ? new Set() : new Set(creatable.map(keyOf))));

  const apply = async () => {
    setApplying(true);
    try {
      const res = await AttendanceV2Helper.authoriseHistoricalOt({
        from_date: preview.from_date,
        to_date: preview.to_date,
        preview_hash: preview.preview_hash,
        items: selectedItems(lines, selected),
      });
      setConfirming(false);
      if (!isOk(res)) {
        toast({ status: "error", title: apiMessage(res, "Nothing was created"), duration: 8000, isClosable: true });
        if (res && res.code === 409) load();
        return;
      }
      setResult(res);
      toast({ status: "success", title: `Batch #${res.review_batch_id}: ${res.summary.created} Pending OT created` });
      load();
      loadBatches();
    } catch (err) {
      toast({ status: "error", title: "Could not reach the server. Nothing may have been created - refresh and check." });
    } finally {
      setApplying(false);
    }
  };

  const s = preview ? preview.summary : null;
  const stat = (label, b, help) => (
    <Stat borderWidth="1px" borderRadius="md" p={3} bg="white">
      <StatLabel>{label}</StatLabel>
      <StatNumber fontSize="xl">{b ? b.entries : "—"}</StatNumber>
      <StatHelpText mb={0}>{b ? `${b.minutes} min · ${b.employees} employees` : help}</StatHelpText>
    </Stat>
  );

  return (
    <GlobalWrapper title="Historical OT Review" permissionKey={["attendance_ot_historical_review"]}>
      <CustomContainer title="Historical OT Review" filledHeader>
        <Stack spacing={4}>
          <Alert status="info" borderRadius="md" alignItems="flex-start">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              Calculated OT dated before automatic OT approval started
              {preview ? ` (${preview.cutover})` : ""} was never sent for approval. Creating it here raises
              <strong> Pending OT</strong> on each employee&rsquo;s normal approval chain. Nothing is approved or paid
              here. In a locked or published month, an approval is paid in a later payroll as Prior-Month OT; the
              locked payroll is not changed.
            </AlertDescription>
          </Alert>

          <Flex gap={3} wrap="wrap" align="flex-end">
            <FormControl w="auto">
              <FormLabel fontSize="sm">From</FormLabel>
              <Input type="date" size="sm" value={range.from_date} onChange={(e) => setRange((r) => ({ ...r, from_date: e.target.value }))} />
            </FormControl>
            <FormControl w="auto">
              <FormLabel fontSize="sm">To</FormLabel>
              <Input type="date" size="sm" value={range.to_date} onChange={(e) => setRange((r) => ({ ...r, to_date: e.target.value }))} />
            </FormControl>
            <Button size="sm" onClick={load} isLoading={loading}>
              Refresh preview
            </Button>
          </Flex>

          {error ? (
            <Alert status="error" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          {s ? (
            <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3} data-review-summary="">
              {stat("Calculated OT entries", s.calculated_ot)}
              {stat("Without an approval request", s.without_request)}
              {stat("To create", s.to_create)}
              {stat("Locked / published payroll", {
                entries: ((s.by_payroll_status.APPROVED_LOCKED || {}).entries || 0) + ((s.by_payroll_status.PUBLISHED || {}).entries || 0),
                minutes: ((s.by_payroll_status.APPROVED_LOCKED || {}).minutes || 0) + ((s.by_payroll_status.PUBLISHED || {}).minutes || 0),
                employees: "—",
              })}
            </SimpleGrid>
          ) : null}

          {result ? (
            <Alert status={result.summary.failed > 0 ? "warning" : "success"} borderRadius="md">
              <AlertIcon />
              Batch #{result.review_batch_id}: {result.summary.created} created ({result.summary.created_minutes} min),{" "}
              {result.summary.skipped} skipped, {result.summary.failed} failed.
            </Alert>
          ) : null}

          <Flex justify="space-between" align="center" gap={2} wrap="wrap">
            <Text fontSize="sm" color="gray.600">
              {lines.length} dates · {creatable.length} can be created · {selected.size} selected
            </Text>
            <Button
              colorScheme="purple"
              size="sm"
              isDisabled={selected.size === 0}
              onClick={() => setConfirming(true)}
            >
              Create Pending OT for {selected.size} selected
            </Button>
          </Flex>

          <Box overflowX="auto" borderWidth="1px" borderRadius="md" bg="white">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>
                    <Checkbox
                      isChecked={creatable.length > 0 && selected.size === creatable.length}
                      isIndeterminate={selected.size > 0 && selected.size < creatable.length}
                      onChange={toggleAll}
                      isDisabled={creatable.length === 0}
                    />
                  </Th>
                  <Th>Employee</Th>
                  <Th>Date</Th>
                  <Th isNumeric>Calculated OT</Th>
                  <Th isNumeric>Would raise</Th>
                  <Th>Existing approval</Th>
                  <Th>Payroll</Th>
                  <Th>Proposed action</Th>
                </Tr>
              </Thead>
              <Tbody>
                {lines.map((l) => (
                  <Tr key={keyOf(l)}>
                    <Td>
                      {isCreatable(l) ? <Checkbox isChecked={selected.has(keyOf(l))} onChange={() => toggle(l)} /> : null}
                    </Td>
                    <Td fontSize="xs">
                      {l.employee_name} <Text as="span" color="gray.500">({l.employee_id})</Text>
                    </Td>
                    <Td fontSize="xs" whiteSpace="nowrap">{l.attendance_date}</Td>
                    <Td isNumeric fontSize="xs">{l.calculated_ot_minutes} min</Td>
                    <Td isNumeric fontSize="xs">
                      {l.dry_run && l.dry_run.ot_minutes !== undefined ? `${l.dry_run.ot_minutes} min` : "—"}
                    </Td>
                    <Td fontSize="xs">
                      {l.existing_status
                        ? `${l.existing_status} #${l.existing_request_id}`
                        : l.withdrawn_request_id
                        ? `None (withdrawn #${l.withdrawn_request_id})`
                        : "None"}
                    </Td>
                    <Td fontSize="xs">{PAYROLL_LABEL[l.payroll_status] || l.payroll_status}</Td>
                    <Td>
                      <Badge colorScheme={isCreatable(l) ? "purple" : "gray"} fontSize="10px" whiteSpace="normal">
                        {actionLabel(l.proposed_action)}
                      </Badge>
                    </Td>
                  </Tr>
                ))}
                {lines.length === 0 && !loading ? (
                  <Tr>
                    <Td colSpan={8}>
                      <Text fontSize="sm" color="gray.500">No calculated OT in this window.</Text>
                    </Td>
                  </Tr>
                ) : null}
              </Tbody>
            </Table>
          </Box>

          {batches.length > 0 ? (
            <Box>
              <Text fontWeight="600" fontSize="sm" mb={2}>Previous review batches</Text>
              <Stack spacing={1}>
                {batches.map((b) => (
                  <Text key={b.review_batch_id} fontSize="xs" color="gray.700">
                    #{b.review_batch_id} · {b.from_date}–{b.to_date} · {b.item_count} items · {b.status} · authorised by{" "}
                    {b.authorised_by_employee_id} at {b.authorised_at}
                  </Text>
                ))}
              </Stack>
            </Box>
          ) : null}
        </Stack>
      </CustomContainer>

      <Modal isOpen={confirming} onClose={() => (applying ? null : setConfirming(false))} isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create Pending OT</ModalHeader>
          <ModalCloseButton isDisabled={applying} />
          <ModalBody>
            <Stack spacing={2} fontSize="sm">
              <Text>
                <strong>{pending.entries}</strong> Pending OT requests for <strong>{pending.employees}</strong> employees,{" "}
                <strong>{pending.minutes}</strong> minutes in all.
              </Text>
              {pending.prior_month > 0 ? (
                <Text>
                  {pending.prior_month} are in a locked or published payroll month: if approved, they are paid in the
                  next eligible payroll as Prior-Month OT. The locked payroll is not changed.
                </Text>
              ) : null}
              <Text color="gray.600">
                Nothing is approved or paid now. Each request goes to the employee&rsquo;s normal approvers. A date can
                be raised by a review only once.
              </Text>
            </Stack>
          </ModalBody>
          <ModalFooter gap={2}>
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} isDisabled={applying}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="purple" onClick={apply} isLoading={applying}>
              Create {pending.entries} Pending OT
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </GlobalWrapper>
  );
}

export default HistoricalOtReview;
