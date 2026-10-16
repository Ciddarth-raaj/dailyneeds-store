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
import { canViewFnf, canManageFnf, rowActions, netLabel, STAGE_COLOR } from "../../util/fnfAccess";

/**
 * Payroll -> F&F Settlement.
 *
 * EVERY EXIT OF A PAYROLL MONTH AND WHERE ITS FULL & FINAL STANDS. The F&F
 * month is calculated, approved and published on the Payrun screen like any
 * other month - this screen adds what is particular to an exit:
 *
 *   F&F ITEMS     Leave Encashment, Notice Pay, Gratuity and Notice Period
 *                 Recovery, entered before the month is approved (the server
 *                 refuses them after). The month must then be recalculated.
 *   MARK SETTLED  once the F&F statement is published and the money has
 *                 moved: payment mode, reference and date. Settled months
 *                 cannot be unpublished or unlocked until reopened.
 *   REOPEN        with a reason - the one way back.
 *
 * NOTHING IS CALCULATED HERE. Net pay, totals and stages are the server's.
 */

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const today = () => new Date().toISOString().slice(0, 10);

function ItemsModal({ open, onClose, target, components, canEdit, onSaved }) {
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detail, setDetail] = useState(null);
  const [values, setValues] = useState({});

  useEffect(() => {
    if (!open || !target) return;
    setLoading(true);
    EmployeeExitHelper.getItems({ year: target.year, month: target.month, employee_id: target.employee_id })
      .then((res) => {
        if (res.code !== 200) throw new Error(res.msg || "Could not load the F&F items");
        setDetail(res);
        const v = {};
        (res.items || []).forEach((i) => {
          v[i.component] = { amount: i.amount === null ? "" : String(i.amount), remarks: i.remarks || "" };
        });
        setValues(v);
      })
      .catch((err) => toast({ status: "error", title: err.message }))
      .finally(() => setLoading(false));
  }, [open, target, toast]);

  const editable = canEdit && detail && detail.editable;
  const save = async () => {
    setSaving(true);
    try {
      const items = components.map((c) => {
        const v = values[c.key] || {};
        return { component: c.key, amount: v.amount === "" || v.amount === undefined ? null : Number(v.amount), remarks: v.remarks || "" };
      });
      const res = await EmployeeExitHelper.saveItems({ year: target.year, month: target.month, employee_id: target.employee_id, items });
      if (res.code !== 200) throw new Error(res.msg || "Not saved");
      toast({ status: "success", title: res.message || "Saved" });
      onSaved();
      onClose();
    } catch (err) {
      toast({ status: "error", title: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} size="xl">
      <ModalOverlay />
      <ModalContent>
        <ModalHeader>F&amp;F earnings &amp; recoveries — {target && target.employee_name}</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          {loading || !detail ? (
            <Spinner />
          ) : (
            <Stack spacing={3}>
              <Text fontSize="sm" color="gray.600">
                Last working day {detail.exit_date}. Amounts are entered by HR; they are not derived. Advance and
                shortage recovery are entered on the Adjustments stage, not here.
              </Text>
              {!detail.editable ? (
                <Alert status="info" fontSize="sm">
                  <AlertIcon />
                  This month is approved &amp; locked. Unlock it on the Payrun screen to change F&amp;F amounts.
                </Alert>
              ) : null}
              {components.map((c) => (
                <FormControl key={c.key}>
                  <FormLabel fontSize="sm" mb={1}>
                    {c.label}{" "}
                    <Badge colorScheme={c.kind === "DEDUCTION" ? "red" : "green"}>{c.kind === "DEDUCTION" ? "Recovery" : "Earning"}</Badge>
                  </FormLabel>
                  <HStack>
                    <Input
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="0.00"
                      isDisabled={!editable}
                      value={(values[c.key] && values[c.key].amount) || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [c.key]: { ...(v[c.key] || {}), amount: e.target.value } }))}
                    />
                    <Input
                      placeholder="Remarks"
                      isDisabled={!editable}
                      maxLength={500}
                      value={(values[c.key] && values[c.key].remarks) || ""}
                      onChange={(e) => setValues((v) => ({ ...v, [c.key]: { ...(v[c.key] || {}), remarks: e.target.value } }))}
                    />
                  </HStack>
                  <Text fontSize="xs" color="gray.500">
                    {c.help}
                  </Text>
                </FormControl>
              ))}
              {(detail.audit || []).length > 0 ? (
                <Box>
                  <Text fontSize="sm" fontWeight="semibold" mb={1}>
                    History
                  </Text>
                  {detail.audit.slice(0, 10).map((a, i) => (
                    <Text key={i} fontSize="xs" color="gray.600">
                      {a.changed_at} · {a.component} · {a.old_amount === null ? "—" : a.old_amount} → {a.new_amount === null ? "cleared" : a.new_amount}
                      {a.changed_by ? ` · by ${a.changed_by}` : ""}
                    </Text>
                  ))}
                </Box>
              ) : null}
            </Stack>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Close
          </Button>
          {editable ? (
            <Button colorScheme="purple" onClick={save} isLoading={saving}>
              Save
            </Button>
          ) : null}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

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
      toast({ status: "success", title: mode === "reopen" ? "Settlement reopened" : "Marked as settled" });
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
          {mode === "reopen" ? "Reopen settlement" : "Mark F&F as settled"} — {target && target.employee_name}
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
                Records that {netLabel(target && target.net_pay)} was settled. The amount is taken from the published
                F&amp;F statement; once settled, the month cannot be unpublished or unlocked until reopened.
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
            {mode === "reopen" ? "Reopen" : "Mark settled"}
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
  const [itemsFor, setItemsFor] = useState(null);
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
                  <Th isNumeric>F&amp;F earnings</Th>
                  <Th isNumeric>F&amp;F recoveries</Th>
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
                    <Tr key={`${row.employee_id}-${row.exit_date}`}>
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
                        {row.outstanding_ot ? (
                          <Text fontSize="xs" color="red.600" mt={1}>
                            Outstanding approved OT: {row.outstanding_ot.items} item(s), {netLabel(row.outstanding_ot.amount)}
                          </Text>
                        ) : null}
                        {row.warning ? (
                          <Text fontSize="xs" color="orange.600" maxWidth="260px" mt={1}>
                            {row.warning}
                          </Text>
                        ) : null}
                      </Td>
                      <Td isNumeric>{row.fnf_additions === null ? "—" : netLabel(row.fnf_additions)}</Td>
                      <Td isNumeric>{row.fnf_deductions === null ? "—" : netLabel(row.fnf_deductions)}</Td>
                      <Td isNumeric>{netLabel(row.net_pay)}</Td>
                      <Td fontSize="xs">
                        {row.settlement_status === "SETTLED"
                          ? `${row.payment_mode || ""} ${row.payment_reference || ""} · ${row.paid_on || ""}`
                          : "Pending"}
                      </Td>
                      <Td>
                        <HStack spacing={1} justify="flex-end">
                          {row.initialized ? (
                            <Button size="xs" variant="outline" onClick={() => setItemsFor(target)}>
                              {a.editItems ? "F&F items" : "View items"}
                            </Button>
                          ) : null}
                          {a.settle ? (
                            <Button size="xs" colorScheme="green" onClick={() => setSettleFor({ target, mode: "settle" })}>
                              Mark settled
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
                        </HStack>
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          </Box>
        ) : null}
        <ItemsModal
          open={Boolean(itemsFor)}
          onClose={() => setItemsFor(null)}
          target={itemsFor}
          components={(data && data.components) || []}
          canEdit={canManageFnf(actor)}
          onSaved={load}
        />
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
