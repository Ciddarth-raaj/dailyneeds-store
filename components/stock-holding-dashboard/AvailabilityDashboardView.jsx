import React, { useCallback, useMemo, useState } from "react";
import { Box, Flex, Grid, Tab, TabList, TabPanel, TabPanels, Tabs, Text } from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import AgGrid from "../AgGrid";
import {
  enrichGroupedRowsWithAvailabilityPct,
  enrichGroupedRowsWithProductCount,
  STOCK_AVAILABILITY_ORDER,
} from "../../util/stockHoldingDashboard";
import { useStockHoldingDashboard } from "../../contexts/StockHoldingDashboardContext";
import BarChartCard from "./BarChartCard";
import {
  getStockHoldingItemsColumnDefs,
  getGroupedTableColDefs,
  STOCK_HOLDING_ITEMS_TABLE_KEY,
} from "./stockHoldingItemsColumnDefs";

const AVAILABILITY_STAT_COLORS = {
  available: "green",
  out_of_stock: "red",
};

const formatFullNumber = (value) => Number(value ?? 0).toLocaleString();

const pctCellRenderer = (props) => {
  const value = props.value;
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${value}%`;
};

function AvailabilityStatCard({ title, pct, count, color = "purple" }) {
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
      flex="1"
      minH="0"
      gap={2}
      w="100%"
    >
      <Text fontSize="xs" fontWeight="semibold" color={`${color}.700`}>
        {title}
      </Text>
      <Text fontSize="2xl" fontWeight="bold" color={`${color}.800`} lineHeight="1">
        {pct}%
      </Text>
      <Text fontSize="sm" color={`${color}.600`}>
        {formatFullNumber(count)} products
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
  { value: "product_availability", label: "By Product Availability" },
];

export default function AvailabilityDashboardView() {
  const [groupedTab, setGroupedTab] = useState(0);

  const {
    dashboard,
    toggleChartFilter,
    setStockAvailabilityFilter,
    openItemsModal,
    gridResetKey,
  } = useStockHoldingDashboard();

  const {
    filteredRows,
    stockAvailabilityBarData,
    stockAvailabilityTableRows,
    supplierTableRows,
    distributorTableRows,
    departmentTableRows,
    categoryTableRows,
    subcategoryTableRows,
    buyerTableRows,
    branchTableRows,
    purchaseTypeTableRows,
    chainLevelTableRows,
  } = dashboard;

  const handleAvailabilityBarClick = useCallback(
    (entry) =>
      toggleChartFilter(setStockAvailabilityFilter, entry?.filterValue),
    [toggleChartFilter, setStockAvailabilityFilter]
  );

  const chartNumberFormatter = useCallback(
    (value) => (value === 0 || value == null ? "" : formatFullNumber(value)),
    []
  );

  const enrichRows = useCallback(
    (rows) => enrichGroupedRowsWithAvailabilityPct(rows),
    []
  );

  const branchRows = useMemo(() => enrichRows(branchTableRows), [branchTableRows, enrichRows]);
  const distributorRows = useMemo(
    () => enrichRows(distributorTableRows),
    [distributorTableRows, enrichRows]
  );
  const supplierRows = useMemo(
    () => enrichRows(supplierTableRows),
    [supplierTableRows, enrichRows]
  );
  const buyerRows = useMemo(() => enrichRows(buyerTableRows), [buyerTableRows, enrichRows]);
  const departmentRows = useMemo(
    () => enrichRows(departmentTableRows),
    [departmentTableRows, enrichRows]
  );
  const categoryRows = useMemo(
    () => enrichRows(categoryTableRows),
    [categoryTableRows, enrichRows]
  );
  const subcategoryRows = useMemo(
    () => enrichRows(subcategoryTableRows),
    [subcategoryTableRows, enrichRows]
  );
  const purchaseTypeRows = useMemo(
    () => enrichRows(purchaseTypeTableRows),
    [purchaseTypeTableRows, enrichRows]
  );
  const chainLevelRows = useMemo(
    () => enrichRows(chainLevelTableRows),
    [chainLevelTableRows, enrichRows]
  );
  const availabilityStatusRows = useMemo(
    () => enrichGroupedRowsWithProductCount(stockAvailabilityTableRows),
    [stockAvailabilityTableRows]
  );

  const groupedTableColDefs = useMemo(() => {
    const pctColumns = [
      {
        field: "available_pct",
        headerName: "Available %",
        valueGetter: (params) => params.data?.available_pct,
        cellRenderer: pctCellRenderer,
      },
      {
        field: "out_of_stock_pct",
        headerName: "Out Of Stock %",
        valueGetter: (params) => params.data?.out_of_stock_pct,
        cellRenderer: pctCellRenderer,
      },
    ];

    return (groupField) =>
      getGroupedTableColDefs({
        groupField,
        openItemsModal,
        extraColumns: pctColumns,
        itemCountHeader: "Products",
      });
  }, [openItemsModal]);

  const availabilityStatusColDefs = useMemo(
    () => [
      { field: "group_name", headerName: "Status", flex: 1 },
      { field: "item_count", headerName: "Products", type: "number" },
      {
        field: "pct_split",
        headerName: "% Split",
        valueGetter: (params) => {
          const pct = params.data?.pct_split;
          if (pct == null || Number.isNaN(Number(pct))) return null;
          return pct;
        },
        cellRenderer: pctCellRenderer,
      },
      { field: "total_stock", headerName: "Stock", type: "number" },
      { field: "total_value", headerName: "Stock Value", type: "currency" },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => [
          {
            label: "View Items",
            value: "view_items",
            onClick: () =>
              openItemsModal(
                `${params.data?.group_name} - Items`,
                params.data?.items
              ),
          },
        ],
      },
    ],
    [openItemsModal]
  );

  const productsColumnDefs = useMemo(
    () => getStockHoldingItemsColumnDefs(),
    []
  );

  const availabilityStatCards = useMemo(() => {
    const byKey = Object.fromEntries(
      (stockAvailabilityBarData || []).map((entry) => [
        entry.filterValue,
        entry,
      ])
    );
    return STOCK_AVAILABILITY_ORDER.map(({ key, name }) => {
      const entry = byKey[key];
      return {
        key,
        name,
        pct: entry?.pct ?? 0,
        count: entry?.value ?? 0,
        color: AVAILABILITY_STAT_COLORS[key] ?? "gray",
      };
    });
  }, [stockAvailabilityBarData]);

  const gridKey = (tableKey) => `${tableKey}-${gridResetKey}`;

  const groupedRowDataByTab = {
    products: filteredRows,
    branch: branchRows,
    distributor: distributorRows,
    supplier: supplierRows,
    buyer: buyerRows,
    department: departmentRows,
    category: categoryRows,
    subcategory: subcategoryRows,
    purchase_type: purchaseTypeRows,
    chain_bill_count_level: chainLevelRows,
    product_availability: availabilityStatusRows,
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
        <BarChartCard
          title="Stock Availability by Status"
          data={stockAvailabilityBarData}
          onBarClick={handleAvailabilityBarClick}
          valueFormatter={chartNumberFormatter}
          legendValueFormatter={chartNumberFormatter}
          showPctInTooltip
        />

        <Flex
          direction="column"
          gap={4}
          w="100%"
          maxW={{ base: "100%", lg: "280px" }}
          justifySelf={{ lg: "end" }}
          alignSelf="stretch"
          minH={{ base: "auto", lg: "320px" }}
        >
          {availabilityStatCards.map((entry) => (
            <AvailabilityStatCard
              key={entry.key}
              title={entry.name}
              pct={entry.pct}
              count={entry.count}
              color={entry.color}
            />
          ))}
        </Flex>
      </Grid>

      <Box>
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
                        ? `${STOCK_HOLDING_ITEMS_TABLE_KEY}-availability-products`
                        : `stock-holding-dashboard-availability-${tab.value}`
                    )}
                    tableKey={
                      tab.value === "products"
                        ? `${STOCK_HOLDING_ITEMS_TABLE_KEY}-availability-products`
                        : tab.value === "product_availability"
                          ? "stock-holding-dashboard-grouped-availability-status"
                          : `stock-holding-dashboard-availability-${tab.value}`
                    }
                    rowData={groupedRowDataByTab[tab.value] ?? []}
                    columnDefs={
                      tab.value === "products"
                        ? productsColumnDefs
                        : tab.value === "product_availability"
                          ? availabilityStatusColDefs
                          : groupedTableColDefs(tab.value)
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
