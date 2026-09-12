import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, AlertIcon, Badge, Button, Flex, FormControl, FormLabel, Input, Select, Stack, Text, useBreakpointValue, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import ApproverSetupTable from "../../../components/attendance/approver-setup/ApproverSetupTable";
import SetApproversModal from "../../../components/attendance/approver-setup/SetApproversModal";
import ReplaceApproverModal from "../../../components/attendance/approver-setup/ReplaceApproverModal";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import useDepartments from "../../../customHooks/useDepartments";
import useEmployeeDirectory from "../../../customHooks/useEmployeeDirectory";
import AttendanceApproverSetupHelper from "../../../helper/attendanceApproverSetup";
import { apiMessage, buildListParams, isOk } from "../../../util/attendanceApproverSetup";

/**
 * Attendance Approver Setup - behind `manage_attendance_approvers`.
 *
 * PER EMPLOYEE, THREE EXPLICIT LEVELS: First Level Approver, Second Level
 * Approver, Final Approver. First and Second are optional and stay visible
 * as blanks; Final is mandatory. The chain governs BOTH missing-punch
 * Regularization and OT approvals; an employee without a setup keeps the
 * existing role/outlet chain (shown as "fallback") until one is created.
 *
 * FILTERS ON ONE LINE at desktop width: Department | Store | Designation |
 * Employee | Search | Reset. Select many employees and Set Approvers to
 * give them the same chain; Edit one row to change one employee; Replace
 * Approver moves one person out of every mapping and every undecided
 * pending step at one level. No payroll or salary field appears here.
 */
const EMPTY = { department_id: "", store_id: "", designation_id: "", employee_id: "", search: "" };

export default function AttendanceApproverSetupPage() {
  const toast = useToast();
  const isMobile = useBreakpointValue({ base: true, md: false });
  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();
  const { departments } = useDepartments();
  const { employees: directory } = useEmployeeDirectory();

  const [filters, setFilters] = useState(EMPTY);
  const [applied, setApplied] = useState(EMPTY);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [approverOptions, setApproverOptions] = useState([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [editInitial, setEditInitial] = useState(null);
  const [replaceOpen, setReplaceOpen] = useState(false);

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }));

  const load = useCallback(async (which) => {
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceApproverSetupHelper.list(buildListParams(which));
      if (!isOk(res)) {
        setRows([]);
        setTotal(0);
        setError(apiMessage(res, "The approver setup could not be loaded"));
      } else {
        setRows(Array.isArray(res.rows) ? res.rows : []);
        setTotal(Number(res.total) || 0);
      }
    } catch (err) {
      setRows([]);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOptions = useCallback(async () => {
    try {
      const res = await AttendanceApproverSetupHelper.options({ include_inactive: false });
      setApproverOptions(isOk(res) && Array.isArray(res.employees) ? res.employees : []);
    } catch (err) {
      setApproverOptions([]);
    }
  }, []);

  useEffect(() => { load(applied); }, [load, applied]);
  useEffect(() => { loadOptions(); }, [loadOptions]);

  const search = () => { setSelectedIds([]); setApplied(filters); };
  const reset = () => { setFilters(EMPTY); setSelectedIds([]); setApplied(EMPTY); };

  const toggle = (id) => setSelectedIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const toggleAll = () => setSelectedIds((s) => (rows.length > 0 && rows.every((r) => s.includes(r.employee_id)) ? [] : rows.map((r) => r.employee_id)));
  const selectedRows = useMemo(() => rows.filter((r) => selectedIds.includes(r.employee_id)), [rows, selectedIds]);

  const openEdit = async (row) => {
    setEditRow(row);
    setEditInitial({
      first_level_approver_employee_id: row.first_level_approver_employee_id,
      second_level_approver_employee_id: row.second_level_approver_employee_id,
      final_approver_employee_id: row.final_approver_employee_id,
    });
  };

  const afterChange = async (changed) => {
    if (changed) {
      await load(applied);
      await loadOptions();
    }
  };

  return (
    <GlobalWrapper title="Attendance Approver Setup" permissionKey={["manage_attendance_approvers"]}>
      <CustomContainer
        title="Attendance Approver Setup"
        filledHeader
        rightSection={
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600">Employees:</Text>
            <Badge colorScheme="purple" fontSize="sm" px={2}>{loading ? "…" : total}</Badge>
          </Flex>
        }
      >
        <Stack spacing={4}>
          <Text fontSize="xs" color="gray.500">
            First Level → Second Level → Final Approver, per employee, for Attendance Regularization and OT requests. First and Second are optional; the Final Approver is always required and is the final decision-maker. Employees without a setup follow the existing role-based chain.
          </Text>

          <Flex direction={isMobile ? "column" : "row"} gap={3} align={isMobile ? "stretch" : "flex-end"} wrap="nowrap">
            <FormControl flex={1} minW={isMobile ? undefined : "150px"}>
              <FormLabel fontSize="sm">Department</FormLabel>
              <Select size="sm" placeholder="All departments" value={filters.department_id} onChange={(e) => setFilter("department_id", e.target.value)}>
                {departments.map((d) => <option key={d.department_id} value={d.department_id}>{d.department_name}</option>)}
              </Select>
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "150px"}>
              <FormLabel fontSize="sm">Store</FormLabel>
              <Select size="sm" placeholder="All stores" value={filters.store_id} onChange={(e) => setFilter("store_id", e.target.value)}>
                {outlets.map((o) => <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>)}
              </Select>
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "160px"}>
              <FormLabel fontSize="sm">Designation</FormLabel>
              <Select size="sm" placeholder="All designations" value={filters.designation_id} onChange={(e) => setFilter("designation_id", e.target.value)}>
                {designations.map((d) => <option key={d.designation_id} value={d.designation_id}>{d.designation_name}</option>)}
              </Select>
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "180px"}>
              <FormLabel fontSize="sm">Employee</FormLabel>
              <Select size="sm" placeholder="All employees" value={filters.employee_id} onChange={(e) => setFilter("employee_id", e.target.value)}>
                {directory.map((e) => <option key={e.employee_id} value={e.employee_id}>{e.employee_id} — {e.employee_name}</option>)}
              </Select>
            </FormControl>
            <FormControl flex={1} minW={isMobile ? undefined : "160px"}>
              <FormLabel fontSize="sm">Search</FormLabel>
              <Input size="sm" placeholder="Code or name" value={filters.search} onChange={(e) => setFilter("search", e.target.value)} onKeyDown={(e) => (e.key === "Enter" ? search() : null)} />
            </FormControl>
            <Button size="sm" colorScheme="purple" onClick={search} flexShrink={0}>Search</Button>
            <Button size="sm" variant="outline" onClick={reset} flexShrink={0}>Reset</Button>
          </Flex>

          <Flex gap={2} align="center" wrap="wrap">
            <Button size="sm" colorScheme="purple" onClick={() => setBulkOpen(true)} isDisabled={selectedIds.length === 0}>
              Set Approvers{selectedIds.length > 0 ? ` (${selectedIds.length})` : ""}
            </Button>
            <Button size="sm" variant="outline" colorScheme="orange" onClick={() => setReplaceOpen(true)}>Replace Approver</Button>
            {selectedIds.length > 0 ? <Text fontSize="xs" color="gray.600">{selectedIds.length} selected</Text> : null}
          </Flex>

          {error ? <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{error}</Alert> : null}

          <ApproverSetupTable
            rows={rows}
            selectedIds={selectedIds}
            onToggle={toggle}
            onToggleAll={toggleAll}
            onEdit={openEdit}
            isMobile={isMobile}
            loading={loading}
          />
        </Stack>
      </CustomContainer>

      <SetApproversModal
        isOpen={bulkOpen}
        mode="bulk"
        employees={selectedRows}
        initial={null}
        approverOptions={approverOptions}
        onSave={(body) => AttendanceApproverSetupHelper.bulkSet({ employee_ids: selectedIds, ...body })}
        onClose={async (changed) => { setBulkOpen(false); if (changed) setSelectedIds([]); await afterChange(changed); }}
      />

      <SetApproversModal
        isOpen={!!editRow}
        mode="single"
        employees={editRow ? [editRow] : []}
        initial={editInitial}
        approverOptions={approverOptions}
        onSave={async (body) => {
          const res = await AttendanceApproverSetupHelper.save(editRow.employee_id, body);
          if (isOk(res)) toast({ title: "Approvers saved", description: `${editRow.employee_name} (${editRow.employee_id})`, status: "success", duration: 4000 });
          return res;
        }}
        onClose={async (changed) => { setEditRow(null); setEditInitial(null); await afterChange(changed); }}
      />

      <ReplaceApproverModal
        isOpen={replaceOpen}
        activeOptions={approverOptions}
        onClose={async (changed) => { setReplaceOpen(false); await afterChange(changed); }}
        onReplaced={(res) => toast({ title: "Approver replaced", description: `${res.setups_updated} mapping(s), ${res.pending_steps_updated} pending step(s)`, status: "success", duration: 5000 })}
      />
    </GlobalWrapper>
  );
}
