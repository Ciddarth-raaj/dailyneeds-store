import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import GrnPriceCheckerItemsModal from "../../components/grn/GrnPriceCheckerItemsModal";
import GrnHighlightLoader from "../../components/grn/GrnHighlightLoader";
import AddToOfferV3Modal from "../../components/grn/AddToOfferV3Modal";
import usePermissions from "../../customHooks/usePermissions";
import {
  Badge,
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Image,
  Text,
  Tooltip,
  useToken,
} from "@chakra-ui/react";
import { unignoreGrnIssues } from "../../helper/grnList";
import { useGrnDetail } from "../../customHooks/useGrnDetail";
import { useGrnPriceCheckerItemsMap } from "../../customHooks/useGrnPriceCheckerItemsMap";
import { capitalize } from "../../util/string";
import {
  calcBaseMarginMD,
  calcDiscountInclFree,
  calcMarkupOnSelling,
  calcNetMarginMD,
  formatDiscountPct,
  formatOfferDetails,
  getGrnLinePriceMismatch,
  getMismatchRowStyle,
  isGrnNetCostChanged,
  sortRowsMismatchFirst,
} from "../../util/grn";
import currencyFormatter from "../../util/currencyFormatter";
import toast from "react-hot-toast";
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";

const colWidth = 120;

function queryParam(value) {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] : value;
}

function productDisplayName(product) {
  const name = product?.de_name ?? product?.de_display_name;
  return name ? capitalize(String(name)) : "";
}

function SummaryField({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500" mb={0.5}>
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="medium">
        {value ?? "—"}
      </Text>
    </Box>
  );
}

function GrnDetailPage() {
  const router = useRouter();
  const refno = queryParam(router.query.refno);
  const backTo = queryParam(router.query.from);
  const isReady = router.isReady;
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [addOfferProduct, setAddOfferProduct] = useState(null);
  const [unignoring, setUnignoring] = useState(false);
  const canAddOfferV3 = usePermissions("add_offers_v3");
  const canIgnore = usePermissions("ignore_grn_issues");
  const { colorScheme } = useModuleTableTheme();
  const [linkColor] = useToken("colors", [`${colorScheme}.600`]);
  const [mismatchBg] = useToken("colors", ["red.100"]);
  const [netCostBg] = useToken("colors", ["pink.100"]);

  const { header, items, loading, error, refetch } = useGrnDetail(refno, {
    enabled: isReady && Boolean(refno),
  });

  const productIds = useMemo(
    () => [...new Set(items.map((item) => item.product_id).filter(Boolean))],
    [items]
  );

  const { itemsByProductId, loading: pcLoading } = useGrnPriceCheckerItemsMap(
    productIds,
    { enabled: !loading && productIds.length > 0 }
  );

  const displayItems = useMemo(() => {
    const withFlags = items.map((row) => ({
      ...row,
      _priceMismatch:
        !pcLoading &&
        !row.is_ignored &&
        getGrnLinePriceMismatch(row, itemsByProductId, false),
      _netCostChanged: isGrnNetCostChanged(row),
    }));
    return sortRowsMismatchFirst(withFlags, (row) => row._priceMismatch);
  }, [items, itemsByProductId, pcLoading]);

  const highlightLoading =
    !loading && productIds.length > 0 && pcLoading;

  // Un-ignoring has to happen here: an ignored line is filtered out of the
  // Issue GRN list server-side, so this page is the only place it can be
  // reached. refno comes from the route -- the same value the API keyed the
  // ignore on.
  const handleUnignoreRow = useCallback(
    async (row) => {
      if (!row || refno == null) return;
      setUnignoring(true);
      try {
        await unignoreGrnIssues([
          { refno, sl_no: row.mmd_mrc_sl_no, product_id: row.product_id ?? null },
        ]);
        toast.success("Item un-ignored.");
        refetch();
      } catch (err) {
        toast.error(err?.message || "Failed to un-ignore item.");
      } finally {
        setUnignoring(false);
      }
    },
    [refno, refetch]
  );

  const gridOptions = useMemo(
    () => ({
      getRowId: (params) => String(params.data?.mmd_mrc_sl_no),
      defaultColDef: {
        flex: 0,
        suppressSizeToFit: true,
      },
      rowHeight: 56,
      // A price conflict is the louder signal, so red wins; pink is left for
      // a line whose Net Cost simply moved from its Prev.N.cost.
      getRowStyle: (params) =>
        getMismatchRowStyle(params.data?._priceMismatch, mismatchBg) ??
        getMismatchRowStyle(params.data?._netCostChanged, netCostBg),
    }),
    [mismatchBg, netCostBg]
  );

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load GRN detail.");
    }
  }, [error]);

  const colDefs = useMemo(
    () => [
      {
        headerName: "SNo",
        colId: "sno",
        pinned: "left",
        flex: 0,
        minWidth: 56,
        maxWidth: 72,
        width: 64,
        sortable: false,
        filter: false,
        suppressSizeToFit: true,
        valueGetter: (params) => params.data?.mmd_mrc_sl_no ?? "",
      },
      {
        field: "product_id",
        headerName: "Product ID",
        type: "id",
        pinned: "left",
        flex: 0,
        minWidth: 100,
        cellStyle: {
          cursor: "pointer",
          color: linkColor,
          textDecoration: "underline",
        },
        onCellClicked: (params) => {
          const productId = params.data?.product_id;
          if (productId == null || productId === "") return;
          setSelectedProduct({
            productId,
            productName: productDisplayName(params.data?.product),
            mrp: params.data.mrp,
            sp: params.data.mmd_sale_rate,
            discountPct: params.data.discount_pct,
            discountAmount: params.data.discount_amount,
            purchasePrice: params.data.mmd_pur_price,
            isIgnored: Boolean(params.data.is_ignored),
          });
        },
      },
      {
        field: "product.image_link",
        headerName: "Image",
        pinned: "left",
        flex: 0,
        minWidth: 72,
        width: 72,
        sortable: false,
        filter: false,
        cellStyle: { lineHeight: 1, paddingTop: 2, paddingBottom: 2 },
        valueGetter: (params) => params.data?.product?.image_link,
        cellRenderer: (params) => {
          if (!params.value) return "—";
          return (
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              h="100%"
            >
              <Image
                src={params.value}
                alt=""
                sx={{
                  maxWidth: "48px",
                  maxHeight: "48px",
                  width: "auto",
                  height: "auto",
                  objectFit: "contain",
                }}
                borderRadius="sm"
              />
            </Box>
          );
        },
      },
      {
        headerName: "Name",
        type: "capitalized",
        pinned: "left",
        flex: 0,
        minWidth: 220,
        valueGetter: (params) => {
          const name = productDisplayName(params.data?.product);
          return name || "—";
        },
      },
      {
        field: "is_offer_product",
        headerName: "Offer",
        type: "badge-column",
        pinned: "left",
        flex: 0,
        minWidth: 90,
        maxWidth: canAddOfferV3 ? 110 : 90,
        valueGetter: (params) =>
          params.data?.is_offer_product
            ? { label: "Offer", colorScheme: "blue" }
            : null,
        cellRenderer: (params) => {
          if (params.value) {
            const tooltipLabel = formatOfferDetails(params.data?.offer_details);
            return (
              <Flex alignItems="center" h="100%">
                <Tooltip
                  label={tooltipLabel}
                  whiteSpace="pre-line"
                  isDisabled={!tooltipLabel}
                  hasArrow
                >
                  <Badge colorScheme={params.value.colorScheme}>
                    {params.value.label}
                  </Badge>
                </Tooltip>
              </Flex>
            );
          }
          if (!canAddOfferV3) return null;
          return (
            <Button
              size="xs"
              variant="link"
              colorScheme="purple"
              onClick={() =>
                setAddOfferProduct({
                  productId: params.data?.product_id,
                  productName: productDisplayName(params.data?.product),
                })
              }
            >
              Add
            </Button>
          );
        },
      },
      {
        field: "_priceMismatch",
        headerName: "Status",
        type: "badge-column",
        flex: 0,
        minWidth: 100,
        maxWidth: canIgnore ? 160 : 100,
        // An ignored line has its conflict suppressed everywhere, so say so
        // here rather than leaving the cell blank -- otherwise it reads as a
        // clean line while its Price Checker still shows the batch in red.
        valueGetter: (params) => {
          if (params.data?._priceMismatch) {
            return { label: "Conflict", colorScheme: "red" };
          }
          if (params.data?.is_ignored) {
            return { label: "Ignored", colorScheme: "gray" };
          }
          return null;
        },
        cellRenderer: (params) => {
          if (!params.value) return null;
          return (
            <Flex alignItems="center" h="100%" gap={2}>
              <Badge colorScheme={params.value.colorScheme}>
                {params.value.label}
              </Badge>
              {params.data?.is_ignored && canIgnore ? (
                <Button
                  size="xs"
                  variant="link"
                  colorScheme="blue"
                  isLoading={unignoring}
                  onClick={() => handleUnignoreRow(params.data)}
                >
                  Undo
                </Button>
              ) : null}
            </Flex>
          );
        },
      },
      {
        field: "mmd_recd_qty",
        headerName: "Recd. Qty",
        type: "number",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_free_qty",
        headerName: "Free Qty",
        type: "number",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mrp",
        headerName: "MRP",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_pur_rate",
        headerName: "Pur. Rate",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_ppur_rate",
        headerName: "Prev. Pur Rate",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_pur_price",
        headerName: "Net Cost",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_prev_pur_price",
        headerName: "Prev.N.cost",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_sale_rate",
        headerName: "SP",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_pmrp",
        headerName: "Prev. Sell.Rate",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_pur_tax_per",
        headerName: "Pur. Tax %",
        type: "number",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_pur_tax_amt",
        headerName: "Pur. Tax Amt",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_pur_amount",
        headerName: "Total Amt",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "mmd_disc_per",
        headerName: "Disc. %",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      {
        field: "mmd_disc_amt",
        headerName: "Disc. Amt",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        colId: "base_margin_md",
        headerName: "Base Margin(MD)",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
        valueGetter: (params) =>
          calcBaseMarginMD(
            params.data?.mmd_pur_rate,
            params.data?.mmd_pur_tax_per,
            params.data?.mrp
          ),
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      {
        colId: "net_margin_md",
        headerName: "Net Margin(MD)",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
        valueGetter: (params) =>
          calcNetMarginMD(params.data?.mmd_pur_price, params.data?.mrp),
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      {
        colId: "discount_incl_free",
        headerName: "Discount(incl. Free)",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
        valueGetter: (params) =>
          calcDiscountInclFree(
            params.data?.mmd_pur_price,
            params.data?.mmd_pur_rate,
            params.data?.mmd_pur_tax_per,
            params.data?.mmd_disc_amt,
            params.data?.mmd_recd_qty,
            params.data?.mmd_free_qty
          ),
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      {
        colId: "markup_on_selling",
        headerName: "Mark up on Selling",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
        valueGetter: (params) =>
          calcMarkupOnSelling(
            params.data?.mmd_sale_rate,
            params.data?.mmd_pur_price
          ),
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
      {
        field: "discount_amount",
        headerName: "Discount Amount",
        type: "currency",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
      },
      {
        field: "discount_pct",
        headerName: "Discount %",
        flex: 0,
        minWidth: colWidth,
        width: colWidth,
        maxWidth: colWidth,
        valueFormatter: (params) => formatDiscountPct(params.value),
        cellRenderer: (params) => formatDiscountPct(params.value),
      },
    ],
    [linkColor, canAddOfferV3, canIgnore, unignoring, handleUnignoreRow]
  );

  const pageTitle = header?.mmh_mrc_refno
    ? `GRN ${header.mmh_mrc_refno}`
    : refno
    ? `GRN ${refno}`
    : "GRN Detail";

  return (
    <GlobalWrapper title={pageTitle} permissionKey="view_all_grn">
      <Flex flexDirection="column" gap={6}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Button
            size="sm"
            variant="outline"
            colorScheme="purple"
            onClick={() => {
              if (backTo && backTo.startsWith("/") && !backTo.startsWith("//")) {
                router.push(backTo);
                return;
              }
              const grnDate = header?.mmh_mrc_dt
                ? String(header.mmh_mrc_dt).slice(0, 10)
                : null;
              router.push(grnDate ? `/grn?date=${grnDate}` : "/grn");
            }}
          >
            Back to All GRN
          </Button>
        </Flex>

        <CustomContainer title="GRN Summary" filledHeader size="xs">
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <Grid
              templateColumns="repeat(auto-fit, minmax(160px, 1fr))"
              gap={4}
            >
              <GridItem>
                <SummaryField label="GRN No" value={header?.mmh_mrc_refno} />
              </GridItem>
              <GridItem>
                <SummaryField
                  label="MRC Date"
                  value={
                    header?.mmh_mrc_dt
                      ? moment(header.mmh_mrc_dt, "YYYY-MM-DD").format(
                          "DD/MM/YYYY"
                        )
                      : "—"
                  }
                />
              </GridItem>
              <GridItem>
                <SummaryField
                  label="Supplier Name"
                  value={header?.supplier_name}
                />
              </GridItem>
              <GridItem>
                <SummaryField
                  label="MRC Amount"
                  value={
                    header?.mmh_mrc_amt != null
                      ? currencyFormatter(header.mmh_mrc_amt)
                      : "—"
                  }
                />
              </GridItem>
            </Grid>
          )}
        </CustomContainer>

        <CustomContainer title="Products" filledHeader>
          {loading || highlightLoading ? (
            <GrnHighlightLoader
              label={
                loading
                  ? "Loading products..."
                  : "Checking price mismatches..."
              }
              minH={loading ? "120px" : "320px"}
            />
          ) : (
            <Box overflowX="auto" w="100%">
              <AgGrid
                rowData={displayItems}
                columnDefs={colDefs}
                tableKey="grn-detail-products"
                gridOptions={gridOptions}
              />
            </Box>
          )}
        </CustomContainer>
      </Flex>
      <GrnPriceCheckerItemsModal
        isOpen={Boolean(selectedProduct)}
        onClose={() => setSelectedProduct(null)}
        productId={selectedProduct?.productId}
        productName={selectedProduct?.productName}
        grnMrp={selectedProduct?.mrp}
        grnSp={selectedProduct?.sp}
        grnDiscountPct={selectedProduct?.discountPct}
        grnDiscountAmount={selectedProduct?.discountAmount}
        grnPurchasePrice={selectedProduct?.purchasePrice}
        isIgnored={selectedProduct?.isIgnored}
        priceCheckerRows={
          selectedProduct?.productId != null
            ? itemsByProductId.get(selectedProduct.productId) ?? []
            : undefined
        }
        priceCheckerLoading={pcLoading}
      />
      <AddToOfferV3Modal
        isOpen={Boolean(addOfferProduct)}
        onClose={() => setAddOfferProduct(null)}
        productId={addOfferProduct?.productId}
        productName={addOfferProduct?.productName}
        onCreated={() => {
          setAddOfferProduct(null);
          refetch();
        }}
      />
    </GlobalWrapper>
  );
}

export default GrnDetailPage;
