import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import BusinessDashboardView from "../../components/business-dashboard/BusinessDashboardView";

/**
 * `/dashboard/business` - Purchase, Sales, SR, PR, Stock and Margin per store,
 * live from RetailPilot. Behind `view_sales_dashboard`; the server also applies
 * the dashboard store scope (Own Store / All Stores).
 */
export default function BusinessDashboardPage() {
  return (
    <GlobalWrapper title="Business Dashboard" permissionKey={["view_sales_dashboard"]}>
      <BusinessDashboardView />
    </GlobalWrapper>
  );
}
