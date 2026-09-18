import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Button,
  Checkbox,
  Select,
  SimpleGrid,
  Spinner,
  Stat,
  StatLabel,
  StatNumber,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import PayrunEmployeeList from "../../components/payroll/PayrunEmployeeList";
import PayrunAdjustments from "../../components/payroll/adjustments/PayrunAdjustments";
import usePayrollActor from "../../customHooks/usePayrollActor";
import usePayrunMonth from "../../customHooks/usePayrunMonth";
import useOutlets from "../../customHooks/useOutlets";
import PayrunHelper from "../../helper/payrun";
import { describeApiResult, KIND } from "../../util/salaryApiError";
import {
  canChangePayrunPayType,
  canInitializePayrun,
  canOpenPayrun,
} from "../../util/payrunAccess";
import {
  confirmationMessage,
  isAllSelected,
  nextSelectAll,
  outcomeMessage,
  pruneSelection,
  selectableEmployeeIds,
  toggleSelection,
} from "../../util/payrunSelection";

/**
 * Payrun - Initialization.
 *
 * THE FIRST STAGE OF THE MONTHLY PAYRUN, AND ONLY THE FIRST. A month's
 * employees, what is stopping each of them, and the act of taking their
 * payroll snapshot. There is no recalculate here, no approval, no finalize, no
 * payslip and no payment - those are later stages with their own screens, and
 * an affordance for one of them on this screen would be a promise the system
 * cannot keep.
 *
 * WHAT INITIALIZING MEANS, AND THE SCREEN SAYS SO RATHER THAN ASSUMING IT IS
 * OBVIOUS. Before it, the month follows its sources: a salary revision or a
 * regularized punch flows through normally. After it, the employee has a
 * snapshot and later changes to those sources do not move it until somebody
 * explicitly recalculates. That is why the confirmation says it in words.
 *
 * IT DECIDES NOTHING. Every status, every blocking reason and every amount on
 * this screen is the server's answer, re-decided on the server from the
 * server's own reads on every request. This screen chooses what to draw and
 * which employee ids to send; it never computes an eligibility, a gross or a
 * pay type default, because a second copy of those rules in a browser is a
 * second answer that drifts.
 *
 * THREE KEYS OPEN IT - `view_employees`, `view_payroll` and `view_salary`,
 * all of them - matching `GET /payrun/month` exactly. The third is because the
 * table carries an Approved Monthly Gross column: company-wide salary
 * disclosure must not be reachable through a payroll key somebody was granted
 * to look at headcounts.
 *
 * INITIALIZING AND CHANGING A PAY TYPE ARE SEPARATE PERMISSIONS, and the
 * screen is useful under either alone: without `process_payroll` it is a
 * read-only view of what payroll is waiting on, which is a genuinely useful
 * thing for HR to have.
 *
 * TWO STAGES LIVE ON THIS SCREEN, AND ADJUSTMENTS IS NOT A SEPARATE MENU.
 * Initialization and Adjustments are consecutive steps of ONE payroll month:
 * the second operates on exactly the employees the first initialized, and a
 * separate Payroll menu entry for it would mean choosing the month twice and
 * would hide the fact that one stage feeds the other. So the month, the year
 * and the branch are chosen once, at the top, and the stage switch below them
 * changes what is shown about that month - it never reloads a different one.
 *
 * SELECT ALL READY MEANS EXACTLY THAT. The rows the server returned that are
 * READY - never a blocked row, never an already-initialized one, and never a
 * row the active filters are hiding, since the filters are applied by the
 * server and the rows are what came back.
 */

/** The current month, as the two values the server wants. */
function currentPeriod() {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

/** The two stages of the monthly payrun that exist today. */
const STAGE = {
  INITIALIZATION: "INITIALIZATION",
  ADJUSTMENTS: "ADJUSTMENTS",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function Payrun() {
  const toast = useToast();
  const actor = usePayrollActor();
  const mayOpen = canOpenPayrun(actor);
  const mayInitialize = canInitializePayrun(actor);
  const mayChangePayType = canChangePayrunPayType(actor);

  const initial = currentPeriod();
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [storeId, setStoreId] = useState("");
  const [status, setStatus] = useState("");
  /*
   * THE EMPLOYEE LIFECYCLE FILTER, AND IT IS ITS OWN PIECE OF STATE.
   *
   * A SEPARATE QUESTION FROM `status`: that one asks what the PAYRUN says
   * about the month, this asks what the EMPLOYMENT RECORD says about the
   * person. Every combination is a real thing to ask for - "Exited +
   * Initialized" is the list whose pay type may need moving to CASH by hand,
   * which is the reason this filter exists.
   *
   * EXITED IS THE SERVER'S DATED ANSWER. It means "had they left by the end of
   * THIS month", never the Employee Master's current status, and the server
   * decides it from the same field the Exited badge uses.
   */
  const [lifecycle, setLifecycle] = useState("");
  /*
   * WHICH STAGE OF THE MONTH IS ON SCREEN. It is a view of the SAME month -
   * the year, month and branch above are shared - so switching stages never
   * asks somebody to pick a payroll month twice.
   */
  const [stage, setStage] = useState(STAGE.INITIALIZATION);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { outlets } = useOutlets({ directory: true });

  // Sent to the server, so rows that do not match are never read out of the
  // database - not filtered out of a full month in the browser.
  const filters = useMemo(
    () => ({ year, month, store_ids: storeId, status, lifecycle }),
    [year, month, storeId, status, lifecycle]
  );

  /*
   * THE INITIALIZATION MONTH IS READ ONLY WHILE ITS STAGE IS ON SCREEN. The
   * adjustments stage reads its own month through its own hook, and loading
   * both would be two full-month requests to draw one of them.
   */
  const { rows, summary, monthLocked, loading, loaded, denied, error, refresh } =
    usePayrunMonth(filters, mayOpen && stage === STAGE.INITIALIZATION);

  const selectableIds = useMemo(
    () => (mayInitialize ? selectableEmployeeIds(rows) : []),
    [rows, mayInitialize]
  );

  /* A selection never outlives the rows it was made on - most obviously the
     rows that were just initialized and are no longer READY. */
  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, selectableIds));
  }, [selectableIds]);

  const selectedCount = selectedIds.length;
  const allSelected = isAllSelected(selectableIds, selectedIds);

  const setSelected = (employeeId, checked) =>
    setSelectedIds((prev) => toggleSelection(prev, employeeId, checked));

  const toggleSelectAll = () => setSelectedIds(nextSelectAll(selectableIds, selectedIds));

  /**
   * INITIALIZE - one employee or a selection, by the SAME call.
   *
   * A single row posts a list of one, because the server has one endpoint for
   * both and two client paths into one endpoint is how they drift.
   */
  const runInitialize = async (employeeIds, { confirm }) => {
    if (bulkBusy || busyEmployeeId) return;
    if (confirm && !window.confirm(confirmationMessage(employeeIds.length))) return;

    if (employeeIds.length === 1) setBusyEmployeeId(employeeIds[0]);
    else setBulkBusy(true);

    try {
      const result = await PayrunHelper.initialize({ year, month, employee_ids: employeeIds });
      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) {
        // A lost permission, a locked month, a month that is not a month -
        // each said in the server's own words rather than paraphrased.
        toast({
          title: outcome.message,
          status: outcome.kind === KIND.DENIED ? "info" : "error",
          duration: 8000,
          isClosable: true,
        });
        return;
      }

      /*
       * A PARTIAL OUTCOME IS REPORTED AS A PARTIAL OUTCOME. "12 initialized"
       * on a run where three were blocked would be a lie by omission, and the
       * three would sit there until somebody noticed.
       */
      const blocked = Number(result.blocked_count || 0) + Number(result.not_in_scope_count || 0);
      toast({
        title: outcomeMessage(result),
        description: blocked
          ? "Blocked employees were not initialized. Their reasons are shown on their rows."
          : undefined,
        status: blocked ? "warning" : "success",
        duration: 7000,
        isClosable: true,
      });
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      toast({
        title: "The payrun could not be initialized. Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setBusyEmployeeId(null);
      setBulkBusy(false);
    }
  };

  /**
   * THIS MONTH'S PAY TYPE. No reason is asked for - moving somebody between
   * bank and cash for one month is an ordinary operational act - but the
   * screen says plainly that it is month-specific, because somebody flipping
   * it would reasonably assume they had just changed the employee's record.
   */
  const changePayType = async (employeeId, payType) => {
    if (busyEmployeeId || bulkBusy) return;
    setBusyEmployeeId(employeeId);
    try {
      const result = await PayrunHelper.setPayType({
        year,
        month,
        employee_id: employeeId,
        pay_type: payType,
      });
      const outcome = describeApiResult(result);
      if (outcome.kind !== KIND.OK) {
        toast({
          title: outcome.message,
          status: outcome.kind === KIND.DENIED ? "info" : "error",
          duration: 8000,
          isClosable: true,
        });
        return;
      }
      toast({
        title: `Pay type set to ${payType} for ${MONTH_NAMES[month - 1]} ${year}.`,
        description: "This month only. The employee's record is unchanged.",
        status: "success",
        duration: 5000,
        isClosable: true,
      });
      await refresh();
    } catch (err) {
      toast({
        title: "The pay type could not be changed. Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setBusyEmployeeId(null);
    }
  };

  const summaryCards = [
    { label: "Total Eligible", value: summary.total_eligible },
    { label: "Ready", value: summary.ready },
    { label: "Blocked", value: summary.blocked },
    { label: "Initialized", value: summary.initialized },
  ];

  const body = () => {
    if (!mayOpen) {
      return (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to open the Payrun. This screen needs View Employees, View
          Payroll and View Salary.
        </Alert>
      );
    }

    return (
      <Stack spacing={4}>
        {/* TWO ACROSS ON A PHONE. Month and Year belong side by side - they
            are one choice - and five full-width rows would push the summary
            and the first employee below the fold before anything was read. */}
        <SimpleGrid columns={{ base: 2, md: stage === STAGE.INITIALIZATION ? 6 : 4 }} spacing={3}>
          <Select
            size="sm"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            aria-label="Payroll month"
          >
            {MONTH_NAMES.map((name, index) => (
              <option key={name} value={index + 1}>
                {name}
              </option>
            ))}
          </Select>
          <Select
            size="sm"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            aria-label="Payroll year"
          >
            {[initial.year - 2, initial.year - 1, initial.year, initial.year + 1].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
          <Select
            size="sm"
            placeholder="All locations"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
          >
            {outlets.map((o) => (
              <option key={o.outlet_id} value={o.outlet_id}>
                {o.outlet_name}
              </option>
            ))}
          </Select>
          {/* THE TWO INITIALIZATION FILTERS. They ask about initialization
              eligibility and employment lifecycle, neither of which the
              adjustments stage has an opinion about - its population is
              simply "everybody initialized" - so they are not drawn there
              rather than being drawn and ignored. */}
          {stage === STAGE.INITIALIZATION ? (
            <Select
              size="sm"
              placeholder="All statuses"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="READY">Ready</option>
              <option value="BLOCKED">Blocked</option>
              <option value="INITIALIZED">Initialized</option>
            </Select>
          ) : null}
          {/* INDEPENDENT OF THE STATUS FILTER BESIDE IT - both are sent, and
              the server applies both, so Exited + Blocked is one request. */}
          {stage === STAGE.INITIALIZATION ? (
            <Select
              size="sm"
              placeholder="All employees"
              value={lifecycle}
              onChange={(e) => setLifecycle(e.target.value)}
              aria-label="Employee lifecycle"
            >
              <option value="ACTIVE">Active</option>
              <option value="EXITED">Exited</option>
            </Select>
          ) : null}
          {stage === STAGE.INITIALIZATION ? (
            <Button
              size="sm"
              variant="outline"
              onClick={refresh}
              isDisabled={loading}
              gridColumn={{ base: "span 2", md: "auto" }}
            >
              Refresh
            </Button>
          ) : null}
        </SimpleGrid>

        {/*
          THE STAGE SWITCH — the payrun's own steps, not a menu.

          TWO BUTTONS RATHER THAN A ROUTE, because both stages are views of the
          SAME month: switching must not ask somebody to choose August again,
          and it must not be reachable from the sidebar as though Adjustments
          were a module of its own. It is the second step of a payroll month
          and only means anything after the first.

          FULL-WIDTH ON A PHONE so the two targets are thumb-sized rather than
          two small buttons sharing a line with the filters above them.
        */}
        <Stack direction="row" spacing={2}>
          {[
            { key: STAGE.INITIALIZATION, label: "Initialization" },
            { key: STAGE.ADJUSTMENTS, label: "Adjustments" },
          ].map((entry) => (
            <Button
              key={entry.key}
              size="sm"
              flex={{ base: 1, md: "0 0 auto" }}
              colorScheme="purple"
              variant={stage === entry.key ? "solid" : "outline"}
              onClick={() => setStage(entry.key)}
            >
              {entry.label}
            </Button>
          ))}
        </Stack>

        {/*
          THE ADJUSTMENTS STAGE. It receives the month and the branch that were
          chosen above and nothing else: it reads its own population - the
          employees INITIALIZED for that month - from the server, and it
          decides none of its own rules here.
        */}
        {stage === STAGE.ADJUSTMENTS ? (
          <PayrunAdjustments
            year={year}
            month={month}
            storeId={storeId}
            monthName={MONTH_NAMES[month - 1]}
            /* The same key that initializes a month is the key that puts
               figures into it - see `routes/payrun_adjustment.js`. */
            mayEdit={mayInitialize}
          />
        ) : null}

        {/* ============================= THE INITIALIZATION STAGE, unchanged */}
        {stage === STAGE.INITIALIZATION ? (
          <>
        <SimpleGrid columns={{ base: 2, md: 4 }} spacing={3}>
          {summaryCards.map((card) => (
            <Stat key={card.label} p={3} borderWidth="1px" borderRadius="md">
              <StatLabel fontSize="xs">{card.label}</StatLabel>
              <StatNumber fontSize="lg">{card.value ?? 0}</StatNumber>
            </Stat>
          ))}
        </SimpleGrid>

        {monthLocked ? (
          <Alert status="warning" fontSize="sm">
            <AlertIcon />
            This payroll month is locked. Nothing in it can be initialized or changed.
          </Alert>
        ) : null}

        {loading ? (
          <Stack direction="row" align="center" spacing={2}>
            <Spinner size="sm" />
            <Text fontSize="sm" color="gray.600">
              Loading the payroll month…
            </Text>
          </Stack>
        ) : null}

        {denied ? (
          <Alert status="info" fontSize="sm">
            <AlertIcon />
            You do not have permission to view this payroll month.
          </Alert>
        ) : null}

        {/* A FAILED READ IS NOT AN EMPTY MONTH. "Nobody is waiting" and "we
            could not find out" are different things to tell a payroll clerk. */}
        {error ? (
          <Alert status="error" fontSize="sm">
            <AlertIcon />
            {error} This is a problem reading the month — it does not mean there is nothing to
            initialize.
          </Alert>
        ) : null}

        {loaded && rows.length === 0 ? (
          <Text fontSize="sm" color="gray.600">
            No employees match this payroll month and these filters.
          </Text>
        ) : null}

        {loaded && rows.length > 0 ? (
          <Stack spacing={2}>
            {/*
              THE BULK BAR, AND IT STICKS TO THE TOP ON A PHONE.

              On a desktop it sits above the table and everything it refers to
              is on screen with it. On a phone the cards are tall, so by the
              time somebody has ticked the fourth employee the count and the
              Initialize Selected button have scrolled away - and a bulk action
              you cannot see is one you perform by scrolling back up to find,
              every time. Sticking it to the top keeps the count and the button
              with the selection that is being built.

              STICKY RATHER THAN A FIXED FOOTER BAR: sticky is three properties
              and no layout to maintain, and it cannot cover the last card the
              way a fixed bar does. `zIndex` and a solid background so the
              cards scroll under it rather than through it.
            */}
            <Stack
              direction="row"
              align="center"
              spacing={3}
              flexWrap="wrap"
              position={{ base: "sticky", md: "static" }}
              top={{ base: 0, md: "auto" }}
              zIndex={{ base: 1, md: "auto" }}
              bg="white"
              py={{ base: 2, md: 0 }}
            >
              <Checkbox
                colorScheme="purple"
                isChecked={allSelected}
                isIndeterminate={selectedCount > 0 && !allSelected}
                isDisabled={selectableIds.length === 0 || bulkBusy}
                onChange={toggleSelectAll}
                aria-label="Select all ready employees"
              >
                <Text fontSize="xs">Select all Ready ({selectableIds.length})</Text>
              </Checkbox>
              <Text fontSize="xs" color="gray.600">
                {rows.length} employee{rows.length === 1 ? "" : "s"} shown.
              </Text>
              {selectedCount > 0 ? (
                <>
                  <Text fontSize="xs" fontWeight="bold">
                    {selectedCount} selected
                  </Text>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => setSelectedIds([])}
                    isDisabled={bulkBusy}
                  >
                    Clear
                  </Button>
                  <Button
                    size="xs"
                    colorScheme="purple"
                    isLoading={bulkBusy}
                    loadingText="Initializing"
                    isDisabled={Boolean(busyEmployeeId) || monthLocked}
                    onClick={() => runInitialize(selectedIds, { confirm: true })}
                  >
                    Initialize Selected ({selectedCount})
                  </Button>
                </>
              ) : null}
            </Stack>

            {/* THE TABLE ON A DESKTOP, STACKED CARDS ON A PHONE - one
                component decides, and both layouts get the same props, the
                same permissions and the same shared cells. */}
            <PayrunEmployeeList
              rows={rows}
              selectedIds={selectedIds}
              onSelectChange={setSelected}
              onInitialize={(employeeId) => runInitialize([employeeId], { confirm: true })}
              onPayTypeChange={changePayType}
              canInitialize={mayInitialize && !monthLocked}
              canChangePayType={mayChangePayType && !monthLocked}
              busyEmployeeId={busyEmployeeId}
              disabled={bulkBusy}
            />
          </Stack>
        ) : null}
          </>
        ) : null}
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="Payrun">
      <CustomContainer
        title={stage === STAGE.ADJUSTMENTS ? "Payrun — Adjustments" : "Payrun — Initialization"}
        subtitle={
          stage === STAGE.ADJUSTMENTS
            ? "Record the incentives, bonuses, arrears and recoveries for the employees initialized for this month — and confirm, explicitly, the ones who genuinely have none."
            : "Take each employee's payroll snapshot for the month. After initialization, later salary and attendance changes do not alter the month until it is explicitly recalculated."
        }
      >
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Payrun;
