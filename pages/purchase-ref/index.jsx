import React, { useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import EmptyData from "../../components/EmptyData";
import PurchaseRefMobileCards from "../../components/purchase-ref/PurchaseRefMobileCards";
import { Box, Flex, Input, Spinner } from "@chakra-ui/react";
import { usePurchaseRef } from "../../customHooks/usePurchaseRef";
import useDebounce from "../../customHooks/useDebounce";
import toast from "react-hot-toast";

function PurchaseRef() {
  const { rows, loading, error } = usePurchaseRef();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load Purchase Ref.");
    }
  }, [error]);

  const filteredRows = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => {
      const pid = row.product_id?.toString().toLowerCase() || "";
      const name = row.name?.toLowerCase() || "";
      const supplier = row.supplier_name?.toLowerCase() || "";
      return (
        pid.includes(query) || name.includes(query) || supplier.includes(query)
      );
    });
  }, [rows, debouncedSearchQuery]);

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
        field: "current_stock",
        headerName: "Current Stock",
        type: "number",
        flex: 0,
        minWidth: 140,
        cellRenderer: (params) =>
          params.value != null
            ? (Math.round(params.value * 100) / 100).toString()
            : "—",
      },
      {
        field: "avg_sales",
        headerName: "Avg Sales (3mo)",
        type: "number",
        flex: 0,
        minWidth: 150,
        cellRenderer: (params) =>
          params.value != null ? Math.round(params.value).toString() : "—",
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
          <>
            <Box mb={4}>
              <Input
                placeholder="Search by PID, Name, or Supplier..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                size="sm"
              />
            </Box>

            {filteredRows.length === 0 ? (
              <EmptyData
                message="No products match your search"
                faIcon="fa-file-invoice"
              />
            ) : (
              <>
                <Box display={{ base: "none", md: "block" }} overflowX="auto">
                  <AgGrid
                    rowData={filteredRows}
                    columnDefs={colDefs}
                    tableKey="purchase-ref"
                  />
                </Box>
                <Box display={{ base: "block", md: "none" }}>
                  <PurchaseRefMobileCards rows={filteredRows} />
                </Box>
              </>
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseRef;
