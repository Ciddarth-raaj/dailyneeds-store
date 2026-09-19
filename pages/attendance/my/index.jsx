import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  AlertIcon,
  Flex,
  FormControl,
  FormLabel,
  Input,
  Stack,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AttendanceDayList from "../../../components/attendance/AttendanceDayList";
import CorrectionRequestList from "../../../components/attendance/CorrectionRequestList";
import OtRequestList from "../../../components/attendance/OtRequestList";
import AttendanceDayDetail from "../../../components/attendance/AttendanceDayDetail";
import RegularizationForm from "../../../components/attendance/RegularizationForm";
import OtRequestForm from "../../../components/attendance/OtRequestForm";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import {
  MY_TAB,
  MY_TAB_LABEL,
  MY_TAB_ORDER,
  apiMessage,
  correctionRequestRows,
  currentMonth,
  isOk,
  monthBounds,
  myTabAtIndex,
  myTabIndex,
  otRequestRows,
} from "../../../util/attendanceV2";

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
 * there, and a day whose OT is Available offers Request OT - two separate
 * requests, never combined. The OT minutes are the engine's and the form
 * has no field for them. The shift is read-only here - there is no Edit Shift on this page,
 * and the backend would refuse it anyway.
 *
 * ================================================== THREE TABS, ONE READ ===
 *
 *   ATTENDANCE           the month, as before. The landing tab.
 *   CORRECTION REQUESTS  the dates needing a correction or carrying one,
 *                        with its status, reason and rejection reason.
 *   OT REQUESTS          the dates with overtime to claim or already
 *                        claimed, with the engine's eligible OT, the status
 *                        and the rejection reason.
 *
 * ALL THREE ARE THE SAME `days`. There is ONE request, `GET /attendance/me`,
 * and the two request tabs are FILTERS over the rows it returned
 * (`otRequestRows`, `correctionRequestRows`) - not a second endpoint, not a
 * second attendance engine and not a second OT calculation. Every figure a
 * tab shows is a field the server sent: `candidate_ot_minutes` is the
 * eligible OT, `ot_claim_state` is the OT status, `correction_state` is the
 * correction status. The browser derives none of them from the punch times
 * it happens to be displaying beside them.
 *
 * THE OT FORM HAS NO DURATION FIELD, here or anywhere: submitting sends a
 * date and a reason, the server recalculates the date and stores its own
 * candidate, and the correction dependency, the one-claim-per-date rule and
 * the payroll lock are all its refusals, not this page's.
 */
export default function MyAttendancePage() {
  const toast = useToast();
  const [month, setMonth] = useState(currentMonth());
  const [days, setDays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(null);
  const [regularizing, setRegularizing] = useState(null);
  const [requestingOt, setRequestingOt] = useState(null);
  // CONTROLLED TABS, so a submission can send the employee to the tab that
  // now holds what they filed instead of leaving them on the month.
  const [tab, setTab] = useState(MY_TAB.ATTENDANCE);

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
    setTab(MY_TAB.CORRECTIONS);
    toast({
      title: "Regularization submitted",
      description: "The day now shows Regularization Pending until it is approved.",
      status: "success",
      duration: 5000,
    });
    await load();
  };

  const onOtSubmitted = async () => {
    setRequestingOt(null);
    setSelected(null);
    setTab(MY_TAB.OT);
    toast({
      title: "OT request submitted",
      description: "The day now shows OT Request Pending until it is approved.",
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

          <Tabs
            index={myTabIndex(tab)}
            onChange={(i) => setTab(myTabAtIndex(i))}
            colorScheme="purple"
            size="sm"
            isLazy
          >
            <TabList>
              {MY_TAB_ORDER.map((key) => (
                <Tab key={key} fontSize="sm" fontWeight="600">
                  {MY_TAB_LABEL[key]}
                </Tab>
              ))}
            </TabList>
            <TabPanels>
              <TabPanel px={0}>
                <AttendanceDayList days={days} loading={loading} onSelect={setSelected} />
              </TabPanel>
              <TabPanel px={0}>
                <CorrectionRequestList
                  days={correctionRequestRows(days)}
                  loading={loading}
                  onSelect={setSelected}
                  onRegularize={(day) => setRegularizing(day)}
                />
              </TabPanel>
              <TabPanel px={0}>
                <OtRequestList
                  days={otRequestRows(days)}
                  loading={loading}
                  onSelect={setSelected}
                  onRequestOt={(day) => setRequestingOt(day)}
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Stack>
      </CustomContainer>

      <AttendanceDayDetail
        day={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onRegularize={(day) => setRegularizing(day)}
        onRequestOt={(day) => setRequestingOt(day)}
      />
      <OtRequestForm
        day={requestingOt}
        isOpen={!!requestingOt}
        onClose={() => setRequestingOt(null)}
        onSubmitted={onOtSubmitted}
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
