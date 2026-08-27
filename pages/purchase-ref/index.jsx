import React, { useEffect, useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import EmptyData from "../../components/EmptyData";
import PurchaseRefMobileCards from "../../components/purchase-ref/PurchaseRefMobileCards";
import { Box, Flex, Input, Spinner, useBreakpointValue } from "@chakra-ui/react";
import { usePurchaseRef } from "../../customHooks/usePurchaseRef";
import useDebounce from "../../customHooks/useDebounce";
import toast from "react-hot-toast";

function PurchaseRef() {
  const { rows, loading, error } = usePurchaseRef();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const isMobile = useBreakpointValue({ base: true, md: false });

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load Purchase Ref.");
    }
  }, [error]);

  const filteredRows = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();
    if (!query) return rows;
    // Numeric queries (PID) search immediately; text queries wait for 3+
    // characters so a couple of keystrokes don't filter the whole list.
    const isNumeric = /^\d+$/.test(query);
    if (!isNumeric && query.length < 3) return rows;
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
        field: "image_url",
        headerName: "Image",
        type: "image",
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
            ) : isMobile ? (
              <PurchaseRefMobileCards rows={filteredRows} />
            ) : (
              <Box overflowX="auto">
                <AgGrid
                  rowData={filteredRows}
                  columnDefs={colDefs}
                  tableKey="purchase-ref"
                />
              </Box>
            )}
          </>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseRef;
