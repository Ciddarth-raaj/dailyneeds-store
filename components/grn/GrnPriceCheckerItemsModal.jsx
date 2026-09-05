import React, { useEffect, useMemo, useState } from "react";
import { Badge, Box, Flex, Text, useToken } from "@chakra-ui/react";
import toast from "react-hot-toast";
import CustomModal from "../CustomModal";
import AgGrid from "../AgGrid";
import GrnOutletStockBreakdownModal from "./GrnOutletStockBreakdownModal";
import { useGrnPriceCheckerItems } from "../../customHooks/useGrnPriceCheckerItems";
import {
  calcMarkupOnSelling,
  formatDiscountPct,
  getMismatchRowStyle,
  isPriceCheckerBatchMismatch,
  sortRowsMismatchFirst,
} from "../../util/grn";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

const colWidth = 120;

function formatGrnCurrency(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  return Number.isFinite(n) ? `₹${n.toFixed(2)}` : "—";
}

export default function GrnPriceCheckerItemsModal({
  isOpen,
  onClose,
  productId,
  productName,
  grnMrp,
  grnSp,
  grnDiscountPct,
  grnDiscountAmount,
  grnPurchasePrice,
  isIgnored = false,
  priceCheckerRows,
  priceCheckerLoading = false,
}) {
  const { colorScheme } = useModuleTableTheme();
  const [mismatchBg] = useToken("colors", ["red.100"]);
  const [breakdownRow, setBreakdownRow] = useState(null);
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
      markup_pct: calcMarkupOnSelling(row.old_selling_price, row.purchase_price),
      _priceMismatch:
        !loading &&
        isPriceCheckerBatchMismatch(
          row,
          grnMrp,
          grnSp,
          grnDiscountPct,
          grnDiscountAmount,
          grnPurchasePrice
        ),
    }));
    return sortRowsMismatchFirst(withFlags, (row) => row._priceMismatch);
  }, [
    sourceRows,
    grnMrp,
    grnSp,
    grnDiscountPct,
    grnDiscountAmount,
    grnPurchasePrice,
    loading,
  ]);

  const grnMarkupPct = useMemo(
    () => calcMarkupOnSelling(grnSp, grnPurchasePrice),
    [grnSp, grnPurchasePrice]
  );

  const gridOptions = useMemo(
    () => ({
      pagination: true,
      paginationPageSize: 15,
      getRowId: (params) =>
        `${params.data?.old_mrp ?? "n"}-${
          params.data?.old_selling_price ?? "n"
        }-${params.rowIndex}`,
      getRowStyle: (params) => ({
        ...getMismatchRowStyle(params.data?._priceMismatch, mismatchBg),
        cursor: "pointer",
      }),
      onRowClicked: (params) =>
        setBreakdownRow({
          mrp: params.data?.old_mrp,
          selling_price: params.data?.old_selling_price,
        }),
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
        field: "markup_pct",
        headerName: "Markup %",
        flex: 0,
        minWidth: colWidth,
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
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
      {
        field: "stock_qty",
        headerName: "Stock",
        type: "number",
        flex: 0,
        minWidth: colWidth,
      },
      {
        field: "_priceMismatch",
        headerName: "Status",
        type: "badge-column",
        flex: 0,
        minWidth: colWidth,
        valueGetter: (params) =>
          params.data?._priceMismatch
            ? { label: "Conflict", colorScheme: "red" }
            : { label: "Match", colorScheme: "green" },
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
    <>
      <CustomModal
        isOpen={isOpen}
        onClose={onClose}
        title={title}
        size="6xl"
        colorScheme={colorScheme}
      >
        <Flex
          wrap="wrap"
          gap={4}
          mb={3}
          p={2}
          borderRadius="md"
          bg="gray.50"
          fontSize="sm"
        >
          <Text fontWeight="semibold">This GRN line:</Text>
          <Text>Pur. Price: {formatGrnCurrency(grnPurchasePrice)}</Text>
          <Text>MRP: {formatGrnCurrency(grnMrp)}</Text>
          <Text>SP: {formatGrnCurrency(grnSp)}</Text>
          <Text>Discount %: {formatDiscountPct(grnDiscountPct)}</Text>
          <Text>Markup %: {formatDiscountPct(grnMarkupPct)}</Text>
          {isIgnored ? (
            <Flex alignItems="center" gap={2}>
              <Badge colorScheme="gray">Ignored</Badge>
              <Text color="gray.600">
                Conflicts on this line are hidden on the GRN and Issue GRN
                lists.
              </Text>
            </Flex>
          ) : null}
        </Flex>
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
      <GrnOutletStockBreakdownModal
        isOpen={breakdownRow != null}
        onClose={() => setBreakdownRow(null)}
        productId={productId}
        productName={productName}
        mrp={breakdownRow?.mrp}
        sellingPrice={breakdownRow?.selling_price}
      />
    </>
  );
}
