import React, { useEffect, useMemo } from "react";
import { Box, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { useGrnOutletStockBreakdown } from "../../customHooks/useGrnOutletStockBreakdown";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

const colWidth = 140;

export default function GrnOutletStockBreakdownModal({
  isOpen,
  onClose,
  productId,
  productName,
  mrp,
  sellingPrice,
}) {
  const { colorScheme } = useModuleTableTheme();
  const enabled = isOpen && productId != null && mrp != null && sellingPrice != null;
  const { rows, loading, error } = useGrnOutletStockBreakdown(productId, mrp, sellingPrice, {
    enabled,
  });

  useEffect(() => {
    if (!isOpen || !error) return;
    toast.error(error?.message || "Failed to load outlet stock breakdown.");
  }, [isOpen, error]);

  const gridOptions = useMemo(
    () => ({
      pagination: true,
      paginationPageSize: 15,
      getRowId: (params) =>
        `${params.data?.outlet_id ?? "n"}-${params.data?.batch_no ?? "n"}-${params.rowIndex}`,
    }),
    []
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "outlet_name",
        headerName: "Outlet",
        flex: 1,
        minWidth: colWidth,
        valueGetter: (params) => params.data?.outlet_name || `Outlet ${params.data?.outlet_id ?? ""}`,
      },
      {
        field: "batch_no",
        headerName: "Batch No",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "stock_qty",
        headerName: "Stock",
        type: "number",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "landing_cost",
        headerName: "Landing Cost",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
    ],
    []
  );

  const titleParts = [`Outlet Stock — MRP ${mrp ?? ""} / SP ${sellingPrice ?? ""}`];
  if (productName) {
    titleParts.push(productName);
  } else if (productId != null) {
    titleParts.push(String(productId));
  }
  const title = titleParts.filter(Boolean).join(" · ");

  return (
    <CustomModal isOpen={isOpen} onClose={onClose} title={title} size="4xl" colorScheme={colorScheme}>
      {loading ? (
        <Text>Loading...</Text>
      ) : rows.length === 0 ? (
        <Text>No outlet stock found for this price.</Text>
      ) : (
        <Box minH="240px">
          <AgGrid
            tableKey="grn-outlet-stock-breakdown-modal"
            rowData={rows}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
          />
        </Box>
      )}
    </CustomModal>
  );
}
