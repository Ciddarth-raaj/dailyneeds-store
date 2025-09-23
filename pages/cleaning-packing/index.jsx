import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import { Flex } from "@chakra-ui/react";
import { useCleaningPacking } from "../../customHooks/useCleaningPacking";
import { exportToExcel } from "../../util/exportCSVFile";
import moment from "moment";
import CleaningSection from "../../components/CleaningPacking/CleaningSection";

function CleaningPacking() {
  const { items: cleaningItems } = useCleaningPacking({ cleaning: "true" });
  const { items: nonCleaningItems } = useCleaningPacking({ cleaning: "false" });

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
          <CleaningSection
            cleaningItems={cleaningItems}
            nonCleaningItems={nonCleaningItems}
          />
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default CleaningPacking;
