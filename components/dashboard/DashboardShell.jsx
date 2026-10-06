import React, { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import DashboardTabs, { panelId, tabId } from "./DashboardTabs";
import DashboardPanelBoundary from "./DashboardPanelBoundary";
import EmptyData from "../EmptyData";
import AttendanceStaffingDashboard from "../attendance/dashboard/AttendanceStaffingDashboard";
import PayrollDashboardView from "../payroll/dashboard/PayrollDashboardView";
import MyAttendanceView from "../attendance/MyAttendanceView";
import useDashboardTabAccess from "../../customHooks/useDashboardTabAccess";
import {
  DASHBOARD_TABS,
  dashboardHref,
  permittedTabs,
  resolveDashboardTab,
  tabForAttendanceView,
} from "../../util/dashboardTabs";

/**
 * THE DASHBOARD - one page, the existing dashboard screens as tabs.
 *
 * A THIN PARENT. It decides which tab is open and renders that screen's own
 * component; it holds no filter, no figure and no request of its own. Every
 * tab keeps its own filters, Refresh, loading, empty, error and refusal states.
 *
 * THE URL IS THE STATE: `?tab=attendance | staffing | payroll | my-attendance`.
 * A tab click pushes a shallow history entry, so refresh keeps the tab and
 * Back / Forward move between tabs. No `tab` opens the first permitted tab
 * (Attendance Today when allowed). An unknown or forbidden `tab` opens the
 * first permitted tab and the URL is corrected in place.
 *
 * NOTHING MOUNTS UNTIL THE TAB IS DECIDED, and the tab is not decided until the
 * permissions have arrived. A forbidden tab named in the URL is refused before
 * render, so its screen never mounts and never asks the server for anything.
 *
 * LAZY, AND IDLE WHEN HIDDEN. A screen mounts the first time its tab is
 * opened - opening Attendance Today requests nothing from Payroll or My
 * Attendance. Once opened it is KEPT, hidden, so its month and filters are
 * still there on the way back; none of these screens polls, and a hidden one
 * issues no request until it is shown and somebody uses it. Attendance Today
 * and Attendance & Staffing are the By date and Now views of ONE screen, so
 * moving between them is that screen's own Now / By date switch.
 */
const PANELS = [
  { panel: "attendance", label: "Attendance" },
  { panel: "payroll", label: "Payroll" },
  { panel: "my-attendance", label: "My Attendance" },
];

export default function DashboardShell() {
  const router = useRouter();
  const { ready, access } = useDashboardTabAccess();
  const decided = ready && router.isReady;
  const allowed = permittedTabs(access);
  const { tab: active, fellBack } = decided
    ? resolveDashboardTab(router.query.tab, access)
    : { tab: null, fellBack: false };
  const activeKey = active ? active.key : null;

  // A malformed or forbidden `tab` is replaced, not pushed: Back should not
  // return to a URL that cannot open.
  useEffect(() => {
    if (decided && fellBack && activeKey) {
      router.replace(dashboardHref(activeKey, router.query), undefined, { shallow: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [decided, fellBack, activeKey]);

  const select = useCallback(
    (key) => {
      if (key === activeKey) return;
      router.push(dashboardHref(key, router.query), undefined, { shallow: true });
    },
    [activeKey, router]
  );

  /**
   * Which screens have been opened, and which view the attendance screen last
   * showed. Refs, written while rendering, so the screen for a newly opened tab
   * mounts in the same render that selects it - not one frame later.
   */
  const opened = useRef(new Set());
  const attendanceTab = useRef("attendance");
  if (active) {
    opened.current.add(active.panel);
    if (active.panel === "attendance") attendanceTab.current = active.key;
  }

  if (!decided) {
    return (
      <Flex minH="320px" align="center" justify="center">
        <Spinner size="lg" color="purple.500" thickness="3px" />
      </Flex>
    );
  }

  if (!active) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <EmptyData message="You do not have access to any Dashboard views" faIcon="fa-lock" />
      </Flex>
    );
  }

  const attendanceView = DASHBOARD_TABS.find((t) => t.key === attendanceTab.current).view;

  const renderPanel = (panel, isActive) => {
    if (panel === "attendance") {
      return (
        <AttendanceStaffingDashboard
          view={attendanceView}
          onViewChange={(view) => select(tabForAttendanceView(view))}
          isActive={isActive}
        />
      );
    }
    if (panel === "payroll") return <PayrollDashboardView isActive={isActive} />;
    return <MyAttendanceView isActive={isActive} />;
  };

  return (
    <Flex direction="column" gap={3}>
      <Box>
        <Text as="h1" fontSize="lg" fontWeight="600" color="purple.700" mb={2}>
          Dashboard
        </Text>
        <DashboardTabs tabs={allowed} activeKey={activeKey} onSelect={select} />
      </Box>

      {PANELS.map(({ panel, label }) => {
        const permitted = allowed.some((t) => t.panel === panel);
        if (!permitted || !opened.current.has(panel)) return null;
        const isActive = active.panel === panel;
        const labelledBy = panel === "attendance" ? attendanceTab.current : panel;
        return (
          <Box
            key={panel}
            role="tabpanel"
            id={panelId(panel)}
            aria-labelledby={tabId(labelledBy)}
            hidden={!isActive}
            display={isActive ? "block" : "none"}
          >
            <DashboardPanelBoundary label={label}>{renderPanel(panel, isActive)}</DashboardPanelBoundary>
          </Box>
        );
      })}
    </Flex>
  );
}
