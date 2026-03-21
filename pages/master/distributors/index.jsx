import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useDistributors } from "../../../customHooks/useDistributors";
import usePermissions from "../../../customHooks/usePermissions";

const listPermissionKeys = [
  "view_product_distributors",
  "view_product_distributor",
];

function DistributorListing() {
  const { distributors, loading } = useDistributors();
  const canAssignBuyer = usePermissions(["add_product_distributor"]);

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
        field: "buyer_name",
        headerName: "Buyer",
        type: "capitalized",
      },
      {
        colId: "actions",
        headerName: "Action",
        type: "action-icons",
        sortable: false,
        filter: false,
        valueGetter: (params) => {
          const distCode = params.data?.MDM_DIST_CODE;
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/master/distributors/view?code=${encodeURIComponent(
                distCode
              )}`,
            },
          ];
          if (canAssignBuyer) {
            actions.push({
              label: "Edit",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/master/distributors/edit?code=${encodeURIComponent(
                distCode
              )}`,
            });
          }
          return actions;
        },
      },
    ],
    [canAssignBuyer]
  );

  return (
    <GlobalWrapper
      title="Product Distributors"
      permissionKey={listPermissionKeys}
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
              getRowId: (params) => String(params.data?.MDM_DIST_CODE ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DistributorListing;
