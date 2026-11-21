import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import StaffMappingView from "../../components/whDailyReports/StaffMappingView";

/**
 * `/warehouse-reports/staff` - map each RetailPilot (Keypoint) user id the
 * pick & pack reports name to an employee, so the analysis shows names.
 * Behind `manage_wh_staff_map`.
 */
export default function WarehouseStaffMappingPage() {
  return (
    <GlobalWrapper title="Staff Mapping" permissionKey={["manage_wh_staff_map"]}>
      <StaffMappingView />
    </GlobalWrapper>
  );
}
