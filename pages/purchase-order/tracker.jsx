import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import PoTrackerView from "../../components/poTracker/PoTrackerView";

/**
 * `/purchase-order/tracker` - buyers follow their purchase orders: the
 * latest POs per store and supplier, live from RetailPilot. Behind
 * `view_purchase_order`.
 */
export default function PoTrackerPage() {
  return (
    <GlobalWrapper title="PO Tracker" permissionKey={["view_purchase_order"]}>
      <PoTrackerView />
    </GlobalWrapper>
  );
}
