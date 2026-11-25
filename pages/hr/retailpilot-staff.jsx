import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import StaffMappingView from "../../components/whDailyReports/StaffMappingView";

/**
 * `/hr/retailpilot-staff` (HR > Employee Master) - HR maps each RetailPilot
 * (Keypoint) user id the warehouse pick & pack reports name to an employee,
 * so the warehouse analysis shows names. Behind `manage_wh_staff_map`.
 */
export default function WarehouseStaffMappingPage() {
  return (
    <GlobalWrapper title="RetailPilot Staff Mapping" permissionKey={["manage_wh_staff_map"]}>
      <StaffMappingView />
    </GlobalWrapper>
  );
}
