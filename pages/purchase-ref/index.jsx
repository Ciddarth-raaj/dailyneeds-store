import React, { useEffect, useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import { Box, Flex, Spinner } from "@chakra-ui/react";
import { usePurchaseRef } from "../../customHooks/usePurchaseRef";
import toast from "react-hot-toast";

function PurchaseRef() {
  const { rows, loading, error } = usePurchaseRef();

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load Purchase Ref.");
    }
  }, [error]);

  const colDefs = useMemo(
    () => [
      {
        field: "product_id",
        headerName: "PID",
        type: "id",
        flex: 0,
        minWidth: 120,
      },
      {
        field: "name",
        headerName: "Name",
        type: "capitalized",
        flex: 2,
        minWidth: 220,
      },
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        type: "capitalized",
        flex: 2,
        minWidth: 200,
      },
      {
        field: "mrp",
        headerName: "MRP",
        type: "currency",
        flex: 0,
        minWidth: 120,
      },
      {
        field: "net_cost",
        headerName: "Net Cost",
        type: "currency",
        flex: 0,
        minWidth: 120,
      },
      {
        field: "avg_sales",
        headerName: "Avg Sales (3mo)",
        type: "number",
        flex: 0,
        minWidth: 150,
        valueFormatter: (params) =>
          params.value != null
            ? (Math.round(params.value * 100) / 100).toString()
            : "—",
      },
    ],
    []
  );

  return (
    <GlobalWrapper title="Purchase Ref" permissionKey="view_purchase_ref">
      <CustomContainer title="Purchase Ref" filledHeader>
        {loading ? (
          <Flex w="100%" minH="200px" justifyContent="center" alignItems="center">
            <Spinner size="lg" color="purple.500" thickness="3px" />
          </Flex>
        ) : (
          <Box overflowX="auto" w="100%">
            <AgGrid
              rowData={rows}
              columnDefs={colDefs}
              tableKey="purchase-ref"
            />
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseRef;
