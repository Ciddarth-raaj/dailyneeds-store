import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import {
  Box,
  Button,
  Flex,
  Grid,
  GridItem,
  Image,
  Text,
} from "@chakra-ui/react";
import { useGrnDetail } from "../../customHooks/useGrnDetail";
import { capitalize } from "../../util/string";
import currencyFormatter from "../../util/currencyFormatter";
import toast from "react-hot-toast";

const colWidth = 120;

function queryParam(value) {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] : value;
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

function formatDiscountPct(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${(Math.round(n * 100) / 100).toFixed(2)}%`;
}

function GrnDetailPage() {
  const router = useRouter();
  const refno = queryParam(router.query.refno);
  const isReady = router.isReady;

  const { header, items, loading, error } = useGrnDetail(refno, {
    enabled: isReady && Boolean(refno),
  });

  useEffect(() => {
    if (error) {
      toast.error(error?.message || "Failed to load GRN detail.");
    }
  }, [error]);

  const colDefs = useMemo(
    () => [
      {
        field: "product_id",
        headerName: "Product ID",
        type: "id",
        flex: 0,
        minWidth: 100,
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
          const product = params.data?.product;
          const name = product?.de_name ?? product?.de_display_name;
          return name ? capitalize(String(name)) : "—";
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
        field: "mmd_sale_rate",
        headerName: "SP",
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
    []
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
          <Link href="/grn" passHref>
            <Button as="a" size="sm" variant="outline" colorScheme="purple">
              Back to All GRN
            </Button>
          </Link>
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
          {loading ? (
            <Text>Loading...</Text>
          ) : (
            <Box overflowX="auto" w="100%">
              <AgGrid
                rowData={items}
                columnDefs={colDefs}
                tableKey="grn-detail-products"
                gridOptions={{
                  getRowId: (params) => String(params.data?.mmd_mrc_sl_no),
                  defaultColDef: {
                    flex: 0,
                    suppressSizeToFit: true,
                  },
                  rowHeight: 56,
                }}
              />
            </Box>
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default GrnDetailPage;
