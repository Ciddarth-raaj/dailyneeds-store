import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import TransfersView from "../../components/transfers/TransfersView";

/**
 * `/dashboard/transfers` - stock dispatched to stores, with each transfer's
 * articles, live from RetailPilot. Behind `view_sales_dashboard`; the server
 * also applies the dashboard store scope.
 */
export default function TransfersPage() {
  return (
    <GlobalWrapper title="Transfers" permissionKey={["view_sales_dashboard"]}>
      <TransfersView />
    </GlobalWrapper>
  );
}
