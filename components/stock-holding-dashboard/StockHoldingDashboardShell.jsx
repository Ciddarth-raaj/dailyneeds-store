import React, { useMemo } from "react";
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

const DASHBOARD_TABS = [
  { value: "holding", label: "Stock Holding" },
  { value: "availability", label: "Stock Availability" },
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
  return (
    <SearchableDropdown
      label={label}
      placeholder={placeholder}
      multiple
      size="sm"
      options={toDropdownOptions(options)}
      value={value}
      onChange={(val) => onChange(Array.isArray(val) ? val : [])}
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
    loading,
    refreshing,
    fetchProgress,
    lastSyncAt,
    refreshData,
    cancelFetch,
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

  const lastSyncFormatted = useMemo(() => {
    if (!lastSyncAt) return null;
    const m = moment(lastSyncAt);
    return m.isValid() ? m.format("DD MMM YYYY, hh:mm A") : null;
  }, [lastSyncAt]);

  const hasReportData = rawItems.length > 0;
  const showDashboard = hasReportData && !enriching;
  const tabIndex = DASHBOARD_TABS.findIndex((t) => t.value === activeTab);

  if (loading && !refreshing) {
    return (
      <GlobalWrapper
        title="Stock Holding Dashboard"
        permissionKey="view_stock_holding_dashboard"
      >
        <Center minH="320px" flexDirection="column" gap={4} px={6} w="100%">
          <Spinner size="lg" color="purple.500" />
          <Box w="100%" maxW="520px">
            <ReportFetchProgress
              progress={fetchProgress}
              title="Loading report"
              onStop={cancelFetch}
            />
          </Box>
        </Center>
      </GlobalWrapper>
    );
  }

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
              onChange={(idx) => onTabChange(DASHBOARD_TABS[idx]?.value ?? "holding")}
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
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </Box>
              <Box>
                <Text fontSize="xs" mb={1} color="gray.500">
                  Last sync
                </Text>
                <Text fontSize="sm" color="gray.700">
                  {lastSyncFormatted || "No sync data"}
                </Text>
              </Box>
              <Button
                size="sm"
                variant="outline"
                leftIcon={<RepeatIcon />}
                onClick={refreshData}
                isDisabled={loading || refreshing}
              >
                Refresh
              </Button>
            </Flex>
          </Flex>
        </CustomContainer>

        {refreshing ? (
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
        ) : showDashboard ? (
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
                  options={branchOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setBranchFilter(val))
                  }
                />
                <FilterDropdown
                  label="Buyer"
                  placeholder="All buyers"
                  value={buyerFilter}
                  options={buyerOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setBuyerFilter(val))
                  }
                />
                <FilterDropdown
                  label="Distributor"
                  placeholder="All distributors"
                  value={distributorFilter}
                  options={distributorOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setDistributorFilter(val))
                  }
                />
                <FilterDropdown
                  label="Supplier"
                  placeholder="All suppliers"
                  value={supplierFilter}
                  options={supplierOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setSupplierFilter(val))
                  }
                />
                <FilterDropdown
                  label="Department"
                  placeholder="All departments"
                  value={departmentFilter}
                  options={departmentOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setDepartmentFilter(val))
                  }
                />
                <FilterDropdown
                  label="Category"
                  placeholder="All categories"
                  value={categoryFilter}
                  options={categoryOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setCategoryFilter(val))
                  }
                />
                <FilterDropdown
                  label="Subcategory"
                  placeholder="All subcategories"
                  value={subcategoryFilter}
                  options={subcategoryOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setSubcategoryFilter(val))
                  }
                />
                <FilterDropdown
                  label="Purchase Type"
                  placeholder="All purchase types"
                  value={purchaseTypeFilter}
                  options={purchaseTypeOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setPurchaseTypeFilter(val))
                  }
                />
                <FilterDropdown
                  label="Chain Bill Count Level"
                  placeholder="All levels"
                  value={chainLevelFilter}
                  options={chainLevelOptions}
                  onChange={(val) =>
                    applyFilterUpdate(() => setChainLevelFilter(val))
                  }
                />
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
              </Grid>
            </CustomContainer>

            {children}
          </>
        ) : null}
      </Flex>
    </GlobalWrapper>
  );
}
