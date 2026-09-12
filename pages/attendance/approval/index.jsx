import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Badge, Flex, Stack, Text, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import ApprovalQueue from "../../../components/attendance/ApprovalQueue";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, isOk } from "../../../util/attendanceV2";

/**
 * Attendance Approval - missing-punch REGULARIZATION requests, and nothing
 * else. OT requests have their own screen.
 *
 * ONE screen: the pending list, with each row expanding inline to the
 * detail and the Approve / Reject actions. "Pending with me" is counted on
 * the server and means only the requests whose CURRENT stage is waiting for
 * the signed-in approver - not every pending request in the company.
 *
 * Attendance approval corrects attendance only. There is no OT figure and
 * no OT control here; if the corrected day earns overtime it becomes OT
 * Available for the employee to request.
 */
export default function AttendanceApprovalPage() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deciding, setDeciding] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, counted] = await Promise.all([
        AttendanceV2Helper.getApprovals({ request_type: "REGULARIZATION", status: "PENDING" }),
        AttendanceV2Helper.getApprovalCount("REGULARIZATION"),
      ]);
      if (!isOk(list)) {
        setRows([]);
        setError(apiMessage(list, "Pending requests could not be loaded"));
      } else {
        setRows(Array.isArray(list.rows) ? list.rows : []);
      }
      setCount(isOk(counted) ? Number(counted.pending_with_me) || 0 : null);
    } catch (err) {
      setRows([]);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onDecide = async (row, decision, remarks) => {
    setDeciding({ id: row.attendance_approval_request_id, decision });
    try {
      const res = await AttendanceV2Helper.decideApproval(row.attendance_approval_request_id, { decision, remarks });
      if (!isOk(res)) {
        toast({ title: "Could not record the decision", description: apiMessage(res), status: "error", duration: 6000 });
        return;
      }
      toast({
        title: decision === "APPROVED" ? "Approved" : "Rejected",
        description:
          res.status === "APPROVED"
            ? res.ot_now_available > 0
              ? "Attendance corrected. The day now offers OT Available for the employee to request."
              : "Attendance corrected."
            : res.status === "REJECTED"
            ? "The request is closed."
            : "Passed to the next stage.",
        status: "success",
        duration: 5000,
      });
      await load();
    } catch (err) {
      toast({ title: "Could not reach the server", status: "error", duration: 5000 });
    } finally {
      setDeciding(null);
    }
  };

  return (
    <GlobalWrapper title="Attendance Approval" permissionKey={["view_attendance_approvals"]}>
      <CustomContainer
        title="Attendance Approval"
        filledHeader
        rightSection={
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600">Pending with me:</Text>
            <Badge colorScheme="purple" fontSize="sm" px={2}>{count === null ? "—" : count}</Badge>
          </Flex>
        }
      >
        <Stack spacing={3}>
          <Text fontSize="xs" color="gray.500">Missing-punch regularizations waiting for your decision. Tap a row to see the detail.</Text>
          {error ? (
            <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{error}</Alert>
          ) : null}
          <ApprovalQueue rows={rows} kind="REGULARIZATION" loading={loading} onDecide={onDecide} deciding={deciding} />
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}
