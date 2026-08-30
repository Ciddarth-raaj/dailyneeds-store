import React, { useEffect, useMemo } from "react";
import { Box, Text, useToken } from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import { useGrnPriceCheckerItems } from "../../customHooks/useGrnPriceCheckerItems";
import {
  formatDiscountPct,
  getMismatchRowStyle,
  isPriceCheckerBatchMismatch,
  sortRowsMismatchFirst,
} from "../../util/grn";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

const colWidth = 120;

export default function GrnPriceCheckerItemsModal({
  isOpen,
  onClose,
  productId,
  productName,
  grnMrp,
  grnSp,
  grnDiscountPct,
  grnDiscountAmount,
  priceCheckerRows,
  priceCheckerLoading = false,
}) {
  const { colorScheme } = useModuleTableTheme();
  const [mismatchBg] = useToken("colors", ["red.100"]);
  const enabled = isOpen && productId != null && productId !== "";
  const hasPreloadedRows = priceCheckerRows !== undefined;
  const { rows: fetchedRows, loading: fetchLoading, error } =
    useGrnPriceCheckerItems(productId, {
      enabled: enabled && !hasPreloadedRows,
    });

  const sourceRows = hasPreloadedRows ? priceCheckerRows : fetchedRows;
  const loading = hasPreloadedRows ? priceCheckerLoading : fetchLoading;

  useEffect(() => {
    if (!isOpen || !error || hasPreloadedRows) return;
    toast.error(error?.message || "Failed to load price checker items.");
  }, [isOpen, error, hasPreloadedRows]);

  const displayRows = useMemo(() => {
    const withFlags = (sourceRows ?? []).map((row) => ({
      ...row,
      _priceMismatch:
        !loading &&
        isPriceCheckerBatchMismatch(
          row,
          grnMrp,
          grnSp,
          grnDiscountPct,
          grnDiscountAmount
        ),
    }));
    return sortRowsMismatchFirst(withFlags, (row) => row._priceMismatch);
  }, [sourceRows, grnMrp, grnSp, grnDiscountPct, grnDiscountAmount, loading]);

  const gridOptions = useMemo(
    () => ({
      pagination: true,
      paginationPageSize: 15,
      getRowId: (params) =>
        `${params.data?.old_mrp ?? "n"}-${
          params.data?.old_selling_price ?? "n"
        }-${params.rowIndex}`,
      getRowStyle: (params) =>
        getMismatchRowStyle(params.data?._priceMismatch, mismatchBg),
    }),
    [mismatchBg]
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "purchase_price",
        headerName: "Pur. Price",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "old_mrp",
        headerName: "MRP",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "old_selling_price",
        headerName: "SP",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "discount_amount",
        headerName: "Discount Amount",
        type: "currency",
        flex: 0,
        minWidth: 150,
      },
      {
        field: "discount_pct",
        headerName: "Discount %",
        flex: 0,
        minWidth: colWidth,
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      {
        field: "batch_count",
        headerName: "Batch Count",
        type: "number",
        flex: 0,
        minWidth: colWidth,
      },
    ],
    []
  );

  const titleParts = [`Price Checker — ${productId ?? ""}`];
  if (productName) {
    titleParts.push(productName);
  }
  const title = titleParts.filter(Boolean).join(" · ");

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="6xl"
      colorScheme={colorScheme}
    >
      {loading ? (
        <Text>Loading...</Text>
      ) : displayRows.length === 0 ? (
        <Text>No price checker batches found for this item.</Text>
      ) : (
        <Box minH="320px">
          <AgGrid
            tableKey="grn-price-checker-items-modal"
            rowData={displayRows}
            columnDefs={columnDefs}
            gridOptions={gridOptions}
          />
        </Box>
      )}
    </CustomModal>
  );
}
