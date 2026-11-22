import React, { useEffect } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import WarehouseFlowSection from "../../components/business-dashboard/WarehouseFlowSection";
import usePermissions from "../../customHooks/usePermissions";

/**
 * `/dashboard/invoice-pipeline` - the Invoice pipeline on its own, for staff
 * who should see gate pass to allocation but not the Business Dashboard's
 * sales and margin. Opens on `view_invoice_pipeline` (or the Business
 * Dashboard's key); the server also applies the dashboard store scope.
 *
 * Warehouse Health moved to Pick and Pack -> Pick Pack Daily Report
 * (/pick-pack/daily-report). Old links here (#warehouse-health, ?site=, the
 * Telegram button) and logins holding only `view_warehouse_health` are sent
 * there.
 */
export default function InvoicePipelinePage() {
  const canPipeline = usePermissions([
    "view_invoice_pipeline",
    "view_sales_dashboard",
  ]);
  const canHealth = usePermissions(["view_warehouse_health"]);
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined" || !canHealth) return;
    const site = new URLSearchParams(window.location.search).get("site");
    if (window.location.hash === "#warehouse-health" || site || !canPipeline) {
      router.replace(
        `/pick-pack/daily-report${site ? `?site=${encodeURIComponent(site)}` : ""}`,
      );
    }
  }, [canHealth, canPipeline, router]);
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
    </GlobalWrapper>
  );
}
