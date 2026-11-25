import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import DashboardShell from "../../components/dashboard/DashboardShell";

/**
 * `/dashboard` - Attendance Today, Attendance & Staffing, Payroll and My
 * Attendance on one page. No page-level permission key: every signed-in user
 * has at least My Attendance, and each tab is offered on its own screen's rule
 * (see `components/dashboard/DashboardShell.jsx`).
 */
export default function DashboardPage() {
  return (
    <GlobalWrapper title="Dashboard">
      <DashboardShell />
    </GlobalWrapper>
  );
}
