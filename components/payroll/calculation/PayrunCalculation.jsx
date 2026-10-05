import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Box,
  Button,
  Checkbox,
  Input,
  Select,
  Spinner,
  Stack,
  Text,
  useToast,
} from "@chakra-ui/react";

import CalculationEmployeeList from "./CalculationEmployeeList";
import CalculationBreakup from "./CalculationBreakup";
import ResetCalculationModal from "./ResetCalculationModal";
import LifecycleActionModal from "./LifecycleActionModal";
import PayslipViewModal from "./PayslipViewModal";
import PfCeilingRevisionModal from "./PfCeilingRevisionModal";
import usePayrunCalculationMonth from "../../../customHooks/usePayrunCalculationMonth";
import PayrunCalculationHelper from "../../../helper/payrunCalculation";
import { describeApiResult, KIND } from "../../../util/salaryApiError";
import { changeMonthlyPayType } from "../../../util/payrunPayType";
import PayrunFilterCards from "../PayrunFilterCards";
import {
  ALL,
  CALCULATION_CARDS,
  CALCULATION_TABS,
  DEFAULT_TAB,
  tabFilters,
  tabCount,
  nextCard,
  filterCaption,
} from "../../../util/payrunTabs";
import {
  STATUS,
  approveMessage,
  eligibleWithin,
  hasRefusals,
  isAllSelected,
  isApprovable,
  isAttendanceProcessable,
  isCalculable,
  isNotificationPending,
  isNotificationRetryable,
  isPublishable,
  isUnlockable,
  isUnpublishable,
  lifecycleHasRefusals,
  lifecycleOutcomeMessage,
  lifecycleRefusalDetail,
  isRecalculable,
  isResettable,
  nextSelectAll,
  outcomeMessage,
  processHasRefusals,
  processOutcomeMessage,
  processRefusalDetail,
  pruneSelection,
  recalculateMessage,
  refusalDetail,
  resetHasRefusals,
  resetOutcomeMessage,
  resetRefusalDetail,
  retryHasRefusals,
  retryOutcomeMessage,
  retryRefusalDetail,
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
 * RESET CALCULATION sends an unapproved employee back to Not Calculated, for
 * one row or a selection, behind a dialog that names the month and asks why.
 * It is the calculate key's act, and it never reaches an approved employee.
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
  mayProcessAttendance = false,
  mayUnlock = false,
  mayPublish = false,
  search = "",
  departmentId = "",
  designationId = "",
  onFilterOptions = null,
  clearFiltersToken = 0,
}) {
  const toast = useToast();

  /*
   * THE SELECTED SUMMARY CARD - one filter at a time, All Employees by
   * default, exactly as Payrun Initialization. Every queue's size is on its
   * card, so opening on the whole month hides nothing; clicking the selected
   * card again goes back to All Employees.
   */
  const [tab, setTab] = useState(DEFAULT_TAB.CALCULATION);
  const selectCard = (key) => setTab((active) => nextCard(active, key));
  /* CLEAR FILTERS (on the page) also goes back to All Employees. */
  useEffect(() => {
    if (clearFiltersToken) setTab(ALL);
  }, [clearFiltersToken]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [busyEmployeeId, setBusyEmployeeId] = useState(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  /* Who the Reset Calculation dialog is open for: { mode, rows }, or null. */
  const [resetTarget, setResetTarget] = useState(null);

  /* Who the Unlock / Publish / Unpublish dialog is open for: { action, mode, rows }. */
  const [lifecycleTarget, setLifecycleTarget] = useState(null);
  /* The employee whose published payslip is open in View Payslip. */
  const [payslipTarget, setPayslipTarget] = useState(null);
  // EPFO 2026 wage ceiling revision: the read-only affected-employee report and ECR.
  const [pfRevisionOpen, setPfRevisionOpen] = useState(false);

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
      /* Department / Designation - this stage's own, chosen on the page. */
      department_id: departmentId,
      designation_id: designationId,
      ...tabFilters(CALCULATION_TABS, tab),
    }),
    [year, month, storeId, tab, search, departmentId, designationId]
  );

  const { rows, summary, filterOptions, monthLocked, loading, loaded, denied, error, refresh } =
    usePayrunCalculationMonth(filters, true);

  /* The page draws the Department / Designation dropdowns from this read. */
  useEffect(() => {
    if (onFilterOptions) onFilterOptions(filterOptions);
  }, [filterOptions, onFilterOptions]);

  /*
   * WHAT A SELECT-ALL IS SENT WITH: every filter the list was read with except
   * the month itself. The server resolves "all eligible" / "all ready" / "all
   * approved" INSIDE them, so a select-all can never reach an employee that a
   * location, department, designation, card or search had hidden.
   */
  const listScope = useMemo(
    () => Object.fromEntries(Object.entries(filters).filter(([key]) => key !== "year" && key !== "month")),
    [filters]
  );

  /* A selection never outlives the rows it was made on - most obviously the
     rows that were just approved and can no longer be acted on. */
  /* EVERY ROW IS SELECTABLE: a locked or published row is what Unlock,
     Publish and Unpublish act on. Each action narrows the selection to the
     rows it fits, and the server re-decides every one. */
  const selectableIds = useMemo(() => rows.map((row) => row.employee_id), [rows]);
  useEffect(() => {
    setSelectedIds((prev) => pruneSelection(prev, selectableIds));
  }, [selectableIds]);
  /* A NEW FILTER IS A NEW LIST: the selection made on the old one is cleared,
     never carried across, so a bulk action can only act on rows chosen from
     the list that is on screen now. */
  useEffect(() => {
    setSelectedIds([]);
  }, [filters]);

  const selectedRecalculable = eligibleWithin(rows, selectedIds, isRecalculable);
  const selectedApprovable = eligibleWithin(rows, selectedIds, isApprovable);
  const selectedResettable = eligibleWithin(rows, selectedIds, isResettable);
  const selectedProcessable = eligibleWithin(rows, selectedIds, isAttendanceProcessable);
  const selectedUnlockable = eligibleWithin(rows, selectedIds, isUnlockable);
  const selectedPublishable = eligibleWithin(rows, selectedIds, isPublishable);
  const selectedUnpublishable = eligibleWithin(rows, selectedIds, isUnpublishable);
  const selectedRetryable = eligibleWithin(rows, selectedIds, isNotificationRetryable);

  /*
   * NOTIFICATIONS ARE SENT IN THE BACKGROUND, after Publish has already
   * returned. While any row still shows Telegram Queued / Sending, the month
   * is re-read every few seconds (a bounded number of times) so the badges
   * settle without anybody pressing Refresh.
   */
  const pendingNotifications = rows.some(isNotificationPending);
  const [pendingPolls, setPendingPolls] = useState(0);
  useEffect(() => {
    if (!pendingNotifications) {
      if (pendingPolls !== 0) setPendingPolls(0);
      return undefined;
    }
    if (pendingPolls >= 12 || loading || bulkBusy) return undefined;
    const timer = setTimeout(() => {
      setPendingPolls((n) => n + 1);
      refresh();
    }, 5000);
    return () => clearTimeout(timer);
  }, [pendingNotifications, pendingPolls, loading, bulkBusy, refresh]);
  /*
   * THE SELECT-ALL COUNTS ARE THE LISTED ROWS THEY WOULD ACT ON. Each
   * select-all is sent with the list's filters (`listScope`) and the server
   * resolves it inside them, so the employees it can reach are exactly the
   * eligible rows on screen - counted here by the same predicates the row
   * buttons use, and re-decided by the server when the request lands.
   */
  const eligibleCount = rows.filter(isCalculable).length;
  const readyCount = rows.filter(isApprovable).length;
  const publishableCount = rows.filter(isPublishable).length;

  const busy = bulkBusy || busyEmployeeId !== null;
  /*
   * NO BULK ACTION WHILE THE LIST IS RE-READING. Between a filter changing
   * and its rows arriving, the rows on screen belong to the previous filters;
   * a bulk click in that window could act on a set nobody is looking at.
   */
  const bulkLocked = busy || loading;

  /**
   * EVERY ACTION GOES THROUGH ONE FUNCTION, so that a single row and a bulk
   * selection cannot end up reporting their outcomes differently - which is
   * how one of them ends up not mentioning that three employees were refused.
   */
  const run = async (
    call,
    {
      employeeId = null,
      confirmText = null,
      report = { message: outcomeMessage, refused: hasRefusals, detail: refusalDetail },
    }
  ) => {
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
      const refused = report.refused(result);
      toast({
        title: report.message(result),
        description: refused
          ? report.detail(result) ||
            "Some employees were not changed. Their reasons are shown on their rows."
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
          ...(all ? { all_eligible: true, filters: listScope } : { employee_ids: employeeIds }),
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

  const approve = (employeeIds, { all = false, mode = null } = {}) =>
    run(
      () =>
        PayrunCalculationHelper.approve({
          year,
          month,
          ...(all ? { all_ready: true, filters: listScope } : { employee_ids: employeeIds }),
          // A row's own button, or a selection / Approve All Ready.
          mode: mode || (all || employeeIds.length > 1 ? "BULK" : "INDIVIDUAL"),
        }),
      {
        employeeId: !all && employeeIds.length === 1 ? employeeIds[0] : null,
        confirmText: approveMessage(all ? readyCount : employeeIds.length),
      }
    );

  /**
   * RESET CALCULATION - one row's action or the selection's, through `run` so
   * both report their outcome the same way. The dialog IS the confirmation;
   * it names the month, the employee or the count, and requires a reason.
   *
   * ONLY THE IDS ARE SENT, AND THE SERVER RE-DECIDES EACH ONE: an employee
   * approved since this screen loaded comes back "skipped — payroll locked"
   * rather than reset.
   */
  /**
   * PROCESS ATTENDANCE - the attendance engine's own month persist, for the
   * employees whose blockers it can clear (a summary that no longer matches
   * its days, days never processed, an approved-OT total out of step). It
   * decides no request and changes no approval, salary or calculation; what
   * still blocks afterwards is reported by name.
   */
  const processAttendance = (employeeIds) =>
    run(() => PayrunCalculationHelper.processAttendance({ year, month, employee_ids: employeeIds }), {
      employeeId: employeeIds.length === 1 ? employeeIds[0] : null,
      confirmText:
        `Process attendance for ${employeeIds.length === 1 ? "this employee" : `these ${employeeIds.length} employees`}?\n\n` +
        "This re-runs the attendance calculation for the month from the punches, approvals and shifts " +
        "as they stand now - the same as Recalculate in Attendance. It does not approve or change any " +
        "request, salary or payroll figure.",
      report: {
        message: processOutcomeMessage,
        refused: processHasRefusals,
        detail: processRefusalDetail,
      },
    });

  /**
   * UNLOCK / PUBLISH / UNPUBLISH - one row or a selection, through `run`.
   * The dialog is the confirmation; the server decides each employee.
   */
  const LIFECYCLE_CALL = {
    UNLOCK: PayrunCalculationHelper.unlock,
    PUBLISH: PayrunCalculationHelper.publish,
    UNPUBLISH: PayrunCalculationHelper.unpublish,
  };
  const openLifecycle = (action, targetRows, mode) => setLifecycleTarget({ action, mode, rows: targetRows });
  const confirmLifecycle = async ({ reason, remark }) => {
    const target = lifecycleTarget;
    if (!target) return;
    const employeeIds = target.rows.map((row) => row.employee_id);
    await run(
      () =>
        LIFECYCLE_CALL[target.action]({ year, month, employee_ids: employeeIds, reason, remark, mode: target.mode }),
      {
        employeeId: target.mode === "INDIVIDUAL" ? employeeIds[0] : null,
        report: {
          message: lifecycleOutcomeMessage,
          refused: lifecycleHasRefusals,
          detail: lifecycleRefusalDetail,
        },
      }
    );
    setLifecycleTarget(null);
  };
  const rowsOf = (ids) => rows.filter((row) => ids.includes(row.employee_id));

  /**
   * PUBLISH ALL APPROVED PAYSLIPS - the month only; who is Approved & Locked
   * is decided by the server inside this viewer's branch scope.
   */
  const publishAll = () =>
    run(() => PayrunCalculationHelper.publishAll({ year, month, filters: listScope }), {
      confirmText:
        `Publish the payslips of the ${publishableCount} Approved & Locked employee${publishableCount === 1 ? "" : "s"} shown for ${monthName ? `${monthName} ${year}` : `${year}-${month}`}?\n\n` +
        "Each payslip is frozen from the approved figures and appears in the employee's Telegram Mini App. " +
        "Each employee is then sent a Telegram message, in the background, that their payslip is available " +
        "(no salary figures in the message). " +
        "Anyone whose salary or attendance changed since approval is refused.",
      report: {
        message: lifecycleOutcomeMessage,
        refused: lifecycleHasRefusals,
        detail: lifecycleRefusalDetail,
      },
    });

  /**
   * RETRY NOTIFICATION - the "payslip available" message again, for published
   * payslips whose employee was not reached. Never republishes.
   */
  const retryNotification = (employeeIds) =>
    run(() => PayrunCalculationHelper.retryNotification({ year, month, employee_ids: employeeIds }), {
      employeeId: employeeIds.length === 1 ? employeeIds[0] : null,
      report: { message: retryOutcomeMessage, refused: retryHasRefusals, detail: retryRefusalDetail },
    });

  const monthLabel = monthName ? `${monthName} ${year}` : `${year}-${String(month).padStart(2, "0")}`;
  const openReset = (targetRows, mode) => setResetTarget({ mode, rows: targetRows });
  const confirmReset = async ({ reason, remark }) => {
    const target = resetTarget;
    if (!target) return;
    const employeeIds = target.rows.map((row) => row.employee_id);
    await run(
      () =>
        PayrunCalculationHelper.reset({
          year,
          month,
          employee_ids: employeeIds,
          reason,
          remark,
          mode: target.mode,
        }),
      {
        employeeId: target.mode === "INDIVIDUAL" ? employeeIds[0] : null,
        report: {
          message: resetOutcomeMessage,
          refused: resetHasRefusals,
          detail: resetRefusalDetail,
        },
      }
    );
    setResetTarget(null);
  };

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

  /*
   * THE SUMMARY CARDS ARE THE FILTERS. Each count is the server's
   * `summary.cards`, decided by the same rule as the card's filter and taken
   * over everybody the location, department, designation and search select -
   * the same population the rows and the select-all counts come from.
   *
   * CALCULATED = Calculated, Not Ready + Ready for Approval. The difference is
   * its own card, and every row in it carries the approval blockers.
   */
  const cardCount = (key) => tabCount("CALCULATION", key, summary);

  return (
    <Stack spacing={4}>
      <PayrunFilterCards
        title="Payroll progress"
        cards={CALCULATION_CARDS}
        active={tab}
        counts={cardCount}
        onSelect={selectCard}
        columns={{ base: 2, md: 3, lg: 9 }}
      />
      <Text fontSize="xs" color="gray.600">
        Calculated = Calculated, Not Ready + Ready for Approval. Not Calculated includes employees on
        statutory hold. Attendance Needs Action can overlap other cards. Counts follow the location,
        department, designation and search; the selected card narrows the list only.
      </Text>

      {monthLocked ? (
        <Alert status="warning" fontSize="sm">
          <AlertIcon />
          This payroll month is locked. Nothing in it can be calculated or changed.
        </Alert>
      ) : null}

      {/* WHAT THE TABLE IS SHOWING, IN WORDS, and the way back to everybody. */}
      <Stack direction="row" align="center" spacing={3} flexWrap="wrap">
        {loaded ? (
          <Text fontSize="sm" fontWeight="600" aria-live="polite" data-testid="filter-caption">
            {filterCaption({ shown: rows.length, active: tab, search, cards: CALCULATION_CARDS })}
          </Text>
        ) : null}
        {tab !== ALL ? (
          <Button size="xs" variant="link" colorScheme="purple" onClick={() => setTab(ALL)}>
            Show all employees
          </Button>
        ) : null}
        <Box flex="1" />
        <Button size="sm" variant="outline" onClick={refresh} isDisabled={loading} flexShrink={0}>
          Refresh
        </Button>
        <Button size="sm" variant="outline" onClick={() => setPfRevisionOpen(true)} flexShrink={0}>
          PF ceiling 2026 / ECR
        </Button>
      </Stack>

      {/*
        THE FOUR ACTIONS THE STAGE HAS, and each says how many rows it would
        touch. A bulk button whose count is zero is disabled rather than hidden,
        so the screen reads the same whether or not there is work to do.

        "CALCULATE ALL ELIGIBLE" AND "APPROVE ALL READY" SEND NO LIST. Who is
        eligible and who is ready is re-decided by the server at the moment of
        the request; sending the ids this screen believes qualify would act on
        a month that may be minutes old. They send the LIST'S FILTERS instead,
        so they act only inside what is listed - and say how many that is.
      */}
      <Stack direction="row" spacing={2} flexWrap="wrap">
        <Button
          size="sm"
          colorScheme="purple"
          isDisabled={!mayCalculate || monthLocked || bulkLocked || eligibleCount === 0}
          isLoading={bulkBusy}
          onClick={() => calculate([], { all: true })}
        >
          Calculate All Eligible ({eligibleCount})
        </Button>
        <Button
          size="sm"
          colorScheme="orange"
          variant="outline"
          isDisabled={!mayCalculate || monthLocked || bulkLocked || selectedRecalculable.length === 0}
          onClick={() => recalculate(selectedRecalculable)}
        >
          Recalculate Selected ({selectedRecalculable.length})
        </Button>
        <Button
          size="sm"
          colorScheme="green"
          variant="outline"
          isDisabled={!mayApprove || monthLocked || bulkLocked || selectedApprovable.length === 0}
          onClick={() => approve(selectedApprovable, { mode: "BULK" })}
        >
          Approve Selected ({selectedApprovable.length})
        </Button>
        <Button
          size="sm"
          colorScheme="green"
          isDisabled={!mayApprove || monthLocked || bulkLocked || readyCount === 0}
          onClick={() => approve([], { all: true })}
        >
          Approve All Ready ({readyCount})
        </Button>
        {/* PUBLISH ALL APPROVED PAYSLIPS sends no list either: the server
            publishes whoever is Approved & Locked when the request lands. */}
        {mayPublish ? (
          <Button
            size="sm"
            colorScheme="blue"
            isDisabled={monthLocked || bulkLocked || publishableCount === 0}
            onClick={publishAll}
          >
            Publish All Approved Payslips ({publishableCount})
          </Button>
        ) : null}
        {/* THE LIFECYCLE ACTIONS, shown once rows are selected and each
            counting only the selected rows it fits. */}
        {selectedIds.length > 0 && mayUnlock ? (
          <Button
            size="sm"
            colorScheme="orange"
            variant="outline"
            isDisabled={monthLocked || bulkLocked || selectedUnlockable.length === 0}
            onClick={() => openLifecycle("UNLOCK", rowsOf(selectedUnlockable), "BULK")}
          >
            Unlock Selected ({selectedUnlockable.length})
          </Button>
        ) : null}
        {selectedIds.length > 0 && mayPublish ? (
          <>
            <Button
              size="sm"
              colorScheme="blue"
              isDisabled={monthLocked || bulkLocked || selectedPublishable.length === 0}
              onClick={() => openLifecycle("PUBLISH", rowsOf(selectedPublishable), "BULK")}
            >
              Publish Payslips Selected ({selectedPublishable.length})
            </Button>
            <Button
              size="sm"
              colorScheme="blue"
              variant="outline"
              isDisabled={monthLocked || bulkLocked || selectedUnpublishable.length === 0}
              onClick={() => openLifecycle("UNPUBLISH", rowsOf(selectedUnpublishable), "BULK")}
            >
              Unpublish Payslips Selected ({selectedUnpublishable.length})
            </Button>
            <Button
              size="sm"
              colorScheme="teal"
              variant="outline"
              isDisabled={bulkLocked || selectedRetryable.length === 0}
              onClick={() => retryNotification(selectedRetryable)}
            >
              Retry Notification Selected ({selectedRetryable.length})
            </Button>
          </>
        ) : null}
        {selectedIds.length > 0 && mayProcessAttendance ? (
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            isDisabled={monthLocked || bulkLocked || selectedProcessable.length === 0}
            onClick={() => processAttendance(selectedProcessable)}
          >
            Process Attendance ({selectedProcessable.length})
          </Button>
        ) : null}
        {/* Shown once rows are selected. It counts only the selected rows that
            HAVE a calculation to reset; the server re-decides each of them. */}
        {selectedIds.length > 0 ? (
          <Button
            size="sm"
            colorScheme="red"
            variant="outline"
            isDisabled={!mayCalculate || monthLocked || bulkLocked || selectedResettable.length === 0}
            onClick={() =>
              openReset(
                rows.filter((row) => selectedResettable.includes(row.employee_id)),
                "BULK"
              )
            }
          >
            Reset Selected ({selectedResettable.length})
          </Button>
        ) : null}
      </Stack>

      {/* THE ELIGIBLE COUNT IS TRUTHFUL: it is what Calculate will accept. The
          rest are said out loud, with their reasons on their rows. */}
      {summary.not_calculated_blocked > 0 ? (
        <Text fontSize="xs" color="orange.700">
          {summary.not_calculated_blocked} not-calculated employee
          {summary.not_calculated_blocked === 1 ? " is" : "s are"} not eligible yet — the reason is shown
          on each row
          {summary.attendance_processable > 0
            ? `; ${summary.attendance_processable} can be cleared with Process Attendance`
            : ""}
          .
        </Text>
      ) : null}

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
              aria-label="Select all employees shown"
            >
              {/* THE ROWS SHOWN - this card and search - and nothing else.
                  Each bulk button then counts only the selected rows it fits,
                  and the server re-decides every one. */}
              <Text fontSize="xs">Select all shown ({selectableIds.length})</Text>
            </Checkbox>
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
            onReset={(row) => openReset([row], "INDIVIDUAL")}
            onLifecycle={(action, row) => openLifecycle(action, [row], "INDIVIDUAL")}
            canUnlock={mayUnlock && !monthLocked}
            canPublish={mayPublish && !monthLocked}
            onRetryNotification={(row) => retryNotification([row.employee_id])}
            onViewPayslip={(row) => setPayslipTarget(row)}
            onProcessAttendance={(row) => processAttendance([row.employee_id])}
            canProcessAttendance={mayProcessAttendance && !monthLocked}
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

      <LifecycleActionModal
        isOpen={lifecycleTarget !== null}
        onClose={() => setLifecycleTarget(null)}
        onConfirm={confirmLifecycle}
        target={lifecycleTarget}
        monthLabel={monthLabel}
        busy={busy}
      />

      <PfCeilingRevisionModal
        isOpen={pfRevisionOpen}
        onClose={() => setPfRevisionOpen(false)}
        year={year}
        month={month}
      />

      <PayslipViewModal
        isOpen={payslipTarget !== null}
        onClose={() => setPayslipTarget(null)}
        target={payslipTarget}
        year={year}
        month={month}
      />

      <ResetCalculationModal
        isOpen={resetTarget !== null}
        onClose={() => setResetTarget(null)}
        onConfirm={confirmReset}
        target={resetTarget}
        monthLabel={monthLabel}
        busy={busy}
      />

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
