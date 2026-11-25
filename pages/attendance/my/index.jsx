import LegacyDashboardRedirect from "../../../components/dashboard/LegacyDashboardRedirect";

/** The My Attendance is now the `my-attendance` tab of `/dashboard`; this route redirects there. */
export default function LegacyRoute() {
  return <LegacyDashboardRedirect tab="my-attendance" />;
}
