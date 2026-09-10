import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  useDisclosure,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomModal from "../../components/CustomModal";
import AgGrid from "../../components/AgGrid";
import usePermissions from "../../customHooks/usePermissions";
import useDebounce from "../../customHooks/useDebounce";
import useOutlets from "../../customHooks/useOutlets";
import useDepartments from "../../customHooks/useDepartments";
import useDesignations from "../../customHooks/useDesignations";
import EmployeeWorkShiftHelper from "../../helper/employeeWorkShift";
import {
  ASSIGNMENT_STATUS,
  ASSIGNMENT_STATUS_OPTIONS,
  workShiftLabel,
  currentWorkShiftLabel,
  confirmationMessage,
  buildAssignPayload,
  filtersToQuery,
  filtersChanged,
} from "../../util/employeeShiftAssignment";

/**
 * Employee Shift Assignment.
 *
 * A SEPARATE SCREEN, AND THE OTHER TWO ARE UNCHANGED. /shift is the legacy
 * `shift_master` master and is not touched. /work-shift maintains the work
 * shift definitions and is not touched. This screen does the one thing
 * neither does: map employees onto a work shift, in bulk, by hand.
 *
 * NOT ON THE EMPLOYEE PROFILE. Default Work Shift is deliberately absent from
 * the individual Employee Profile / Edit screen in this phase. HR is filling
 * in several hundred people from a standing start, and one-at-a-time is the
 * wrong instrument for that; the field goes on the profile in a later phase,
 * once the backlog is gone.
 *
 * NOTHING IS INFERRED. Every employee starts Unassigned and stays there until
 * somebody chooses a shift on this screen. No default is offered, nothing is
 * derived from the legacy `shift_id` or `shift_code`, and there is no
 * "suggest" affordance anywhere on the page.
 *
 * THERE IS NO UNASSIGN. Changing an assignment means assigning a different
 * active work shift. Clearing one is not something this screen can do, and
 * the backend has no call for it either.
 */
function EmployeeShiftAssignment() {
  const toast = useToast();
  const canAssign = usePermissions(["employee_edit"]);
  const confirm = useDisclosure();

  const { outlets, accessDenied: outletsDenied } = useOutlets({ directory: true });
  const { departments, accessDenied: departmentsDenied } = useDepartments();
  const { designations, accessDenied: designationsDenied } = useDesignations();

  const [storeId, setStoreId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [designationId, setDesignationId] = useState("");
  const [assignmentStatus, setAssignmentStatus] = useState(ASSIGNMENT_STATUS.ALL);
  const [search, setSearch] = useState("");

  // A request per keystroke would be a query per keystroke on the whole
  // employee master.
  const debouncedSearch = useDebounce(search, 400);

  const [employees, setEmployees] = useState([]);
  const [workShifts, setWorkShifts] = useState([]);
  const [selectedRows, setSelectedRows] = useState([]);
  const [targetWorkShiftId, setTargetWorkShiftId] = useState("");

  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [shiftsAccessDenied, setShiftsAccessDenied] = useState(false);

  const gridRef = useRef(null);

  const filters = useMemo(
    () => ({
      store_id: storeId,
      department_id: departmentId,
      designation_id: designationId,
      search: debouncedSearch,
      assignment_status: assignmentStatus,
    }),
    [storeId, departmentId, designationId, debouncedSearch, assignmentStatus]
  );

  /**
   * Drop the selection whenever the filters change.
   *
   * Select All takes the whole filtered list, so a selection can easily
   * include people who are no longer on screen. Carrying that across a filter
   * change would let somebody narrow to one outlet, press Assign, and reassign
   * people in another - with a confirmation dialog that counted them but never
   * showed them.
   */
  const previousFilters = useRef(filters);
  useEffect(() => {
    if (filtersChanged(previousFilters.current, filters)) {
      previousFilters.current = filters;
      setSelectedRows([]);
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.deselectAll();
      }
    }
  }, [filters]);

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const res = await EmployeeWorkShiftHelper.getEmployees(filtersToQuery(filters));
      // A refusal arrives as `{ code: 403, msg }` rather than a list — see
      // util/api.js — and must not be shown as "no employees".
      if (res && res.code === 403) {
        setAccessDenied(true);
        setEmployees([]);
        return;
      }
      setAccessDenied(false);
      setEmployees(Array.isArray(res && res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      toast({ title: "Could not load employees", status: "error", duration: 5000 });
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  }, [filters, toast]);

  const loadWorkShifts = useCallback(async () => {
    try {
      const res = await EmployeeWorkShiftHelper.getActiveWorkShifts();
      if (res && res.code === 403) {
        setShiftsAccessDenied(true);
        setWorkShifts([]);
        return;
      }
      setShiftsAccessDenied(false);
      setWorkShifts(Array.isArray(res && res.data) ? res.data : []);
    } catch (err) {
      console.log(err);
      setWorkShifts([]);
    }
  }, []);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  useEffect(() => {
    loadWorkShifts();
  }, [loadWorkShifts]);

  const selectedWorkShift = useMemo(
    () =>
      workShifts.find(
        (shift) => String(shift.work_shift_id) === String(targetWorkShiftId)
      ) || null,
    [workShifts, targetWorkShiftId]
  );

  const canSubmit = canAssign && selectedRows.length > 0 && Boolean(selectedWorkShift);

  /** The write itself, once the confirmation has been accepted. */
  const assign = async () => {
    const payload = buildAssignPayload(selectedRows, targetWorkShiftId);
    setAssigning(true);
    try {
      const res = await EmployeeWorkShiftHelper.bulkAssign(
        payload.employee_ids,
        payload.work_shift_id
      );

      if (!res || res.code !== 200) {
        // All-or-nothing on the server: on a rejection nobody was assigned, so
        // the selection is deliberately KEPT for the user to correct.
        const rejected =
          res && Array.isArray(res.rejected_employee_ids) && res.rejected_employee_ids.length
            ? ` (employee ids: ${res.rejected_employee_ids.join(", ")})`
            : "";
        toast({
          title: `${(res && res.msg) || "The assignment could not be saved"}${rejected}`,
          status: "error",
          duration: 8000,
          isClosable: true,
        });
        return;
      }

      toast({
        title: `${res.assigned_count} ${
          res.assigned_count === 1 ? "employee" : "employees"
        } assigned to ${workShiftLabel(res)}`,
        status: "success",
        duration: 4000,
      });

      // Clear the successful selection and re-read, so the Current Work Shift
      // column shows what was just written rather than a stale value - and so
      // an Unassigned filter drops the people who are no longer unassigned.
      setSelectedRows([]);
      if (gridRef.current && gridRef.current.api) {
        gridRef.current.api.deselectAll();
      }
      loadEmployees();
    } catch (err) {
      console.log(err);
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setAssigning(false);
      confirm.onClose();
    }
  };

  const colDefs = [
    { field: "employee_id", headerName: "Employee ID", maxWidth: 150 },
    { field: "employee_name", headerName: "Employee Name" },
    {
      field: "outlet_name",
      headerName: "Outlet",
      valueGetter: (props) => (props.data && props.data.outlet_name) || "—",
    },
    {
      field: "department_name",
      headerName: "Department",
      valueGetter: (props) => (props.data && props.data.department_name) || "—",
    },
    {
      field: "designation_name",
      headerName: "Designation",
      valueGetter: (props) => (props.data && props.data.designation_name) || "—",
    },
    {
      field: "default_work_shift_id",
      headerName: "Current Work Shift",
      // A plain string, so sorting, filtering and export read as words rather
      // than as an id - and so "Unassigned" is something you can filter on in
      // the grid as well as through the server-side filter.
      valueGetter: (props) => currentWorkShiftLabel(props.data),
    },
  ];

  return (
    <GlobalWrapper title="Employee Shift Assignment" permissionKey={["view_employees"]}>
      <CustomContainer
        title="Employee Shift Assignment"
        subtitle="Assign employees to a payroll work shift. The legacy Shift master and the Employee Profile are unchanged."
        filledHeader
      >
        {accessDenied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view employees.
          </Alert>
        ) : (
          <>
            <Stack
              direction={{ base: "column", md: "row" }}
              spacing={3}
              mb={4}
              align={{ base: "stretch", md: "center" }}
            >
              <Select
                size="sm"
                placeholder="All outlets"
                value={storeId}
                onChange={(e) => setStoreId(e.target.value)}
                maxW={{ base: "100%", md: "180px" }}
                isDisabled={outletsDenied}
              >
                {(outlets || []).map((outlet) => (
                  <option key={outlet.outlet_id} value={outlet.outlet_id}>
                    {outlet.outlet_name}
                  </option>
                ))}
              </Select>

              <Select
                size="sm"
                placeholder="All departments"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                maxW={{ base: "100%", md: "180px" }}
                isDisabled={departmentsDenied}
              >
                {(departments || []).map((department) => (
                  <option key={department.department_id} value={department.department_id}>
                    {department.department_name}
                  </option>
                ))}
              </Select>

              <Select
                size="sm"
                placeholder="All designations"
                value={designationId}
                onChange={(e) => setDesignationId(e.target.value)}
                maxW={{ base: "100%", md: "180px" }}
                isDisabled={designationsDenied}
              >
                {(designations || []).map((designation) => (
                  <option key={designation.designation_id} value={designation.designation_id}>
                    {designation.designation_name}
                  </option>
                ))}
              </Select>

              <Select
                size="sm"
                value={assignmentStatus}
                onChange={(e) => setAssignmentStatus(e.target.value)}
                maxW={{ base: "100%", md: "160px" }}
                aria-label="Assignment status"
              >
                {ASSIGNMENT_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>

              <Input
                size="sm"
                placeholder="Search employee id or name"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxW={{ base: "100%", md: "260px" }}
              />
            </Stack>

            {/* The bulk action. Separated from the filters so it reads as an
                action on the selection rather than as another filter. */}
            <Stack
              direction={{ base: "column", md: "row" }}
              spacing={3}
              mb={4}
              align={{ base: "stretch", md: "center" }}
            >
              <Select
                size="sm"
                placeholder="Select work shift"
                value={targetWorkShiftId}
                onChange={(e) => setTargetWorkShiftId(e.target.value)}
                maxW={{ base: "100%", md: "260px" }}
                isDisabled={!canAssign || shiftsAccessDenied}
                aria-label="Work shift to assign"
              >
                {workShifts.map((shift) => (
                  <option key={shift.work_shift_id} value={shift.work_shift_id}>
                    {workShiftLabel(shift)}
                  </option>
                ))}
              </Select>

              <Button
                size="sm"
                colorScheme="purple"
                isDisabled={!canSubmit}
                isLoading={assigning}
                onClick={confirm.onOpen}
              >
                Assign to Selected
              </Button>

              <Text fontSize="sm" color={selectedRows.length ? "purple.600" : "gray.500"}>
                {selectedRows.length} selected
              </Text>
            </Stack>

            {shiftsAccessDenied ? (
              <Alert status="warning" fontSize="sm" mb={4}>
                <AlertIcon />
                You do not have permission to view work shifts, so none can be assigned.
              </Alert>
            ) : null}

            {!canAssign ? (
              <Alert status="info" fontSize="sm" mb={4}>
                <AlertIcon />
                You can view assignments but not change them.
              </Alert>
            ) : null}

            {loading ? (
              <Stack align="center" py={10}>
                <Spinner color="purple.500" />
              </Stack>
            ) : (
              <AgGrid
                ref={gridRef}
                tableKey="employee-shift-assignment"
                rowData={employees}
                colDefs={colDefs}
                selectMode={canAssign}
                onSelectionChanged={setSelectedRows}
                gridOptions={{
                  getRowId: (params) => String((params.data || {}).employee_id ?? ""),
                }}
              />
            )}
          </>
        )}
      </CustomContainer>

      {/* Confirmation before the write. It quotes the count and the shift,
          because Select All can take in far more people than are visible. */}
      <CustomModal
        isOpen={confirm.isOpen}
        onClose={confirm.onClose}
        title="Confirm work shift assignment"
        size="md"
        footer={
          <Stack direction="row" spacing={3}>
            <Button size="sm" variant="ghost" onClick={confirm.onClose} isDisabled={assigning}>
              Cancel
            </Button>
            <Button size="sm" colorScheme="purple" onClick={assign} isLoading={assigning}>
              Assign
            </Button>
          </Stack>
        }
      >
        <Text fontSize="sm">
          {confirmationMessage(selectedRows.length, selectedWorkShift)}
        </Text>
        <Text fontSize="xs" color="gray.500" mt={3}>
          This sets the payroll work shift only. The employee&apos;s existing shift record is
          not changed.
        </Text>
      </CustomModal>
    </GlobalWrapper>
  );
}

export default EmployeeShiftAssignment;
