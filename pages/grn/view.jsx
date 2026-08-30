import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import GrnPriceCheckerItemsModal from "../../components/grn/GrnPriceCheckerItemsModal";
import GrnHighlightLoader from "../../components/grn/GrnHighlightLoader";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Image,
  Text,
  useToken,
} from "@chakra-ui/react";
import { useGrnDetail } from "../../customHooks/useGrnDetail";
import { useGrnPriceCheckerItemsMap } from "../../customHooks/useGrnPriceCheckerItemsMap";
import { capitalize } from "../../util/string";
import {
  formatDiscountPct,
  getGrnLinePriceMismatch,
  getMismatchRowStyle,
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
  const { colorScheme } = useModuleTableTheme();
  const [linkColor] = useToken("colors", [`${colorScheme}.600`]);
  const [mismatchBg] = useToken("colors", ["red.100"]);

  const { header, items, loading, error } = useGrnDetail(refno, {
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
        getGrnLinePriceMismatch(row, itemsByProductId, false),
    }));
    return sortRowsMismatchFirst(withFlags, (row) => row._priceMismatch);
  }, [items, itemsByProductId, pcLoading]);

  const highlightLoading =
    !loading && productIds.length > 0 && pcLoading;

  const gridOptions = useMemo(
    () => ({
      getRowId: (params) => String(params.data?.mmd_mrc_sl_no),
      defaultColDef: {
        flex: 0,
        suppressSizeToFit: true,
      },
      rowHeight: 56,
      getRowStyle: (params) =>
        getMismatchRowStyle(params.data?._priceMismatch, mismatchBg),
    }),
    [mismatchBg]
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
          });
        },
      },
      {
        field: "product.image_link",
        headerName: "Image",
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
        flex: 0,
        minWidth: 220,
        valueGetter: (params) => {
          const name = productDisplayName(params.data?.product);
          return name || "—";
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
        field: "mmd_sale_rate",
        headerName: "SP",
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
        field: "mmd_pur_price",
        headerName: "Net Cost",
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
    [linkColor]
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
              } else {
                router.push("/grn");
              }
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
        priceCheckerRows={
          selectedProduct?.productId != null
            ? itemsByProductId.get(selectedProduct.productId) ?? []
            : undefined
        }
        priceCheckerLoading={pcLoading}
      />
    </GlobalWrapper>
  );
}

export default GrnDetailPage;
