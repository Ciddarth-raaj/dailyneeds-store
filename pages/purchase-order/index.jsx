import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";

function PurchaseOrder() {
  return (
    <GlobalWrapper>
      <CustomContainer
        title="Purchase Order"
        filledHeader
        rightSection={<Button colorScheme="whiteAlpha">Add</Button>}
      ></CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseOrder;
