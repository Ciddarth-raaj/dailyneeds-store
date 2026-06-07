import React, { useCallback, useMemo, useRef, useState } from "react";
import { Box, Flex, Grid, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import AgGrid from "../AgGrid";
import currencyFormatter from "../../util/currencyFormatter";
import { useStockHoldingDashboard } from "../../contexts/StockHoldingDashboardContext";
import BarChartCard from "./BarChartCard";
import {
  getStockHoldingItemsColumnDefs,
  getGroupedTableColDefs,
  STOCK_HOLDING_ITEMS_TABLE_KEY,
} from "./stockHoldingItemsColumnDefs";

const formatFullNumber = (value) => Number(value ?? 0).toLocaleString();

function StatCard({ title, value, color = "purple", icon }) {
  return (
    <Flex
      direction="column"
      align="flex-start"
      justify="center"
      p={6}
      borderWidth="1px"
      borderColor={`${color}.200`}
      borderRadius="10px"
      bg={`${color}.50`}
      h="100%"
      gap={2}
      w="100%"
    >
      {icon ? (
        <Box color={`${color}.300`} fontSize="2xl" lineHeight="1" opacity={0.65}>
          {icon}
        </Box>
      ) : null}
      <Text fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {title}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={`${color}.800`} lineHeight="1">
        {value}
      </Text>
    </Flex>
  );
}

const GROUPED_TABS = [
  { value: "products", label: "Products" },
  { value: "branch", label: "By Branch" },
  { value: "distributor", label: "By Distributor" },
  { value: "supplier", label: "By Supplier" },
  { value: "buyer", label: "By Buyer" },
  { value: "department", label: "By Department" },
  { value: "category", label: "By Category" },
  { value: "subcategory", label: "By Subcategory" },
  { value: "purchase_type", label: "By Purchase Type" },
  { value: "chain_bill_count_level", label: "By Chain Bill Count Level" },
  { value: "status", label: "By Item Status" },
];

export default function HoldingDashboardView() {
  const [groupedTab, setGroupedTab] = useState(0);
  const groupedTableRef = useRef(null);

  const {
    dashboard,
    toggleChartFilter,
    setStatusFilter,
    setPurchaseTypeFilter,
    setChainLevelFilter,
    openItemsModal,
    gridResetKey,
  } = useStockHoldingDashboard();

  const {
    filteredRows,
    itemStatusPieData,
    purchaseTypePieData,
    chainBillPieData,
    totalStockQty,
    totalStockValue,
    supplierTableRows,
    distributorTableRows,
    departmentTableRows,
    categoryTableRows,
    subcategoryTableRows,
    buyerTableRows,
    branchTableRows,
    purchaseTypeTableRows,
    chainLevelTableRows,
    statusTableRows,
  } = dashboard;

  const handleItemStatusBarClick = useCallback(
    (entry) => toggleChartFilter(setStatusFilter, entry?.filterValue),
    [toggleChartFilter, setStatusFilter]
  );

  const handlePurchaseTypeBarClick = useCallback(
    (entry) => toggleChartFilter(setPurchaseTypeFilter, entry?.filterValue),
    [toggleChartFilter, setPurchaseTypeFilter]
  );

  const handleChainBillBarClick = useCallback(
    (entry) => toggleChartFilter(setChainLevelFilter, entry?.filterValue),
    [toggleChartFilter, setChainLevelFilter]
  );

  const chartNumberFormatter = useCallback(
    (value) => (value === 0 || value == null ? "" : formatFullNumber(value)),
    []
  );

  const productsColumnDefs = useMemo(
    () => getStockHoldingItemsColumnDefs(),
    []
  );

  const getGroupedColDefsForTab = useCallback(
    (tabValue) =>
      getGroupedTableColDefs({ groupField: tabValue, openItemsModal }),
    [openItemsModal]
  );

  const gridKey = (tableKey) => `${tableKey}-${gridResetKey}`;

  const groupedRowDataByTab = {
    products: filteredRows,
    branch: branchTableRows,
    distributor: distributorTableRows,
    supplier: supplierTableRows,
    buyer: buyerTableRows,
    department: departmentTableRows,
    category: categoryTableRows,
    subcategory: subcategoryTableRows,
    purchase_type: purchaseTypeTableRows,
    chain_bill_count_level: chainLevelTableRows,
    status: statusTableRows,
  };

  return (
    <>
      <Grid
        templateColumns={{
          base: "1fr",
          lg: "minmax(0, 1fr) minmax(220px, 280px)",
        }}
        gap={4}
        alignItems="stretch"
      >
        <Grid
          templateColumns={{
            base: "1fr",
            md: "repeat(2, 1fr)",
            xl: "repeat(3, 1fr)",
          }}
          gap={4}
        >
          <BarChartCard
            title="Product Availability"
            data={itemStatusPieData}
            onBarClick={handleItemStatusBarClick}
            valueFormatter={chartNumberFormatter}
            legendValueFormatter={chartNumberFormatter}
          />
          <BarChartCard
            title="Purchase Type"
            data={purchaseTypePieData}
            onBarClick={handlePurchaseTypeBarClick}
            valueFormatter={chartNumberFormatter}
            legendValueFormatter={chartNumberFormatter}
          />
          <BarChartCard
            title="Chain Bill Count Level"
            data={chainBillPieData}
            onBarClick={handleChainBillBarClick}
            valueFormatter={chartNumberFormatter}
            legendValueFormatter={chartNumberFormatter}
          />
        </Grid>
        <Grid templateColumns="1fr" gap={4} w="100%" maxW={{ base: "100%", lg: "280px" }} justifySelf={{ lg: "end" }}>
          <StatCard
            title="Total Stock Qty"
            color="blue"
            value={formatFullNumber(totalStockQty)}
          />
          <StatCard
            title="Total Stock Value"
            color="purple"
            value={currencyFormatter(totalStockValue)}
          />
        </Grid>
      </Grid>

      <Box ref={groupedTableRef}>
        <CustomContainer title="Grouped Totals" filledHeader size="xs">
          <Tabs
            index={groupedTab}
            onChange={setGroupedTab}
            variant="line"
            colorScheme="purple"
          >
            <TabList flexWrap="wrap">
              {GROUPED_TABS.map((tab) => (
                <Tab key={tab.value} whiteSpace="nowrap" fontSize="sm">
                  {tab.label}
                </Tab>
              ))}
            </TabList>
            <TabPanels pt={4}>
              {GROUPED_TABS.map((tab) => (
                <TabPanel key={tab.value} px={0}>
                  <AgGrid
                    key={gridKey(
                      tab.value === "products"
                        ? `${STOCK_HOLDING_ITEMS_TABLE_KEY}-products`
                        : `stock-holding-dashboard-grouped-${tab.value}`
                    )}
                    tableKey={
                      tab.value === "products"
                        ? `${STOCK_HOLDING_ITEMS_TABLE_KEY}-products`
                        : `stock-holding-dashboard-grouped-${tab.value}`
                    }
                    rowData={groupedRowDataByTab[tab.value] ?? []}
                    columnDefs={
                      tab.value === "products"
                        ? productsColumnDefs
                        : getGroupedColDefsForTab(tab.value)
                    }
                  />
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
        </CustomContainer>
      </Box>
    </>
  );
}
