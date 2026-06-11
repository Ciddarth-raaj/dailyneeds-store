import React, { useMemo, useState, useRef, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Box,
  Button,
  Flex,
  Progress,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Switch,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import FileUpload from "../../components/FileUpload";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import AgGrid from "../../components/AgGrid";
import Badge from "../../components/Badge";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";
import { usePriceChecker } from "../../customHooks/usePriceChecker";
import { usePriceCheckerUpload } from "../../customHooks/usePriceCheckerUpload";

const PRICE_CHECKER_TABLE_HEADER = {
  Outlet_ID: "Outlet_ID",
  Outlet_Name: "Outlet_Name",
  Item_Code: "Item_Code",
  Item_Name: "Item_Name",
  de_distributor: "Distributor",
  buyer_name: "Buyer",
  de_preparation_type: "Preparation Type",
  Batch_No: "Batch_No",
  Purchase_Price: "Purchase_Price",
  Landing_Cost: "Landing_Cost",
  Old_MRP: "Old_MRP",
  New_MRP: "New_MRP",
  Old_Selling_Price: "Old_Selling_Price",
  New_Selling_Price: "New_Selling_Price",
  Margin: "Margin",
  "Mark Down": "Mark Down",
  Expected_Selling: "Expected Selling",
  offer_price: "Offer Price",
  mpfd_markup_down: "mpfd_markup_down",
  mpfd_price_parameter: "mpfd_price_parameter",
  mpfd_value: "mpfd_value",
  mpfd_amt_perc: "mpfd_amt_perc",
  mpfd_roundoff_type: "mpfd_roundoff_type",
  mpfd_roundoff_value: "mpfd_roundoff_value",
};

const UPLOAD_REQUIRED_HEADERS = [
  "Item_Code",
  "Item_Name",
  "Old_MRP",
  "Old_Selling_Price",
  "Outlet_ID",
  "Outlet_Name",
];

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function normalizeMrpKey(v) {
  const trimmed = v == null ? "" : String(v).trim();
  if (!trimmed) return "";
  const n = Number(trimmed);
  return Number.isFinite(n) ? String(n) : trimmed;
}

function filterExpectedSellingPrices(expectedSellingPrices, incorrectSellingPrices) {
  const issueMrps = new Set(
    (incorrectSellingPrices || [])
      .map((entry) => normalizeMrpKey(entry.mrp))
      .filter(Boolean)
  );

  if (!issueMrps.size) return [];

  return (expectedSellingPrices || []).filter((entry) =>
    issueMrps.has(normalizeMrpKey(entry.mrp))
  );
}

function formatPriceValue(v) {
  if (v == null || v === "") return "";
  const n = toNum(v);
  if (n == null) return String(v);
  const fixed = (Math.round(n * 100) / 100).toFixed(2);
  return fixed.endsWith(".00") ? fixed.slice(0, -3) : fixed;
}

function mapLineItemsToPriceCheckerRows(items) {
  return items.map((row) => {
    const purchasePrice = toNum(row.Purchase_Price);
    const oldMrp = toNum(row.Old_MRP);
    const oldSelling = toNum(row.Old_Selling_Price);
    const safeName =
      typeof row.Item_Name === "string"
        ? row.Item_Name.replace(/[^a-zA-Z0-9]/g, "_")
        : row.Item_Name;

    const enrichedRow = {
      ...row,
      Item_Name: safeName,
      Purchase_Price: formatPriceValue(row.Purchase_Price),
      Landing_Cost: formatPriceValue(row.Landing_Cost),
      Old_MRP: formatPriceValue(row.Old_MRP),
      New_MRP: formatPriceValue(row.Old_MRP),
      Old_Selling_Price: formatPriceValue(row.Old_Selling_Price),
      New_Selling_Price: formatPriceValue(row.New_Selling_Price),
      Margin:
        oldMrp && purchasePrice != null
          ? formatPriceValue(100 - (purchasePrice / oldMrp) * 100)
          : "",
      "Mark Down":
        oldMrp && oldSelling != null
          ? formatPriceValue(100 - (oldSelling / oldMrp) * 100)
          : "",
      Expected_Selling: formatPriceValue(row.Expected_Selling),
      offer_price: formatPriceValue(row.offer_price),
    };

    const orderedRow = {};
    Object.keys(PRICE_CHECKER_TABLE_HEADER).forEach((key) => {
      orderedRow[key] = enrichedRow[key] ?? "";
    });

    return orderedRow;
  });
}

function groupLabel(value) {
  const label = value == null ? "" : String(value).trim();
  return label || "Unknown";
}

const GROUP_BY_TABS = [
  { value: "de_distributor", label: "Distributor" },
  { value: "buyer_name", label: "Buyer" },
  { value: "de_preparation_type", label: "Preparation Type" },
];

function buildGroupedRows(products, groupField) {
  if (!products?.length) return [];

  const grouped = products.reduce((acc, item) => {
    const groupName = groupLabel(item[groupField]);

    if (!acc[groupName]) {
      acc[groupName] = {
        group_name: groupName,
        group_field: groupField,
        productCount: 0,
        items: [],
      };
    }

    acc[groupName].productCount += 1;
    acc[groupName].items.push(...(item.items || []));

    return acc;
  }, {});

  return Object.values(grouped).sort((a, b) =>
    a.group_name.localeCompare(b.group_name)
  );
}

function UploadProgress({ progress }) {
  const processed = progress?.processed_rows ?? 0;
  const total = progress?.total_rows ?? 0;
  const hasTotal = total > 0;
  const percent = hasTotal
    ? Math.min(100, Math.round((processed / total) * 100))
    : progress?.percent ?? 0;

  const countLabel = hasTotal
    ? `${processed.toLocaleString()} / ${total.toLocaleString()} rows`
    : processed > 0
      ? `${processed.toLocaleString()} rows processed`
      : "Starting…";

  return (
    <Box mt={4} w="100%">
      <Flex justify="space-between" align="center" mb={2} gap={3} flexWrap="wrap">
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          {progress?.stage_label || progress?.message || "Processing upload"}
        </Text>
        <Text fontSize="sm" color="gray.600">
          {countLabel}
          {hasTotal ? ` (${percent}%)` : ""}
        </Text>
      </Flex>
      <Progress
        value={hasTotal ? percent : undefined}
        isIndeterminate={!hasTotal && processed === 0}
        hasStripe={!hasTotal && processed > 0}
        isAnimated
        size="sm"
        colorScheme="purple"
        borderRadius="md"
      />
    </Box>
  );
}

function PriceChecker() {
  const { products, meta, loading, error, refetch } = usePriceChecker();
  const handleUploadComplete = useCallback(
    async (result) => {
      await refetch();
      if (result?.silent) return;
      const rowCount = result?.total_rows ?? result?.inserted;
      toast.success(
        rowCount != null
          ? `Successfully imported ${rowCount.toLocaleString()} rows`
          : "Upload complete"
      );
    },
    [refetch]
  );

  const handleUploadError = useCallback((err) => {
    setFile(null);
    toast.error(err?.message || "Failed to upload price checker file");
  }, []);

  const { uploading, uploadProgress, startUpload } = usePriceCheckerUpload({
    onComplete: handleUploadComplete,
    onError: handleUploadError,
  });
  const [file, setFile] = useState(null);
  const [selectedGroupRows, setSelectedGroupRows] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [groupedTab, setGroupedTab] = useState(0);
  const [showAll, setShowAll] = useState(false);
  const productsGridRef = useRef(null);
  const groupGridRef = useRef(null);

  const activeGroupField = GROUP_BY_TABS[groupedTab]?.value ?? "de_distributor";

  const displayProducts = useMemo(() => {
    if (showAll) return products;
    return products.filter((product) => product.hasIssue);
  }, [products, showAll]);

  const onFileChange = async (nextFile) => {
    setFile(nextFile);
    if (!nextFile) return;

    try {
      if (!isValidFileType(nextFile)) {
        throw new Error("Invalid file type");
      }

      const result = await importFileToJSON(
        nextFile,
        UPLOAD_REQUIRED_HEADERS,
        1
      );
      await startUpload(result.data);
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "Failed to upload price checker file");
      setFile(null);
    }
  };

  const groupedCounts = useMemo(() => {
    const counts = {};
    GROUP_BY_TABS.forEach((tab) => {
      counts[tab.value] = buildGroupedRows(displayProducts, tab.value).length;
    });
    return counts;
  }, [displayProducts]);

  const groupedRows = useMemo(
    () => buildGroupedRows(displayProducts, activeGroupField),
    [displayProducts, activeGroupField]
  );

  const exportItems = useCallback((items, titleSuffix) => {
    const sanitizeFileName = (name) =>
      (name ?? "").replace(/[^a-zA-Z0-9]/g, "_");

    const allData = mapLineItemsToPriceCheckerRows(items);

    exportCSVFile(
      PRICE_CHECKER_TABLE_HEADER,
      allData,
      sanitizeFileName(
        `Price Checker${
          titleSuffix ? " " + titleSuffix : ""
        }${moment().format("DDMMYYYYHHmm")}`
      )
    );
  }, []);

  const getFilteredProducts = useCallback(() => {
    let filteredProducts = displayProducts;
    if (productsGridRef.current?.api) {
      const filteredRows = [];
      productsGridRef.current.api.forEachNodeAfterFilter((node) => {
        if (node.data) {
          filteredRows.push(node.data);
        }
      });
      filteredProducts = filteredRows;
    }
    return filteredProducts;
  }, [displayProducts]);

  const handleExportByGroup = useCallback(
    (groupName, groupField = activeGroupField) => {
      const filteredProducts = getFilteredProducts();
      const groupProducts = filteredProducts.filter(
        (product) => groupLabel(product[groupField]) === groupName
      );

      const itemsToExport = [];
      groupProducts.forEach((product) => {
        itemsToExport.push(...product.items);
      });

      exportItems(itemsToExport, groupName);
      toast.success("CSV downloaded");
    },
    [getFilteredProducts, exportItems, activeGroupField]
  );

  const colDefs = useMemo(() => [
    {
      field: "Item_Code",
      headerName: "ID",
      type: "id",
    },
    {
      field: "Item_Name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "de_distributor",
      headerName: "Distributor",
      type: "capitalized",
    },
    {
      field: "buyer_name",
      headerName: "Buyer",
      type: "capitalized",
    },
    {
      field: "de_preparation_type",
      headerName: "PType",
      type: "capitalized",
      maxWidth: 100,
    },
    {
      field: "incorrectSellingPrices",
      headerName: "Incorrect Selling Prices",
      minWidth: 420,
      flex: 1.5,
      autoHeight: true,
      cellRenderer: (props) => {
        const sellingPrices = showAll
          ? props.data?.allSellingPrices || []
          : props.value || [];

        return (
          <Flex flexDirection="column" gap={2} p={4}>
            {sellingPrices.map((price) => {
              const isIssue = (price.sellingPrices || []).length > 1;

              return (
                <Flex key={price.mrp} gap={2} alignItems="center" h="100%" flexWrap="wrap">
                  <Badge>{`MRP: ${formatPriceValue(price.mrp)}`}</Badge>

                  <Badge colorScheme={isIssue ? "orange" : "gray"}>{`Selling Prices: ${price.sellingPrices
                    .map((value) => formatPriceValue(value))
                    .join(" | ")}`}</Badge>
                </Flex>
              );
            })}
          </Flex>
        );
      },
    },
    {
      field: "offerPrice",
      headerName: "Offer Price",
      hideByDefault: true,
      type: "currency",
      minWidth: 120,
    },
    {
      field: "expectedSellingPrices",
      headerName: "Expected Selling",
      hideByDefault: true,
      minWidth: 320,
      flex: 1,
      autoHeight: true,
      cellRenderer: (props) => {
        const entries = showAll
          ? props.data?.allExpectedSellingPrices || []
          : filterExpectedSellingPrices(
              props.value,
              props.data?.incorrectSellingPrices
            );

        return (
          <Flex flexDirection="column" gap={2} p={4}>
            {entries.map((entry) => {
              const label = entry.mrp
                ? `MRP: ${formatPriceValue(entry.mrp)} → ${formatPriceValue(entry.expectedSelling)}`
                : `PP: ${formatPriceValue(entry.purchasePrice)} → ${formatPriceValue(entry.expectedSelling)}`;

              return (
                <Flex
                  key={entry.mrp ?? entry.purchasePrice}
                  gap={2}
                  alignItems="center"
                  h="100%"
                  flexWrap="wrap"
                >
                  <Badge colorScheme="green">{label}</Badge>
                </Flex>
              );
            })}
          </Flex>
        );
      },
    },
  ], [showAll]);

  const handleExport = useCallback(() => {
    if (tabIndex === 1) {
      if (!selectedGroupRows.length) {
        toast.error("Select at least one group to export");
        return;
      }

      const selectedKeys = new Set(
        selectedGroupRows.map((row) => groupLabel(row?.group_name))
      );

      const filteredProducts = getFilteredProducts();
      const matchingProducts = filteredProducts.filter((product) =>
        selectedKeys.has(groupLabel(product[activeGroupField]))
      );

      const allItems = [];
      matchingProducts.forEach((item) => {
        allItems.push(...item.items);
      });

      exportItems(allItems);
      toast.success(
        `Exported ${allItems.length} line item${
          allItems.length === 1 ? "" : "s"
        } from ${selectedKeys.size} group${
          selectedKeys.size === 1 ? "" : "s"
        }`
      );
      return;
    }

    const filteredProducts = getFilteredProducts();

    const allItems = [];
    filteredProducts.forEach((item) => {
      allItems.push(...item.items);
    });

    exportItems(allItems);
  }, [
    tabIndex,
    selectedGroupRows,
    activeGroupField,
    getFilteredProducts,
    exportItems,
  ]);

  const handleTabChange = useCallback((index) => {
    setTabIndex(index);
    setSelectedGroupRows([]);
  }, []);

  const handleGroupedTabChange = useCallback((index) => {
    setGroupedTab(index);
    setSelectedGroupRows([]);
  }, []);

  const groupColDefs = useMemo(
    () => [
      {
        field: "group_name",
        headerName: GROUP_BY_TABS[groupedTab]?.label ?? "Group",
        type: "capitalized",
        cellRenderer: (params) => {
          const name = params.value ?? "";
          return (
            <Tooltip label="Download CSV" placement="bottom" openDelay={500}>
              <Text
                as="span"
                cursor="pointer"
                textDecoration="underline"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExportByGroup(
                    params.data?.group_name,
                    params.data?.group_field
                  );
                }}
              >
                {name || "Unknown"}
              </Text>
            </Tooltip>
          );
        },
      },
      {
        field: "productCount",
        headerName: "No. of Products",
        type: "number",
      },
    ],
    [groupedTab, handleExportByGroup]
  );

  const exportButtonLabel =
    tabIndex === 0
      ? `Export`
      : `Export (${selectedGroupRows.length} items)`;

  const activeGroupTableKey = `price-checker-grouped-${activeGroupField}`;

  const metaSummary = meta?.uploaded_at
    ? `${meta.total_rows ?? 0} rows · ${
        meta.issue_product_count ?? 0
      } products with issues${
        meta.total_product_count != null
          ? ` · ${meta.total_product_count} products total`
          : ""
      } · uploaded ${moment(meta.uploaded_at).format("DD MMM YYYY, HH:mm")}`
    : null;

  const productsTabLabel = showAll
    ? `Products List (${displayProducts.length})`
    : `Products List (${displayProducts.length}${
        meta?.total_product_count != null
          ? ` of ${meta.total_product_count}`
          : ""
      })`;

  return (
    <GlobalWrapper title="Price Checker" permissionKey={["view_price_checker"]}>
      <CustomContainer
        title="Price Checker"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            size="sm"
            onClick={handleExport}
            isDisabled={
              uploading ||
              loading ||
              !displayProducts.length ||
              (tabIndex === 1 && selectedGroupRows.length === 0)
            }
          >
            {exportButtonLabel}
          </Button>
        }
      >
        <FileUpload
          value={file}
          onChange={onFileChange}
          accept=".xlsx,.xls,.csv"
          maxSize={52428800}
          disabled={uploading}
        />

        {uploadProgress ? <UploadProgress progress={uploadProgress} /> : null}

        {metaSummary ? (
          <Text mt={3} fontSize="sm" color="gray.600">
            {metaSummary}
          </Text>
        ) : null}

        {error ? (
          <Text mt={3} fontSize="sm" color="red.500">
            {error?.message || "Failed to load price checker data."}
          </Text>
        ) : null}

        <Box mt="42px">
          <Tabs
            size="sm"
            colorScheme="purple"
            index={tabIndex}
            onChange={handleTabChange}
          >
            <TabList>
              <Tab>{productsTabLabel}</Tab>
              <Tab>Group By</Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0} pt={4}>
                <Flex justify="flex-end" align="center" gap={2} mb={3}>
                  <Text fontSize="sm" color="gray.700">
                    Show All
                  </Text>
                  <Switch
                    size="sm"
                    colorScheme="purple"
                    isChecked={showAll}
                    onChange={(e) => setShowAll(e.target.checked)}
                  />
                </Flex>
                <AgGrid
                  ref={productsGridRef}
                  rowData={displayProducts}
                  colDefs={colDefs}
                />
              </TabPanel>
              <TabPanel p={0} pt={4}>
                <Tabs
                  size="sm"
                  colorScheme="purple"
                  variant="enclosed"
                  index={groupedTab}
                  onChange={handleGroupedTabChange}
                >
                  <TabList mb={4}>
                    {GROUP_BY_TABS.map((tab) => (
                      <Tab key={tab.value}>
                        {tab.label} ({groupedCounts[tab.value] ?? 0})
                      </Tab>
                    ))}
                  </TabList>
                </Tabs>
                <AgGrid
                  key={activeGroupTableKey}
                  ref={groupGridRef}
                  tableKey={activeGroupTableKey}
                  rowData={groupedRows}
                  colDefs={groupColDefs}
                  selectMode
                  onSelectionChanged={setSelectedGroupRows}
                  getRowId={(params) =>
                    `${params.data?.group_field ?? activeGroupField}:${params.data?.group_name ?? "unknown"}`
                  }
                />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Box>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PriceChecker;
