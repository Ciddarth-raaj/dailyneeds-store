import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Flex, FormControl, FormLabel, Input, Stack, Text, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import EmployeePicker from "../../../components/payroll/EmployeePicker";
import AttendanceDayList from "../../../components/attendance/AttendanceDayList";
import AttendanceDayDetail from "../../../components/attendance/AttendanceDayDetail";
import EditShiftModal from "../../../components/attendance/EditShiftModal";
import usePermissions from "../../../customHooks/usePermissions";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, currentMonth, isOk, monthBounds } from "../../../util/attendanceV2";

/**
 * Employee Attendance - the HR/Admin view of one employee's calculated month.
 *
 * Behind `view_calculated_attendance`, on the page and on every request it
 * makes (`GET /attendance/calculated`). The same cards, rows and Day Detail
 * as My Attendance, over an employee chosen with the existing picker.
 *
 * Edit Shift appears - on the Day Detail - only for a caller holding
 * `edit_attendance_date_shift`, and the backend requires that key again on
 * the save. It changes that ONE date. Nothing here regularizes on somebody
 * else's behalf; that stays with the existing HR regularization route.
 */
export default function EmployeeAttendancePage() {
  const toast = useToast();
  const canEditShift = usePermissions(["edit_attendance_date_shift"]);
  const [employeeId, setEmployeeId] = useState(null);
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null);

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

  return (
    <GlobalWrapper title="Employee Attendance" permissionKey={["view_calculated_attendance"]}>
      <CustomContainer title="Employee Attendance" filledHeader>
        <Stack spacing={4}>
          <EmployeePicker selectedId={employeeId} onSelect={setEmployeeId} />
          <Flex gap={3} align="flex-end" wrap="wrap">
            <FormControl maxW="220px">
              <FormLabel fontSize="sm">Month</FormLabel>
              <Input type="month" size="sm" value={month} onChange={(e) => setMonth(e.target.value)} />
            </FormControl>
            {!employeeId ? (
              <Text fontSize="xs" color="gray.500" pb={2}>
                Select an employee to see their attendance.
              </Text>
            ) : null}
          </Flex>

          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          {employeeId ? <AttendanceDayList days={days} loading={loading} onSelect={setSelected} /> : null}
        </Stack>
      </CustomContainer>

      <AttendanceDayDetail
        day={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onEditShift={canEditShift ? (day) => setEditing(day) : null}
      />
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
