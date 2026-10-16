import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  FormControl,
  FormLabel,
  HStack,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Select,
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
  useToast,
} from "@chakra-ui/react";

import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import usePayrollActor from "../../customHooks/usePayrollActor";
import EmployeeExitHelper from "../../helper/employeeExit";
import { canViewFnf, rowActions, netLabel, STAGE_COLOR } from "../../util/fnfAccess";

/**
 * Payroll -> F&F Settlement.
 *
 * EVERY EXIT OF A PAYROLL MONTH AND WHERE ITS FULL & FINAL STANDS. The F&F
 * month is calculated, approved and published on the Payrun screen like any
 * other month - this screen adds what is particular to an exit:
 *
 *   CONFIRM PAYMENT  ACCOUNTS ONLY (confirm_fnf_payment), once the F&F
 *                    statement is published AND the money has actually
 *                    moved: payment mode, reference and date. Publishing is
 *                    not payment. A confirmed month cannot be unpublished or
 *                    unlocked until reopened.
 *   REOPEN           with a reason - the one way back.
 *   RECONCILE EXIT   payroll (process_payroll): bring a late-recorded exit
 *                    into the month's payroll snapshot.
 *
 * There are no F&F-only amounts: the exit month is paid exactly as the
 * ordinary payrun pays any month.
 *
 * NOTHING IS CALCULATED HERE. Net pay, totals and stages are the server's.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const today = () => new Date().toISOString().slice(0, 10);

function SettleModal({ open, onClose, target, mode, onDone }) {
  const toast = useToast();
  const [form, setForm] = useState({ payment_mode: "BANK", payment_reference: "", paid_on: today(), reason: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setForm({ payment_mode: "BANK", payment_reference: "", paid_on: today(), reason: "" });
  }, [open]);
  const submit = async () => {
    setBusy(true);
    try {
      const base = { year: target.year, month: target.month, employee_id: target.employee_id };
      const res =
        mode === "reopen"
          ? await EmployeeExitHelper.reopen({ ...base, reason: form.reason })
          : await EmployeeExitHelper.settle({ ...base, payment_mode: form.payment_mode, payment_reference: form.payment_reference, paid_on: form.paid_on });
      if (res.code !== 200) throw new Error(res.msg || "Not saved");
      toast({ status: "success", title: mode === "reopen" ? "Payment confirmation reopened" : "F&F payment confirmed" });
      onDone();
      onClose();
    } catch (err) {
      toast({ status: "error", title: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal isOpen={open} onClose={onClose}>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>
          {mode === "reopen" ? "Reopen payment confirmation" : "Confirm F&F payment (Accounts)"} — {target && target.employee_name}
        </ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {mode === "reopen" ? (
            <Stack spacing={3}>
              <Text fontSize="sm">
                Reopening lets the month be unpublished and corrected. The settled figures stay in the history.
              </Text>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Reason</FormLabel>
                <Textarea maxLength={500} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </FormControl>
            </Stack>
          ) : (
            <Stack spacing={3}>
              <Text fontSize="sm">
                Confirms that {netLabel(target && target.net_pay)} has actually been paid. Publishing the statement is not
                payment. The amount is taken from the published F&amp;F statement; once confirmed, the month cannot be
                unpublished or unlocked until reopened.
              </Text>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Payment mode</FormLabel>
                <Select value={form.payment_mode} onChange={(e) => setForm({ ...form, payment_mode: e.target.value })}>
                  <option value="BANK">Bank transfer</option>
                  <option value="CASH">Cash</option>
                </Select>
              </FormControl>
              <FormControl isRequired={form.payment_mode === "BANK"}>
                <FormLabel fontSize="sm">Reference (UTR / transaction id)</FormLabel>
                <Input maxLength={100} value={form.payment_reference} onChange={(e) => setForm({ ...form, payment_reference: e.target.value })} />
              </FormControl>
              <FormControl isRequired>
                <FormLabel fontSize="sm">Paid on</FormLabel>
                <Input type="date" max={today()} value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} />
              </FormControl>
            </Stack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button colorScheme={mode === "reopen" ? "red" : "green"} onClick={submit} isLoading={busy}>
            {mode === "reopen" ? "Reopen" : "Confirm payment"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

function FnfSettlement() {
  const router = useRouter();
  const toast = useToast();
  const actor = usePayrollActor();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [settleFor, setSettleFor] = useState(null);
  const canView = canViewFnf(actor);

  const load = useCallback(async () => {
    if (!canView) return;
    setLoading(true);
    try {
      const res = await EmployeeExitHelper.getMonth({ year, month });
      if (res.code !== 200) throw new Error(res.msg || "Could not load the month");
      setData(res);
    } catch (err) {
      toast({ status: "error", title: err.message });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [canView, year, month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  /* The explicit correction for an exit recorded after initialization. */
  const reconcile = async (row) => {
    try {
      const res = await EmployeeExitHelper.reconcileExit({ year, month, employee_id: row.employee_id });
      if (res.code !== 200) throw new Error(res.msg || "Not reconciled");
      toast({ status: "success", title: res.message || "Exit reconciled" });
      load();
    } catch (err) {
      toast({ status: "error", title: err.message, duration: 9000 });
    }
  };

  const years = useMemo(() => [now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1], []); // eslint-disable-line react-hooks/exhaustive-deps

  const body = () => {
    if (!canView) {
      return (
        <Alert status="warning">
          <AlertIcon />
          You do not have permission to view F&amp;F settlements.
        </Alert>
      );
    }
    return (
      <Stack spacing={4}>
        <HStack>
          <Select width="160px" value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </Select>
          <Select width="110px" value={year} onChange={(e) => setYear(Number(e.target.value))}>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Button onClick={load} isLoading={loading} variant="outline">
            Refresh
          </Button>
        </HStack>
        <Text fontSize="sm" color="gray.600">
          Employees whose last working day falls in this month. Calculate, approve and publish the month on the Payrun
          screen — an exit month publishes a Full &amp; Final Settlement statement instead of a payslip.
        </Text>
        {loading && !data ? <Spinner /> : null}
        {data && data.rows.length === 0 ? <Text color="gray.500">No exits in this month.</Text> : null}
        {data && data.rows.length > 0 ? (
          <Box overflowX="auto">
            <Table size="sm">
              <Thead>
                <Tr>
                  <Th>Employee</Th>
                  <Th>Last working day</Th>
                  <Th>Stage</Th>
                  <Th isNumeric>Net</Th>
                  <Th>Settlement</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {data.rows.map((row) => {
                  const a = rowActions(row, actor);
                  const target = { ...row, year, month };
                  return (
                    <React.Fragment key={`${row.employee_id}-${row.exit_date}`}>
                    <Tr>
                      <Td>
                        <Text fontWeight="medium">{row.employee_name}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {row.employee_id}
                          {row.location ? ` · ${row.location}` : ""}
                        </Text>
                      </Td>
                      <Td>{row.exit_date}</Td>
                      <Td>
                        <Badge colorScheme={STAGE_COLOR[row.stage] || "gray"}>{row.stage_label}</Badge>
                      </Td>
                      <Td isNumeric>{netLabel(row.net_pay)}</Td>
                      <Td fontSize="xs">
                        {row.settlement_status === "SETTLED"
                          ? `${row.payment_mode || ""} ${row.payment_reference || ""} · ${row.paid_on || ""}`
                          : "Payment not confirmed"}
                      </Td>
                      <Td>
                        <Stack spacing={1} align="flex-end">
                          {a.settle ? (
                            <Button size="xs" colorScheme="green" onClick={() => setSettleFor({ target, mode: "settle" })}>
                              Confirm payment
                            </Button>
                          ) : null}
                          {a.reconcile ? (
                            <Button size="xs" colorScheme="orange" onClick={() => reconcile(row)}>
                              Reconcile exit
                            </Button>
                          ) : null}
                          {a.reopen ? (
                            <Button size="xs" colorScheme="red" variant="outline" onClick={() => setSettleFor({ target, mode: "reopen" })}>
                              Reopen
                            </Button>
                          ) : null}
                          {a.exitInterview ? (
                            <Button size="xs" variant="ghost" onClick={() => router.push(`/hr/exit/${row.employee_id}`)}>
                              Exit interview
                            </Button>
                          ) : null}
                        </Stack>
                      </Td>
                    </Tr>
                    {/* What stops this exit from moving on, across the whole row. */}
                    {row.outstanding_ot || row.open_ot_requests || row.warning ? (
                      <Tr>
                        <Td colSpan={6} pt={0} borderTopWidth={0}>
                          {row.outstanding_ot ? (
                            <Text fontSize="xs" color="red.600">
                              Outstanding approved OT: {row.outstanding_ot.items} item(s), {netLabel(row.outstanding_ot.amount)}
                            </Text>
                          ) : null}
                          {row.warning ? (
                            <Text fontSize="xs" color="orange.600">
                              {row.warning}
                            </Text>
                          ) : null}
                        </Td>
                      </Tr>
                    ) : null}
                    </React.Fragment>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        ) : null}
        <SettleModal
          open={Boolean(settleFor)}
          onClose={() => setSettleFor(null)}
          target={settleFor && settleFor.target}
          mode={settleFor && settleFor.mode}
          onDone={load}
        />
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="F&F Settlement">
      <CustomContainer title="F&F Settlement" subtitle="Full & Final settlements of employees who left in the month.">
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default FnfSettlement;
