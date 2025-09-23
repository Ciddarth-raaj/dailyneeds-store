import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import Table from "../../components/table/table";
import { Flex, Text } from "@chakra-ui/react";
import { useCleaningPacking } from "../../customHooks/useCleaningPacking";
import exportCSVFile, { exportToExcel } from "../../util/exportCSVFile";
import moment from "moment";

const BULK_ITEMS_HEADINGS = {
  sno: "S.No",
  article_name: "Name",
  parent_stock: "Current Stock",
  repackage_conversion: "Repack Conversion",
  bulk_weight: "Bulk Weight",
  priority_score: "Bulk Priority",
};

function CleaningPacking() {
  const { items: cleaningItems } = useCleaningPacking({ cleaning: "true" });
  const { items: nonCleaningItems } = useCleaningPacking({ cleaning: "false" });

  const handleExport = (list, name) => {
    const TABLE_HEADER = {
      sno: "S.No",
      article_name: "Name",
      parent_stock: "Current Stock",
      repackage_conversion: "Repack Conversion",
      bulk_weight: "Bulk Weight",
      priority_score: "Bulk Priority",
      gross_weight: "Gross Weight",
      bag_weight: "Bag Weight",
      wastage: "Wastage",
      net_weight: "Net Weight",
      start_time: "Start Time",
      end_time: "End Time",
      no_of_persons: "No Of Persons",
    };

    const formattedData = [];
    list.forEach((item) => {
      formattedData.push({
        sno: item.sno,
        article_name: item.article_name,
        parent_stock: item.parent_stock,
        repackage_conversion: item.repackage_conversion,
        bulk_weight: item.bulk_weight,
        priority_score: item.priority_score,
        gross_weight: "",
        bag_weight: "",
        wastage: "",
        net_weight: "",
        start_time: "",
        end_time: "",
        no_of_persons: "",
      });
    });

    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      `${name}-${moment(fromDate).format("DD-MM-YYYY")}`
    );
  };

  const formatDataForExportAll = (list) => {
    return list.map((item) => ({
      "S.No": item.sno,
      Name: item.article_name,
      "Current Stock": item.parent_stock,
      "Repack Conversion": item.repackage_conversion,
      "Bulk Weight": item.bulk_weight,
      "Bulk Priority": item.priority_score,
      "Gross Weight": item.gross_weight,
      "Bag Weight": item.bag_weight,
      Wastage: item.wastage,
      "Net Weight": item.net_weight,
      "Start Time": item.start_time,
      "End Time": item.end_time,
      "No Of Persons": item.no_of_persons,
    }));
  };

  const handleExportAll = () => {
    exportToExcel(
      [
        formatDataForExportAll(cleaningItems),
        formatDataForExportAll(nonCleaningItems),
      ],
      ["Bulk Items for Cleaning", "Bulk Items for Without Cleaning"],
      `cleaning-packing-${moment().format("DD-MM-YYYY")}.xlsx`
    );
  };

  const getLastSyncedComponent = (list) => {
    if (!list || list.length === 0) {
      return "";
    }

    return (
      <Text fontSize="sm" color="gray.400">
        Last Sync - {moment(list[0].created_at).fromNow()}
      </Text>
    );
  };

  return (
    <GlobalWrapper title="Cleaning and Packing">
      <CustomContainer
        title="Cleaning and Packing"
        filledHeader
        rightSection={
          <Button colorScheme="whiteAlpha" onClick={handleExportAll}>
            Export All
          </Button>
        }
      >
        <Flex gap={6} flexDirection="column">
          <CustomContainer
            title="Bulk Items for Cleaning"
            smallHeader
            toggleChildren
            defaultOpen={false}
            rightSection={
              <Flex alignItems="center" gap={4}>
                {getLastSyncedComponent(cleaningItems)}

                <Button
                  colorScheme="purple"
                  onClick={() => handleExport(cleaningItems, "cleaning")}
                >
                  Export
                </Button>
              </Flex>
            }
          >
            <Table
              heading={BULK_ITEMS_HEADINGS}
              rows={cleaningItems}
              sortCallback={() => {}}
              variant="plain"
              size="sm"
              showPagination
              defaultRowsPerPage={10}
            />
          </CustomContainer>

          <CustomContainer
            title="Bulk Items for Without Cleaning"
            smallHeader
            toggleChildren
            defaultOpen={false}
            rightSection={
              <Flex alignItems="center" gap={4}>
                {getLastSyncedComponent(nonCleaningItems)}

                <Button
                  colorScheme="purple"
                  onClick={() => handleExport(nonCleaningItems, "no-cleaning")}
                >
                  Export
                </Button>
              </Flex>
            }
          >
            <Table
              heading={BULK_ITEMS_HEADINGS}
              rows={nonCleaningItems}
              sortCallback={() => {}}
              variant="plain"
              size="sm"
              showPagination
              defaultRowsPerPage={10}
            />
          </CustomContainer>
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default CleaningPacking;
