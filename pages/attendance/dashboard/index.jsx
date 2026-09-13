import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, Box, Button, Flex, SimpleGrid, Spinner, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import DashboardFilters from "../../../components/attendance/dashboard/DashboardFilters";
import DashboardCards from "../../../components/attendance/dashboard/DashboardCards";
import StaffingCards from "../../../components/attendance/dashboard/StaffingCards";
import CoveragePanel from "../../../components/attendance/dashboard/CoveragePanel";
import NextHourPanel from "../../../components/attendance/dashboard/NextHourPanel";
import GapDetailPanel from "../../../components/attendance/dashboard/GapDetailPanel";
import CrossLocationPanel from "../../../components/attendance/dashboard/CrossLocationPanel";
import RecurringGapsPanel from "../../../components/attendance/dashboard/RecurringGapsPanel";
import AttendanceOverviewPanel from "../../../components/attendance/dashboard/AttendanceOverviewPanel";
import LocationPanel from "../../../components/attendance/dashboard/LocationPanel";
import ShiftPanel from "../../../components/attendance/dashboard/ShiftPanel";
import TrendPanel from "../../../components/attendance/dashboard/TrendPanel";
import AttentionPanel from "../../../components/attendance/dashboard/AttentionPanel";
import RecentPunchesPanel from "../../../components/attendance/dashboard/RecentPunchesPanel";
import DrilldownModal from "../../../components/attendance/dashboard/DrilldownModal";
import StaffingListModal from "../../../components/attendance/dashboard/StaffingListModal";
import usePermissions from "../../../customHooks/usePermissions";
import AttendanceDashboardHelper from "../../../helper/attendanceDashboard";
import {
  DELIVERY_STANDING_NOTE,
  apiMessage,
  displayDate,
  employeeDayHref,
  isForbidden,
  isOk,
  istToday,
} from "../../../util/attendanceDashboard";

/**
 * The Attendance & Staffing Dashboard.
 *
 * TWO VIEWS, AND THEY ANSWER DIFFERENT QUESTIONS.
 *
 *   NOW        "how many should be on duty, how many are recorded IN, where
 *              are the gaps, and what changes in the next hour" - the
 *              operational default, built on a server-issued `as_of`.
 *   HISTORICAL the existing dated view of one attendance date, unchanged.
 *
 * They are deliberately separate tabs rather than one screen with a date
 * picker, because a past date's figures under a "Now" heading is the single
 * most misleading thing this dashboard could show. "Recorded IN as of now" and
 * "checked in at some point that day" are different metrics and neither
 * borrows the other's wording.
 *
 * AN ADDITIONAL OVERVIEW, NOT A REPLACEMENT. The per-employee monthly screen
 * at `/attendance/calculated` is untouched and remains where a day is
 * examined, corrected and approved. This screen LINKS there; it holds no
 * approve, reject, regularize, edit or recalculate control of any kind, and
 * the API behind it has no route that could perform one.
 *
 * BEHIND `view_attendance_dashboard`, on the page AND on every request it
 * makes. `GlobalWrapper` hides the page, which is presentation; the backend
 * requires the same key again on all five endpoints, which is what actually
 * stops a request.
 *
 * THE LAYOUT, as approved: a compact filter bar, six differently coloured
 * summary cards across the top, then white panels in a three-column desktop
 * grid. On a phone the cards go two across and the panels stack - the same
 * screen reflowed, never a shrunken desktop layout.
 *
 * EVERY FIGURE IS THE SERVER'S. Nothing on this page counts, re-derives or
 * recalculates attendance in the browser: the attendance engine is the source
 * of truth and the dashboard renders what it said. Switching a filter refetches
 * rather than recomputing locally, so what is on screen always came from one
 * definition of "present".
 *
 * MANUAL REFRESH, WITH THE FETCH TIME SHOWN. There is no polling and no
 * streaming, and nothing here claims real-time attendance - punches arrive in
 * bursts from the terminals, so "live" would be a promise the data cannot
 * keep. The label says when the page fetched, and it is explicitly not a
 * device sync time; terminal freshness has its own panel.
 *
 * LOADING, EMPTY, PARTIAL, ERROR AND PERMISSION-DENIED ARE ALL DISTINCT
 * STATES. In particular a failed request NEVER renders as zero: an error is an
 * error, because "0 absent" and "we could not ask" must never look the same.
 */
export default function AttendanceDashboardPage() {
  const router = useRouter();
  const canApprovals = usePermissions(["view_attendance_approvals"]);
  // `{ all: true }` and NOT the default, which is ANY: the Employee Shift
  // Assignment screen's own read endpoint requires BOTH keys because it joins
  // the employee master to the shift master. Defaulting to ANY would offer the
  // link to somebody holding only `view_employees` and hand them a button that
  // 403s the moment they press it.
  const canShiftAssign = usePermissions(["view_employees", "view_shift_assignments"], {
    all: true,
  });
  const canWorkShifts = usePermissions(["view_work_shifts"]);

  const [filters, setFilters] = useState({
    attendance_date: istToday(),
    store_id: null,
    work_shift_id: null,
    designation_id: null,
    search: null,
  });
  const [options, setOptions] = useState({ outlets: [], designations: [], shifts: [], today: null });
  /**
   * Has the user chosen a date themselves yet?
   *
   * The date starts at the browser's idea of today in IST so the page is
   * useful on the first paint, but the SERVER's IST today is the authoritative
   * business date - it is the clock every stored attendance figure was written
   * against. So when the filter options arrive, the server's date replaces the
   * browser's UNLESS the user has already picked one, in which case their
   * choice obviously wins. Without this flag the server's answer could never
   * apply (the field is never empty) and a browser with a wrong clock would
   * quietly ask for the wrong day.
   */
  const dateChosen = useRef(false);
  const [view, setView] = useState("NOW");
  const [staffing, setStaffing] = useState(null);
  const [staffingError, setStaffingError] = useState(null);
  const [staffingLoading, setStaffingLoading] = useState(true);
  const [staffingList, setStaffingList] = useState(null);
  const [recurring, setRecurring] = useState(null);
  const [recurringLoading, setRecurringLoading] = useState(false);
  const [recurringError, setRecurringError] = useState(null);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState(null);
  const [trendDays, setTrendDays] = useState(14);
  const [punches, setPunches] = useState(null);

  const [loading, setLoading] = useState(true);
  const [trendLoading, setTrendLoading] = useState(false);
  const [error, setError] = useState(null);
  const [trendError, setTrendError] = useState(null);
  const [punchesError, setPunchesError] = useState(null);
  const [filtersError, setFiltersError] = useState(null);
  const [forbidden, setForbidden] = useState(null);

  /**
   * STALE RESPONSES MUST NOT OVERWRITE NEWER ONES.
   *
   * Changing a filter fires a request and leaves the previous one in flight.
   * They can come back in either order, and without a guard a slow response
   * for LAST WEEK can land after a fast one for today and repaint the screen
   * with figures that do not match the filter bar - the worst kind of wrong,
   * because everything looks fine. Each load takes a ticket; only the newest
   * ticket may write state.
   */
  const staffingSeq = useRef(0);
  const overviewSeq = useRef(0);
  const trendSeq = useRef(0);
  const drilldownSeq = useRef(0);

  /**
   * The open drilldown: `{ bucket, offset, overrides }`.
   *
   * `overrides` lets a PANEL row scope its own drilldown - one outlet, one
   * shift - WITHOUT rewriting the page's filter bar. Clicking a row in a table
   * to read it should not silently re-filter every other panel on the screen;
   * that is a side effect nobody asked for and it loses the comparison the row
   * was being read against. The overrides apply to this one request only.
   */
  const [drilldown, setDrilldown] = useState(null);
  const [drilldownResult, setDrilldownResult] = useState(null);
  const [drilldownLoading, setDrilldownLoading] = useState(false);
  const [drilldownError, setDrilldownError] = useState(null);

  /**
   * The filters as the API takes them. `store_id` is a single selection in the
   * UI and a LIST on the wire, because the endpoint accepts several and the
   * server intersects the list with the caller's own scope.
   */
  const apiFilters = useMemo(
    () => ({
      attendance_date: filters.attendance_date,
      store_ids: filters.store_id ? [Number(filters.store_id)] : null,
      designation_id: filters.designation_id ? Number(filters.designation_id) : null,
      work_shift_id: filters.work_shift_id ? Number(filters.work_shift_id) : null,
      search: filters.search || null,
    }),
    [filters]
  );

  /** The filter options, once. A refusal here means the whole screen is refused. */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await AttendanceDashboardHelper.getFilters();
        if (cancelled) return;
        if (isForbidden(res)) {
          setForbidden(true);
          return;
        }
        if (isOk(res)) {
          setOptions({
            outlets: res.outlets || [],
            designations: res.designations || [],
            shifts: res.shifts || [],
            today: res.today || null,
          });
          // The server's own IST today, so the default date is the business
          // day rather than the browser's idea of it.
          if (res.today) {
            // A REF, not state: this effect runs once on mount, so a state
            // value read here would be the mount-time closure for ever. The
            // ref reads the CURRENT answer, which matters if the filters
            // request is slow enough for somebody to pick a date first.
            setFilters((f) => (dateChosen.current ? f : { ...f, attendance_date: res.today }));
          }
        }
        if (!isOk(res)) {
          setFiltersError(
            apiMessage(res, "The filter options could not be loaded; the selectors may be empty")
          );
        }
      } catch (err) {
        if (!cancelled) {
          setFiltersError("The filter options could not be loaded; the selectors may be empty.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * THE OPERATIONAL SNAPSHOT. No date is sent: the server decides what "now"
   * is and returns the `as_of` shown on screen.
   */
  const loadStaffing = useCallback(async () => {
    const ticket = ++staffingSeq.current;
    const isCurrent = () => ticket === staffingSeq.current;
    setStaffingLoading(true);
    setStaffingError(null);
    try {
      const res = await AttendanceDashboardHelper.getStaffing({
        store_ids: apiFilters.store_ids,
        designation_id: apiFilters.designation_id,
        work_shift_id: apiFilters.work_shift_id,
        search: apiFilters.search,
      });
      if (!isCurrent()) return;
      if (isForbidden(res)) {
        setForbidden(apiMessage(res, "You do not have permission to view this dashboard."));
        setStaffing(null);
        return;
      }
      if (!isOk(res)) {
        setStaffing(null);
        setStaffingError(apiMessage(res, "The staffing snapshot could not be loaded"));
        return;
      }
      setStaffing(res);
    } catch (err) {
      if (!isCurrent()) return;
      setStaffing(null);
      setStaffingError("Could not reach the server. Please try again.");
    } finally {
      if (isCurrent()) setStaffingLoading(false);
    }
  }, [apiFilters]);

  const loadRecurring = useCallback(async () => {
    setRecurringLoading(true);
    setRecurringError(null);
    try {
      const res = await AttendanceDashboardHelper.getRecurringGaps({
        store_ids: apiFilters.store_ids,
        designation_id: apiFilters.designation_id,
        search: apiFilters.search,
      });
      if (isOk(res)) setRecurring(res);
      else {
        setRecurring(null);
        setRecurringError(apiMessage(res, "The pattern analysis could not be loaded"));
      }
    } catch (err) {
      setRecurring(null);
      setRecurringError("The pattern analysis could not be loaded.");
    } finally {
      setRecurringLoading(false);
    }
  }, [apiFilters]);

  const loadOverview = useCallback(async () => {
    if (!filters.attendance_date) return;
    const ticket = ++overviewSeq.current;
    const isCurrent = () => ticket === overviewSeq.current;

    setLoading(true);
    setError(null);
    setPunchesError(null);
    try {
      // THE PUNCH FEED TAKES THE SAME FILTERS, the selected date included, so
      // it describes the same day and the same people as the cards above it.
      const [ov, rp] = await Promise.all([
        AttendanceDashboardHelper.getOverview(apiFilters),
        AttendanceDashboardHelper.getRecentPunches({ ...apiFilters, limit: 25 }),
      ]);
      if (!isCurrent()) return;

      if (isForbidden(ov)) {
        setForbidden(apiMessage(ov, "You do not have permission to view the Attendance Dashboard."));
        setOverview(null);
        return;
      }
      if (!isOk(ov)) {
        // A FAILED REQUEST IS NOT ZERO EMPLOYEES. The panels are cleared and
        // the error is shown, so nobody reads "no absences" off a request that
        // never succeeded.
        setOverview(null);
        setError(apiMessage(ov, "The dashboard could not be loaded"));
        return;
      }
      setOverview(ov);

      if (isOk(rp)) {
        setPunches(rp);
      } else {
        setPunches(null);
        setPunchesError(apiMessage(rp, "The punch feed could not be loaded"));
      }
    } catch (err) {
      if (!isCurrent()) return;
      setOverview(null);
      setPunches(null);
      setError("Could not reach the server. Please try again.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [apiFilters, filters.attendance_date]);

  const loadTrend = useCallback(async () => {
    if (!filters.attendance_date) return;
    const ticket = ++trendSeq.current;
    const isCurrent = () => ticket === trendSeq.current;

    setTrendLoading(true);
    setTrendError(null);
    try {
      // The employee search goes with it: the chart must describe the same
      // population as the cards.
      const res = await AttendanceDashboardHelper.getTrend({ ...apiFilters, days: trendDays });
      if (!isCurrent()) return;
      if (isOk(res)) {
        setTrend(res);
      } else {
        setTrend(null);
        setTrendError(apiMessage(res, "The trend could not be loaded"));
      }
    } catch (err) {
      if (!isCurrent()) return;
      setTrend(null);
      setTrendError("The trend could not be loaded. Please try again.");
    } finally {
      if (isCurrent()) setTrendLoading(false);
    }
  }, [apiFilters, trendDays, filters.attendance_date]);

  useEffect(() => {
    if (view === "NOW") loadStaffing();
  }, [view, loadStaffing]);

  useEffect(() => {
    if (view === "HISTORY") loadOverview();
  }, [view, loadOverview]);

  useEffect(() => {
    if (view === "HISTORY") loadTrend();
  }, [view, loadTrend]);

  /* ------------------------------------------------------- drilldown */

  const openBucket = (bucket, overrides = null) => {
    setDrilldown({ bucket, offset: 0, overrides });
  };

  /**
   * The NOW view's lists come from the snapshot itself, not from the dated
   * drilldown endpoint - they are as-of figures and the dated endpoint would
   * answer a different question. Each opens the matching employee list in a
   * modal built from the snapshot rows already in hand.
   */
  const openStaffingBucket = (bucket) => {
    if (!staffing) return;
    const all = staffing.expected_detail || [];
    if (bucket === "EXPECTED") {
      setStaffingList({ title: "Expected now", rows: all });
    } else if (bucket === "COVERED") {
      setStaffingList({
        title: "Recorded IN at the expected location",
        rows: all.filter((r) => r.gap_class === "COVERED"),
      });
    } else {
      setStaffingList({ title: "Gaps to check", rows: staffing.gap_detail || [] });
    }
  };

  const openCoverageRow = (row) => {
    if (!staffing) return;
    setStaffingList({
      title: `${row.outlet_name} — ${row.designation_name}`,
      rows: (staffing.expected_detail || []).filter(
        (g) =>
          String(g.store_id) === String(row.store_id) &&
          String(g.designation_id) === String(row.designation_id)
      ),
      summary: row,
    });
  };

  const openEmployeeNow = (row) => {
    const href = employeeDayHref(row.employee_id, row.attendance_date || staffing.business_date);
    if (href) router.push(href);
  };

  useEffect(() => {
    if (!drilldown) {
      setDrilldownResult(null);
      setDrilldownError(null);
      return;
    }
    let cancelled = false;
    const ticket = ++drilldownSeq.current;
    (async () => {
      setDrilldownLoading(true);
      setDrilldownError(null);
      try {
        const res = await AttendanceDashboardHelper.getDrilldown({
          ...apiFilters,
          ...(drilldown.overrides || {}),
          bucket: drilldown.bucket,
          limit: 50,
          offset: drilldown.offset,
        });
        if (cancelled || ticket !== drilldownSeq.current) return;
        if (!isOk(res)) {
          setDrilldownResult(null);
          setDrilldownError(apiMessage(res, "The list could not be loaded"));
          return;
        }
        setDrilldownResult(res);
      } catch (err) {
        if (!cancelled) setDrilldownError("Could not reach the server. Please try again.");
      } finally {
        if (!cancelled) setDrilldownLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [drilldown, apiFilters]);

  /** Into the EXISTING monthly screen, at this employee and this date. */
  const openEmployee = (row) => {
    const href = employeeDayHref(row.employee_id, filters.attendance_date);
    if (href) router.push(href);
  };

  const canFor = (permission) => {
    const keys = Array.isArray(permission) ? permission : [permission];
    if (keys.includes("view_attendance_approvals")) return canApprovals;
    if (keys.includes("view_shift_assignments")) return canShiftAssign;
    if (keys.includes("view_work_shifts")) return canWorkShifts;
    return false;
  };

  /* ---------------------------------------------------------- render */

  /**
   * A REFUSAL EXPLAINS ITSELF.
   *
   * There are two different refusals behind this screen and they need
   * different answers from whoever reads it: not holding the dashboard
   * permission, and holding it but having no branch authorization. The server
   * says which in its message, so it is shown rather than replaced with a
   * generic line that would send somebody to ask the wrong question.
   */
  if (forbidden) {
    return (
      <GlobalWrapper title="Attendance Dashboard" permissionKey={["view_attendance_dashboard"]}>
        <CustomContainer title="Attendance Dashboard" filledHeader>
          <Alert status="warning" fontSize="sm" borderRadius="md">
            <AlertIcon />
            {forbidden}
          </Alert>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const isOpenDay = !!(overview && overview.is_open_day);
  const isNow = view === "NOW";

  return (
    <GlobalWrapper title="Attendance & Staffing Dashboard" permissionKey={["view_attendance_dashboard"]}>
      <Box bg="#F7F8FB" minH="100%" pb={4}>
        <CustomContainer
          title="Attendance & Staffing Dashboard"
          filledHeader
          rightSection={
            <Flex gap={1}>
              {[
                { key: "NOW", label: "Now" },
                { key: "HISTORY", label: "By date" },
              ].map((tab) => (
                <Button
                  key={tab.key}
                  size="xs"
                  variant={view === tab.key ? "solid" : "outline"}
                  colorScheme="purple"
                  onClick={() => setView(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </Flex>
          }
        >
          <Flex direction="column" gap={3}>
            <DashboardFilters
              filters={filters}
              options={options}
              onChange={(next) => {
                if (next.attendance_date !== filters.attendance_date) dateChosen.current = true;
                setFilters(next);
              }}
              onRefresh={() => {
                if (isNow) loadStaffing();
                else {
                  loadOverview();
                  loadTrend();
                }
              }}
              loading={isNow ? staffingLoading : loading}
              fetchedAt={isNow ? null : overview ? overview.fetched_at : null}
              hideDate={isNow}
            />

            {filtersError ? (
              <Alert status="warning" fontSize="xs" borderRadius="md" py={2}>
                <AlertIcon boxSize="14px" />
                {filtersError}
              </Alert>
            ) : null}

            {/* ============================================= NOW ==== */}
            {isNow ? (
              <>
                {staffingError ? (
                  <Alert status="error" fontSize="sm" borderRadius="md">
                    <AlertIcon />
                    {staffingError}
                  </Alert>
                ) : null}

                {staffingLoading && !staffing ? (
                  <Flex minH="220px" align="center" justify="center">
                    <Spinner size="lg" color="purple.500" thickness="3px" />
                  </Flex>
                ) : !staffing ? null : (
                  <>
                    <Flex align="baseline" gap={2} wrap="wrap">
                      <Text fontSize="xs" color="gray.600">
                        As of <strong>{staffing.as_of}</strong> ({displayDate(staffing.business_date)})
                      </Text>
                      <Text fontSize="10px" color="gray.500">
                        · manual refresh · not a live stream
                      </Text>
                    </Flex>

                    <StaffingCards snapshot={staffing} onOpen={openStaffingBucket} />

                    {staffing.reconciles === false ? (
                      <Alert status="error" fontSize="xs" borderRadius="md" py={2}>
                        <AlertIcon boxSize="14px" />
                        The gap breakdown does not add up to the expected headcount. Please report
                        this.
                      </Alert>
                    ) : null}

                    {staffing.unknown_expectation && staffing.unknown_expectation.length > 0 ? (
                      <Alert status="warning" fontSize="xs" borderRadius="md" py={2}>
                        <AlertIcon boxSize="14px" />
                        Expected coverage unknown for {staffing.unknown_expectation.length}{" "}
                        {staffing.unknown_expectation.length === 1 ? "employee" : "employees"} —
                        shift setup required. They are not counted in Expected Now.
                      </Alert>
                    ) : null}

                    <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={3}>
                      <CoveragePanel rows={staffing.coverage} onOpen={openCoverageRow} />
                      <GapDetailPanel rows={staffing.gap_detail} onOpenEmployee={openEmployeeNow} />
                      <NextHourPanel nextHour={staffing.next_hour} />
                    </SimpleGrid>

                    <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={3}>
                      <CrossLocationPanel
                        arrivals={staffing.additional && staffing.additional.cross_location_arrivals}
                        additional={staffing.additional}
                      />
                      <RecurringGapsPanel
                        data={recurring}
                        loading={recurringLoading}
                        error={recurringError}
                        onLoad={loadRecurring}
                      />
                    </SimpleGrid>

                    <Text fontSize="10px" color="gray.500">
                      {DELIVERY_STANDING_NOTE} Recorded IN means a punch opened a session — not
                      that somebody is at a counter or not on a break. Opening this page changes no
                      attendance or payroll record.
                    </Text>
                  </>
                )}
              </>
            ) : (
              /* ========================================= BY DATE ==== */
              <>
                {error ? (
                  <Alert status="error" fontSize="sm" borderRadius="md">
                    <AlertIcon />
                    {error}
                  </Alert>
                ) : null}

                {overview && isOpenDay ? (
                  <Alert status="info" fontSize="xs" borderRadius="md" py={2}>
                    <AlertIcon boxSize="14px" />
                    {overview.day_state_note}
                  </Alert>
                ) : null}

                {loading && !overview ? (
                  <Flex minH="220px" align="center" justify="center">
                    <Spinner size="lg" color="purple.500" thickness="3px" />
                  </Flex>
                ) : !overview ? (
                  !error ? (
                    <Text fontSize="sm" color="gray.600" py={6} textAlign="center">
                      Choose an attendance date to see the overview.
                    </Text>
                  ) : null
                ) : (
                  <>
                    <DashboardCards
                      cards={overview.cards}
                      isOpenDay={isOpenDay}
                      onOpenBucket={openBucket}
                    />

                    <SimpleGrid columns={{ base: 1, lg: 2, xl: 3 }} spacing={3}>
                      <AttendanceOverviewPanel
                        overview={overview.overview}
                        isOpenDay={isOpenDay}
                        onOpenSlice={openBucket}
                      />
                      <LocationPanel
                        rows={overview.by_location}
                        isOpenDay={isOpenDay}
                        onOpenLocation={(row) =>
                          openBucket(
                            "TOTAL",
                            row.store_id === null
                              ? { store_unassigned: true }
                              : { store_ids: [row.store_id] }
                          )
                        }
                      />
                      <ShiftPanel
                        rows={overview.by_shift}
                        total={overview.cards.total_employees.count}
                        isOpenDay={isOpenDay}
                        onOpenShift={(row) =>
                          row.setup_gap
                            ? openBucket(
                                row.issue_key || "SHIFT_SETUP",
                                row.work_shift_id === null
                                  ? null
                                  : { work_shift_id: row.work_shift_id }
                              )
                            : openBucket(
                                "TOTAL",
                                row.work_shift_id === null
                                  ? null
                                  : { work_shift_id: row.work_shift_id }
                              )
                        }
                      />
                      <TrendPanel
                        trend={trend}
                        error={trendError}
                        days={trendDays}
                        onDaysChange={setTrendDays}
                        loading={trendLoading}
                      />
                      <AttentionPanel
                        issues={overview.attention}
                        canFor={canFor}
                        onOpenIssue={openBucket}
                        onNavigate={(href) => router.push(href)}
                      />
                      <RecentPunchesPanel
                        data={punches}
                        error={punchesError}
                        onOpenEmployee={openEmployee}
                      />
                    </SimpleGrid>

                    <Text fontSize="10px" color="gray.500">
                      Figures come from the attendance engine, the same calculation the
                      employee&rsquo;s own attendance screen shows. {DELIVERY_STANDING_NOTE}
                    </Text>
                  </>
                )}
              </>
            )}
          </Flex>
        </CustomContainer>
      </Box>

      <StaffingListModal
        list={staffingList}
        asOf={staffing ? staffing.as_of : ""}
        isOpen={!!staffingList}
        onClose={() => setStaffingList(null)}
        onOpenEmployee={openEmployeeNow}
      />

      <DrilldownModal
        isOpen={!!drilldown}
        onClose={() => setDrilldown(null)}
        bucket={drilldown ? drilldown.bucket : null}
        attendanceDate={filters.attendance_date}
        result={drilldownResult}
        loading={drilldownLoading}
        error={drilldownError}
        onPage={(offset) => setDrilldown((d) => (d ? { ...d, offset } : d))}
        onOpenEmployee={openEmployee}
      />
    </GlobalWrapper>
  );
}
