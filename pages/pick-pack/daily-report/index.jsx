import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import WarehouseHealthSection from "../../../components/whDailyReports/WarehouseHealthSection";

/**
 * `/pick-pack/daily-report` - the Pick Pack Daily Report: the warehouse (or,
 * with ?site=ecr, a store) for one day - picking write-off, where every line
 * stands from picked to verified, and what the stores found short. For
 * `view_warehouse_health`. Also sent as the 9 am Telegram message and PDF.
 */
export default function PickPackDailyReportPage() {
  return (
    <GlobalWrapper
      title="Pick Pack Daily Report"
      permissionKey={["view_warehouse_health"]}
    >
      <WarehouseHealthSection />
    </GlobalWrapper>
  );
}
