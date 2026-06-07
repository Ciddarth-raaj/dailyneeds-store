import React, { useCallback, useState } from "react";
import { StockHoldingDashboardProvider } from "../../../contexts/StockHoldingDashboardContext";
import StockHoldingDashboardShell from "../../../components/stock-holding-dashboard/StockHoldingDashboardShell";
import HoldingDashboardView from "../../../components/stock-holding-dashboard/HoldingDashboardView";
import AvailabilityDashboardView from "../../../components/stock-holding-dashboard/AvailabilityDashboardView";

const DEFAULT_TAB = "holding";
const VALID_TABS = new Set(["holding", "availability"]);

function StockHoldingDashboardPage() {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  const onTabChange = useCallback((tab) => {
    if (!VALID_TABS.has(tab)) return;
    setActiveTab(tab);
  }, []);

  return (
    <StockHoldingDashboardProvider>
      <StockHoldingDashboardShell activeTab={activeTab} onTabChange={onTabChange}>
        {activeTab === "holding" ? (
          <HoldingDashboardView />
        ) : (
          <AvailabilityDashboardView />
        )}
      </StockHoldingDashboardShell>
    </StockHoldingDashboardProvider>
  );
}

export default StockHoldingDashboardPage;
