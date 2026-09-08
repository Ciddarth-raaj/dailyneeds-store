import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Button,
  ButtonGroup,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Text,
  Spinner,
  Alert,
  AlertIcon,
} from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Table from "../../../components/table/table";
import EmployeeCard from "../../../components/hr/EmployeeCard";
import {
  AadhaarListBadge,
  BankListBadge,
  EmploymentBadge,
} from "../../../components/hr/StatusBadges";
import usePermissions from "../../../customHooks/usePermissions";
import useOutlets from "../../../customHooks/useOutlets";
import useDesignations from "../../../customHooks/useDesignations";
import EmployeeHelper from "../../../helper/employee";
import HrHelper from "../../../helper/hr";
import unwrapList from "../../../util/apiList";
import { statusSummaryIndex } from "../../../util/hrStatus";

/**
 * Stage 0C / C3 — the HR employee master list.
 *
 * The operational list HR works from: who is employed, where, and how to reach
 * them, with one click through to everything else about them.
 *
 * SOURCE: GET /employee/employees (`view_employees`), which already returns
 * name, outlet, designation, department, mobile, status and joining date, and
 * has B3 stripping salary, bank, PAN and Aadhaar for anyone without
 * `view_employee_sensitive`. There is deliberately no new backend endpoint.
 *
 * The Aadhaar and Bank columns come from GET /hr/employees/status-summary
 * (`view_employees`), fetched ONCE for the whole list and merged by
 * employee_id. The per-employee reads still exist and are what the profile
 * uses; calling them from here would be 1,260 requests to draw one screen,
 * which is the reason the bulk endpoint exists.
 *
 * IF THE SUMMARY FAILS the list still renders. The two statuses fall back to a
 * neutral dash - "not known" rather than "not verified" - because the list is
 * useful without them and useless if a status request can blank it.
 *
 * TWO VIEWS, ONE DATA SET. Cards are the default, because the everyday task is
 * "find this person and see where they stand", and a card answers that at a
 * glance. The table is kept for the other task - scanning several hundred rows
 * for the ones that need chasing - and shows the detail a card deliberately
 * leaves off. The choice is remembered per browser; the filters, the search
 * and the data are shared, so switching view never changes what is shown, only
 * how.
 *
 * THERE IS NO SYNC BUTTON, and this is the point of C1/C2 rather than an
 * omission: dnds.co.in IS the employee master now. Employees are created,
 * edited, resigned and rejoined here. A "Sync" action and a "Last Sync" line
 * would describe Digisme owning these records and this screen showing a copy,
 * which stopped being true.
 */
const VIEW_STORAGE_KEY = "hr.employees.view";
function HrEmployeeList() {
  const canView = usePermissions(["view_employees"]);
  const canCreate = usePermissions(["employee_create"]);

  const [rows, setRows] = useState([]);
  // Keyed by employee_id. Empty until it arrives, and empty forever if the
  // request is refused - neither of which may stop the list rendering.
  const [statuses, setStatuses] = useState({});
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  // Cards by default. Read from localStorage after mount rather than during
  // the first render, so the server-rendered markup and the client's first
  // render agree - a mismatch is a hydration error, not a preference.
  const [view, setView] = useState("card");
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(VIEW_STORAGE_KEY);
      if (saved === "card" || saved === "list") setView(saved);
    } catch (err) {
      // A browser with site data blocked still gets the default.
    }
  }, []);

  const chooseView = (next) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_STORAGE_KEY, next);
    } catch (err) {
      // Not remembering the choice is not a reason to refuse to make it.
    }
  };

  // 630 cards at once is a lot of DOM for a screen somebody is scanning the
  // top of. Shown in pages, with the count always visible so nobody mistakes
  // the first batch for the whole answer.
  const CARD_PAGE = 48;
  const [cardsShown, setCardsShown] = useState(CARD_PAGE);

  const [search, setSearch] = useState("");
  const [outlet, setOutlet] = useState("");
  const [designation, setDesignation] = useState("");
  const [status, setStatus] = useState("active");

  const { outlets } = useOutlets({ directory: true });
  const { designations } = useDesignations();

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

  /**
   * ONE request for the whole list, never one per employee. It is deliberately
   * a separate effect from the employee list above: the two are independent,
   * and a refusal or failure here must not touch `rows`.
   */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const summary = await HrHelper.getStatusSummary();
        if (cancelled) return;
        if (!Array.isArray(summary)) {
          // A B2 refusal arrives as `{ code: 403, msg }` rather than a list.
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

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((e) => {
      if (status === "active" && Number(e.status) !== 1) return false;
      if (status === "inactive" && Number(e.status) === 1) return false;
      if (outlet && String(e.store_id) !== String(outlet)) return false;
      if (designation && String(e.designation_id) !== String(designation)) return false;
      if (!needle) return true;
      return (
        String(e.employee_id).includes(needle) ||
        String(e.employee_name || "").toLowerCase().includes(needle) ||
        String(e.primary_contact_number || "").includes(needle)
      );
    });
  }, [rows, search, outlet, designation, status]);

  // A new filter is a new question; it starts at the first page of answers.
  useEffect(() => {
    setCardsShown(CARD_PAGE);
  }, [search, outlet, designation, status]);

  const heading = {
    employee_id: "ID",
    employee_name: "Name",
    store_name: "Outlet",
    designation_name: "Designation",
    department_name: "Department",
    primary_contact_number: "Mobile",
    date_of_joining: "Joined",
    status: "Status",
    aadhaar: "Aadhaar",
    bank: "Bank",
    open: "",
  };

  // Built only for the view that uses it: in card view this would be several
  // hundred table cells nobody is going to look at.
  const tableRows = view !== "list" ? [] : filtered.map((e) => {
    // `undefined` when the summary has not loaded, or was refused. The badges
    // treat that as unknown rather than as Pending.
    const s = statuses[String(e.employee_id)] || {};
    return {
      employee_id: e.employee_id,
      employee_name: e.employee_name,
      store_name: e.store_name || "—",
      designation_name: e.designation_name || "—",
      department_name: e.department_name || "—",
      primary_contact_number: e.primary_contact_number || "—",
      date_of_joining: e.date_of_joining || "—",
      status: <EmploymentBadge status={e.status} />,
      aadhaar: <AadhaarListBadge status={s.aadhaar_status} />,
      bank: <BankListBadge status={s.bank_status} payrollReady={s.bank_payroll_ready} />,
      open: (
        <Link href={`/hr/employees/${e.employee_id}`} passHref>
          <Button size="xs" colorScheme="purple" variant="outline">
            Open
          </Button>
        </Link>
      ),
    };
  });

  return (
    <GlobalWrapper title="Employees">
      <CustomContainer
        title="Employees"
        filledHeader
        rightSection={
          <Stack direction="row" spacing={3} align="center">
            {/* Card / List. Not a setting buried somewhere - the two views
                serve two different tasks, so the switch sits on both. */}
            <ButtonGroup size="sm" isAttached variant="outline">
              <Button
                onClick={() => chooseView("card")}
                colorScheme={view === "card" ? "purple" : "gray"}
                variant={view === "card" ? "solid" : "outline"}
                aria-pressed={view === "card"}
                leftIcon={<i className="fa fa-th-large" aria-hidden="true" />}
              >
                Cards
              </Button>
              <Button
                onClick={() => chooseView("list")}
                colorScheme={view === "list" ? "purple" : "gray"}
                variant={view === "list" ? "solid" : "outline"}
                aria-pressed={view === "list"}
                leftIcon={<i className="fa fa-list" aria-hidden="true" />}
              >
                List
              </Button>
            </ButtonGroup>
            {canCreate ? (
              <Link href="/hr/employees/new" passHref>
                <Button colorScheme="purple" size="sm">
                  Add Employee
                </Button>
              </Link>
            ) : null}
          </Stack>
        }
      >
        {!canView ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            You do not have permission to view the employee list.
          </Alert>
        ) : (
          <>
            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4}>
              <Input
                size="sm"
                placeholder="Search name, ID or mobile"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                maxW={{ base: "100%", md: "260px" }}
              />
              <Select size="sm" value={status} onChange={(e) => setStatus(e.target.value)} maxW={{ md: "160px" }}>
                <option value="active">Active</option>
                <option value="inactive">Resigned</option>
                <option value="all">All</option>
              </Select>
              <Select
                size="sm"
                placeholder="All outlets"
                value={outlet}
                onChange={(e) => setOutlet(e.target.value)}
                maxW={{ md: "200px" }}
              >
                {outlets.map((o) => (
                  <option key={o.outlet_id} value={o.outlet_id}>
                    {o.outlet_name}
                  </option>
                ))}
              </Select>
              <Select
                size="sm"
                placeholder="All designations"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                maxW={{ md: "200px" }}
              >
                {(designations || []).map((d) => (
                  <option key={d.designation_id} value={d.designation_id}>
                    {d.designation_name}
                  </option>
                ))}
              </Select>
            </Stack>

            {loading ? (
              <Stack align="center" py={8}>
                <Spinner />
              </Stack>
            ) : denied ? (
              <Alert status="warning" fontSize="sm">
                <AlertIcon />
                You do not have permission to view the employee list.
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
                    Aadhaar and bank status could not be loaded, so they show a dash. Everything
                    else on this page is unaffected, and each employee&apos;s status is on their
                    profile.
                  </Alert>
                ) : null}
                <Text fontSize="sm" color="gray.600" mb={3}>
                  {filtered.length} employee{filtered.length === 1 ? "" : "s"}
                </Text>

                {filtered.length === 0 ? (
                  <Alert status="info" fontSize="sm">
                    <AlertIcon />
                    No employee matches these filters.
                  </Alert>
                ) : view === "card" ? (
                  <>
                    <SimpleGrid columns={{ base: 1, sm: 2, lg: 3, xl: 4 }} spacing={4}>
                      {filtered.slice(0, cardsShown).map((e) => (
                        <EmployeeCard
                          key={e.employee_id}
                          employee={e}
                          status={statuses[String(e.employee_id)] || {}}
                        />
                      ))}
                    </SimpleGrid>
                    {filtered.length > cardsShown ? (
                      <Stack align="center" mt={5} spacing={2}>
                        <Text fontSize="sm" color="gray.600">
                          Showing {cardsShown} of {filtered.length}
                        </Text>
                        <Button
                          size="sm"
                          variant="outline"
                          colorScheme="purple"
                          onClick={() => setCardsShown((n) => n + CARD_PAGE)}
                        >
                          Show more
                        </Button>
                      </Stack>
                    ) : null}
                  </>
                ) : (
                  <Table heading={heading} rows={tableRows} showPagination defaultRowsPerPage={50} />
                )}
              </>
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default HrEmployeeList;
