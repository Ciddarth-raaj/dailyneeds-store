import LegacyDashboardRedirect from "../../components/dashboard/LegacyDashboardRedirect";

/** The Payroll Dashboard is now the `payroll` tab of `/dashboard`; this route redirects there. */
export default function LegacyRoute() {
  return <LegacyDashboardRedirect tab="payroll" />;
}
