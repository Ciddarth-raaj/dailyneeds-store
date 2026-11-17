import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import WarehouseFlowSection from "../../components/business-dashboard/WarehouseFlowSection";

/**
 * `/dashboard/invoice-pipeline` - the Invoice pipeline on its own, for staff
 * who should see gate pass to allocation but not the Business Dashboard's
 * sales and margin. Opens on `view_invoice_pipeline` (or the Business
 * Dashboard's key); the server also applies the dashboard store scope.
 */
export default function InvoicePipelinePage() {
  return (
    <GlobalWrapper title="Invoice Pipeline" permissionKey={["view_invoice_pipeline", "view_sales_dashboard"]}>
      <WarehouseFlowSection standalone />
    </GlobalWrapper>
  );
}
