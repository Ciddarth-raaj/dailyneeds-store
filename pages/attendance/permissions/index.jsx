import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Radio,
  RadioGroup,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Tab,
  Table,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tbody,
  Td,
  Text,
  Textarea,
  Th,
  Thead,
  Tr,
  useToast,
} from "@chakra-ui/react";
import ReactSelect from "react-select";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import EmployeeHelper from "../../../helper/employee";
import unwrapList from "../../../util/apiList";
import usePermissions from "../../../customHooks/usePermissions";
import useEmployeeOutlets from "../../../customHooks/useEmployeeOutlets";
import { apiMessage, currentMonth, displayDate, displayDateTime, isOk, monthBounds } from "../../../util/attendanceV2";
import {
  PAID_NOT_WORKED,
  TARGET_MODE,
  TARGET_MODE_LABEL,
  canRevokeDirect,
  confirmSentence,
  formatMinutes,
  grantBody,
  grantKey,
  needsBulkKey,
  outcomeSummary,
  permissionSourceLabel,
  permissionStateColor,
  permissionStateLabel,
  permissionWindowLabel,
} from "../../../util/attendancePermission";

/**
 * ATTENDANCE PERMISSIONS - paid forgiven shortage, never worked time.
 *
 *   Register     every permission in your outlets over a period: requested
 *                and management-granted, in every state, with who did what.
 *   Grant        a MANAGEMENT permission, effective at once: one employee,
 *                selected employees, selected outlets, or every eligible
 *                employee in your outlets (the festival early release). The
 *                PREVIEW comes first and writes nothing: how many employees,
 *                which date and times, each employee's own window inside
 *                their own shift, and everybody left out with the reason.
 *                Only then is the grant confirmed - and if anything moved
 *                since the preview, the server refuses and shows the new one.
 *   Bulk grants  every bulk grant, per-employee outcomes, and revoking what
 *                is left of one.
 *
 * THE KEYS DECIDE WHAT IS OFFERED; THE SERVER DECIDES AGAIN. Grant needs
 * `grant_attendance_permission` (and `_bulk` for anything beyond one named
 * employee); revoke needs `revoke_attendance_permission`. A requested
 * permission is decided and revoked in the Attendance Approvals centre.
 */

const RESULT_COLOR = { SUCCEEDED: "green", SKIPPED: "orange", FAILED: "red" };

function Tile({ label, value, color = "gray" }) {
  return (
    <Box borderWidth="1px" borderColor={`${color}.100`} bg={`${color}.50`} borderRadius="md" px={3} py={2}>
      <Text fontSize="10px" color="gray.600" textTransform="uppercase" letterSpacing="wide">
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="700" color={`${color}.700`}>
        {value}
      </Text>
    </Box>
  );
}

function OutcomeReport({ result }) {
  if (!result) return null;
  const s = outcomeSummary(result);
  return (
    <Stack spacing={2}>
      <SimpleGrid columns={3} spacing={2}>
        <Tile label="Successful" value={s.succeeded} color="green" />
        <Tile label="Skipped" value={s.skipped} color="orange" />
        <Tile label="Failed" value={s.failed} color="red" />
      </SimpleGrid>
      {s.problems.length > 0 ? (
        <Box maxH="220px" overflowY="auto" borderWidth="1px" borderColor="gray.100" borderRadius="md">
          <Table size="sm">
            <Tbody>
              {s.problems.map((p) => (
                <Tr key={`${p.employee_id}-${p.attendance_permission_id || p.code}`}>
                  <Td>
                    <Badge colorScheme={RESULT_COLOR[p.outcome] || "gray"} fontSize="10px">
                      {p.outcome}
                    </Badge>
                  </Td>
                  <Td fontSize="xs">{p.employee_name || p.employee_id}</Td>
                  <Td fontSize="xs" color="gray.600">
                    {p.message || p.code}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      ) : null}
    </Stack>
  );
}

function ReasonModal({ title, text, isOpen, onClose, onConfirm, busy }) {
  const [reason, setReason] = useState("");
  const short = reason.trim().length < 5;
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={() => {
        setReason("");
        onClose();
      }}
      title={title}
      size="md"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            colorScheme="red"
            isLoading={busy}
            isDisabled={short}
            onClick={async () => {
              await onConfirm(reason.trim());
              setReason("");
            }}
          >
            Revoke
          </Button>
        </Flex>
      }
    >
      <Stack spacing={3}>
        <Text fontSize="sm">{text}</Text>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea size="sm" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="At least 5 characters" />
        </FormControl>
      </Stack>
    </CustomModal>
  );
}

/* ================================================================ Register */

function Register({ outlets, canRevoke, refreshKey }) {
  const toast = useToast();
  const initial = monthBounds(currentMonth());
  const [from, setFrom] = useState(initial.from_date);
  const [to, setTo] = useState(initial.to_date);
  const [outlet, setOutlet] = useState("");
  const [source, setSource] = useState("");
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!from || !to) return;
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceV2Helper.getPermissions({
        from_date: from,
        to_date: to,
        outlet_ids: outlet ? [Number(outlet)] : null,
        source: source || null,
      });
      if (!isOk(res)) {
        setError(apiMessage(res));
        setRows([]);
        return;
      }
      setRows(res.rows || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [from, to, outlet, source]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const revoke = async (reason) => {
    setBusy(true);
    try {
      const res = await AttendanceV2Helper.revokePermission(revoking.attendance_permission_id, { reason });
      if (!isOk(res)) {
        toast({ title: "Not revoked", description: apiMessage(res), status: "error", duration: 6000 });
        return;
      }
      toast({
        title: "Permission revoked",
        description: res.recalculated ? "The date has been recalculated without it." : "It stops applying when the day is calculated.",
        status: "success",
        duration: 5000,
      });
      setRevoking(null);
      await load();
    } catch (err) {
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={2}>
        <FormControl>
          <FormLabel fontSize="xs">From</FormLabel>
          <Input size="sm" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">To</FormLabel>
          <Input size="sm" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">Outlet</FormLabel>
          <Select size="sm" placeholder="All my outlets" value={outlet} onChange={(e) => setOutlet(e.target.value)}>
            {outlets.map((o) => (
              <option key={o.outlet_id} value={o.outlet_id}>
                {o.outlet_name}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl>
          <FormLabel fontSize="xs">Origin</FormLabel>
          <Select size="sm" placeholder="Requested and granted" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="REQUEST">Requested</option>
            <option value="DIRECT">Management grant</option>
          </Select>
        </FormControl>
      </SimpleGrid>

      {error ? (
        <Alert status="error" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Flex justify="center" py={6}>
          <Spinner size="sm" color="purple.500" />
        </Flex>
      ) : rows.length === 0 ? (
        <Text fontSize="sm" color="gray.600" py={4}>
          No permissions in this period.
        </Text>
      ) : (
        <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md" bg="white">
          <Table size="sm">
            <Thead bg="gray.50">
              <Tr>
                <Th>Date</Th>
                <Th>Employee</Th>
                <Th>Window</Th>
                <Th>Origin</Th>
                <Th>State</Th>
                <Th>Reason</Th>
                <Th>By</Th>
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((p) => (
                <Tr key={p.attendance_permission_id}>
                  <Td fontSize="xs" whiteSpace="nowrap">
                    {displayDate(p.attendance_date)}
                  </Td>
                  <Td fontSize="xs">
                    {p.employee_name || p.employee_id}
                    {p.outlet_name ? (
                      <Text as="span" color="gray.500">
                        {" "}
                        · {p.outlet_name}
                      </Text>
                    ) : null}
                  </Td>
                  <Td fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                    {permissionWindowLabel(p)}
                    <Text as="span" color="gray.500">
                      {" "}
                      ({formatMinutes(p.permission_minutes)})
                    </Text>
                  </Td>
                  <Td fontSize="xs">{permissionSourceLabel(p)}</Td>
                  <Td>
                    <Badge colorScheme={permissionStateColor(p)} fontSize="10px" whiteSpace="normal">
                      {permissionStateLabel(p)}
                    </Badge>
                    {p.revoked_at ? (
                      <Text fontSize="10px" color="gray.500">
                        {p.revoked_by_name || "—"} · {displayDateTime(p.revoked_at)}
                        {p.revoke_reason ? ` · “${p.revoke_reason}”` : ""}
                      </Text>
                    ) : null}
                  </Td>
                  <Td fontSize="xs" maxW="220px">
                    <Text noOfLines={2}>{p.reason}</Text>
                  </Td>
                  <Td fontSize="xs" whiteSpace="nowrap">
                    {p.created_by_name || "—"}
                    <Text fontSize="10px" color="gray.500">
                      {displayDateTime(p.created_at)}
                    </Text>
                  </Td>
                  <Td textAlign="right">
                    {canRevoke && canRevokeDirect(p) ? (
                      <Button size="xs" variant="ghost" colorScheme="red" onClick={() => setRevoking(p)}>
                        Revoke
                      </Button>
                    ) : null}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
          {total > rows.length ? (
            <Text fontSize="xs" color="gray.500" p={2}>
              Showing {rows.length} of {total}. Narrow the period or outlet to see the rest.
            </Text>
          ) : null}
        </Box>
      )}

      <ReasonModal
        title="Revoke permission"
        text={
          revoking
            ? `Revoke ${revoking.employee_name || revoking.employee_id}'s permission ${permissionWindowLabel(revoking)} on ${displayDate(
                revoking.attendance_date
              )}? Whatever it covered is charged as shortage again. Refused if the month's payroll is locked.`
            : ""
        }
        isOpen={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        busy={busy}
      />
    </Stack>
  );
}

/* =================================================================== Grant */

const EMPTY_FORM = {
  mode: TARGET_MODE.ALL,
  employee_ids: [],
  outlet_ids: [],
  attendance_date: "",
  from_time: "",
  to_time: "",
  to_shift_end: true,
  reason: "",
  remarks: "",
};

function Grant({ outlets, canGrantBulk, onGranted }) {
  const toast = useToast();
  const [form, setForm] = useState({ ...EMPTY_FORM, mode: canGrantBulk ? TARGET_MODE.ALL : TARGET_MODE.ONE });
  const [employees, setEmployees] = useState([]);
  const [preview, setPreview] = useState(null);
  const [previewKey, setPreviewKey] = useState(null);
  const [error, setError] = useState(null);
  const [warning, setWarning] = useState(null);
  const [previewing, setPreviewing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = unwrapList(await EmployeeHelper.getEmployee({ status: 1 }));
        if (!cancelled) setEmployees(res.items || []);
      } catch (err) {
        if (!cancelled) setEmployees([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const key = grantKey(form);
  // ANY CHANGE DISCARDS THE PREVIEW: a grant is confirmed against exactly
  // what was shown, never against a form edited since.
  const stale = !!preview && previewKey !== key;
  const shown = stale ? null : preview;

  const employeeOptions = useMemo(
    () =>
      employees.map((e) => ({
        value: Number(e.employee_id),
        label: `${e.employee_id} — ${e.employee_name}${e.store_name ? ` · ${e.store_name}` : ""}`,
      })),
    [employees]
  );

  const runPreview = async () => {
    setError(null);
    setWarning(null);
    setResult(null);
    const built = grantBody(form);
    if (built.error) {
      setError(built.error);
      return;
    }
    if (needsBulkKey(form) && !canGrantBulk) {
      setError("Granting to more than one employee needs the bulk grant permission.");
      return;
    }
    setPreviewing(true);
    try {
      const res = await AttendanceV2Helper.previewPermissionGrant(built.body);
      if (!isOk(res)) {
        setError(apiMessage(res));
        setPreview(null);
        return;
      }
      setPreview(res);
      setPreviewKey(key);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setPreviewing(false);
    }
  };

  const apply = async () => {
    const built = grantBody(form);
    if (built.error || !shown) return;
    setApplying(true);
    try {
      const res = await AttendanceV2Helper.applyPermissionGrant({ ...built.body, fingerprint: shown.fingerprint });
      setConfirming(false);
      if (res && res.code === 409 && res.preview) {
        setPreview(res.preview);
        setPreviewKey(key);
        setWarning(res.msg || "Who this grant reaches has changed. Review the new preview and confirm again.");
        return;
      }
      if (!isOk(res)) {
        setError(apiMessage(res));
        return;
      }
      setResult(res);
      setPreview(null);
      toast({
        title: "Permission granted",
        description: `${outcomeSummary(res).succeeded} employee(s) granted.`,
        status: "success",
        duration: 5000,
      });
      onGranted();
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setApplying(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Text fontSize="sm" color="gray.600">
        A management permission is effective at once. {PAID_NOT_WORKED}: it forgives only the shortage inside the window,
        changes no punch and no shift, and never creates overtime.
      </Text>

      <FormControl>
        <FormLabel fontSize="sm">Who</FormLabel>
        <RadioGroup value={form.mode} onChange={(mode) => set({ mode, employee_ids: [], outlet_ids: [] })}>
          <Flex gap={4} wrap="wrap">
            {[TARGET_MODE.ONE, TARGET_MODE.EMPLOYEES, TARGET_MODE.OUTLETS, TARGET_MODE.ALL].map((m) => (
              <Radio key={m} value={m} size="sm" isDisabled={m !== TARGET_MODE.ONE && !canGrantBulk}>
                {TARGET_MODE_LABEL[m]}
              </Radio>
            ))}
          </Flex>
        </RadioGroup>
      </FormControl>

      {form.mode === TARGET_MODE.ONE || form.mode === TARGET_MODE.EMPLOYEES ? (
        <FormControl isRequired>
          <FormLabel fontSize="sm">{form.mode === TARGET_MODE.ONE ? "Employee" : "Employees"}</FormLabel>
          <ReactSelect
            isMulti={form.mode === TARGET_MODE.EMPLOYEES}
            options={employeeOptions}
            value={employeeOptions.filter((o) => form.employee_ids.includes(o.value))}
            onChange={(v) => set({ employee_ids: Array.isArray(v) ? v.map((o) => o.value) : v ? [v.value] : [] })}
            placeholder="Search by id or name"
          />
        </FormControl>
      ) : null}

      {form.mode === TARGET_MODE.OUTLETS ? (
        <FormControl isRequired>
          <FormLabel fontSize="sm">Outlets</FormLabel>
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={1}>
            {outlets.map((o) => (
              <Checkbox
                key={o.outlet_id}
                size="sm"
                isChecked={form.outlet_ids.includes(Number(o.outlet_id))}
                onChange={(e) =>
                  set({
                    outlet_ids: e.target.checked
                      ? [...form.outlet_ids, Number(o.outlet_id)]
                      : form.outlet_ids.filter((id) => id !== Number(o.outlet_id)),
                  })
                }
              >
                {o.outlet_name}
              </Checkbox>
            ))}
          </SimpleGrid>
        </FormControl>
      ) : null}

      <SimpleGrid columns={{ base: 1, md: 4 }} spacing={3} alignItems="flex-end">
        <FormControl isRequired>
          <FormLabel fontSize="sm">Date</FormLabel>
          <Input size="sm" type="date" value={form.attendance_date} onChange={(e) => set({ attendance_date: e.target.value })} />
        </FormControl>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Permission from</FormLabel>
          <Input size="sm" type="time" value={form.from_time} onChange={(e) => set({ from_time: e.target.value })} />
        </FormControl>
        <FormControl isRequired={!form.to_shift_end} isDisabled={form.to_shift_end}>
          <FormLabel fontSize="sm">Permission to</FormLabel>
          <Input size="sm" type="time" value={form.to_time} onChange={(e) => set({ to_time: e.target.value })} />
        </FormControl>
        <Checkbox size="sm" pb={2} isChecked={form.to_shift_end} onChange={(e) => set({ to_shift_end: e.target.checked })}>
          Until each employee&apos;s scheduled shift end
        </Checkbox>
      </SimpleGrid>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
        <FormControl isRequired>
          <FormLabel fontSize="sm">Reason</FormLabel>
          <Textarea size="sm" rows={2} value={form.reason} onChange={(e) => set({ reason: e.target.value })} placeholder="e.g. Deepavali early closing" />
        </FormControl>
        <FormControl>
          <FormLabel fontSize="sm">Remarks</FormLabel>
          <Textarea size="sm" rows={2} value={form.remarks} onChange={(e) => set({ remarks: e.target.value })} />
        </FormControl>
      </SimpleGrid>

      {error ? (
        <Alert status="error" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {error}
        </Alert>
      ) : null}
      {warning ? (
        <Alert status="warning" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {warning}
        </Alert>
      ) : null}

      <Flex gap={2}>
        <Button size="sm" colorScheme="purple" variant="outline" onClick={runPreview} isLoading={previewing}>
          Preview
        </Button>
        <Button size="sm" colorScheme="teal" isDisabled={!shown || !shown.can_apply} onClick={() => setConfirming(true)}>
          Grant permission
        </Button>
      </Flex>
      {stale ? (
        <Text fontSize="xs" color="orange.700">
          The form changed since the preview. Preview again before granting.
        </Text>
      ) : null}

      {shown ? (
        <Stack spacing={3} borderWidth="1px" borderColor="purple.100" borderRadius="md" p={3} bg="purple.50">
          <Text fontSize="sm" fontWeight="600">
            Preview - nothing has been granted yet. {displayDate(shown.attendance_date)}, from {shown.from_time} to{" "}
            {shown.to_shift_end ? "each employee's scheduled shift end" : shown.to_time}.
          </Text>
          <SimpleGrid columns={{ base: 2, md: 4 }} spacing={2}>
            <Tile label="Will be granted" value={shown.counts.eligible} color="teal" />
            <Tile label="Left out" value={shown.counts.excluded} color="orange" />
            <Tile label="Considered" value={shown.counts.considered} />
            <Tile label="Paid permission, at most" value={formatMinutes(shown.counts.permission_minutes)} color="purple" />
          </SimpleGrid>
          {shown.by_outlet && shown.by_outlet.length > 1 ? (
            <Text fontSize="xs" color="gray.700">
              {shown.by_outlet.map((o) => `${o.outlet_name || "No outlet"}: ${o.eligible}`).join(" · ")}
            </Text>
          ) : null}
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={3}>
            <Box maxH="280px" overflowY="auto" bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.100">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Will be granted</Th>
                    <Th>Window</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {shown.eligible.map((e) => (
                    <Tr key={e.employee_id}>
                      <Td fontSize="xs">
                        {e.employee_name || e.employee_id}
                        <Text as="span" color="gray.500">
                          {e.outlet_name ? ` · ${e.outlet_name}` : ""}
                        </Text>
                      </Td>
                      <Td fontFamily="mono" fontSize="xs" whiteSpace="nowrap">
                        {permissionWindowLabel(e)} ({formatMinutes(e.permission_minutes)})
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
            <Box maxH="280px" overflowY="auto" bg="white" borderRadius="md" borderWidth="1px" borderColor="gray.100">
              <Table size="sm">
                <Thead>
                  <Tr>
                    <Th>Left out</Th>
                    <Th>Why</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {shown.excluded.map((e) => (
                    <Tr key={`${e.employee_id}-${e.code}`}>
                      <Td fontSize="xs">{e.employee_name || e.employee_id}</Td>
                      <Td fontSize="xs" color="gray.600">
                        {e.message}
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          </SimpleGrid>
        </Stack>
      ) : null}

      {result ? <OutcomeReport result={result} /> : null}

      <CustomModal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title="Confirm permission"
        size="md"
        bodyProps={{ p: 4 }}
        footer={
          <Flex gap={2} w="100%" justify="flex-end">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)} isDisabled={applying}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="teal" onClick={apply} isLoading={applying}>
              Grant
            </Button>
          </Flex>
        }
      >
        <Stack spacing={2}>
          <Text fontSize="sm" fontWeight="600">
            {confirmSentence(shown)}
          </Text>
          <Text fontSize="sm" color="gray.600">
            Reason: {form.reason}
          </Text>
          <Text fontSize="xs" color="gray.600">
            Each employee is granted on their own and checked again - outlet scope, payroll lock, overlapping permissions.
            One refusal does not stop the others.
          </Text>
        </Stack>
      </CustomModal>
    </Stack>
  );
}

/* ============================================================= Bulk grants */

function BulkGrants({ canRevoke, refreshKey, onChanged }) {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null);
  const [items, setItems] = useState([]);
  const [revoking, setRevoking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await AttendanceV2Helper.getPermissionBulkOperations();
      setRows(isOk(res) ? res.rows || [] : []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const show = async (op) => {
    if (open === op.bulk_operation_id) {
      setOpen(null);
      return;
    }
    setOpen(op.bulk_operation_id);
    const res = await AttendanceV2Helper.getPermissionBulkOperation(op.bulk_operation_id);
    setItems(isOk(res) ? res.items || [] : []);
  };

  const revoke = async (reason) => {
    setBusy(true);
    try {
      const res = await AttendanceV2Helper.revokePermissionBulkOperation(revoking.bulk_operation_id, { reason });
      if (!isOk(res)) {
        toast({ title: "Not revoked", description: apiMessage(res), status: "error", duration: 6000 });
        return;
      }
      setResult(res);
      setRevoking(null);
      await load();
      onChanged();
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <Flex justify="center" py={6}>
        <Spinner size="sm" color="purple.500" />
      </Flex>
    );
  }
  return (
    <Stack spacing={3}>
      {result ? <OutcomeReport result={result} /> : null}
      {rows.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No bulk grants yet.
        </Text>
      ) : (
        rows.map((op) => (
          <Box key={op.bulk_operation_id} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3} bg="white">
            <Flex justify="space-between" gap={2} wrap="wrap" align="center">
              <Box>
                <Text fontSize="sm" fontWeight="600">
                  {displayDate(op.attendance_date)} · from {op.from_time} to {Number(op.to_shift_end) === 1 ? "shift end" : op.to_time} ·{" "}
                  {TARGET_MODE_LABEL[op.target_mode] || op.target_mode}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  {op.reason} · {op.created_by_name || "—"} · {displayDateTime(op.created_at)}
                </Text>
                <Text fontSize="xs" color="gray.600">
                  Granted {op.succeeded_count} · skipped {op.skipped_count} · failed {op.failed_count} · still active {op.active_count}
                </Text>
              </Box>
              <Flex gap={2}>
                <Button size="xs" variant="outline" onClick={() => show(op)}>
                  {open === op.bulk_operation_id ? "Hide" : "Employees"}
                </Button>
                {canRevoke && Number(op.active_count) > 0 ? (
                  <Button size="xs" variant="outline" colorScheme="red" onClick={() => setRevoking(op)}>
                    Revoke remaining
                  </Button>
                ) : null}
              </Flex>
            </Flex>
            {open === op.bulk_operation_id ? (
              <Box mt={2} maxH="260px" overflowY="auto">
                <Table size="sm">
                  <Tbody>
                    {items.map((it) => (
                      <Tr key={`${it.employee_id}-${it.acted_at}`}>
                        <Td>
                          <Badge colorScheme={RESULT_COLOR[it.outcome] || "gray"} fontSize="10px">
                            {it.outcome}
                          </Badge>
                        </Td>
                        <Td fontSize="xs">
                          {it.employee_name || it.employee_id}
                          {it.outlet_name ? ` · ${it.outlet_name}` : ""}
                        </Td>
                        <Td fontSize="xs" color="gray.600">
                          {it.message || (it.outcome === "SUCCEEDED" ? "Granted" : it.code)}
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            ) : null}
          </Box>
        ))
      )}
      <ReasonModal
        title="Revoke bulk grant"
        text={
          revoking
            ? `Revoke the ${revoking.active_count} still-active permission(s) of this grant on ${displayDate(
                revoking.attendance_date
              )}? Each employee is revoked on their own and recorded; a payroll-locked month is skipped.`
            : ""
        }
        isOpen={!!revoking}
        onClose={() => setRevoking(null)}
        onConfirm={revoke}
        busy={busy}
      />
    </Stack>
  );
}

/* ==================================================================== page */

export default function AttendancePermissionsPage() {
  const canView = usePermissions(["view_attendance_permissions"]);
  const canGrant = usePermissions(["grant_attendance_permission"]);
  const canGrantBulk = usePermissions(["grant_attendance_permission", "grant_attendance_permission_bulk"], { all: true });
  const canRevoke = usePermissions(["revoke_attendance_permission"]);
  const scoped = useEmployeeOutlets();
  const outlets = scoped.outlets || [];
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  const tabs = [
    canView ? { key: "register", label: "Register" } : null,
    canGrant ? { key: "grant", label: "Grant" } : null,
    canView ? { key: "bulk", label: "Bulk grants" } : null,
  ].filter(Boolean);

  return (
    <GlobalWrapper title="Permissions" permissionKey={["view_attendance_permissions", "grant_attendance_permission"]}>
      <CustomContainer title="Attendance Permissions" filledHeader>
        <Tabs colorScheme="purple" size="sm" isLazy>
          <TabList>
            {tabs.map((t) => (
              <Tab key={t.key} fontSize="sm" fontWeight="600">
                {t.label}
              </Tab>
            ))}
          </TabList>
          <TabPanels>
            {tabs.map((t) => (
              <TabPanel key={t.key} px={0}>
                {t.key === "register" ? <Register outlets={outlets} canRevoke={canRevoke} refreshKey={refreshKey} /> : null}
                {t.key === "grant" ? <Grant outlets={outlets} canGrantBulk={canGrantBulk} onGranted={bump} /> : null}
                {t.key === "bulk" ? <BulkGrants canRevoke={canRevoke} refreshKey={refreshKey} onChanged={bump} /> : null}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </CustomContainer>
    </GlobalWrapper>
  );
}
