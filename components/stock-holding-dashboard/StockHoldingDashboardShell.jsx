import React, { useCallback, useMemo } from "react";
import moment from "moment";
import {
  Box,
  Button,
  Center,
  Flex,
  Grid,
  Input,
  Progress,
  Spinner,
  Tab,
  TabList,
  Tabs,
  Text,
} from "@chakra-ui/react";
import { RepeatIcon } from "@chakra-ui/icons";
import GlobalWrapper from "../globalWrapper/globalWrapper";
import CustomContainer from "../CustomContainer";
import SearchableDropdown from "../customInput/SearchableDropdown";
import ViewItemsModal from "./ViewItemsModal";
import { useStockHoldingDashboard } from "../../contexts/StockHoldingDashboardContext";
import { SALES_SOLD_STATUS_OPTIONS } from "../../util/salesDashboard";

const DASHBOARD_TABS = [
  { value: "holding", label: "Stock Holding" },
  { value: "availability", label: "Stock Availability" },
  { value: "sales", label: "Sales Dashboard" },
];

function toDropdownOptions(options = []) {
  return (options || []).map((o) => ({
    id: o.value,
    value: o.label,
  }));
}

function ReportFetchProgress({ progress, title, onStop }) {
  const loaded = progress?.loaded ?? 0;
  const total = progress?.total;
  const hasTotal = total != null && total > 0;
  const percent = hasTotal
    ? Math.min(100, Math.round((loaded / total) * 100))
    : null;

  const countLabel = hasTotal
    ? `${loaded.toLocaleString()} / ${total.toLocaleString()} rows`
    : loaded > 0
      ? `${loaded.toLocaleString()} rows loaded`
      : "Starting…";

  return (
    <Box w="100%">
      <Flex justify="space-between" align="center" mb={2} gap={3} flexWrap="wrap">
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {title}
        </Text>
        <Text fontSize="sm" color="gray.600">
          {countLabel}
          {percent != null ? ` (${percent}%)` : ""}
        </Text>
      </Flex>
      <Progress
        value={hasTotal ? percent : undefined}
        isIndeterminate={!hasTotal && loaded === 0}
        hasStripe={!hasTotal && loaded > 0}
        isAnimated
        size="sm"
        colorScheme="purple"
        borderRadius="md"
      />
      {onStop ? (
        <Flex justify="flex-end" mt={3}>
          <Button size="xs" variant="outline" colorScheme="red" onClick={onStop}>
            Stop
          </Button>
        </Flex>
      ) : null}
    </Box>
  );
}

function FilterDropdown({ label, placeholder, value, options, onChange }) {
  const dropdownOptions = useMemo(
    () => toDropdownOptions(options),
    [options]
  );

  const handleChange = useCallback(
    (val) => onChange(Array.isArray(val) ? val : []),
    [onChange]
  );

  return (
    <SearchableDropdown
      label={label}
      placeholder={placeholder}
      multiple
      size="sm"
      options={dropdownOptions}
      value={value}
      onChange={handleChange}
    />
  );
}

export default function StockHoldingDashboardShell({
  activeTab,
  onTabChange,
  children,
}) {
  const {
    selectedDate,
    setSelectedDate,
    salesSelectedDate,
    setSalesSelectedDate,
    loading,
    refreshing,
    fetchProgress,
    lastSyncAt,
    refreshData,
    refreshSalesData,
    cancelFetch,
    salesDashboardState,
    rawItems,
    enriching,
    dashboard,
    applyFilterUpdate,
    branchFilter,
    setBranchFilter,
    buyerFilter,
    setBuyerFilter,
    supplierFilter,
    setSupplierFilter,
    distributorFilter,
    setDistributorFilter,
    departmentFilter,
    setDepartmentFilter,
    categoryFilter,
    setCategoryFilter,
    subcategoryFilter,
    setSubcategoryFilter,
    purchaseTypeFilter,
    setPurchaseTypeFilter,
    chainLevelFilter,
    setChainLevelFilter,
    statusFilter,
    setStatusFilter,
    stockAvailabilityFilter,
    setStockAvailabilityFilter,
    salesSoldStatusFilter,
    setSalesSoldStatusFilter,
    salesFilterOptions,
    clearFilters,
    itemsModalOpen,
    setItemsModalOpen,
    itemsModalTitle,
    filteredModalRows,
  } = useStockHoldingDashboard();

  const {
    branchOptions,
    buyerOptions,
    supplierOptions,
    distributorOptions,
    departmentOptions,
    categoryOptions,
    subcategoryOptions,
    purchaseTypeOptions,
    chainLevelOptions,
    statusOptions,
    stockAvailabilityOptions,
  } = dashboard;

  const isSalesTab = activeTab === "sales";
  const salesBusy =
    salesDashboardState?.loading ||
    salesDashboardState?.refreshing ||
    salesDashboardState?.backgroundLoading ||
    salesDashboardState?.filtersProcessing ||
    Boolean(salesDashboardState?.hydrateProgress);
  const branchOptionsSource = isSalesTab
    ? salesFilterOptions?.branchOptions ?? []
    : branchOptions;
  const effectiveBuyerOptions = isSalesTab
    ? salesFilterOptions?.buyerOptions ?? []
    : buyerOptions;
  const effectiveSupplierOptions = isSalesTab
    ? salesFilterOptions?.supplierOptions ?? []
    : supplierOptions;
  const effectiveDistributorOptions = isSalesTab
    ? salesFilterOptions?.distributorOptions ?? []
    : distributorOptions;
  const effectiveDepartmentOptions = isSalesTab
    ? salesFilterOptions?.departmentOptions ?? []
    : departmentOptions;
  const effectiveCategoryOptions = isSalesTab
    ? salesFilterOptions?.categoryOptions ?? []
    : categoryOptions;
  const effectiveSubcategoryOptions = isSalesTab
    ? salesFilterOptions?.subcategoryOptions ?? []
    : subcategoryOptions;
  const effectivePurchaseTypeOptions = isSalesTab
    ? salesFilterOptions?.purchaseTypeOptions ?? []
    : purchaseTypeOptions;
  const effectiveChainLevelOptions = isSalesTab
    ? salesFilterOptions?.chainLevelOptions ?? []
    : chainLevelOptions;
  const datePickerValue = isSalesTab ? salesSelectedDate : selectedDate;
  const handleDateChange = (value) => {
    if (isSalesTab) {
      setSalesSelectedDate(value);
    } else {
      setSelectedDate(value);
    }
  };
  const handleRefresh = () => {
    if (isSalesTab) {
      refreshSalesData();
    } else {
      refreshData();
    }
  };

  const lastSyncFormatted = useMemo(() => {
    if (!lastSyncAt) return null;
    const m = moment(lastSyncAt);
    return m.isValid() ? m.format("DD MMM YYYY, hh:mm A") : null;
  }, [lastSyncAt]);

  const hasReportData = isSalesTab || rawItems.length > 0;
  const showStockDashboard = hasReportData && !enriching;
  const showFiltersAndContent = isSalesTab || showStockDashboard;
  const tabIndex = useMemo(
    () => DASHBOARD_TABS.findIndex((t) => t.value === activeTab),
    [activeTab]
  );

  const soldStatusFilterOptions = useMemo(
    () =>
      SALES_SOLD_STATUS_OPTIONS.filter((o) => o.value !== "all").map((o) => ({
        value: o.value,
        label: o.label,
      })),
    []
  );

  const handleTabChange = useCallback(
    (idx) => onTabChange(DASHBOARD_TABS[idx]?.value ?? "holding"),
    [onTabChange]
  );

  return (
    <GlobalWrapper
      title="Stock Holding Dashboard"
      permissionKey="view_stock_holding_dashboard"
    >
      <ViewItemsModal
        isOpen={itemsModalOpen}
        onClose={() => setItemsModalOpen(false)}
        title={itemsModalTitle}
        rows={filteredModalRows}
        showAvailabilitySummary={activeTab === "availability"}
      />

      <Flex direction="column" gap="22px" w="100%" maxW="100%" overflow="hidden">
        <CustomContainer title="Stock Holding Dashboard" filledHeader size="xs">
          <Flex
            justify="space-between"
            w="100%"
            gap={3}
            flexWrap="wrap"
            alignItems="flex-end"
          >
            <Tabs
              index={tabIndex >= 0 ? tabIndex : 0}
              onChange={handleTabChange}
              variant="line"
              colorScheme="purple"
            >
              <TabList borderBottomWidth="0">
                {DASHBOARD_TABS.map((tab) => (
                  <Tab key={tab.value} fontSize="sm">
                    {tab.label}
                  </Tab>
                ))}
              </TabList>
            </Tabs>

            <Flex align="flex-end" gap={3} flexWrap="wrap">
              <Box w={{ base: "100%", md: "220px" }}>
                <Text fontSize="sm" mb={1} color="gray.600">
                  Date
                </Text>
                <Input
                  type="date"
                  size="sm"
                  value={datePickerValue}
                  onChange={(e) => handleDateChange(e.target.value)}
                />
              </Box>
              {!isSalesTab ? (
                <Box>
                  <Text fontSize="xs" mb={1} color="gray.500">
                    Last sync
                  </Text>
                  <Text fontSize="sm" color="gray.700">
                    {lastSyncFormatted || "No sync data"}
                  </Text>
                </Box>
              ) : null}
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RepeatIcon />}
                onClick={handleRefresh}
                isDisabled={isSalesTab ? salesBusy : loading || refreshing}
              >
                Refresh
              </Button>
            </Flex>
          </Flex>
        </CustomContainer>

        {loading && !refreshing && !isSalesTab ? (
          <CustomContainer title="Loading Report" filledHeader size="xs">
            <ReportFetchProgress
              progress={fetchProgress}
              title="Loading report in background"
              onStop={cancelFetch}
            />
          </CustomContainer>
        ) : null}

        {refreshing && !isSalesTab ? (
          <CustomContainer title="Refreshing Data" filledHeader size="xs">
            <ReportFetchProgress
              progress={fetchProgress}
              title="Fetching latest report"
              onStop={cancelFetch}
            />
          </CustomContainer>
        ) : null}

        {hasReportData && enriching ? (
          <Center minH="240px">
            <Spinner size="lg" color="purple.500" />
          </Center>
        ) : !hasReportData ? (
          <CustomContainer title="No Data" filledHeader size="xs">
            <Text color="gray.600" fontSize="sm">
              No stock holding report found on or before the selected date.
              Import a report from Uploads → Stock Holding Report to view
              dashboard data.
            </Text>
          </CustomContainer>
        ) : showFiltersAndContent ? (
          <>
            <CustomContainer
              title="Filters"
              filledHeader
              size="xs"
              rightSection={
                <Button size="xs" variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              }
            >
              <Grid
                templateColumns={{
                  base: "1fr",
                  md: "repeat(2, 1fr)",
                  lg: "repeat(4, 1fr)",
                }}
                gap={3}
              >
                <FilterDropdown
                  label="Branch"
                  placeholder="All branches"
                  value={branchFilter}
                  options={branchOptionsSource}
                  onChange={(val) =>
                    applyFilterUpdate(() => setBranchFilter(val))
                  }
                />
                <FilterDropdown
                  label="Buyer"
                  placeholder="All buyers"
                  value={buyerFilter}
                  options={effectiveBuyerOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setBuyerFilter(val))
                  }
                />
                <FilterDropdown
                  label="Distributor"
                  placeholder="All distributors"
                  value={distributorFilter}
                  options={effectiveDistributorOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setDistributorFilter(val))
                  }
                />
                <FilterDropdown
                  label="Supplier"
                  placeholder="All suppliers"
                  value={supplierFilter}
                  options={effectiveSupplierOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setSupplierFilter(val))
                  }
                />
                <FilterDropdown
                  label="Department"
                  placeholder="All departments"
                  value={departmentFilter}
                  options={effectiveDepartmentOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setDepartmentFilter(val))
                  }
                />
                <FilterDropdown
                  label="Category"
                  placeholder="All categories"
                  value={categoryFilter}
                  options={effectiveCategoryOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setCategoryFilter(val))
                  }
                />
                <FilterDropdown
                  label="Subcategory"
                  placeholder="All subcategories"
                  value={subcategoryFilter}
                  options={effectiveSubcategoryOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setSubcategoryFilter(val))
                  }
                />
                <FilterDropdown
                  label="Purchase Type"
                  placeholder="All purchase types"
                  value={purchaseTypeFilter}
                  options={effectivePurchaseTypeOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setPurchaseTypeFilter(val))
                  }
                />
                <FilterDropdown
                  label="Chain Bill Count Level"
                  placeholder="All levels"
                  value={chainLevelFilter}
                  options={effectiveChainLevelOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setChainLevelFilter(val))
                  }
                />
                {!isSalesTab ? (
                  <>
                    <FilterDropdown
                      label="Product Availability"
                      placeholder="All availability"
                      value={stockAvailabilityFilter}
                      options={stockAvailabilityOptions}
                      onChange={(val) =>
                        applyFilterUpdate(() => setStockAvailabilityFilter(val))
                      }
                    />
                    <FilterDropdown
                      label="Item Status"
                      placeholder="All statuses"
                      value={statusFilter}
                      options={statusOptions}
                      onChange={(val) =>
                        applyFilterUpdate(() => setStatusFilter(val))
                      }
                    />
                  </>
                ) : (
                  <FilterDropdown
                    label="Sold Status"
                    placeholder="All products"
                    value={
                      salesSoldStatusFilter === "all" ? [] : [salesSoldStatusFilter]
                    }
                    options={soldStatusFilterOptions}
                    onChange={(val) =>
                      applyFilterUpdate(() =>
                        setSalesSoldStatusFilter(val?.[0] ?? "all")
                      )
                    }
                  />
                )}
              </Grid>
            </CustomContainer>

            {children}
          </>
        ) : null}
      </Flex>
    </GlobalWrapper>
  );
}
