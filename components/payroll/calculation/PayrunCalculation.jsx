import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Input,
  Select,
  SimpleGrid,
  Spinner,
  Stack,
  Stat,
  StatLabel,
  StatNumber,
  Text,
  useToast,
} from "@chakra-ui/react";

import CalculationEmployeeList from "./CalculationEmployeeList";
import CalculationBreakup from "./CalculationBreakup";
import usePayrunCalculationMonth from "../../../customHooks/usePayrunCalculationMonth";
import PayrunCalculationHelper from "../../../helper/payrunCalculation";
import { describeApiResult, KIND } from "../../../util/salaryApiError";
import { changeMonthlyPayType } from "../../../util/payrunPayType";
import PayrunTabs from "../PayrunTabs";
import {
  CALCULATION_TABS,
  DEFAULT_TAB,
  tabFilters,
  tabCount,
} from "../../../util/payrunTabs";
import {
  STATUS,
  approveMessage,
  approvableEmployeeIds,
  eligibleWithin,
  hasRefusals,
  isAllSelected,
  isApprovable,
  isLocked,
  isRecalculable,
  nextSelectAll,
  outcomeMessage,
  pruneSelection,
  recalculateMessage,
  toggleSelection,
} from "../../../util/payrunCalculation";

/**
 * PAYRUN > CALCULATION & REVIEW - the third stage of the monthly payrun.
 *
 *   Initialization -> Adjustments -> CALCULATION & REVIEW -> Approve & Lock
 *
 * WHAT THIS SCREEN IS FOR: computing each initialized employee's month from
 * the sources the payrun already has, showing the result in enough detail to
 * be reviewed, and signing it off one employee at a time.
 *
 * IT DECIDES NOTHING. Every figure, every status, every blocker and every
 * recalculation reason is the server's answer, re-decided on the server from
 * the server's own reads on every request. This screen chooses what to draw
 * and which employee ids to send. A second copy of a payroll formula in a
 * browser would be a second answer about what somebody is paid.
 *
 * IT NEVER RECALCULATES ANYBODY BY ITSELF. Opening this screen calculates
 * nothing; refreshing it recalculates nothing; a row that has gone stale
 * because a salary was approved overnight shows as RECALCULATION REQUIRED with
 * its stored figures exactly as they were, and stays that way until a person
 * presses the button. Helpfully refreshing it would be the silent mutation the
 * whole payrun design exists to prevent.
 *
 * THE TWO PERMISSIONS ARE SEPARATE AND THE SCREEN IS USEFUL UNDER EITHER.
 * Without `process_payroll` it is a read-only review; without `approve_payrun`
 * it calculates but cannot sign off - which is the separation of duties the
 * key exists for, and the screen has to make sense on both sides of it.
 *
 * THERE IS NO PAYSLIP HERE, and no Generate, Publish or Unlock. Those are
 * later stages, and an affordance for one of them would be a promise the
 * system cannot keep.
 */
function PayrunCalculation({
  year,
  month,
  storeId,
  monthName,
  mayCalculate,
  mayApprove,
  mayChangePayType,
  search = "",
}) {
  const toast = useToast();

  /*
   * THE WORKING TAB. Opens on the attendance queue - the employees whose month
   * cannot be finished until somebody settles or accepts their attendance -
   * rather than on a list where two hundred approved employees bury ten
   * unfinished ones. APPROVED & LOCKED is a tab of its own and is never the
   * default: it is the only queue that is definitionally finished.
   */
  const [tab, setTab] = useState(DEFAULT_TAB.CALCULATION);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  /* The employee whose breakup is open, and the read behind it. */
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const filters = useMemo(
    () => ({
      year,
      month,
      store_ids: storeId,
      /* Typed once at the top of the payrun and carried into every stage. */
      search,
      ...tabFilters(CALCULATION_TABS, tab),
    }),
    [year, month, storeId, tab, search]
  );

  const { rows, summary, monthLocked, loading, loaded, denied, error, refresh } =
    usePayrunCalculationMonth(filters, true);

  /* A selection never outlives the rows it was made on - most obviously the
     rows that were just approved and can no longer be acted on. */
  const selectableIds = useMemo(
    () => rows.filter((row) => !isLocked(row)).map((row) => row.employee_id),
    [rows]
  );
  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, selectableIds));
  }, [selectableIds]);

  const selectedRecalculable = eligibleWithin(rows, selectedIds, isRecalculable);
  const selectedApprovable = eligibleWithin(rows, selectedIds, isApprovable);
  const readyIds = approvableEmployeeIds(rows);

  const busy = bulkBusy || busyEmployeeId !== null;

  /**
   * EVERY ACTION GOES THROUGH ONE FUNCTION, so that a single row and a bulk
   * selection cannot end up reporting their outcomes differently - which is
   * how one of them ends up not mentioning that three employees were refused.
   */
  const run = async (call, { employeeId = null, confirmText = null }) => {
    if (busy) return;
    if (confirmText && !window.confirm(confirmText)) return;

    if (employeeId !== null) setBusyEmployeeId(employeeId);
    else setBulkBusy(true);

    try {
      const result = await call();
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
       * A PARTIAL OUTCOME IS REPORTED AS A PARTIAL OUTCOME. "12 approved" on a
       * run where three were not ready would be a lie by omission, and the
       * three would sit there until somebody noticed.
       */
      const refused = hasRefusals(result);
      toast({
        title: outcomeMessage(result),
        description: refused
          ? "Some employees were not changed. Their reasons are shown on their rows."
          : undefined,
        status: refused ? "warning" : "success",
        duration: 7000,
        isClosable: true,
      });
      setSelectedIds([]);
      await refresh();
    } catch (err) {
      toast({
        title: "That could not be completed. Please try again.",
        status: "error",
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setBusyEmployeeId(null);
      setBulkBusy(false);
    }
  };

  const calculate = (employeeIds, { all = false } = {}) =>
    run(
      () =>
        PayrunCalculationHelper.calculate({
          year,
          month,
          ...(all ? { all_eligible: true } : { employee_ids: employeeIds }),
        }),
      { employeeId: !all && employeeIds.length === 1 ? employeeIds[0] : null }
    );

  const recalculate = (employeeIds, { confirm = true } = {}) =>
    run(
      () => PayrunCalculationHelper.recalculate({ year, month, employee_ids: employeeIds }),
      {
        employeeId: employeeIds.length === 1 ? employeeIds[0] : null,
        confirmText: confirm ? recalculateMessage(employeeIds.length) : null,
      }
    );

  const approve = (employeeIds, { all = false } = {}) =>
    run(
      () =>
        PayrunCalculationHelper.approve({
          year,
          month,
          ...(all ? { all_ready: true } : { employee_ids: employeeIds }),
        }),
      {
        employeeId: !all && employeeIds.length === 1 ? employeeIds[0] : null,
        confirmText: approveMessage(all ? readyIds.length : employeeIds.length),
      }
    );

  /**
   * THIS MONTH'S PAY TYPE, CHANGED FROM THE REVIEW SCREEN.
   *
   * WHY IT IS OFFERED HERE AT ALL. Whoever is reading what an employee will
   * actually be paid is the person who notices that it has to go out in cash -
   * their account is closed, they have left, the bank rejected the last one.
   * Sending them back a stage to change it, and then forward again, is how a
   * month goes out on the wrong route.
   *
   * IT IS THE SAME ACT AS ON THE INITIALIZATION SCREEN, through the same
   * shared module, the same endpoint and the same permission. It writes
   * `payrun_employee.pay_type` and nothing else - not the Employee Master, and
   * not this stage's stored calculation.
   *
   * AND IT DOES NOT SILENTLY RE-SIGN ANYTHING. The pay type is one of the
   * inputs the server hashes, so an employee who was calculated comes back as
   * RECALCULATION REQUIRED with every stored figure exactly as it was, and
   * cannot be approved until somebody presses Recalculate. The refresh below
   * is what makes that visible immediately - the row's status changes under
   * the person who just changed the pay type, which is the point.
   */
  const changePayType = async (employeeId, payType) => {
    if (busy) return;
    setBusyEmployeeId(employeeId);
    try {
      const { ok, toast: message } = await changeMonthlyPayType({
        year,
        month,
        employeeId,
        payType,
        monthLabel: monthName,
      });
      toast(message);
      if (ok) await refresh();
    } finally {
      setBusyEmployeeId(null);
    }
  };

  /** Open one employee's breakup. A read, and it changes nothing. */
  const openDetail = async (row) => {
    setDetailOpen(true);
    setDetail({ ...row });
    setDetailLoading(true);
    setDetailError(null);
    try {
      const body = await PayrunCalculationHelper.getEmployee({
        year,
        month,
        employee_id: row.employee_id,
      });
      const outcome = describeApiResult(body);
      if (outcome.kind !== KIND.OK) {
        setDetailError(outcome.message);
        return;
      }
      setDetail(body);
    } catch (err) {
      setDetailError("This employee's breakup could not be loaded. Please try again.");
    } finally {
      setDetailLoading(false);
    }
  };

  /**
   * THE COUNTS THE STAGE IS SUMMARISED BY, in the order of the pipeline
   * they describe.
   *
   * ATTENDANCE PENDING IS ITS OWN CARD and is deliberately not folded into
   * "Calculated". Those two numbers are two different jobs: a calculated
   * employee is waiting on a confirmation or an approval somebody here can
   * give, and a pending one is waiting on the attendance month being settled,
   * which is somebody else's. A month where the second number is large is a
   * month that is not costed yet, and rolling it into the first would say the
   * opposite. They count the WHOLE month and never the filtered view -
   * the server's summary is used as it arrives, because "ready: 0" meaning
   * "none matching this filter" is the most dangerous number here.
   */
  const summaryCards = [
    { label: "Initialized", value: summary.initialized },
    { label: "Attendance Pending", value: summary.attendance_pending },
    { label: "Calculated", value: summary.calculated + summary.ready_for_approval },
    { label: "Recalculation Required", value: summary.recalculation_required },
    { label: "Ready for Approval", value: summary.ready_for_approval },
    { label: "Approved & Locked", value: summary.approved_locked },
  ];

  return (
    <Stack spacing={4}>
      <SimpleGrid columns={{ base: 2, md: 6 }} spacing={3}>
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
          This payroll month is locked. Nothing in it can be calculated or changed.
        </Alert>
      ) : null}

      <Stack direction={{ base: "column", md: "row" }} spacing={3} align={{ md: "center" }}>
        <Box flex="1" minWidth={0}>
          <PayrunTabs
            tabs={CALCULATION_TABS}
            active={tab}
            counts={(key) => tabCount("CALCULATION", key, summary)}
            onChange={setTab}
            isDisabled={loading}
            ariaLabel="Calculation workflow"
          />
        </Box>
        <Button size="sm" variant="outline" onClick={refresh} isDisabled={loading} flexShrink={0}>
          Refresh
        </Button>
      </Stack>

      {/*
        THE FOUR ACTIONS THE STAGE HAS, and each says how many rows it would
        touch. A bulk button whose count is zero is disabled rather than hidden,
        so the screen reads the same whether or not there is work to do.

        "CALCULATE ALL ELIGIBLE" AND "APPROVE ALL READY" SEND NO LIST. Who is
        eligible and who is ready is re-decided by the server at the moment of
        the request; sending the ids this screen believes qualify would act on
        a month that may be minutes old.
      */}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Button
          size="sm"
          colorScheme="purple"
          isDisabled={!mayCalculate || monthLocked || busy || summary.not_calculated === 0}
          isLoading={bulkBusy}
          onClick={() => calculate([], { all: true })}
        >
          Calculate All Eligible ({summary.not_calculated})
        </Button>
        <Button
          size="sm"
          colorScheme="orange"
          variant="outline"
          isDisabled={!mayCalculate || monthLocked || busy || selectedRecalculable.length === 0}
          onClick={() => recalculate(selectedRecalculable)}
        >
          Recalculate Selected ({selectedRecalculable.length})
        </Button>
        <Button
          size="sm"
          colorScheme="green"
          variant="outline"
          isDisabled={!mayApprove || monthLocked || busy || selectedApprovable.length === 0}
          onClick={() => approve(selectedApprovable)}
        >
          Approve Selected ({selectedApprovable.length})
        </Button>
        <Button
          size="sm"
          colorScheme="green"
          isDisabled={!mayApprove || monthLocked || busy || readyIds.length === 0}
          onClick={() => approve([], { all: true })}
        >
          Approve All Ready ({readyIds.length})
        </Button>
      </Stack>

      {!mayApprove ? (
        <Text fontSize="xs" color="gray.600">
          You can calculate and review this month, but approving and locking it needs the Approve
          Payrun permission.
        </Text>
      ) : null}

      {loading ? (
        <Stack direction="row" align="center" spacing={2}>
          <Spinner size="sm" />
          <Text fontSize="sm" color="gray.600">
            Loading the calculated month…
          </Text>
        </Stack>
      ) : null}

      {denied ? (
        <Alert status="info" fontSize="sm">
          <AlertIcon />
          You do not have permission to view this payroll month&rsquo;s calculation.
        </Alert>
      ) : null}

      {/* A FAILED READ IS NOT AN EMPTY MONTH. "Nobody is waiting" and "we could
          not find out" are different things to tell a payroll clerk. */}
      {error ? (
        <Alert status="error" fontSize="sm">
          <AlertIcon />
          {error} This is a problem reading the month — it does not mean there is nothing to
          calculate.
        </Alert>
      ) : null}

      {loaded && rows.length === 0 ? (
        <Text fontSize="sm" color="gray.600">
          No initialized employees match this payroll month and these filters. Employees have to be
          initialized before their month can be calculated.
        </Text>
      ) : null}

      {loaded && rows.length > 0 ? (
        <Stack spacing={2}>
          {/* THE SELECTION BAR STICKS TO THE TOP ON A PHONE, for the reason
              the initialization screen's does: the cards are tall, and a bulk
              action you cannot see is one you perform by scrolling back up to
              find, every time. */}
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
              isChecked={isAllSelected(selectableIds, selectedIds)}
              isIndeterminate={selectedIds.length > 0 && !isAllSelected(selectableIds, selectedIds)}
              isDisabled={selectableIds.length === 0 || busy}
              onChange={() => setSelectedIds(nextSelectAll(selectableIds, selectedIds))}
              aria-label="Select all unlocked employees"
            >
              <Text fontSize="xs">Select all ({selectableIds.length})</Text>
            </Checkbox>
            <Text fontSize="xs" color="gray.600">
              {rows.length} employee{rows.length === 1 ? "" : "s"} shown
              {monthName ? ` for ${monthName} ${year}` : ""}.
            </Text>
            {selectedIds.length > 0 ? (
              <>
                <Text fontSize="xs" fontWeight="bold">
                  {selectedIds.length} selected
                </Text>
                <Button size="xs" variant="ghost" onClick={() => setSelectedIds([])} isDisabled={busy}>
                  Clear
                </Button>
              </>
            ) : null}
          </Stack>

          {/* THE TABLE ON A DESKTOP, STACKED CARDS ON A PHONE - one component
              decides, and both layouts get the same rows, the same permissions
              and the same actions. */}
          <CalculationEmployeeList
            rows={rows}
            selectedIds={selectedIds}
            onSelectChange={(employeeId, checked) =>
              setSelectedIds((prev) => toggleSelection(prev, employeeId, checked))
            }
            onRecalculate={(row, { first }) =>
              first ? calculate([row.employee_id]) : recalculate([row.employee_id])
            }
            onApprove={(ids) => approve(ids)}
            onOpen={openDetail}
            onPayTypeChange={changePayType}
            canCalculate={mayCalculate && !monthLocked}
            canApprove={mayApprove && !monthLocked}
            canChangePayType={mayChangePayType && !monthLocked}
            busyEmployeeId={busyEmployeeId}
            disabled={bulkBusy}
          />
        </Stack>
      ) : null}

      <CalculationBreakup
        isOpen={detailOpen}
        onClose={() => setDetailOpen(false)}
        employee={detail}
        loading={detailLoading}
        error={detailError}
      />
    </Stack>
  );
}

export default PayrunCalculation;
