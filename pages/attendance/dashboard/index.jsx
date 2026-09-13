import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import { Alert, AlertIcon, Box, Flex, SimpleGrid, Spinner, Text } from "@chakra-ui/react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import DashboardFilters from "../../../components/attendance/dashboard/DashboardFilters";
import DashboardCards from "../../../components/attendance/dashboard/DashboardCards";
import AttendanceOverviewPanel from "../../../components/attendance/dashboard/AttendanceOverviewPanel";
import LocationPanel from "../../../components/attendance/dashboard/LocationPanel";
import ShiftPanel from "../../../components/attendance/dashboard/ShiftPanel";
import TrendPanel from "../../../components/attendance/dashboard/TrendPanel";
import AttentionPanel from "../../../components/attendance/dashboard/AttentionPanel";
import RecentPunchesPanel from "../../../components/attendance/dashboard/RecentPunchesPanel";
import DrilldownModal from "../../../components/attendance/dashboard/DrilldownModal";
import usePermissions from "../../../customHooks/usePermissions";
import AttendanceDashboardHelper from "../../../helper/attendanceDashboard";
import {
  apiMessage,
  employeeDayHref,
  isForbidden,
  isOk,
  istToday,
} from "../../../util/attendanceDashboard";

/**
 * The Attendance Dashboard - the management overview of ONE attendance date.
 *
 * AN ADDITIONAL OVERVIEW, NOT A REPLACEMENT. The per-employee monthly screen
 * at `/attendance/calculated` is untouched and remains where a day is
 * examined, corrected and approved. This screen answers "how is today going,
 * across the company" and then LINKS there; it holds no approve, reject,
 * regularize, edit or recalculate control of any kind, and the API behind it
 * has no route that could perform one.
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
    loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    loadTrend();
  }, [loadTrend]);

  /* ------------------------------------------------------- drilldown */

  const openBucket = (bucket, overrides = null) => {
    setDrilldown({ bucket, offset: 0, overrides });
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

  return (
    <GlobalWrapper title="Attendance Dashboard" permissionKey={["view_attendance_dashboard"]}>
      <Box bg="#F7F8FB" minH="100%" pb={4}>
        <CustomContainer title="Attendance Dashboard" filledHeader>
          <Flex direction="column" gap={3}>
            <DashboardFilters
              filters={filters}
              options={options}
              onChange={(next) => {
                if (next.attendance_date !== filters.attendance_date) dateChosen.current = true;
                setFilters(next);
              }}
              onRefresh={() => {
                loadOverview();
                loadTrend();
              }}
              loading={loading}
              fetchedAt={overview ? overview.fetched_at : null}
            />

            {error ? (
              <Alert status="error" fontSize="sm" borderRadius="md">
                <AlertIcon />
                {error}
              </Alert>
            ) : null}

            {filtersError ? (
              <Alert status="warning" fontSize="xs" borderRadius="md" py={2}>
                <AlertIcon boxSize="14px" />
                {filtersError}
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

                {/* Three columns on the desktop, stacked on a phone. */}
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
                      // Scoped to THAT location for this list only; the filter
                      // bar and the other panels are left alone. The
                      // "no outlet on record" row is selected EXPLICITLY -
                      // omitting the filter, which is what this used to do,
                      // returns everybody.
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
                      // THE EXACT GROUP THE ROW STANDS FOR. A setup-gap row
                      // opens its own ISSUE - No Shift Assigned or Shift Setup
                      // Issue - narrowed to that row's shift where it has one.
                      // Opening the whole UNRESOLVED population instead, which
                      // is what this did, listed unrelated problems AND missed
                      // the employee who matters most: somebody who punched
                      // normally on a shift with no schedule row is Checked In,
                      // so no slice-based list could contain them.
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
                  Figures come from the attendance engine, the same calculation the employee’s own
                  attendance screen shows. Opening this page changes no attendance or payroll record
                  and triggers no recalculation.
                </Text>
              </>
            )}
          </Flex>
        </CustomContainer>
      </Box>

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
