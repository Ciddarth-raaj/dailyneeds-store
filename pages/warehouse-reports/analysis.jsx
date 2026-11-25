import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import AnalysisView from "../../components/whDailyReports/AnalysisView";

/**
 * `/warehouse-reports/analysis` - write-offs at picking, packing and
 * verification, loading against unloading, and trucks, for any range of
 * uploaded days. Behind `view_wh_daily_reports`.
 */
export default function WarehouseReportsAnalysisPage() {
  return (
    <GlobalWrapper title="Warehouse Reports Analysis" permissionKey={["view_wh_daily_reports"]}>
      <AnalysisView />
    </GlobalWrapper>
  );
}
