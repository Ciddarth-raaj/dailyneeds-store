import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, FormControl, FormLabel, Input, Stack, Text, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import SearchableEmployeePicker from "../../../components/attendance/SearchableEmployeePicker";
import AttendanceDayList from "../../../components/attendance/AttendanceDayList";
import AttendanceDayDetail from "../../../components/attendance/AttendanceDayDetail";
import EditShiftModal from "../../../components/attendance/EditShiftModal";
import VoidPunchModal from "../../../components/attendance/VoidPunchModal";
import usePermissions from "../../../customHooks/usePermissions";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, currentMonth, isOk, monthBounds } from "../../../util/attendanceV2";

/**
 * Employee Attendance - the HR/Admin view of one employee's calculated month.
 *
 * Behind `view_calculated_attendance`, on the page and on every request it
 * makes (`GET /attendance/calculated`). The same cards, rows and Day Detail
 * as My Attendance, over an employee chosen with the searchable picker.
 *
 * ONE FILTER ROW, ONE EMPLOYEE CONTROL: Employee | Outlet | Month. The
 * employee combobox is searched by id or by name and picking a result IS the
 * selection - there is no separate search box and no second employee
 * dropdown for the same choice. Month sits in that same row rather than in a
 * date control of its own further down.
 *
 * NOTHING IS RENDERED UNTIL SOMEBODY IS CHOSEN. An empty attendance table
 * for nobody reads like an employee with no attendance, so the screen says
 * what it wants instead.
 *
 * Edit Shift appears - on the Day Detail - only for a caller holding
 * `edit_attendance_date_shift`, and the backend requires that key again on
 * the save. It changes that ONE date. Nothing here regularizes on somebody
 * else's behalf; that stays with the existing HR regularization route.
 *
 * Void Punch appears - beside a raw BIOMAX / IMPORT punch on the Day Detail
 * - only for a caller holding `void_attendance_punch`, and the backend
 * requires that key again. It records the exclusion with a reason and
 * recalculates the date; the day is then reloaded so the punch shows as
 * VOIDED and the numbers reflect the effective punches.
 */
export default function EmployeeAttendancePage() {
  const toast = useToast();
  const canEditShift = usePermissions(["edit_attendance_date_shift"]);
  const canVoidPunch = usePermissions(["void_attendance_punch"]);
  const [employeeId, setEmployeeId] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);
  const [voiding, setVoiding] = useState(null);

  const load = useCallback(async () => {
    const bounds = monthBounds(month);
    if (!employeeId || !bounds) {
      setDays([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceV2Helper.getEmployeeAttendance({ employee_id: employeeId, ...bounds });
      if (!isOk(res)) {
        setDays([]);
        setError(apiMessage(res, "Attendance could not be loaded"));
        return;
      }
      setDays(Array.isArray(res.days) ? res.days : []);
    } catch (err) {
      setDays([]);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [employeeId, month]);

  useEffect(() => {
    load();
  }, [load]);

  const onShiftSaved = async (res) => {
    setEditing(null);
    setSelected(null);
    toast({
      title: res.changed ? "Shift changed for this date" : "Shift unchanged",
      description: res.changed
        ? `${res.attendance_date} now calculated under ${res.shift_code || "the new shift"}.`
        : "This date was already on that shift.",
      status: "success",
      duration: 5000,
    });
    await load();
  };

  const onPunchVoided = async (res) => {
    setVoiding(null);
    setSelected(null);
    toast({
      title: res.recalculated ? "Punch voided" : "Punch voided, but the date was not recalculated",
      description: res.msg,
      status: res.recalculated ? "success" : "warning",
      duration: res.recalculated ? 5000 : 10000,
      isClosable: true,
    });
    await load();
  };

  return (
    <GlobalWrapper title="Employee Attendance" permissionKey={["view_calculated_attendance"]}>
      <CustomContainer title="Employee Attendance" filledHeader>
        <Stack spacing={4}>
          <SearchableEmployeePicker
            selectedId={employeeId}
            onSelect={setEmployeeId}
            trailingControl={
              <FormControl>
                <FormLabel fontSize="sm" mb={1}>
                  Month
                </FormLabel>
                <Input
                  type="month"
                  size="sm"
                  aria-label="Month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                />
              </FormControl>
            }
          />

          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          {employeeId ? (
            <AttendanceDayList days={days} loading={loading} onSelect={setSelected} />
          ) : (
            <Text fontSize="sm" color="gray.600" py={4}>
              Select an employee to view attendance.
            </Text>
          )}
        </Stack>
      </CustomContainer>

      <AttendanceDayDetail
        day={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onEditShift={canEditShift ? (day) => setEditing(day) : null}
        onVoidPunch={canVoidPunch ? (punch) => setVoiding(punch) : null}
      />
      {canVoidPunch ? (
        <VoidPunchModal
          punch={voiding ? { ...voiding, employee_name: selected ? selected.employee_name : null } : null}
          isOpen={!!voiding}
          onClose={() => setVoiding(null)}
          onVoided={onPunchVoided}
        />
      ) : null}
      {canEditShift ? (
        <EditShiftModal
          day={editing}
          employeeId={employeeId}
          isOpen={!!editing}
          onClose={() => setEditing(null)}
          onSaved={onShiftSaved}
        />
      ) : null}
    </GlobalWrapper>
  );
}
