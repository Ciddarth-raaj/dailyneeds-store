import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Alert,
  AlertIcon,
  Badge,
  Button,
  Flex,
  Select,
  SimpleGrid,
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
import ApprovalQueue from "../../../components/attendance/ApprovalQueue";
import AttendanceV2Helper from "../../../helper/attendanceV2";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import { apiMessage, isOk } from "../../../util/attendanceV2";

/**
 * THE ATTENDANCE APPROVAL CENTRE - Attendance, OT and Shift in one place.
 *
 * There were two screens and a third was asked for. Three screens would have
 * been three copies of the same queue, the same filters, the same decide
 * flow and the same "pending with me" counter, differing in four columns -
 * so this is one screen with a REQUEST TYPE selector, and `/attendance/
 * ot-approval` now redirects here with OT preselected rather than being
 * maintained beside it.
 *
 * THE FILTERS NARROW; THEY DO NOT WIDEN. The outlets in the dropdown are the
 * ones this user has rights to, and the server applies its own scope to every
 * query regardless: asking for an outlet outside it returns nothing rather
 * than returning it. Nothing on this screen can reach a request the caller
 * was not already entitled to see, which is why the filter state is safe to
 * keep in the URL.
 *
 * FILTERS SURVIVE THE TAB. Switching Attendance -> OT -> Shift keeps the
 * outlet, employee and designation, because a manager looking at one outlet's
 * pending work wants the same outlet's OT next, not everybody's.
 *
 * "PENDING WITH ME" IS COUNTED UNDER THE SAME FILTERS as the table, so the
 * number is always a count of what is on the screen.
 */
const TYPES = [
  { key: "REGULARIZATION", label: "Attendance" },
  { key: "OT", label: "OT" },
  { key: "SHIFT_CHANGE", label: "Shift" },
];
const STATUSES = ["PENDING", "APPROVED", "REJECTED", "ALL"];
const EMPTY_FILTERS = { outlet_id: "", employee_id: "", designation_id: "" };

/** The URL's `type`, accepting the short word the old links and Telegram use. */
const typeFromQuery = (value) => {
  const asked = String(value || "").toUpperCase();
  if (asked === "SHIFT" || asked === "SHIFT_CHANGE") return "SHIFT_CHANGE";
  if (asked === "OT") return "OT";
  if (asked === "ATTENDANCE" || asked === "REGULARIZATION") return "REGULARIZATION";
  return null;
};

const decisionMessage = (type, res) => {
  if (res.status === "PENDING") return "Passed to the next stage.";
  if (res.status === "REJECTED") return "The request is closed.";
  if (type === "SHIFT_CHANGE") {
    return "Approved. The requested shift applies to that date only, and the date has been recalculated.";
  }
  if (type === "OT") return "Finally approved. Only this approved OT reaches payroll.";
  return res.ot_now_available > 0
    ? "Attendance corrected. The day now offers OT Available for the employee to request."
    : "Attendance corrected.";
};

export default function AttendanceApprovalCentrePage() {
  const toast = useToast();
  const router = useRouter();
  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();

  const [type, setType] = useState("REGULARIZATION");
  const [tab, setTab] = useState(0);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [deciding, setDeciding] = useState(null);
  /**
   * The employees the EMPLOYEE filter offers.
   *
   * Taken from the requests the server has already returned, rather than from
   * the employee directory. Two reasons, and the second is the important one:
   * an approver holds `view_attendance_approvals` and not necessarily any
   * employee-reading permission, and these are exactly the people whose
   * requests this approver can see - so the dropdown cannot name somebody
   * they have no business filtering by. It is refreshed on every load that
   * is not itself filtered by employee, which is what keeps the list from
   * collapsing to the one person just chosen.
   */
  const [roster, setRoster] = useState([]);
  const status = STATUSES[tab];

  // The Request Type may arrive in the URL: from the redirect that replaced
  // the old OT screen, and from the View button on a Telegram message.
  useEffect(() => {
    if (!router.isReady) return;
    const asked = typeFromQuery(router.query.type);
    if (asked) setType(asked);
  }, [router.isReady, router.query.type]);

  const queryFilters = useMemo(
    () => ({
      outlet_ids: filters.outlet_id ? [Number(filters.outlet_id)] : null,
      employee_id: filters.employee_id ? Number(filters.employee_id) : null,
      designation_id: filters.designation_id ? Number(filters.designation_id) : null,
    }),
    [filters]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, counted] = await Promise.all([
        AttendanceV2Helper.getApprovals({ request_type: type, status, ...queryFilters }),
        AttendanceV2Helper.getApprovalCount(type, queryFilters),
      ]);
      if (!isOk(list)) {
        setRows([]);
        setError(apiMessage(list, "Requests could not be loaded"));
      } else {
        const loaded = Array.isArray(list.rows) ? list.rows : [];
        setRows(loaded);
        if (!queryFilters.employee_id) {
          const seen = new Map();
          loaded.forEach((r) => {
            if (!seen.has(r.employee_id)) {
              seen.set(r.employee_id, { employee_id: r.employee_id, employee_name: r.employee_name });
            }
          });
          setRoster([...seen.values()].sort((a, b) => ("" + a.employee_name).localeCompare(b.employee_name)));
        }
      }
      setCount(isOk(counted) ? Number(counted.pending_with_me) || 0 : null);
    } catch (err) {
      setRows([]);
      setError("Could not reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [type, status, queryFilters]);

  useEffect(() => {
    load();
  }, [load]);

  const setFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }));

  /**
   * Choosing an outlet re-queries, so the roster it rebuilds is already that
   * outlet's - the employee options follow the outlet without a second rule.
   * An employee chosen from a different outlet is cleared rather than left as
   * a filter whose effect the reader can no longer see the reason for.
   */
  useEffect(() => {
    if (!filters.employee_id) return;
    if (roster.some((e) => Number(e.employee_id) === Number(filters.employee_id))) return;
    setFilter("employee_id", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.outlet_id]);

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
        description: decisionMessage(type, res),
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

  const filtered = filters.outlet_id || filters.employee_id || filters.designation_id;

  return (
    <GlobalWrapper title="Attendance Approvals" permissionKey={["view_attendance_approvals"]}>
      <CustomContainer
        title="Attendance Approvals"
        filledHeader
        rightSection={
          <Flex align="center" gap={2}>
            <Text fontSize="sm" color="gray.600">Pending with me:</Text>
            <Badge colorScheme="purple" fontSize="sm" px={2}>{count === null ? "—" : count}</Badge>
          </Flex>
        }
      >
        <Stack spacing={3}>
          <Flex gap={2} wrap="wrap">
            {TYPES.map((t) => (
              <Button
                key={t.key}
                size="sm"
                colorScheme="purple"
                variant={type === t.key ? "solid" : "outline"}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </Flex>

          <SimpleGrid columns={{ base: 1, md: 4 }} spacing={2}>
            <Select size="sm" placeholder="All outlets" value={filters.outlet_id} onChange={(e) => setFilter("outlet_id", e.target.value)}>
              {(outlets || []).map((o) => (
                <option key={o.outlet_id} value={o.outlet_id}>{o.outlet_name}</option>
              ))}
            </Select>
            <Select size="sm" placeholder="All employees" value={filters.employee_id} onChange={(e) => setFilter("employee_id", e.target.value)}>
              {roster.map((e) => (
                <option key={e.employee_id} value={e.employee_id}>{e.employee_id} — {e.employee_name}</option>
              ))}
            </Select>
            <Select size="sm" placeholder="All designations" value={filters.designation_id} onChange={(e) => setFilter("designation_id", e.target.value)}>
              {(designations || []).map((d) => (
                <option key={d.designation_id} value={d.designation_id}>{d.designation_name}</option>
              ))}
            </Select>
            <Button size="sm" variant="ghost" onClick={() => setFilters(EMPTY_FILTERS)} isDisabled={!filtered}>
              Clear Filters
            </Button>
          </SimpleGrid>

          <Tabs index={tab} onChange={setTab} colorScheme="purple" isLazy>
            <TabList mb={3} overflowX="auto">
              <Tab>Pending</Tab>
              <Tab>Approved</Tab>
              <Tab>Rejected</Tab>
              <Tab>All</Tab>
            </TabList>
            <TabPanels>
              {STATUSES.map((name) => (
                <TabPanel key={name} p={0}>
                  <Stack spacing={3}>
                    {error ? (
                      <Alert status="error" fontSize="sm" borderRadius="md"><AlertIcon />{error}</Alert>
                    ) : null}
                    <ApprovalQueue
                      rows={rows}
                      kind={type}
                      loading={loading}
                      onDecide={name === "PENDING" || name === "ALL" ? onDecide : null}
                      deciding={deciding}
                    />
                  </Stack>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </Stack>
      </CustomContainer>
    </GlobalWrapper>
  );
}
