import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import DailyUploadsView from "../../components/whDailyReports/DailyUploadsView";

/**
 * `/warehouse-reports/daily-uploads` - every morning the team uploads the
 * five RetailPilot exports: Picking, Packing, Loading, Unloading,
 * Verification. Behind `view_wh_daily_reports`; uploading needs
 * `upload_wh_daily_reports`.
 */
export default function WarehouseDailyUploadsPage() {
  return (
    <GlobalWrapper title="Daily Warehouse Reports" permissionKey={["view_wh_daily_reports"]}>
      <DailyUploadsView />
    </GlobalWrapper>
  );
}
