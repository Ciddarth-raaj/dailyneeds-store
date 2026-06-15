import React, { useCallback, useState } from "react";
import { StockHoldingDashboardProvider } from "../../../contexts/StockHoldingDashboardContext";
import StockHoldingDashboardShell from "../../../components/stock-holding-dashboard/StockHoldingDashboardShell";
import HoldingDashboardView from "../../../components/stock-holding-dashboard/HoldingDashboardView";
import AvailabilityDashboardView from "../../../components/stock-holding-dashboard/AvailabilityDashboardView";
import SalesDashboardView from "../../../components/stock-holding-dashboard/SalesDashboardView";

const DEFAULT_TAB = "holding";
const VALID_TABS = new Set(["holding", "availability", "sales"]);

function StockHoldingDashboardPage() {
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);

  const onTabChange = useCallback((tab) => {
    if (!VALID_TABS.has(tab)) return;
    setActiveTab(tab);
  }, []);

  return (
    <StockHoldingDashboardProvider activeTab={activeTab}>
      <StockHoldingDashboardShell activeTab={activeTab} onTabChange={onTabChange}>
        {activeTab === "holding" ? (
          <HoldingDashboardView />
        ) : activeTab === "availability" ? (
          <AvailabilityDashboardView />
        ) : (
          <SalesDashboardView />
        )}
      </StockHoldingDashboardShell>
    </StockHoldingDashboardProvider>
  );
}

export default StockHoldingDashboardPage;
