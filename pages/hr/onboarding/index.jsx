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
  filterQueue,
  queueCards,
  queueCounts,
  queueFilters,
  queueRow,
  statusBadge,
} from "../../../util/hrOnboardingQueue";
import OnboardingQueueCard from "../../../components/hr/OnboardingQueueCard";

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
 * ONE DEFINITION OF FINISHED, AND IT IS THE SERVER'S. `hr_onboarding_pending`
 * is the union of FOUR items - a verified Aadhaar, a payroll-ready bank
 * account, the PF/ESI statutory decision, and the payroll setup itself - so
 * the HR column is that flag and this screen composes nothing of its own. An
 * employee is HR complete only when all four are. The per-item columns beside
 * it exist to say WHICH item is outstanding and to be filtered on; they are
 * read from the same summary, so they cannot disagree with it.
 *
 * SEVEN CARDS, AND EVERY ONE OF THEM IS A FILTER. Clicking a card sets the
 * one `filter` the dropdown also sets, so the two controls cannot contradict
 * each other, and `QUEUE_CARDS` in the rules module is the single place that
 * says which card selects which filter and shows which count.
 *
 * SIX OF THEM ARE COMPLIANCE; THE SEVENTH IS A MIGRATION. Cash -> Bank counts
 * the employees still paid in cash so HR can work through moving them onto
 * accounts. It is deliberately NOT part of HR pending - cash is a route
 * payroll accepts, not an unfinished record - so an employee can be HR
 * complete, payroll complete, and still on that card. The Bank card is the
 * other half of the same correction: it now asks only about employees who are
 * actually paid by bank transfer, because chasing a cash employee for an
 * account nobody will ever verify is a chase that cannot be closed.
 *
 * THE COUNTS ARE NOT COMPUTED FROM EACH OTHER, OR FROM THE ROWS ON SCREEN.
 * `queueCounts` is handed the whole merged queue and takes no filter at all:
 * every card counts its own predicate over every active employee, so Payroll
 * pending is measured against all of them rather than against whatever
 * another card left visible, and selecting a card cannot move a number.
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
/** How many cards the mobile list shows before "Show more" - as the employee master. */
const CARD_PAGE = 24;

function OnboardingQueue() {
  const canView = usePermissions(["view_employees"]);
  /**
   * MAY THIS USER BE TOLD HOW AN EMPLOYEE IS PAID?
   *
   * `payment_type` is sensitive under B3, and "paid in cash" is a value of
   * it, so the Cash -> Bank card, its filter and the "Paid by" column exist
   * only for a holder of `view_employee_sensitive`. They are ABSENT for
   * everybody else rather than showing zero: a zero would state as a fact
   * that nobody is on cash, which is worse than not answering.
   *
   * The backend withholds `cash_to_bank_pending` from the same callers on its
   * own, so this decides what to OFFER and is not the boundary.
   */
  const canSeePaymentRoute = usePermissions(["view_employee_sensitive"]);

  const [rows, setRows] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [statusUnavailable, setStatusUnavailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState(false);

  // HR Pending is the queue proper - the union of the four - so it is where
  // the screen opens. The Active Employees card is one click away.
  const [filter, setFilter] = useState("hr");
  // Mobile renders cards, and 200 of them at once is a scroll nobody wants.
  const [cardsShown, setCardsShown] = useState(CARD_PAGE);
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
  const cards = useMemo(() => queueCards({ canSeePaymentRoute }), [canSeePaymentRoute]);
  const filters = useMemo(() => queueFilters({ canSeePaymentRoute }), [canSeePaymentRoute]);

  const counts = useMemo(() => queueCounts(queue, { outlet, department }), [queue, outlet, department]);
  const visible = useMemo(
    () => filterQueue(queue, { filter, outlet, department, search }),
    [queue, filter, outlet, department, search]
  );

  // A new filter is a new question; it starts at the first page of answers.
  useEffect(() => {
    setCardsShown(CARD_PAGE);
  }, [filter, outlet, department, search]);

  // A filter this user may not use cannot stay selected - there would be no
  // card to draw the selection on, and no data behind it either. It cannot
  // normally be reached; this is the belt to that pair of braces.
  useEffect(() => {
    if (!filters.some((f) => f.value === filter)) setFilter("hr");
  }, [filters, filter]);

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
    // PF and ESI are ONE section on this dashboard now - the card above says
    // Statutory and so does the column. Which of the two is outstanding is
    // still available as a filter, and on the employee's own profile.
    statutory: "Statutory",
    payroll: "Payroll",
    // WHY THE ROUTE IS A COLUMN, AND WHY IT IS CONDITIONAL. Bank reads "Not
    // applicable" for anybody paid in cash, and a dash-like badge with no
    // explanation beside it is a puzzle - this says which route they are on.
    // It names a sensitive fact, so it is absent, not blank, for a user
    // without `view_employee_sensitive`; that user sees no N/A either, since
    // the backend collapses it to a dash for them.
    ...(canSeePaymentRoute ? { cash: "Paid by" } : {}),
    hr: "HR",
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
    bank: badge(row.bank, { completeLabel: "Verified" }),
    statutory: badge(row.statutory),
    payroll: badge(row.payroll),
    // Pending here means "still on cash", so it is labelled as the route
    // rather than as an outstanding item - it is not one of the four.
    ...(canSeePaymentRoute
      ? { cash: badge(row.cashToBank, { pendingLabel: "Cash", completeLabel: "Bank" }) }
      : {}),
    hr: badge(row.hr),
    open: (
      <Link href={`/hr/employees/${row.employee_id}`} passHref>
        <Button size="xs" colorScheme="purple" variant="outline">
          Open
        </Button>
      </Link>
    ),
  }));

  /**
   * ONE LIVE COUNT, AND THE CONTROL THAT SELECTS IT. Never a constant - see
   * the test for `queueCounts`.
   *
   * THE CARD IS A BUTTON, not a number with a click handler bolted on: it is
   * keyboard reachable, it says what it does to a screen reader, and it
   * reports which card is selected. `aria-pressed` is the honest role here -
   * these are six toggles over one filter, not links to six pages.
   *
   * THE SELECTED STATE IS DELIBERATELY LOUD - a filled border, a tinted
   * ground and a ring - because the whole screen below it is showing a subset
   * and the card is the only thing that says which.
   *
   * TAP TARGET. `minH` of 72px and real padding, so a thumb hits the card and
   * not the gap between two of them.
   */
  const Count = ({ label, value, accent = false, selected = false, onSelect }) => (
    <Box
      as="button"
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${label}: ${value}. Show these employees`}
      textAlign="left"
      w="100%"
      minH="72px"
      borderWidth={selected ? "2px" : "1px"}
      borderColor={selected ? "purple.500" : accent ? "orange.200" : "gray.200"}
      bg={selected ? "purple.50" : accent ? "orange.50" : "white"}
      boxShadow={selected ? "0 0 0 3px var(--chakra-colors-purple-100)" : "none"}
      borderRadius="lg"
      px={3}
      py={2}
      minW="0"
      transition="border-color 120ms, background-color 120ms, box-shadow 120ms"
      _hover={{ borderColor: selected ? "purple.600" : "gray.300" }}
      _focusVisible={{ outline: "2px solid", outlineColor: "purple.600", outlineOffset: "2px" }}
    >
      <Text
        fontSize="10px"
        textTransform="uppercase"
        letterSpacing="0.04em"
        color={selected ? "purple.700" : "gray.500"}
        noOfLines={2}
      >
        {label}
      </Text>
      <Text
        fontSize="xl"
        fontWeight="bold"
        color={selected ? "purple.800" : accent ? "orange.700" : "gray.900"}
      >
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

            {/* SEVEN CARDS, EACH ONE A FILTER. Two per row on a phone so each
                stays a comfortable tap target, seven across on a wide screen.
                `QUEUE_CARDS` is the single definition of which card selects
                which filter and displays which count - the screen does not
                get to pair them up its own way. */}
            <SimpleGrid columns={{ base: 2, md: 4, xl: 7 }} spacing={3} mb={4}>
              {cards.map((card) => (
                <Count
                  key={card.filter}
                  label={card.label}
                  value={counts[card.count]}
                  accent={card.accent}
                  selected={filter === card.filter}
                  onSelect={() => setFilter(card.filter)}
                />
              ))}
            </SimpleGrid>

            <Stack direction={{ base: "column", md: "row" }} spacing={3} mb={4}>
              {/* THE SAME STATE THE CARDS SET, not a second copy of it. The
                  dropdown and the six cards are two controls over one
                  `filter`, so the page cannot show a selected card and a
                  dropdown that contradicts it - clicking a card moves this,
                  and choosing here clears the selection on any card that is
                  no longer the answer. */}
              <Select
                size="sm"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                maxW={{ md: "260px" }}
                aria-label="Pending filter"
              >
                {filters.map((f) => (
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
              <>
                {/* ONE QUEUE, TWO LAYOUTS - the same `visible` rows either
                    way, so a phone and a desktop can never show different
                    employees. The breakpoint does the choosing in CSS rather
                    than a hook, so the server and the first client render
                    agree and nothing flashes on hydration. */}
                <Box display={{ base: "none", lg: "block" }}>
                  <Table heading={heading} rows={tableRows} showPagination defaultRowsPerPage={50} />
                </Box>

                <Box display={{ base: "block", lg: "none" }}>
                  <Stack spacing={3}>
                    {visible.slice(0, cardsShown).map((row) => (
                      <OnboardingQueueCard
                        key={row.employee_id}
                        row={row}
                        canSeePaymentRoute={canSeePaymentRoute}
                      />
                    ))}
                  </Stack>
                  {visible.length > cardsShown ? (
                    <Stack align="center" mt={4} spacing={2}>
                      <Text fontSize="sm" color="gray.600">
                        Showing {cardsShown} of {visible.length}
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
                </Box>
              </>
            )}

            <Text fontSize="xs" color="gray.500" mt={4}>
              HR is pending while any of Aadhaar, Bank, Statutory or Payroll is, so an employee is
              HR complete only when all four are. The store manager attempts the Aadhaar during
              onboarding; if it is left unverified for any reason, getting it verified is
              HR&apos;s follow-up. Bank is complete only once the account has passed its check — an
              account that failed, clashed or is still being checked is an employee who cannot be
              paid. Statutory is the PF and ESI decision together, and either recorded as not
              applicable counts as complete. Payroll is complete when the employee has an approved
              pay structure in effect today whose cost could be calculated, and a recorded way to
              be paid — it is a different question from Bank, which only asks whether an account
              can receive a transfer. Every status is derived from the employee&apos;s own sections, so
              a record stops appearing as soon as it is finished. Counts are over all active
              employees and never change when you select a card.
            </Text>
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default OnboardingQueue;
