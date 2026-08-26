import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import EmptyData from "../../components/EmptyData";

function PurchaseRef() {
  return (
    <GlobalWrapper title="Purchase Ref" permissionKey="view_purchase_ref">
      <CustomContainer title="Purchase Ref" filledHeader>
        <EmptyData
          message="Purchase Ref is coming soon"
          faIcon="fa-file-invoice"
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseRef;
