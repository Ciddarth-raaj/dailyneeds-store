import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  AlertIcon,
  Avatar,
  Badge,
  Box,
  Button,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Table from "../../../components/table/table";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDepartments from "../../../customHooks/useDepartments";
import EmployeeHelper from "../../../helper/employee";
import HrHelper from "../../../helper/hr";
import unwrapList from "../../../util/apiList";
import { statusSummaryIndex } from "../../../util/hrStatus";
import {
  QUEUE_FILTERS,
  filterQueue,
  queueCounts,
  queueRow,
  statusBadge,
} from "../../../util/hrOnboardingQueue";

/**
 * Onboarding / Pending HR — the compliance work queue.
 *
 * THE OTHER HALF OF THE EMPLOYEE MASTER. `/hr/employees` answers "who is this
 * person and where do they work" and is now clean of compliance badges; this
 * answers "whose record is not finished, and what is missing". They are two
 * jobs done by different people at different times, and one screen serving
 * both gave 630 employees three badges each to chase the handful who need it.
 *
 * NO NEW ENDPOINT, NO NEW PERMISSION, NO NEW STATE. Exactly the two requests
 * the employee list already makes:
 *
 *   GET /employee/employees             `view_employees` - who exists
 *   GET /hr/employees/status-summary    `view_employees` - their statuses
 *
 * and every rule about what those statuses mean lives in
 * `util/hrOnboardingQueue.js`, which is tested without a renderer. Nothing on
 * this screen decides anything about compliance; it renders decisions the
 * backend already derives from the sections themselves. That is what makes it
 * impossible for this queue and the badge on an employee's profile to
 * disagree, and why nothing had to be backfilled for it.
 *
 * NOTHING IS MARKED DONE HERE. There is no action on this screen but "Open" -
 * the work is done on the employee's profile, in the section that owns it,
 * under that section's own permission. An employee leaves the queue when the
 * last outstanding section is filled in, because the flag is derived from
 * those sections and not stored.
 *
 * A FAILED SUMMARY DOES NOT INVENT WORK. Where the statuses could not be
 * loaded, every row reads "—" and the counts are zero, with the reason stated
 * at the top. Chasing somebody because a request failed is worse than not
 * chasing them.
 *
 * NOTHING SENSITIVE IS RENDERED - no Aadhaar digits, no account number, no
 * PAN, UAN, PF or ESI number, no salary. Only whether a section is
 * outstanding, which is what the summary returns.
 */
function OnboardingQueue() {
  const canView = usePermissions(["view_employees"]);

  const [rows, setRows] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  const [filter, setFilter] = useState("all_pending");
  const [outlet, setOutlet] = useState("");
  const [department, setDepartment] = useState("");
  const [search, setSearch] = useState("");

  const { outlets } = useOutlets({ directory: true });
  const { departments } = useDepartments();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = unwrapList(await EmployeeHelper.getEmployee());
        if (cancelled) return;
        setRows(result.items);
        setDenied(result.accessDenied);
        setError(result.error);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(true);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** ONE request for the whole queue, exactly as the employee list does it. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await HrHelper.getStatusSummary();
        if (cancelled) return;
        if (!Array.isArray(summary)) {
          // A refusal arrives as `{ code: 403, msg }` rather than a list.
          setStatuses({});
          setStatusUnavailable(true);
          return;
        }
        setStatuses(statusSummaryIndex(summary));
        setStatusUnavailable(false);
      } catch (err) {
        if (cancelled) return;
        setStatuses({});
        setStatusUnavailable(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Employee + status, merged by id into the one shape every rule reads. */
  const queue = useMemo(
    () => rows.map((e) => queueRow(e, statuses[String(e.employee_id)] || {})),
    [rows, statuses]
  );

  // The counts follow the outlet and department narrowing but NOT the work
  // filter: a number that moved when you clicked the thing it counts would be
  // useless for deciding what to click.
  const counts = useMemo(() => queueCounts(queue, { outlet, department }), [queue, outlet, department]);
  const visible = useMemo(
    () => filterQueue(queue, { filter, outlet, department, search }),
    [queue, filter, outlet, department, search]
  );

  const badge = (value, labels) => {
    const b = statusBadge(value, labels);
    return (
      <Badge colorScheme={b.colorScheme} variant={b.unknown ? "outline" : "subtle"}>
        {b.label}
      </Badge>
    );
  };

  const heading = {
    employee: "Employee",
    store_name: "Location",
    aadhaar: "Aadhaar",
    bank: "Bank",
    pf: "PF",
    esi: "ESI",
    hr: "HR",
    overall: "Onboarding",
    open: "",
  };

  const tableRows = visible.map((row) => ({
    // The ID and the photo belong to the person, so they travel together in
    // one cell rather than as three columns of the same answer.
    employee: (
      <Stack direction="row" spacing={3} align="center">
        <Avatar size="sm" name={row.employee_name || undefined} src={row.employee_image || undefined} />
        <Box minW="0">
          <Text fontFamily="mono" fontWeight="bold" fontSize="sm" color="gray.900">
            {row.employee_id}
          </Text>
          <Text fontSize="sm" color="gray.700" noOfLines={1}>
            {row.employee_name || "Unnamed"}
          </Text>
        </Box>
      </Stack>
    ),
    store_name: row.store_name || "—",
    aadhaar: badge(row.aadhaar, { completeLabel: "Verified" }),
    bank: badge(row.bank, { completeLabel: "Ready" }),
    pf: badge(row.pf),
    esi: badge(row.esi),
    hr: badge(row.hr),
    overall: badge(row.overall),
    open: (
      <Link href={`/hr/employees/${row.employee_id}`} passHref>
        <Button size="xs" colorScheme="purple" variant="outline">
          Open
        </Button>
      </Link>
    ),
  }));

  /** One live count. Never a constant - see the test for `queueCounts`. */
  const Count = ({ label, value, accent = false }) => (
    <Box
      borderWidth="1px"
      borderColor={accent ? "orange.200" : "gray.200"}
      bg={accent ? "orange.50" : "white"}
      borderRadius="lg"
      px={3}
      py={2}
      minW="0"
    >
      <Text fontSize="10px" textTransform="uppercase" letterSpacing="0.04em" color="gray.500" noOfLines={1}>
        {label}
      </Text>
      <Text fontSize="xl" fontWeight="bold" color={accent ? "orange.700" : "gray.900"}>
        {value}
      </Text>
    </Box>
  );

  return (
    <GlobalWrapper title="Onboarding / Pending HR">
      <CustomContainer
        title="Onboarding / Pending HR"
        filledHeader
        rightSection={
          <Link href="/hr/employees" passHref>
            <Button size="sm" variant="outline" colorScheme="purple">
              Employee Master
            </Button>
          </Link>
        }
      >
        {!canView ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view employees.
          </Alert>
        ) : loading ? (
          <Stack align="center" py={8}>
            <Spinner />
          </Stack>
        ) : denied ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view employees.
          </Alert>
        ) : error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            The employee list could not be loaded. Try again.
          </Alert>
        ) : (
          <>
            {statusUnavailable ? (
              <Alert status="info" fontSize="sm" mb={3}>
                <AlertIcon />
                Onboarding status could not be loaded, so every row reads a dash and the counts are
                zero. Nothing is shown as pending that has not actually been checked; each
                employee&apos;s status is on their profile.
              </Alert>
            ) : null}

            <SimpleGrid columns={{ base: 2, md: 4, xl: 7 }} spacing={3} mb={4}>
              <Count label="Active employees" value={counts.active} />
              <Count label="Onboarding pending" value={counts.pending} accent />
              <Count label="Aadhaar pending" value={counts.aadhaar} />
              <Count label="Bank pending" value={counts.bank} />
              <Count label="PF pending" value={counts.pf} />
              <Count label="ESI pending" value={counts.esi} />
              <Count label="HR pending" value={counts.hr} />
            </SimpleGrid>

            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4}>
              <Select
                size="sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                maxW={{ md: "230px" }}
                aria-label="Pending filter"
              >
                {QUEUE_FILTERS.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                placeholder="All outlets"
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                maxW={{ md: "200px" }}
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
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                maxW={{ md: "200px" }}
              >
                {(departments || []).map((d) => (
                  <option key={d.department_id} value={d.department_id}>
                    {d.department_name}
                  </option>
                ))}
              </Select>
              <Input
                size="sm"
                placeholder="Search name or ID"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxW={{ base: "100%", md: "240px" }}
              />
            </Stack>

            <Text fontSize="sm" color="gray.600" mb={3}>
              {visible.length} employee{visible.length === 1 ? "" : "s"}
            </Text>

            {visible.length === 0 ? (
              <Alert status="success" fontSize="sm">
                <AlertIcon />
                Nothing outstanding for these filters. An employee leaves this queue as soon as the
                last outstanding section is recorded on their profile.
              </Alert>
            ) : (
              <Table heading={heading} rows={tableRows} showPagination defaultRowsPerPage={50} />
            )}

            <Text fontSize="xs" color="gray.500" mt={4}>
              Aadhaar is shown and filterable but does not decide whether onboarding is complete: it
              can be verified at any time and holds nothing up. PF and ESI recorded as not
              applicable count as complete. Every status here is derived from the employee&apos;s own
              sections, so a record stops appearing as soon as it is finished.
            </Text>
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default OnboardingQueue;
