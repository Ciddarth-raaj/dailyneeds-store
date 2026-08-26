import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import EmptyData from "../../../components/EmptyData";
import { Box, Button, Flex, Spinner } from "@chakra-ui/react";
import { useGrnDetail } from "../../../customHooks/useGrnDetail";
import { capitalize } from "../../../util/string";
import toast from "react-hot-toast";

function queryParam(value) {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] : value;
}

function productDisplayName(product) {
  const name = product?.de_name ?? product?.de_display_name;
  return name ? capitalize(String(name)) : "";
}

function PurchaseUom() {
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

  const rowData = useMemo(
    () =>
      items.map((item) => ({
        product_id: item.product_id,
        name: productDisplayName(item.product),
        mrp: item.mrp,
        pareto: item.product?.pareto ?? null,
      })),
    [items]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "product_id",
        headerName: "ID",
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
        field: "mrp",
        headerName: "MRP",
        type: "currency",
        flex: 0,
        minWidth: 120,
      },
      {
        field: "pareto",
        headerName: "Pareto",
        flex: 0,
        minWidth: 120,
        valueFormatter: (params) => params.value ?? "—",
      },
    ],
    []
  );

  const pageTitle = header?.mmh_mrc_refno
    ? `Purchase UOM - GRN ${header.mmh_mrc_refno}`
    : "Purchase UOM";

  return (
    <GlobalWrapper title={pageTitle} permissionKey="view_purchase_uom">
      <Flex flexDirection="column" gap={6}>
        <Flex justify="space-between" align="center" flexWrap="wrap" gap={3}>
          <Link href="/grn" passHref>
            <Button as="a" size="sm" variant="outline" colorScheme="purple">
              Back to All GRN
            </Button>
          </Link>
        </Flex>

        <CustomContainer
          title={
            header?.mmh_mrc_refno
              ? `Purchase UOM (GRN ${header.mmh_mrc_refno})`
              : "Purchase UOM"
          }
          subtitle={header?.supplier_name || undefined}
          filledHeader
        >
          {!refno ? (
            <EmptyData
              message="Select a GRN from the All GRN page to view Purchase UOM"
              faIcon="fa-ruler-combined"
            />
          ) : loading ? (
            <Flex w="100%" minH="200px" justifyContent="center" alignItems="center">
              <Spinner size="lg" color="purple.500" thickness="3px" />
            </Flex>
          ) : (
            <Box overflowX="auto" w="100%">
              <AgGrid
                rowData={rowData}
                columnDefs={colDefs}
                tableKey="grn-purchase-uom"
              />
            </Box>
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default PurchaseUom;
