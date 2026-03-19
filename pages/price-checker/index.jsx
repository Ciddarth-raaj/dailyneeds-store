import React, { useMemo, useState, useRef, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Box,
  Button,
  Flex,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import FileUpload from "../../components/FileUpload";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import AgGrid from "../../components/AgGrid";
import Badge from "../../components/Badge";
import exportCSVFile, {
  generateCsvFromObjects,
} from "../../util/exportCSVFile";
import JSZip from "jszip";
import moment from "moment";
import { useProducts } from "../../customHooks/useProducts";

// {
//     "Outlet_ID": "2",
//     "Outlet_Name": "Warehouse",
//     "Item_Code": "11",
//     "Item_Name": "TOP RAMEN MASALA NOODLES 280G",
//     "Batch_No": "3312",
//     "Purchase_Price": "46.6861",
//     "Landing_Cost": "0",
//     "Old_MRP": "57",
//     "New_MRP": " ",
//     "Old_Selling_Price": "50.8",
//     "New_Selling_Price": ""
// }

const PRICE_CHECKER_TABLE_HEADER = {
  Outlet_ID: "Outlet_ID",
  Outlet_Name: "Outlet_Name",
  Item_Code: "Item_Code",
  Item_Name: "Item_Name",
  de_distributor: "Distributor",
  de_preparation_type: "Preparation Type",
  Batch_No: "Batch_No",
  Purchase_Price: "Purchase_Price",
  Landing_Cost: "Landing_Cost",
  Old_MRP: "Old_MRP",
  New_MRP: "New_MRP",
  Old_Selling_Price: "Old_Selling_Price",
  New_Selling_Price: "New_Selling_Price",
  Margin: "Margin",
  "Mark Up": "Mark Up",
};

function mapLineItemsToPriceCheckerRows(items, mappedProducts) {
  return items.map((row) => {
    const product = mappedProducts?.[row.Item_Code];
    const safeName =
      typeof row.Item_Name === "string"
        ? row.Item_Name.replace(/[^a-zA-Z0-9]/g, "_")
        : row.Item_Name;

    const enrichedRow = {
      ...row,
      Item_Name: safeName,
      de_distributor: product?.de_distributor || "",
      de_preparation_type: product?.de_preparation_type || "",
      Margin: (100 - (row.Purchase_Price / row.Old_MRP) * 100).toFixed(2),
      "Mark Up": (100 - (row.Old_Selling_Price / row.Old_MRP) * 100).toFixed(2),
    };

    const orderedRow = {};
    Object.keys(PRICE_CHECKER_TABLE_HEADER).forEach((key) => {
      orderedRow[key] = enrichedRow[key] ?? "";
    });

    return orderedRow;
  });
}

function PriceChecker() {
  const { products } = useProducts({
    limit: 50000,
    fetchAll: true,
    fetchNonOnline: true,
  });
  const [file, setFile] = useState(null);
  const [incorrectSellingPrices, setIncorrectSellingPrices] = useState([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [selectedDistributorRows, setSelectedDistributorRows] = useState([]);
  const productsGridRef = useRef(null);
  const distributorGridRef = useRef(null);

  const mappedProducts = useMemo(() => {
    if (products) {
      const map = {};

      products.forEach((product) => {
        map[product.product_id] = product;
      });

      return map;
    }
  }, [products]);

  const onFileChange = (file) => {
    setFile(file);
    if (file) {
      parseFile(file, [
        "Item_Code",
        "Item_Name",
        "Old_MRP",
        "Old_Selling_Price",
        "Outlet_ID",
        "Outlet_Name",
      ]);
    }
  };

  const parseFile = async (file, requiredHeaders = []) => {
    try {
      if (!isValidFileType(file)) {
        throw new Error("Invalid file type");
      }

      const result = await importFileToJSON(file, requiredHeaders, 1);
      handleParsedData(result.data);
      toast.success(`Successfully imported ${result.totalRows} rows`);
    } catch (error) {
      console.error(error);
      toast.error(error.message);
    }
  };

  const handleParsedData = (data) => {
    // Group items by Item_Code only (1 object per item)
    const groupedByItem = data.reduce((acc, item) => {
      const itemCode = item.Item_Code?.trim() || "";

      if (!acc[itemCode]) {
        acc[itemCode] = {
          Item_Code: itemCode,
          Item_Name: item.Item_Name?.trim() || "",
          mrps: [],
          sellingPrices: [],
          items: [],
          incorrectSellingPrices: [],
        };
      }

      // Add the original item to the items array
      acc[itemCode].items.push(item);

      // Collect MRP values
      const mrp = item.Old_MRP?.trim() || "";
      if (mrp && !acc[itemCode].mrps.includes(mrp)) {
        acc[itemCode].mrps.push(mrp);
      }

      // Collect selling price values
      const sellingPrice = item.Old_Selling_Price?.trim() || "";
      if (sellingPrice && !acc[itemCode].sellingPrices.includes(sellingPrice)) {
        acc[itemCode].sellingPrices.push(sellingPrice);
      }

      return acc;
    }, {});

    // Find items with same MRP but different selling prices
    const itemsWithIncorrectValues = [];

    Object.keys(groupedByItem).forEach((itemCode) => {
      let itemData = groupedByItem[itemCode];
      itemData = {
        ...itemData,
        Item_Name:
          mappedProducts[itemData.Item_Code]?.gf_item_name ||
          mappedProducts[itemData.Item_Code]?.de_display_name ||
          "",
        de_distributor:
          mappedProducts[itemData.Item_Code]?.de_distributor || "",
        de_preparation_type:
          mappedProducts[itemData.Item_Code]?.de_preparation_type || "",
      };

      // Group items by MRP to find inconsistencies
      const mrpGroups = itemData.items.reduce((acc, item) => {
        const mrp = item.Old_MRP?.trim() || "";
        if (!acc[mrp]) {
          acc[mrp] = [];
        }
        acc[mrp].push(item);
        return acc;
      }, {});

      // Check each MRP group for different selling prices
      Object.keys(mrpGroups).forEach((mrp) => {
        const itemsWithSameMRP = mrpGroups[mrp];
        const sellingPricesForMRP = itemsWithSameMRP
          .map((item) => item.Old_Selling_Price?.trim() || "")
          .filter((price) => price !== "");

        const uniqueSellingPrices = [...new Set(sellingPricesForMRP)];

        // If there are multiple different selling prices for the same MRP
        if (uniqueSellingPrices.length > 1) {
          // Store incorrect selling prices for this MRP
          itemData.incorrectSellingPrices.push({
            mrp: mrp,
            sellingPrices: uniqueSellingPrices,
          });

          itemsWithIncorrectValues.push(itemData);
        }
      });
    });

    setIncorrectSellingPrices(itemsWithIncorrectValues);
  };

  const productsLineItemsCount = useMemo(() => {
    return incorrectSellingPrices.reduce(
      (sum, p) => sum + (Array.isArray(p.items) ? p.items.length : 0),
      0
    );
  }, [incorrectSellingPrices]);

  const groupedByDistributor = useMemo(() => {
    if (!incorrectSellingPrices || incorrectSellingPrices.length === 0) {
      return [];
    }

    const grouped = incorrectSellingPrices.reduce((acc, item) => {
      const distributor = item.de_distributor || "Unknown";

      if (!acc[distributor]) {
        acc[distributor] = {
          de_distributor: distributor,
          productCount: 0,
          items: [],
        };
      }

      acc[distributor].productCount += 1;
      acc[distributor].items.push(...item.items);

      return acc;
    }, {});

    return Object.values(grouped);
  }, [incorrectSellingPrices]);

  const exportItems = useCallback(
    (items, titleSuffix) => {
      const sanitizeFileName = (name) =>
        (name ?? "").replace(/[^a-zA-Z0-9]/g, "_"); // replaces all non-alphanumeric with _

      const allData = mapLineItemsToPriceCheckerRows(items, mappedProducts);

      exportCSVFile(
        PRICE_CHECKER_TABLE_HEADER,
        allData,
        sanitizeFileName(
          `Price Checker${
            titleSuffix ? " " + titleSuffix : ""
          }${moment().format("DDMMYYYYHHmm")}`
        )
      );
    },
    [mappedProducts]
  );

  const getFilteredIncorrectSellingPrices = useCallback(() => {
    let filteredProducts = incorrectSellingPrices;
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
  }, [incorrectSellingPrices]);

  const handleExportByDistributor = useCallback(
    (distributor) => {
      const filteredProducts = getFilteredIncorrectSellingPrices();
      const distributorProducts = filteredProducts.filter(
        (product) => (product.de_distributor || "") === (distributor || "")
      );

      const itemsToExport = [];
      distributorProducts.forEach((product) => {
        itemsToExport.push(...product.items);
      });

      exportItems(itemsToExport, distributor);
      toast.success("CSV downloaded");
    },
    [getFilteredIncorrectSellingPrices, exportItems]
  );

  const colDefs = [
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
      field: "de_preparation_type",
      headerName: "PType",
      type: "capitalized",
      maxWidth: 100,
    },
    {
      field: "incorrectSellingPrices",
      headerName: "Incorrect Selling Prices",
      autoHeight: true,
      cellRenderer: (props) => {
        return (
          <Flex flexDirection="column" gap={2} p={4}>
            {props.value.map((price) => {
              return (
                <Flex key={price.mrp} gap={2} alignItems="center" h="100%">
                  <Badge>{`MRP: ${price.mrp}`}</Badge>

                  <Badge colorScheme="orange">{`Selling Prices: ${price.sellingPrices.join(
                    " | "
                  )}`}</Badge>
                </Flex>
              );
            })}
          </Flex>
        );
      },
    },
  ];

  const handleExport = useCallback(async () => {
    if (tabIndex === 1) {
      if (!selectedDistributorRows.length) {
        toast.error("Select at least one distributor group to export");
        return;
      }

      const sanitizeFileName = (name) =>
        (name ?? "").replace(/[^a-zA-Z0-9]/g, "_");

      const stamp = moment().format("DDMMYYYYHHmm");
      const folderBase = sanitizeFileName(`Price_Checker_Export_${stamp}`);
      const zip = new JSZip();
      const folder = zip.folder(folderBase);

      const filteredProducts = getFilteredIncorrectSellingPrices();
      const nameCount = new Map();

      try {
        selectedDistributorRows.forEach((row) => {
          const distributor = row.de_distributor ?? "";
          const distributorProducts = filteredProducts.filter(
            (product) => (product.de_distributor || "") === distributor
          );

          const itemsToExport = [];
          distributorProducts.forEach((product) => {
            itemsToExport.push(...product.items);
          });

          const allData = mapLineItemsToPriceCheckerRows(
            itemsToExport,
            mappedProducts
          );
          const rows = [PRICE_CHECKER_TABLE_HEADER, ...allData];
          const csv = generateCsvFromObjects(rows);

          const base = sanitizeFileName(
            `Price Checker ${distributor || "Unknown"} ${stamp}`
          );
          const n = (nameCount.get(base) || 0) + 1;
          nameCount.set(base, n);
          const uniqueBase = n > 1 ? `${base}_${n}` : base;
          folder.file(`${uniqueBase}.csv`, csv);
        });

        const blob = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${folderBase}.zip`);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success(
          `Downloaded folder with ${selectedDistributorRows.length} file${
            selectedDistributorRows.length === 1 ? "" : "s"
          } (${folderBase}.zip)`
        );
      } catch (e) {
        console.error(e);
        toast.error(e?.message || "Export failed");
      }
      return;
    }

    const filteredProducts = getFilteredIncorrectSellingPrices();

    const allItems = [];
    filteredProducts.forEach((item) => {
      allItems.push(...item.items);
    });

    exportItems(allItems);
  }, [
    tabIndex,
    selectedDistributorRows,
    getFilteredIncorrectSellingPrices,
    mappedProducts,
    exportItems,
  ]);

  const handleTabChange = useCallback((index) => {
    setTabIndex(index);
    setSelectedDistributorRows([]);
  }, []);

  const distributorColDefs = useMemo(
    () => [
      {
        field: "de_distributor",
        headerName: "Distributor",
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
                  handleExportByDistributor(params.data?.de_distributor);
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
    [handleExportByDistributor]
  );

  const exportButtonLabel =
    tabIndex === 0
      ? `Export`
      : `Export (${selectedDistributorRows.length} items)`;

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
            isDisabled={tabIndex === 1 && selectedDistributorRows.length === 0}
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
        />

        <Box mt="42px">
          <Tabs
            size="sm"
            colorScheme="purple"
            index={tabIndex}
            onChange={handleTabChange}
          >
            <TabList>
              <Tab>Products List</Tab>
              <Tab>Grouped By Distributor</Tab>
            </TabList>
            <TabPanels>
              <TabPanel p={0} pt={4}>
                <AgGrid
                  ref={productsGridRef}
                  rowData={incorrectSellingPrices}
                  colDefs={colDefs}
                />
              </TabPanel>
              <TabPanel p={0} pt={4}>
                <AgGrid
                  ref={distributorGridRef}
                  rowData={groupedByDistributor}
                  colDefs={distributorColDefs}
                  selectMode
                  onSelectionChanged={setSelectedDistributorRows}
                  getRowId={(params) =>
                    String(params.data?.de_distributor ?? "unknown")
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
