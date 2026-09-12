import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Flex, FormControl, FormLabel, Input, Stack, Text, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AttendanceDayList from "../../../components/attendance/AttendanceDayList";
import AttendanceDayDetail from "../../../components/attendance/AttendanceDayDetail";
import RegularizationForm from "../../../components/attendance/RegularizationForm";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, currentMonth, isOk, monthBounds } from "../../../util/attendanceV2";

/**
 * My Attendance - the signed-in employee's own calculated attendance.
 *
 * NO EMPLOYEE SELECTOR, and no permission key: this is every employee's own
 * month. The helper calls `GET /attendance/me`, which takes the employee
 * from the session token and refuses an employee id parameter, so there is
 * nothing on this page - or in its requests - that could be pointed at
 * somebody else. The HR/Admin view of another employee is a different page
 * (/attendance/calculated) behind `view_calculated_attendance`.
 *
 * Mobile-first: cards on a phone, a compact table on a desktop. Tapping a
 * day opens the Day Detail; a Missing Punch day offers Regularize from
 * there. The shift is read-only here - there is no Edit Shift on this page,
 * and the backend would refuse it anyway.
 */
export default function MyAttendancePage() {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [regularizing, setRegularizing] = useState(null);

  const load = useCallback(async () => {
    const bounds = monthBounds(month);
    if (!bounds) return;
    setLoading(true);
    setError(null);
    try {
      const res = await AttendanceV2Helper.getMyAttendance(bounds);
      if (!isOk(res)) {
        setDays([]);
        setError(apiMessage(res, "Your attendance could not be loaded"));
        return;
      }
      setDays(Array.isArray(res.days) ? res.days : []);
    } catch (err) {
      setDays([]);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  const onSubmitted = async () => {
    setRegularizing(null);
    setSelected(null);
    toast({
      title: "Regularization submitted",
      description: "The day now shows Regularization Pending until it is approved.",
      status: "success",
      duration: 5000,
    });
    await load();
  };

  return (
    <GlobalWrapper title="My Attendance">
      <CustomContainer title="My Attendance" filledHeader>
        <Stack spacing={4}>
          <Flex gap={3} align="flex-end" wrap="wrap">
            <FormControl maxW="220px">
              <FormLabel fontSize="sm">Month</FormLabel>
              <Input type="month" size="sm" value={month} onChange={(e) => setMonth(e.target.value)} />
            </FormControl>
            <Text fontSize="xs" color="gray.500" pb={2}>
              Tap a day for its detail.
            </Text>
          </Flex>

          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md">
              <AlertIcon />
              {error}
            </Alert>
          ) : null}

          <AttendanceDayList days={days} loading={loading} onSelect={setSelected} />
        </Stack>
      </CustomContainer>

      <AttendanceDayDetail
        day={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onRegularize={(day) => setRegularizing(day)}
      />
      <RegularizationForm
        day={regularizing}
        isOpen={!!regularizing}
        onClose={() => setRegularizing(null)}
        onSubmitted={onSubmitted}
      />
    </GlobalWrapper>
  );
}
