import LegacyDashboardRedirect from "../../../components/dashboard/LegacyDashboardRedirect";

/** The Attendance & Staffing Dashboard is now the `staffing` tab of `/dashboard`; this route redirects there. */
export default function LegacyRoute() {
  return <LegacyDashboardRedirect tab="staffing" />;
}
