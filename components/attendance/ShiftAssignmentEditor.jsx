import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  FormControl,
  FormLabel,
  Input,
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
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import EmployeeWorkShiftHelper from "../../helper/employeeWorkShift";

/**
 * EDIT SHIFT ASSIGNMENT, and the SHIFT HISTORY beside it.
 *
 * The two belong in one place because they are two views of one fact. The
 * history is what the employee's shift HAS BEEN, dated; the form appends the
 * next row of it. Nothing here edits or deletes a row that exists - a change
 * effective from the 15th leaves the 1st-14th exactly as they were, which is
 * the whole reason the history is dated rather than a single column.
 *
 * WHAT THE FORM STATES, because a reader should not have to infer it:
 *
 *   - the effective date may be in the PAST, if payroll for the months it
 *     would move is still open. The server refuses a locked month with a
 *     message naming it, and refuses it again at the write.
 *   - it may be in the FUTURE, in which case nothing is recalculated and the
 *     employee's current shift does not move until the date arrives.
 *   - attendance from the effective date to today is recalculated, because
 *     those are precisely the dates whose NRM, shortage and overtime the
 *     change has just moved.
 *
 * `is_current` on a history row is the RESOLVER's answer for today and not
 * "the newest row": a future-dated change sits at the top of the list and is
 * explicitly marked Scheduled rather than Current.
 */
const isoToday = () => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

const shiftText = (row) => {
  const label = row.shift_code || row.shift_name;
  if (!label) return "—";
  return row.shift_name && row.shift_code ? `${row.shift_code} — ${row.shift_name}` : label;
};

export default function ShiftAssignmentEditor({
  employee,
  shiftOptions,
  isOpen,
  onClose,
  onChanged,
  canEdit,
}) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [workShiftId, setWorkShiftId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(isoToday());
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const employeeId = employee ? Number(employee.employee_id) : null;

  const load = useCallback(async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await EmployeeWorkShiftHelper.getAssignmentHistory(employeeId);
      if (!res || res.code !== 200) {
        setHistory([]);
        setError((res && res.msg) || "The shift history could not be loaded");
        return;
      }
      setHistory(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      setHistory([]);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (!isOpen) return;
    setWorkShiftId("");
    setEffectiveFrom(isoToday());
    setReason("");
    setNotice(null);
    load();
  }, [isOpen, load]);

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!workShiftId) {
      setError("Choose the new shift");
      return;
    }
    if (!effectiveFrom) {
      setError("Choose the date the new shift applies from");
      return;
    }
    if (reason.trim().length < 5) {
      setError("Enter a reason for the change");
      return;
    }
    setSaving(true);
    try {
      const res = await EmployeeWorkShiftHelper.changeAssignment({
        employee_id: employeeId,
        work_shift_id: Number(workShiftId),
        effective_from: effectiveFrom,
        reason: reason.trim(),
      });
      if (!res || res.code !== 200) {
        setError((res && res.msg) || "The change could not be saved");
        return;
      }
      setNotice(res.msg || "Recorded.");
      setWorkShiftId("");
      setReason("");
      await load();
      if (onChanged) onChanged(res);
    } catch (err) {
      setError("Could not reach the server. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  const current = history.find((row) => row.is_current) || null;

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Shift assignment — ${employee.employee_name || employee.employee_id}`}
      size="2xl"
      bodyProps={{ p: 4 }}
      footer={
        <Flex gap={2} w="100%" justify="flex-end">
          <Button size="sm" variant="ghost" onClick={onClose} isDisabled={saving}>
            Close
          </Button>
          {canEdit ? (
            <Button size="sm" colorScheme="purple" onClick={submit} isLoading={saving}>
              Save change
            </Button>
          ) : null}
        </Flex>
      }
    >
      <Stack spacing={5}>
        <Box>
          <Text fontSize="10px" color="gray.500" textTransform="uppercase" letterSpacing="wide">
            Current shift
          </Text>
          <Text fontSize="sm" fontWeight="600">
            {loading ? <Spinner size="xs" /> : current ? shiftText(current) : "Unassigned"}
          </Text>
          {current ? (
            <Text fontSize="xs" color="gray.500">
              In force since {current.effective_from}
            </Text>
          ) : null}
        </Box>

        {canEdit ? (
          <Stack spacing={3} borderWidth="1px" borderColor="gray.200" borderRadius="md" p={3}>
            <Text fontSize="sm" fontWeight="600">
              Change the shift
            </Text>
            <Flex gap={3} wrap="wrap">
              <FormControl isRequired maxW="260px">
                <FormLabel fontSize="sm">New shift</FormLabel>
                <Select size="sm" placeholder="Choose a shift" value={workShiftId} onChange={(e) => setWorkShiftId(e.target.value)}>
                  {(shiftOptions || []).map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </FormControl>
              <FormControl isRequired maxW="200px">
                <FormLabel fontSize="sm">Effective from</FormLabel>
                <Input type="date" size="sm" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </FormControl>
            </Flex>
            <FormControl isRequired>
              <FormLabel fontSize="sm">Reason</FormLabel>
              <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why the shift is changing" />
            </FormControl>
            <Text fontSize="xs" color="gray.600">
              Dates before the effective date keep the shift they already had. Attendance from the effective date to
              today is recalculated; a date in a payroll month that is approved and locked is refused. A future date is
              recorded now and applies when it arrives.
            </Text>
          </Stack>
        ) : (
          <Alert status="info" fontSize="xs" borderRadius="md">
            <AlertIcon />
            You can see this employee&apos;s shift history. Changing it needs the shift-change permission.
          </Alert>
        )}

        {notice ? (
          <Alert status="success" fontSize="sm" borderRadius="md">
            <AlertIcon />
            {notice}
          </Alert>
        ) : null}
        {error ? (
          <Alert status="error" fontSize="sm" borderRadius="md">
            <AlertIcon />
            {error}
          </Alert>
        ) : null}

        <Box>
          <Text fontSize="sm" fontWeight="600" mb={2}>
            Shift history
          </Text>
          {loading ? (
            <Flex align="center" gap={2} py={4}>
              <Spinner size="sm" color="purple.500" />
              <Text fontSize="sm" color="gray.600">
                Loading…
              </Text>
            </Flex>
          ) : history.length === 0 ? (
            <Text fontSize="sm" color="gray.600">
              No dated assignment yet.
            </Text>
          ) : (
            <Box overflowX="auto" borderWidth="1px" borderColor="gray.200" borderRadius="md">
              <Table size="sm" variant="simple">
                <Thead bg="gray.50">
                  <Tr>
                    <Th>Effective From</Th>
                    <Th>Shift</Th>
                    <Th>Status</Th>
                    <Th>Changed By</Th>
                    <Th>Changed At</Th>
                    <Th>Reason</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {history.map((row) => (
                    <Tr key={row.employee_work_shift_assignment_id}>
                      <Td whiteSpace="nowrap">{row.effective_from}</Td>
                      <Td fontSize="xs">{shiftText(row)}</Td>
                      <Td>
                        {row.is_current ? (
                          <Badge colorScheme="green" fontSize="10px">Current</Badge>
                        ) : row.is_future_dated ? (
                          <Badge colorScheme="purple" fontSize="10px">Scheduled</Badge>
                        ) : (
                          <Badge colorScheme="gray" fontSize="10px">Superseded</Badge>
                        )}
                      </Td>
                      <Td fontSize="xs">{row.changed_by_name || (row.changed_by_employee_id ? `Employee ${row.changed_by_employee_id}` : "System")}</Td>
                      <Td fontSize="xs" whiteSpace="nowrap">{row.changed_at}</Td>
                      <Td fontSize="xs">{row.reason || "—"}</Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </Box>
          )}
        </Box>
      </Stack>
    </CustomModal>
  );
}
