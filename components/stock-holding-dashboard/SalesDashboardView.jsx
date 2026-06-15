import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
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
} from "../../util/salesDashboard";
import { useStockHoldingDashboard } from "../../contexts/StockHoldingDashboardContext";
import useSalesDashboardData from "../../customHooks/useSalesDashboardData";
import SalesWindowStatCard from "./SalesWindowStatCard";
import SalesLineChartCard from "./SalesLineChartCard";
import SalesSoldUnsoldBarChart from "./SalesSoldUnsoldBarChart";
import SalesGroupedTabPanel from "./SalesGroupedTabPanel";
import ViewSalesItemsModal from "./ViewSalesItemsModal";
import {
  getSalesCumulativeColumnDefs,
  getSalesItemsColumnDefs,
  SALES_ITEMS_TABLE_KEY,
} from "./salesItemsColumnDefs";

const GROUP_TABS = [
  { value: "branch", label: "By Branch" },
  { value: "department", label: "By Department" },
  { value: "category", label: "By Category" },
  { value: "subcategory", label: "By Subcategory" },
  { value: "buyer", label: "By Buyer" },
  { value: "supplier", label: "By Supplier" },
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
    getStockRowsForDate,
    clearSalesStockCache,
    salesSoldStatusFilter,
    setSalesSoldStatusFilter,
    applyFilterUpdate,
  } = useStockHoldingDashboard();

  const {
    loading,
    refreshing,
    summaryStreaming,
    summaryStreamProgress,
    loadedFromCache,
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
    itemsFetchProgress,
    selectedDateHasReport,
    filterOptions,
    loadItemsForModal,
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

  const itemsColumnDefs = useMemo(() => getSalesItemsColumnDefs(), []);

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

  const productsLoading = displayItemsLoading;
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

  const groupedPanelProps = {
    selectedDate: salesSelectedDate,
    items: filteredDisplayItems,
    loading: displayItemsLoading,
    hasReport: selectedDateHasReport,
    hasSourceItems: hasUnfilteredProductRows,
    onViewProducts: handleViewProducts,
    emptyMessage: isSoldStatusFiltered
      ? "No products match the selected sold status filter."
      : undefined,
  };

  const summaryProgressPercent = summaryStreamProgress
    ? Math.round(
        (summaryStreamProgress.loadedDays / summaryStreamProgress.totalDays) *
          100
      )
    : 0;

  if (loading && !refreshing && !loadedFromCache && !bundle) {
    return (
      <Center minH="240px" flexDirection="column" gap={3}>
        <Spinner size="lg" color="purple.500" />
        <Text fontSize="sm" color="gray.600">
          Loading sales dashboard…
        </Text>
      </Center>
    );
  }

  return (
    <>
      {summaryStreaming && summaryStreamProgress ? (
        <CustomContainer title="Loading Sales Data" filledHeader size="xs">
          <Flex direction="column" gap={2}>
            <Flex justify="space-between" align="center" gap={3}>
              <Text fontSize="sm" color="gray.600">
                Loading sales data… {summaryStreamProgress.loadedDays} /{" "}
                {summaryStreamProgress.totalDays} days
                {summaryStreamProgress.currentDate
                  ? ` (${summaryStreamProgress.currentDate})`
                  : ""}
              </Text>
              <Text fontSize="xs" color="gray.500">
                Day {summaryStreamProgress.chunkIndex} /{" "}
                {summaryStreamProgress.totalChunks}
              </Text>
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
                w={`${summaryProgressPercent}%`}
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
          title={`Sold vs Unsold (${formatDateDisplay(salesSelectedDate)})`}
          activeFilter={salesSoldStatusFilter}
          onBarClick={handleSoldUnsoldBarClick}
        />

        <Tabs
          index={groupedTab}
          onChange={setGroupedTab}
          variant="line"
          colorScheme="purple"
        >
          <TabList flexWrap="wrap">
            <Tab fontSize="sm">Daily Sales</Tab>
            <Tab fontSize="sm">Cumulative Sales</Tab>
            {GROUP_TABS.map((tab) => (
              <Tab key={tab.value} fontSize="sm">
                {tab.label}
              </Tab>
            ))}
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              <Flex direction="column" gap={4}>
                <SalesLineChartCard
                  data={lineChartData}
                  title="Daily Sales (Last 30 Days)"
                />

                <CustomContainer
                  title={`Sales on ${formatDateDisplay(salesSelectedDate)}`}
                  filledHeader
                  size="xs"
                >
                  {!selectedDateHasReport && !hasUnfilteredProductRows ? (
                    <Text fontSize="sm" color="gray.600">
                      No sales data found for the selected date.
                    </Text>
                  ) : productsLoading && !hasProductRows ? (
                    <Center py={8} flexDirection="column" gap={2}>
                      <Spinner size="md" color="purple.500" />
                      <Text fontSize="sm" color="gray.600">
                        {itemsFetchProgress?.total != null
                          ? `Loading products… ${itemsFetchProgress.loaded.toLocaleString()} / ${itemsFetchProgress.total.toLocaleString()}`
                          : itemsFetchProgress?.loaded
                            ? `Loading products… ${itemsFetchProgress.loaded.toLocaleString()} rows`
                            : "Loading products…"}
                      </Text>
                    </Center>
                  ) : !hasProductRows ? (
                    <Text fontSize="sm" color="gray.600">
                      {isSoldStatusFiltered
                        ? "No products match the selected sold status filter."
                        : "No products match the current filters for this date."}
                    </Text>
                  ) : (
                    <Flex direction="column" gap={3}>
                      {productsLoading ? (
                        <Flex align="center" gap={2}>
                          <Spinner size="sm" color="purple.500" />
                          <Text fontSize="sm" color="gray.600">
                            {itemsFetchProgress?.total != null
                              ? `Loading more products… ${itemsFetchProgress.loaded.toLocaleString()} / ${itemsFetchProgress.total.toLocaleString()}`
                              : itemsFetchProgress?.loaded
                                ? `Loading more products… ${itemsFetchProgress.loaded.toLocaleString()} rows`
                                : "Loading more products…"}
                          </Text>
                        </Flex>
                      ) : null}
                      <AgGrid
                        tableKey={SALES_ITEMS_TABLE_KEY}
                        rowData={filteredDisplayItems}
                        columnDefs={itemsColumnDefs}
                        pagination={true}
                        paginationPageSize={20}
                      />
                    </Flex>
                  )}
                </CustomContainer>
              </Flex>
            </TabPanel>

            <TabPanel px={0}>
              <CustomContainer
                title="Cumulative Sales (Last 30 Days)"
                filledHeader
                size="xs"
              >
                <AgGrid
                  tableKey="sales-dashboard-cumulative"
                  rowData={cumulativeRows}
                  columnDefs={cumulativeColumnDefs}
                  pagination={true}
                  paginationPageSize={15}
                />
              </CustomContainer>
            </TabPanel>

            {GROUP_TABS.map((tab) => (
              <TabPanel key={tab.value} px={0}>
                <SalesGroupedTabPanel
                  groupBy={tab.value}
                  {...groupedPanelProps}
                />
              </TabPanel>
            ))}
          </TabPanels>
        </Tabs>
      </Flex>
    </>
  );
}
