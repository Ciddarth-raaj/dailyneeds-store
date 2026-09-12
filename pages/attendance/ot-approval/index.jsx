import React, { useCallback, useEffect, useState } from "react";
import { Alert, AlertIcon, Badge, Flex, Stack, Tab, TabList, TabPanel, TabPanels, Tabs, Text, useToast } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import ApprovalQueue from "../../../components/attendance/ApprovalQueue";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import { apiMessage, isOk } from "../../../util/attendanceV2";

/**
 * OT Approval - employee OT requests, and nothing else.
 *
 * Tabs: Pending (pending with me - the requests whose CURRENT stage this
 * approver can act on now), Approved, Rejected, All. History is what the
 * approver's role and outlet entitled them to see, decided on the server;
 * the tabs do not widen anybody's visibility.
 *
 * Eligible OT is read-only everywhere on this screen. The approver decides
 * Approve or Reject and never types minutes; the backend clamps a final
 * approval to what the engine finds eligible. Payroll-lock closures show
 * their exact wording in the Rejected and All tabs.
 */
const TABS = ["PENDING", "APPROVED", "REJECTED", "ALL"];

export default function OtApprovalPage() {
  const toast = useToast();
  const [tab, setTab] = useState(0);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const status = TABS[tab];

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, counted] = await Promise.all([
        AttendanceV2Helper.getApprovals({ request_type: "OT", status }),
        AttendanceV2Helper.getApprovalCount("OT"),
      ]);
      if (!isOk(list)) {
        setRows([]);
        setError(apiMessage(list, "OT requests could not be loaded"));
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
  }, [status]);

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
            ? "Finally approved. Only this approved OT reaches payroll."
            : res.status === "REJECTED"
            ? "The OT request is closed."
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
    <GlobalWrapper title="OT Approval" permissionKey={["view_attendance_approvals"]}>
      <CustomContainer
        title="OT Approval"
        filledHeader
        rightSection={
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600">Pending with me:</Text>
            <Badge colorScheme="purple" fontSize="sm" px={2}>{count === null ? "—" : count}</Badge>
          </Flex>
        }
      >
        <Tabs index={tab} onChange={setTab} colorScheme="purple" isLazy>
          <TabList mb={3} overflowX="auto">
            <Tab>Pending</Tab>
            <Tab>Approved</Tab>
            <Tab>Rejected</Tab>
            <Tab>All</Tab>
          </TabList>
          <TabPanels>
            {TABS.map((name) => (
              <TabPanel key={name} p={0}>
                <Stack spacing={3}>
                  {error ? (
                    <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{error}</Alert>
                  ) : null}
                  <ApprovalQueue rows={rows} kind="OT" loading={loading} onDecide={name === "PENDING" || name === "ALL" ? onDecide : null} deciding={deciding} />
                </Stack>
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </CustomContainer>
    </GlobalWrapper>
  );
}
