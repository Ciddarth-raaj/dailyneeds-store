import { useUser } from "../contexts/UserContext";
import usePermissions from "./usePermissions";
import usePayrollActor from "./usePayrollActor";
import { canOpenPayrun } from "../util/payrunAccess";

/**
 * Which `/dashboard` tabs the signed-in user may open, and whether that is
 * known yet.
 *
 * EACH RULE IS THE ONE ITS PAGE ALREADY USED, called rather than restated:
 *
 *   attendance, staffing   usePermissions(["view_attendance_dashboard"]) -
 *                          the key the old page's GlobalWrapper checked
 *   payroll                canOpenPayrun(usePayrollActor()) - the Payroll
 *                          Dashboard's own `mayOpen`
 *   my-attendance          always - My Attendance has never had a key; the
 *                          server takes the employee from the session
 *
 * `ready` IS FALSE UNTIL THE PERMISSIONS HAVE ARRIVED. On a full page load the
 * permission list starts empty and is fetched; deciding the tab before then
 * would send `?tab=payroll` to My Attendance and mount the wrong screen. The
 * shell waits instead.
 */
export default function useDashboardTabAccess() {
  const { userConfig } = useUser();
  const canAttendance = usePermissions(["view_attendance_dashboard"]);
  const payroll = canOpenPayrun(usePayrollActor());
  return {
    ready: userConfig.permissionsLoaded !== false,
    access: {
      attendance: canAttendance,
      staffing: canAttendance,
      payroll,
      "my-attendance": true,
    },
  };
}
