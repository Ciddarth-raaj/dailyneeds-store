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
import PayrunTable from "../../components/payroll/PayrunTable";
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
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const { outlets } = useOutlets({ directory: true });

  // Sent to the server, so rows that do not match are never read out of the
  // database - not filtered out of a full month in the browser.
  const filters = useMemo(
    () => ({ year, month, store_ids: storeId, status }),
    [year, month, storeId, status]
  );

  const { rows, summary, monthLocked, loading, loaded, denied, error, refresh } =
    usePayrunMonth(filters, mayOpen);

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
        <SimpleGrid columns={{ base: 1, md: 5 }} spacing={3}>
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
          <Button size="sm" variant="outline" onClick={refresh} isDisabled={loading}>
            Refresh
          </Button>
        </SimpleGrid>

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
            <Stack direction="row" align="center" spacing={3} flexWrap="wrap">
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

            <PayrunTable
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
      </Stack>
    );
  };

  return (
    <GlobalWrapper title="Payrun">
      <CustomContainer
        title="Payrun — Initialization"
        subtitle="Take each employee's payroll snapshot for the month. After initialization, later salary and attendance changes do not alter the month until it is explicitly recalculated."
      >
        {body()}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Payrun;
