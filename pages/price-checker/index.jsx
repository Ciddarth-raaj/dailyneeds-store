import React, { useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Box, Button, Flex } from "@chakra-ui/react";
import FileUpload from "../../components/FileUpload";
import { importFileToJSON, isValidFileType } from "../../util/fileImport";
import toast from "react-hot-toast";
import AgGrid from "../../components/AgGrid";
import Badge from "../../components/Badge";
import exportCSVFile from "../../util/exportCSVFile";
import moment from "moment";

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

function PriceChecker() {
  const [file, setFile] = useState(null);
  const [incorrectSellingPrices, setIncorrectSellingPrices] = useState([]);

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
      const itemData = groupedByItem[itemCode];

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

  const handleExport = () => {
    const allData = [];
    incorrectSellingPrices.forEach((item) => {
      allData.push(...item.items);
    });

    const TABLE_HEADER = {
      Outlet_ID: "Outlet_ID",
      Outlet_Name: "Outlet_Name",
      Item_Code: "Item_Code",
      Item_Name: "Item_Name",
      Batch_No: "Batch_No",
      Purchase_Price: "Purchase_Price",
      Landing_Cost: "Landing_Cost",
      Old_MRP: "Old_MRP",
      New_MRP: "New_MRP",
      Old_Selling_Price: "Old_Selling_Price",
      New_Selling_Price: "New_Selling_Price",
    };

    exportCSVFile(
      TABLE_HEADER,
      allData,
      "Price Checker (" + moment().format("DD-MM-YYYY") + ")"
    );
  };

  return (
    <GlobalWrapper title="Price Checker" permissionKey={["view_price_checker"]}>
      <CustomContainer
        title="Price Checker"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            variant="new-outline"
            onClick={handleExport}
          >
            Export
          </Button>
        }
      >
        <FileUpload
          value={file}
          onChange={onFileChange}
          accept=".xlsx,.xls,.csv"
          maxSize={52428800}
        />

        <Box mt="22px">
          <AgGrid rowData={incorrectSellingPrices} colDefs={colDefs} />
        </Box>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PriceChecker;
