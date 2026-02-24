import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useDistributors } from "../../../customHooks/useDistributors";

function DistributorListing() {
  const { distributors, loading } = useDistributors();

  const colDefs = useMemo(
    () => [
      {
        field: "MDM_DIST_CODE",
        headerName: "ID",
        type: "id",
      },
      {
        field: "MDM_DIST_NAME",
        headerName: "Name",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "MDM_SHORT_NAME",
        headerName: "Short Name",
      },
      {
        field: "MDM_DIST_CODE",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const code = params.data?.MDM_DIST_CODE;
          return [
            {
              label: "View",
              redirectionUrl: `/master/distributors/view?code=${encodeURIComponent(
                code
              )}`,
            },
          ];
        },
      },
    ],
    []
  );

  return (
    <GlobalWrapper
      title="Product Distributors"
      permissionKey="view_product_distributors"
    >
      <CustomContainer title="Product Distributors" filledHeader>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={distributors}
            columnDefs={colDefs}
            tableKey="master-distributors"
            gridOptions={{
              getRowId: (params) => params.data?.MDM_DIST_CODE,
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DistributorListing;
