import React from "react";
import CustomContainer from "../CustomContainer";
import { Button, Flex, Text } from "@chakra-ui/react";
import Table from "../table/table";
import moment from "moment";
import exportCSVFile from "../../util/exportCSVFile";

const BULK_ITEMS_HEADINGS = {
  sno: "S.No",
  article_name: "Name",
  parent_stock: "Current Stock",
  repackage_conversion: "Repack Conversion",
  bulk_weight: "Bulk Weight",
  priority_score: "Bulk Priority",
};

function CleaningSection({ cleaningItems, nonCleaningItems }) {
  const handleExport = (list, name) => {
    const TABLE_HEADER = {
      sno: "S.No",
      article_name: "Name",
      parent_stock: "Current Stock",
      repackage_conversion: "Repack Conversion",
      bulk_weight: "Bulk Weight",
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
      `${name}-${moment().format("DD-MM-YYYY")}`
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
    <>
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
    </>
  );
}

export default CleaningSection;
