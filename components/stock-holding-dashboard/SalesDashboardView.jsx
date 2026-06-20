import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Spinner,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import AgGrid from "../AgGrid";
import {
  formatDateDisplay,
  filterSalesItemsBySoldStatus,
  soldStatusFromBarName,
  SALES_SOLD_STATUS_KEYS,
  pivotSalesItemsToRows,
  enrichSalesItemsWithBuyerLabels,
} from "../../util/salesDashboard";
import { useStockHoldingDashboard } from "../../contexts/StockHoldingDashboardContext";
import useSalesDashboardData from "../../customHooks/useSalesDashboardData";
import SalesWindowStatCard from "./SalesWindowStatCard";
import SalesLineChartCard from "./SalesLineChartCard";
import SalesSoldUnsoldBarChart from "./SalesSoldUnsoldBarChart";
import SalesGroupedTabPanel from "./SalesGroupedTabPanel";
import ViewSalesItemsModal from "./ViewSalesItemsModal";
import SalesPivotedTable from "./SalesPivotedTable";
import SalesRangeTabPanel from "./SalesRangeTabPanel";
import {
  getSalesCumulativeColumnDefs,
  SALES_PIVOTED_DAILY_TABLE_KEY,
} from "./salesItemsColumnDefs";

const GROUP_TABS = [
  { value: "branch", label: "By Branch" },
  { value: "department", label: "By Department" },
  { value: "category", label: "By Category" },
  { value: "subcategory", label: "By Subcategory" },
  { value: "buyer", label: "By Buyer" },
  { value: "distributor", label: "By Distributor" },
];

const ROLLING_WINDOWS = [
  { days: 7, color: "blue" },
  { days: 15, color: "purple" },
  { days: 30, color: "green" },
];

export default function SalesDashboardView() {
  const [groupedTab, setGroupedTab] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalRows, setModalRows] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  const {
    salesSelectedDate,
    dashboardFilters,
    setSalesFilterOptions,
    registerSalesRefresh,
    registerSalesDashboardState,
    getStockRowsForDate,
    clearSalesStockCache,
    salesSoldStatusFilter,
    setSalesSoldStatusFilter,
    applyFilterUpdate,
  } = useStockHoldingDashboard();

  const {
    loading,
    refreshing,
    backgroundLoading,
    backgroundProgress,
    hydrateProgress,
    cancelBackgroundLoad,
    bundle,
    refreshData,
    window7,
    window15,
    window30,
    todaySummary,
    monthSummary,
    soldUnsoldBarData,
    lineChartData,
    cumulativeRows,
    displayItems,
    displayItemsLoading,
    filtersProcessing,
    selectedDateHasReport,
    filterOptions,
    loadItemsForModal,
    ensureItemsForDateRange,
    rangeItems,
    rangeItemsLoading,
    rangeLoadProgress,
    activeRange,
    rangeResetKey,
  } = useSalesDashboardData({
    selectedDate: salesSelectedDate,
    dashboardFilters,
    enabled: true,
    getStockRowsForDate,
    clearSalesStockCache,
  });

  useEffect(() => {
    registerSalesRefresh(refreshData);
    return () => registerSalesRefresh(null);
  }, [refreshData, registerSalesRefresh]);

  useEffect(() => {
    registerSalesDashboardState({
      loading,
      refreshing,
      backgroundLoading,
      backgroundProgress,
      hydrateProgress,
      filtersProcessing,
      cancelBackgroundLoad,
    });
    return () =>
      registerSalesDashboardState({
        loading: false,
        refreshing: false,
        backgroundLoading: false,
        backgroundProgress: null,
        hydrateProgress: null,
        filtersProcessing: false,
        cancelBackgroundLoad: null,
      });
  }, [
    loading,
    refreshing,
    backgroundLoading,
    backgroundProgress,
    hydrateProgress,
    filtersProcessing,
    cancelBackgroundLoad,
    registerSalesDashboardState,
  ]);

  useEffect(() => {
    if (filterOptions) {
      setSalesFilterOptions(filterOptions);
    }
  }, [filterOptions, setSalesFilterOptions]);

  const handleViewDay = useCallback(
    async (date) => {
      if (!date) return;
      setModalTitle(`Sales on ${formatDateDisplay(date)}`);
      setModalOpen(true);
      setModalLoading(true);
      setModalRows([]);
      try {
        const items = await loadItemsForModal(date);
        setModalRows(items);
      } catch {
        setModalRows([]);
      } finally {
        setModalLoading(false);
      }
    },
    [loadItemsForModal]
  );

  const handleViewProducts = useCallback(
    (groupName, items) => {
      setModalTitle(`${groupName} — ${formatDateDisplay(salesSelectedDate)}`);
      setModalOpen(true);
      setModalLoading(false);
      setModalRows(items || []);
    },
    [salesSelectedDate]
  );

  const cumulativeColumnDefs = useMemo(
    () =>
      getSalesCumulativeColumnDefs({
        onViewDay: handleViewDay,
      }),
    [handleViewDay]
  );

  const filteredDisplayItems = useMemo(
    () => filterSalesItemsBySoldStatus(displayItems, salesSoldStatusFilter),
    [displayItems, salesSoldStatusFilter]
  );

  const itemsForPivot = useMemo(
    () =>
      enrichSalesItemsWithBuyerLabels(
        filteredDisplayItems,
        filterOptions?.buyerOptions
      ),
    [filteredDisplayItems, filterOptions?.buyerOptions]
  );

  const pivotedDailySales = useMemo(
    () => pivotSalesItemsToRows(itemsForPivot),
    [itemsForPivot]
  );

  const handleSoldUnsoldBarClick = useCallback(
    (entry) => {
      const nextStatus = soldStatusFromBarName(entry?.name);
      applyFilterUpdate(() => {
        setSalesSoldStatusFilter((prev) =>
          prev === nextStatus ? SALES_SOLD_STATUS_KEYS.ALL : nextStatus
        );
      });
    },
    [applyFilterUpdate, setSalesSoldStatusFilter]
  );

  const productsLoading = displayItemsLoading || filtersProcessing;
  const hasProductRows = filteredDisplayItems.length > 0;
  const hasUnfilteredProductRows = displayItems.length > 0;
  const isSoldStatusFiltered =
    salesSoldStatusFilter &&
    salesSoldStatusFilter !== SALES_SOLD_STATUS_KEYS.ALL;

  const rollingWindowSummaries = useMemo(
    () => ({
      7: window7,
      15: window15,
      30: window30,
    }),
    [window7, window15, window30]
  );

  const groupedPanelProps = useMemo(
    () => ({
      selectedDate: salesSelectedDate,
      items: filteredDisplayItems,
      loading: productsLoading,
      hasReport: selectedDateHasReport,
      hasSourceItems: hasUnfilteredProductRows,
      onViewProducts: handleViewProducts,
      emptyMessage: isSoldStatusFiltered
        ? "No products match the selected sold status filter."
        : undefined,
    }),
    [
      salesSelectedDate,
      filteredDisplayItems,
      productsLoading,
      selectedDateHasReport,
      hasUnfilteredProductRows,
      handleViewProducts,
      isSoldStatusFiltered,
    ]
  );

  const soldUnsoldChartTitle = useMemo(
    () => `Sold vs Unsold (${formatDateDisplay(salesSelectedDate)})`,
    [salesSelectedDate]
  );

  const lineChartTitle = useMemo(
    () => "Daily Sales (Last 30 Days)",
    []
  );

  const backgroundProgressPercent = backgroundProgress?.totalDays
    ? Math.round(
        ((backgroundProgress.loadedDays ?? 0) / backgroundProgress.totalDays) *
          100
      )
    : 0;

  const hydrateProgressPercent = hydrateProgress?.totalDays
    ? Math.round(
        ((hydrateProgress.loadedDays ?? 0) / hydrateProgress.totalDays) * 100
      )
    : 0;

  const isHydratingFromCache = Boolean(hydrateProgress);
  const showInitialLoader =
    (loading || isHydratingFromCache) && !refreshing && !bundle;

  if (showInitialLoader) {
    return (
      <Center minH="240px" flexDirection="column" gap={3}>
        <Spinner size="lg" color="purple.500" />
        <Text fontSize="sm" color="gray.600">
          {isHydratingFromCache
            ? `Loading cached sales data… ${hydrateProgress.loadedDays ?? 0} / ${hydrateProgress.totalDays} days`
            : "Loading sales dashboard…"}
        </Text>
      </Center>
    );
  }

  return (
    <>
      {isHydratingFromCache && bundle ? (
        <CustomContainer title="Loading Cached Sales Data" filledHeader size="xs">
          <Flex direction="column" gap={3}>
            <Text fontSize="sm" color="gray.600">
              Loading cached sales data… {hydrateProgress.loadedDays ?? 0} /{" "}
              {hydrateProgress.totalDays} days
            </Text>
            <Box
              w="100%"
              h="8px"
              borderRadius="full"
              bg="gray.100"
              overflow="hidden"
            >
              <Box
                h="100%"
                borderRadius="full"
                bg="purple.500"
                w={`${hydrateProgressPercent}%`}
                transition="width 0.35s ease"
              />
            </Box>
          </Flex>
        </CustomContainer>
      ) : null}

      {backgroundLoading && backgroundProgress ? (
        <CustomContainer title="Loading Sales Data" filledHeader size="xs">
          <Flex direction="column" gap={3}>
            <Flex justify="space-between" align="center" gap={3} flexWrap="wrap">
              <Text fontSize="sm" color="gray.600">
                Loading sales data in background…{" "}
                {backgroundProgress.loadedDays ?? 0} /{" "}
                {backgroundProgress.totalDays} days
                {backgroundProgress.currentDate
                  ? ` (${formatDateDisplay(backgroundProgress.currentDate)})`
                  : ""}
              </Text>
              {typeof cancelBackgroundLoad === "function" ? (
                <Button
                  size="xs"
                  variant="outline"
                  colorScheme="red"
                  onClick={cancelBackgroundLoad}
                >
                  Stop
                </Button>
              ) : null}
            </Flex>
            <Box
              w="100%"
              h="8px"
              borderRadius="full"
              bg="gray.100"
              overflow="hidden"
            >
              <Box
                h="100%"
                borderRadius="full"
                bg="purple.500"
                w={`${backgroundProgressPercent}%`}
                transition="width 0.35s ease"
              />
            </Box>
          </Flex>
        </CustomContainer>
      ) : null}

      {refreshing ? (
        <CustomContainer title="Refreshing Sales Data" filledHeader size="xs">
          <Flex align="center" gap={3}>
            <Spinner size="sm" color="purple.500" />
            <Text fontSize="sm" color="gray.600">
              Refreshing sales dashboard…
            </Text>
          </Flex>
        </CustomContainer>
      ) : null}

      {filtersProcessing ? (
        <CustomContainer title="Applying Filters" filledHeader size="xs">
          <Flex align="center" gap={3}>
            <Spinner size="sm" color="purple.500" />
            <Text fontSize="sm" color="gray.600">
              Updating sales data for the selected filters…
            </Text>
          </Flex>
        </CustomContainer>
      ) : null}

      <ViewSalesItemsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        rows={modalRows}
        loading={modalLoading}
      />

      <Flex direction="column" gap={4}>
        <CustomContainer title="Key Periods" filledHeader size="xs">
          <Grid
            templateColumns={{ base: "1fr", md: "repeat(2, 1fr)" }}
            gap={4}
          >
            <SalesWindowStatCard
              periodLabel="Today"
              windowSummary={todaySummary}
              color="orange"
              deltaLabel="vs yesterday"
              variant="featured"
            />
            <SalesWindowStatCard
              periodLabel={
                monthSummary?.periodLabel
                  ? `${monthSummary.periodLabel} (MTD)`
                  : "This Month (MTD)"
              }
              windowSummary={monthSummary}
              color="pink"
              deltaLabel="vs last month"
              variant="featured"
            />
          </Grid>
        </CustomContainer>

        <CustomContainer title="Rolling Windows" filledHeader size="xs">
          <Grid
            templateColumns={{
              base: "1fr",
              md: "repeat(2, 1fr)",
              xl: "repeat(3, 1fr)",
            }}
            gap={4}
          >
            {ROLLING_WINDOWS.map(({ days, color }) => (
              <SalesWindowStatCard
                key={days}
                days={days}
                windowSummary={rollingWindowSummaries[days]}
                color={color}
                deltaLabel="vs prev period"
                variant="rolling"
              />
            ))}
          </Grid>
        </CustomContainer>

        <SalesSoldUnsoldBarChart
          data={soldUnsoldBarData}
          title={soldUnsoldChartTitle}
          activeFilter={salesSoldStatusFilter}
          onBarClick={handleSoldUnsoldBarClick}
        />

        <SalesLineChartCard data={lineChartData} title={lineChartTitle} />

        <Tabs
          index={groupedTab}
          onChange={setGroupedTab}
          variant="line"
          colorScheme="purple"
        >
          <TabList flexWrap="wrap">
            <Tab fontSize="sm">Daily Sales</Tab>
            <Tab fontSize="sm">Sales</Tab>
            <Tab fontSize="sm">Cumulative Sales</Tab>
            {GROUP_TABS.map((tab) => (
              <Tab key={tab.value} fontSize="sm">
                {tab.label}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {groupedTab === 0 ? (
                <CustomContainer
                  title={`Sales on ${formatDateDisplay(salesSelectedDate)}`}
                  filledHeader
                  size="xs"
                >
                  {!selectedDateHasReport && !hasUnfilteredProductRows ? (
                    <Text fontSize="sm" color="gray.600">
                      No sales data found for the selected date.
                    </Text>
                  ) : (
                    <SalesPivotedTable
                      rows={pivotedDailySales.rows}
                      branches={pivotedDailySales.branches}
                      loading={productsLoading && !hasProductRows}
                      tableKey={SALES_PIVOTED_DAILY_TABLE_KEY}
                      showLoadingOverlay={productsLoading && hasProductRows}
                      emptyMessage={
                        isSoldStatusFiltered
                          ? "No products match the selected sold status filter."
                          : "No products match the current filters for this date."
                      }
                    />
                  )}
                </CustomContainer>
              ) : null}
            </TabPanel>

            <TabPanel px={0}>
              {groupedTab === 1 ? (
                <SalesRangeTabPanel
                  isActive
                  selectedDate={salesSelectedDate}
                  ensureItemsForDateRange={ensureItemsForDateRange}
                  rangeItems={rangeItems}
                  rangeLoading={rangeItemsLoading}
                  rangeLoadProgress={rangeLoadProgress}
                  activeRange={activeRange}
                  rangeResetKey={rangeResetKey}
                  refreshing={refreshing}
                  filtersProcessing={filtersProcessing}
                  soldStatusFilter={salesSoldStatusFilter}
                  buyerOptions={filterOptions?.buyerOptions}
                  emptyMessage={
                    isSoldStatusFiltered
                      ? "No products match the selected sold status filter."
                      : undefined
                  }
                />
              ) : null}
            </TabPanel>

            <TabPanel px={0}>
              {groupedTab === 2 ? (
                <CustomContainer
                  title="Cumulative Sales (Last 30 Days)"
                  filledHeader
                  size="xs"
                >
                  {filtersProcessing ? (
                    <Center py={12} flexDirection="column" gap={3} minH="200px">
                      <Spinner size="lg" color="purple.500" thickness="3px" />
                      <Text fontSize="sm" color="gray.600">
                        Updating sales data for the selected filters…
                      </Text>
                    </Center>
                  ) : (
                    <AgGrid
                      tableKey="sales-dashboard-cumulative"
                      rowData={cumulativeRows}
                      columnDefs={cumulativeColumnDefs}
                      pagination={true}
                      paginationPageSize={15}
                    />
                  )}
                </CustomContainer>
              ) : null}
            </TabPanel>

            {GROUP_TABS.map((tab, index) => (
              <TabPanel key={tab.value} px={0}>
                {groupedTab === index + 3 ? (
                  <SalesGroupedTabPanel
                    groupBy={tab.value}
                    {...groupedPanelProps}
                  />
                ) : null}
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Flex>
    </>
  );
}
