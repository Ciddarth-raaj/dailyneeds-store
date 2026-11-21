import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import WarehouseFlowSection from "../../components/business-dashboard/WarehouseFlowSection";
import WarehouseHealthSection from "../../components/whDailyReports/WarehouseHealthSection";
import usePermissions from "../../customHooks/usePermissions";

/**
 * `/dashboard/invoice-pipeline` - the Invoice pipeline on its own, for staff
 * who should see gate pass to allocation but not the Business Dashboard's
 * sales and margin. Opens on `view_invoice_pipeline` (or the Business
 * Dashboard's key); the server also applies the dashboard store scope.
 *
 * Below it, Warehouse Health - the warehouse manager's day (write-off, boxes,
 * yet to verify, pickers) - for `view_warehouse_health`. Each part shows only
 * to those holding its right, so a warehouse manager can be given Warehouse
 * Health alone.
 */
export default function InvoicePipelinePage() {
  const canPipeline = usePermissions([
    "view_invoice_pipeline",
    "view_sales_dashboard",
  ]);
  const canHealth = usePermissions(["view_warehouse_health"]);
  return (
    <GlobalWrapper
      title="Invoice Pipeline"
      permissionKey={[
        "view_invoice_pipeline",
        "view_sales_dashboard",
        "view_warehouse_health",
      ]}
    >
      {canPipeline && <WarehouseFlowSection standalone />}
      {canHealth && <WarehouseHealthSection />}
    </GlobalWrapper>
  );
}
