import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import { Flex, Text } from "@chakra-ui/react";
import { useCleaningPacking } from "../../customHooks/useCleaningPacking";
import exportCSVFile, { exportToExcel } from "../../util/exportCSVFile";
import moment from "moment";
import CleaningSection from "../../components/CleaningPacking/CleaningSection";
import Table from "../../components/table/table";

const HANDPACKED_ITEMS_HEADING = {
  sno: "S.No",
  article_id: "Item Code",
  article_name: "Name",
  priority_score: "Priority",
  repack_quantity: "Pack Qty",
  packing_material_val: "Packing Material",
  packing_material_size_val: "Packing Material Size",
  sticker_val: "Sticker",
  store_uom: "Store UOM",
};

const getLastSyncedComponent = (list) => {
  if (!list || list.length === 0) {
    return "";
  }

  return (
    <Text fontSize="sm" color="#FFFFFF">
      Last Sync - {moment(list[0].created_at).fromNow()}
    </Text>
  );
};

function CleaningPacking() {
  const { items: cleaningItems } = useCleaningPacking({ cleaning: "true" });
  const { items: nonCleaningItems } = useCleaningPacking({ cleaning: "false" });
  const { items: handpackedItems } = useCleaningPacking({ packing_type: 1 });
  const { items: machinePackedItems } = useCleaningPacking({ packing_type: 2 });

  const formatDataForExportAll = (list) => {
    return list.map((item) => ({
      "S.No": item.sno,
      Name: item.article_name,
      "Current Stock": item.parent_stock,
      "Repack Conversion": item.repackage_conversion,
      "Bulk Weight": item.bulk_weight,
      "Gross Weight": item.gross_weight,
      "Bag Weight": item.bag_weight,
      Wastage: item.wastage,
      "Net Weight": item.net_weight,
      "Start Time": item.start_time,
      "End Time": item.end_time,
      "No Of Persons": item.no_of_persons,
    }));
  };

  const formatDataForPackExportAll = (list) => {
    return list.map((item) => ({
      "S.No": item.sno,
      "Item Code": item.article_id,
      Name: item.article_name,
      "Pack Qty": item.repack_quantity,
      "Packing Material": item.packing_material_val,
      "Packing Material Size": item.packing_material_size_val,
      Sticker: item.sticker_val,
      "Store UOM": item.store_uom,
      "Bag Weight": item.bag_weight,
      Wastage: item.wastage,
    }));
  };

  const handleExportAll = () => {
    exportToExcel(
      [
        formatDataForExportAll(cleaningItems),
        formatDataForExportAll(nonCleaningItems),
        formatDataForPackExportAll(handpackedItems),
        formatDataForPackExportAll(machinePackedItems),
      ],
      [
        "Bulk Items for Cleaning",
        "Bulk Items for Without Cleaning",
        "Hand Packing Items",
        "Machine Packing Items",
      ],
      `cleaning-packing-${moment().format("DD-MM-YYYY")}.xlsx`
    );
  };

  const handleExport = (list, name) => {
    const TABLE_HEADER = {
      sno: "S.No",
      article_id: "Item Code",
      article_name: "Name",
      repack_quantity: "Pack Qty",
      packing_material_val: "Packing Material",
      packing_material_size_val: "Packing Material Size",
      sticker_val: "Sticker",
      store_uom: "Store UOM",
      bag_weight: "Bag Weight",
      wastage: "Wastage",
    };

    const formattedData = [];
    list.forEach((item) => {
      formattedData.push({
        sno: item.sno,
        article_id: item.article_id,
        article_name: item.article_name,
        repack_quantity: item.repack_quantity,
        packing_material_val: item.packing_material_val,
        packing_material_size_val: item.packing_material_size_val,
        sticker_val: item.sticker_val,
        store_uom: item.store_uom,
        bag_weight: "",
        wastage: "",
      });
    });

    exportCSVFile(
      TABLE_HEADER,
      formattedData,
      `${name}-${moment().format("DD-MM-YYYY")}`
    );
  };

  return (
    <GlobalWrapper title="Cleaning and Packing">
      <CustomContainer
        title="Cleaning and Packing"
        filledHeader
        rightSection={
          <Flex alignItems="center" gap={4}>
            {getLastSyncedComponent(machinePackedItems)}

            <Button colorScheme="whiteAlpha" onClick={handleExportAll}>
              Export All
            </Button>
          </Flex>
        }
      >
        <Flex gap={6} flexDirection="column">
          <CleaningSection
            cleaningItems={cleaningItems}
            nonCleaningItems={nonCleaningItems}
          />

          <CustomContainer
            title="Hand Packing Items"
            smallHeader
            toggleChildren
            defaultOpen={false}
            rightSection={
              <Button
                colorScheme="purple"
                onClick={() => handleExport(handpackedItems, "hand-packed")}
              >
                Export
              </Button>
            }
          >
            <Table
              heading={HANDPACKED_ITEMS_HEADING}
              rows={handpackedItems}
              sortCallback={() => {}}
              variant="plain"
              size="sm"
              showPagination
              defaultRowsPerPage={10}
            />
          </CustomContainer>

          <CustomContainer
            title="Machine Packing Items"
            smallHeader
            toggleChildren
            defaultOpen={false}
            rightSection={
              <Button
                colorScheme="purple"
                onClick={() =>
                  handleExport(machinePackedItems, "machine-bulk-packed")
                }
              >
                Export
              </Button>
            }
          >
            <Table
              heading={HANDPACKED_ITEMS_HEADING}
              rows={machinePackedItems}
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
