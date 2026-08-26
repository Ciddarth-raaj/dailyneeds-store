import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import EmptyData from "../../../components/EmptyData";

function PurchaseUom() {
  return (
    <GlobalWrapper title="Purchase UOM" permissionKey="view_purchase_uom">
      <CustomContainer title="Purchase UOM" filledHeader>
        <EmptyData
          message="Purchase UOM is coming soon"
          faIcon="fa-ruler-combined"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseUom;
