import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  Checkbox,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomModal from "../../components/CustomModal";
import Table from "../../components/table/table";
import usePermissions from "../../customHooks/usePermissions";
import useOutlets from "../../customHooks/useOutlets";
import useDepartments from "../../customHooks/useDepartments";
import useDesignations from "../../customHooks/useDesignations";
import EmployeeWorkShiftHelper from "../../helper/employeeWorkShift";
import WorkShiftHelper from "../../helper/workShift";
import {
  ASSIGNMENT_STATUS_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  DEFAULT_FILTERS,
  allSelected,
  buildListQuery,
  confirmationMessage,
  currentWorkShiftLabel,
  reconcileSelection,
  selectAll,
  toggleSelection,
  workShiftOptions,
} from "../../util/employeeShiftAssignment";

/**
 * Employee Shift Assignment.
 *
 * The screen HR uses to put employees onto the new payroll/attendance work
 * shifts. It is the ONLY place that mapping is set in this phase: the
 * employee profile does not carry the field yet, deliberately, because the
 * first job is several hundred unassigned people and that is a bulk job, not
 * a per-record one.
 *
 * A NEW MAPPING BESIDE THE OLD ONE. What this writes is
 * `new_employee.default_work_shift_id`. The legacy shift behind /shift is not
 * read, not written and not shown here, and nothing was copied into the new
 * column - every employee starts Unassigned and a person chooses.
 *
 * FILTERED ON THE SERVER. Outlet, department, designation, the search and the
 * two status filters are all query parameters, so the list is the answer to
 * the question asked rather than a full download narrowed in the browser.
 * That matters at this size: the assignment list is every employee.
 *
 * SELECTION FOLLOWS THE LIST. A tick means "this person, who I can see". When
 * the filters change the list is a different set of people, so the selection
 * is narrowed to what is still on screen - carrying hidden ids along would
 * let a confirmation reading "24 employees" write to somebody the user is no
 * longer looking at.
 *
 * THERE IS NO UNASSIGN. Changing somebody's shift means assigning another
 * active one. Clearing the mapping outright is not part of this phase, and an
 * action that empties a payroll input needs its own thinking.
 *
 * Permissions match the backend, which requires BOTH keys on each endpoint:
 *
 *   see the list  `view_employees`  + `view_shift_assignments`
 *   assign one    `employee_edit`   + `assign_employee_shift`
 *   assign many   `employee_edit`   + `bulk_assign_employee_shift`
 *
 * `usePermissions(..., { all: true })` is the AND form; the default is ANY,
 * which would let one key open a screen that then 403s.
 *
 * ONE AND MANY ARE SEPARATE KEYS, so somebody may be allowed to correct one
 * person's roster without being allowed to re-roster four hundred. The row
 * checkboxes stay usable for whoever holds either key - the count is what
 * decides, and `canAssignSelection` is that decision, recomputed as the
 * selection changes. It mirrors the backend's own rule (the request's
 * `employee_ids` picks the key), so the button is disabled exactly when the
 * server would refuse rather than a moment before or after.
 */
function EmployeeShiftAssignment() {
  const toast = useToast();

  const canView = usePermissions(["view_employees", "view_shift_assignments"], {
    all: true,
  });
  const canAssignOne = usePermissions(["employee_edit", "assign_employee_shift"], {
    all: true,
  });
  const canAssignMany = usePermissions(
    ["employee_edit", "bulk_assign_employee_shift"],
    { all: true }
  );
  // May this caller assign at all? What gates the checkboxes and the
  // "you can look but not change" note.
  const canAssign = canAssignOne || canAssignMany;

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  const [selectedIds, setSelectedIds] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [shiftsUnavailable, setShiftsUnavailable] = useState(false);
  const [targetShiftId, setTargetShiftId] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();
  const { designations } = useDesignations();

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  /**
   * ACTIVE work shifts only, and asked for that way rather than fetched whole
   * and filtered here - the backend refuses an assignment to an inactive
   * shift, so offering one could only ever produce an error the user cannot
   * act on.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await WorkShiftHelper.getWorkShifts({ active: true });
        if (cancelled) return;
        if (!res || res.code !== 200 || !Array.isArray(res.data)) {
          setWorkShifts([]);
          setShiftsUnavailable(true);
          return;
        }
        setWorkShifts(res.data);
        setShiftsUnavailable(false);
      } catch (err) {
        if (cancelled) return;
        setWorkShifts([]);
        setShiftsUnavailable(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await EmployeeWorkShiftHelper.getAssignments(buildListQuery(filters));
      // A refusal arrives as `{ code: 403, msg }` rather than a list, and must
      // not be shown as "no employees".
      if (res && res.code === 403) {
        setRows([]);
        setDenied(true);
        setError(false);
        return;
      }
      if (!res || res.code !== 200 || !Array.isArray(res.data)) {
        setRows([]);
        setDenied(false);
        setError(true);
        return;
      }
      setRows(res.data);
      setDenied(false);
      setError(false);
    } catch (err) {
      console.log(err);
      setRows([]);
      setDenied(false);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // The list has changed, so the selection is narrowed to what is still on it.
  useEffect(() => {
    setSelectedIds((current) => reconcileSelection(current, rows));
  }, [rows]);

  /** Identity of the current question, so a new one starts at page 1. */
  const filterKey = useMemo(() => JSON.stringify(buildListQuery(filters)), [filters]);

  const shiftOptions = useMemo(() => workShiftOptions(workShifts), [workShifts]);
  const targetShift = useMemo(
    () => workShifts.find((s) => Number(s.work_shift_id) === Number(targetShiftId)) || null,
    [workShifts, targetShiftId]
  );

  const everythingTicked = allSelected(selectedIds, rows);

  /**
   * May THIS selection be assigned?
   *
   * One employee needs `assign_employee_shift`, more than one needs
   * `bulk_assign_employee_shift` — the same rule the backend applies to the
   * request's own `employee_ids`, so the button is disabled exactly when the
   * server would refuse. An empty selection is not assignable either way and
   * the button is already disabled for it.
   */
  const canAssignSelection =
    selectedIds.length === 1 ? canAssignOne : selectedIds.length > 1 && canAssignMany;

  const assign = async () => {
    setAssigning(true);
    try {
      const res = await EmployeeWorkShiftHelper.assignWorkShift(
        selectedIds,
        Number(targetShiftId)
      );
      if (!res || res.code !== 200) {
        toast({
          title: (res && res.msg) || "The work shift could not be assigned",
          status: "error",
          duration: 8000,
          isClosable: true,
        });
        return;
      }
      toast({
        title: `${res.matched} employee${res.matched === 1 ? "" : "s"} assigned to ${
          res.shift_code ? `${res.shift_code} - ${res.shift_name}` : "the work shift"
        }`,
        status: "success",
        duration: 4000,
      });
      // Only on success: a refused assignment leaves the selection alone so
      // it can be corrected and retried rather than rebuilt.
      setSelectedIds([]);
      await load();
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setAssigning(false);
      setConfirmOpen(false);
    }
  };

  const heading = {
    select: (
      // The header cell is the table's sort control, so the tick must not
      // also sort the column out from under the click.
      <span onClick={(e) => e.stopPropagation()}>
        <Checkbox
          size="sm"
          colorScheme="purple"
          isChecked={everythingTicked}
          isIndeterminate={selectedIds.length > 0 && !everythingTicked}
          isDisabled={!canAssign || rows.length === 0}
          aria-label="Select all listed employees"
          onChange={(e) => setSelectedIds(selectAll(rows, e.target.checked))}
        />
      </span>
    ),
    employee_id: "Employee ID",
    employee_name: "Employee Name",
    outlet_name: "Outlet",
    department_name: "Department",
    designation_name: "Designation",
    work_shift: "Current Work Shift",
  };

  const tableRows = rows.map((row) => {
    const id = Number(row.employee_id);
    const isUnassigned = row.default_work_shift_id === null || row.default_work_shift_id === undefined;
    return {
      select: (
        <Checkbox
          size="sm"
          colorScheme="purple"
          isChecked={selectedIds.includes(id)}
          isDisabled={!canAssign}
          aria-label={`Select ${row.employee_name}`}
          onChange={() => setSelectedIds((current) => toggleSelection(current, id))}
        />
      ),
      employee_id: id,
      employee_name: row.employee_name || "—",
      outlet_name: row.outlet_name || "—",
      department_name: row.department_name || "—",
      designation_name: row.designation_name || "—",
      work_shift: (
        <Text fontSize="sm" color={isUnassigned ? "gray.500" : "gray.800"}>
          {currentWorkShiftLabel(row)}
          {row.work_shift_active === false ? " (inactive)" : ""}
        </Text>
      ),
    };
  });

  return (
    <GlobalWrapper title="Employee Shift Assignment" permissionKey={["view_shift_assignments"]}>
      <CustomContainer
        title="Employee Shift Assignment"
        subtitle="Assign employees to a work shift. The legacy Shift master is unchanged."
        filledHeader
      >
        {!canView ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view employee shift assignments.
          </Alert>
        ) : (
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4} flexWrap="wrap">
              <Input
                size="sm"
                placeholder="Search employee ID or name"
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                maxW={{ base: "100%", md: "240px" }}
              />
              <Select
                size="sm"
                placeholder="All outlets"
                value={filters.store_id}
                onChange={(e) => setFilter("store_id", e.target.value)}
                maxW={{ md: "180px" }}
              >
                {(outlets || []).map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>
                    {o.outlet_name}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                placeholder="All departments"
                value={filters.department_id}
                onChange={(e) => setFilter("department_id", e.target.value)}
                maxW={{ md: "180px" }}
              >
                {(departments || []).map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                placeholder="All designations"
                value={filters.designation_id}
                onChange={(e) => setFilter("designation_id", e.target.value)}
                maxW={{ md: "180px" }}
              >
                {(designations || []).map((d) => (
                  <option key={d.designation_id} value={d.designation_id}>
                    {d.designation_name}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                value={filters.assignment_status}
                onChange={(e) => setFilter("assignment_status", e.target.value)}
                maxW={{ md: "170px" }}
                aria-label="Assignment status"
              >
                {ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                value={filters.employment_status}
                onChange={(e) => setFilter("employment_status", e.target.value)}
                maxW={{ md: "150px" }}
                aria-label="Employment status"
              >
                {EMPLOYMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Stack>

            {shiftsUnavailable ? (
              <Alert status="warning" fontSize="sm" mb={3}>
                <AlertIcon />
                The active work shifts could not be loaded, so nothing can be assigned right now.
                The list below is unaffected.
              </Alert>
            ) : null}

            {/* The bulk action. Above the table, because it is what the
                selection is for and it should not be hunted for below several
                hundred rows. */}
            <Stack
              direction={{ base: "column", md: "row" }}
              spacing={3}
              align={{ md: "center" }}
              mb={4}
            >
              <Text fontSize="sm" color="gray.600" minW="120px">
                {selectedIds.length} selected
              </Text>
              <Select
                size="sm"
                placeholder="Select work shift"
                value={targetShiftId}
                onChange={(e) => setTargetShiftId(e.target.value)}
                maxW={{ md: "260px" }}
                isDisabled={!canAssign}
                aria-label="Work shift to assign"
              >
                {shiftOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <Button
                size="sm"
                colorScheme="purple"
                isDisabled={!canAssignSelection || !targetShiftId}
                onClick={() => setConfirmOpen(true)}
              >
                Assign to Selected
              </Button>
            </Stack>

            {!canAssign ? (
              <Alert status="info" fontSize="sm" mb={3}>
                <AlertIcon />
                You can see these assignments but not change them.
              </Alert>
            ) : null}

            {/* Held one key but not the other, and picked a selection the
                other one gates. Said here rather than left as a dead button,
                so the reason is on screen instead of arriving as a 403. */}
            {canAssign && !canAssignSelection && selectedIds.length > 0 ? (
              <Alert status="info" fontSize="sm" mb={3}>
                <AlertIcon />
                {selectedIds.length === 1
                  ? "You do not have permission to assign a single employee's shift."
                  : "You do not have permission to assign shifts in bulk. Select one employee at a time."}
              </Alert>
            ) : null}

            {loading ? (
              <Stack align="center" py={8}>
                <Spinner color="purple.500" />
              </Stack>
            ) : denied ? (
              <Alert status="warning" fontSize="sm">
                <AlertIcon />
                You do not have permission to view employee shift assignments.
              </Alert>
            ) : error ? (
              <Alert status="error" fontSize="sm">
                <AlertIcon />
                The assignment list could not be loaded. Try again.
              </Alert>
            ) : rows.length === 0 ? (
              <Alert status="info" fontSize="sm">
                <AlertIcon />
                No employee matches these filters.
              </Alert>
            ) : (
              <>
                <Text fontSize="sm" color="gray.600" mb={3}>
                  {rows.length} employee{rows.length === 1 ? "" : "s"}
                </Text>
                {/* `dontAffectPagination` because `rows` is rebuilt on every
                    render - ticking a box on page 3 would otherwise throw the
                    user back to page 1. A new filter IS a new question, so it
                    starts at the first page again, and the key is what does
                    that: it remounts the table with fresh pagination. */}
                <Table
                  key={filterKey}
                  heading={heading}
                  rows={tableRows}
                  showPagination
                  defaultRowsPerPage={50}
                  dontAffectPagination
                />
              </>
            )}
          </>
        )}
      </CustomContainer>

      <CustomModal
        isOpen={confirmOpen}
        onClose={() => (assigning ? null : setConfirmOpen(false))}
        title="Assign work shift"
        size="md"
        footer={
          <Stack direction="row" spacing={3}>
            <Button size="sm" variant="ghost" onClick={() => setConfirmOpen(false)} isDisabled={assigning}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="purple" onClick={assign} isLoading={assigning}>
              Assign
            </Button>
          </Stack>
        }
      >
        <Text fontSize="sm">{confirmationMessage(selectedIds.length, targetShift)}</Text>
        <Text fontSize="xs" color="gray.500" mt={2}>
          This sets their work shift for attendance and payroll. It does not change anything on the
          old Shift master.
        </Text>
      </CustomModal>
    </GlobalWrapper>
  );
}

export default EmployeeShiftAssignment;
