import React, { useMemo, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Box,
  Flex,
  Text,
  FormControl,
  FormLabel,
  Input,
  useDisclosure,
  Grid,
  Button,
} from "@chakra-ui/react";
import Badge from "../../components/Badge";
import PieChartGraph from "../../components/Dashboard/PieChartGraph";
import BarChartGraph, {
  CHART_HEIGHT,
} from "../../components/Dashboard/BarChartGraph";
import AgGrid from "../../components/AgGrid";
import CustomModal from "../../components/CustomModal";
import { useProducts } from "../../customHooks/useProducts";
import { useProductImagesLog } from "../../customHooks/useProductImagesLog";
import { capitalize } from "../../util/string";
import Link from "next/link";

const PIE_COLORS = ["#805AD5", "#B794F4"];

// Helper to format as YYYY-MM-DD, using local date
function formatYYYYMMDD(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return {
    date_from: formatYYYYMMDD(first),
    date_to: formatYYYYMMDD(last),
  };
}

function ProductsDashboard() {
  const router = useRouter();
  const defaultRange = useMemo(getMonthRange, []);
  const [dateFrom, setDateFrom] = useState(defaultRange.date_from);
  const [dateTo, setDateTo] = useState(defaultRange.date_to);

  const { products, loading: productsLoading } = useProducts({
    limit: 10000,
    fetchAll: true,
  });

  const { byUser, loading: logsLoading } = useProductImagesLog({
    date_from: dateFrom,
    date_to: dateTo,
    limit: 50000,
  });

  const [viewProductsUser, setViewProductsUser] = useState(null);
  const [viewMissingDistributor, setViewMissingDistributor] = useState(null);
  const {
    isOpen: isViewProductsOpen,
    onOpen: onOpenViewProducts,
    onClose: onCloseViewProducts,
  } = useDisclosure({
    onClose: () => {
      setViewProductsUser(null);
      setViewMissingDistributor(null);
    },
  });

  const pieData = useMemo(() => {
    if (!products?.length) return [];
    let withImage = 0;
    let withoutImage = 0;
    products.forEach((p) => {
      const url = p.image_url;
      if (url != null && String(url).trim() !== "") {
        withImage += 1;
      } else {
        withoutImage += 1;
      }
    });
    return [
      { name: "With image", value: withImage, color: PIE_COLORS[0] },
      { name: "Without image", value: withoutImage, color: PIE_COLORS[1] },
    ].filter((d) => d.value > 0);
  }, [products]);

  const productMap = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      map[p.product_id] = {
        product_id: p.product_id,
        name: p.gf_item_name ?? p.de_display_name ?? "-",
        imageUrl: p.image_url,
        distributor: p.de_distributor ?? "-",
      };
    });
    return map;
  }, [products]);

  const barData = useMemo(
    () =>
      byUser.map((u) => ({
        name: u.employeeName,
        products: u.uniqueProductCount,
      })),
    [byUser]
  );

  const missingByDistributor = useMemo(() => {
    const byDistributor = {};
    (products || []).forEach((p) => {
      const url = p.image_url;
      if (url == null || String(url).trim() === "") {
        const dist = p.de_distributor ?? "Unknown";
        if (!byDistributor[dist]) byDistributor[dist] = [];
        byDistributor[dist].push({
          product_id: p.product_id,
          name: p.gf_item_name ?? p.de_display_name ?? "-",
          distributor: dist,
        });
      }
    });
    return Object.entries(byDistributor).map(([distributor, items]) => ({
      distributor,
      count: items.length,
      items,
    }));
  }, [products]);

  const productImageReportByDistributor = useMemo(() => {
    const map = {};
    for (const p of products || []) {
      const distributor = p.de_distributor || "Unknown";
      if (!map[distributor]) {
        map[distributor] = { withImages: 0, withoutImages: 0 };
      }
      const hasImages =
        p.has_images ??
        (p.image_url != null && String(p.image_url).trim() !== "");
      if (hasImages) {
        map[distributor].withImages += 1;
      } else {
        map[distributor].withoutImages += 1;
      }
    }
    return Object.entries(map).map(([name, counts]) => ({
      distributor: name,
      ...counts,
      total: counts.withImages + counts.withoutImages,
    }));
  }, [products]);

  const viewProductsRowData = useMemo(() => {
    if (viewMissingDistributor) {
      const group = missingByDistributor.find(
        (d) => d.distributor === viewMissingDistributor
      );
      if (!group?.items?.length) return [];
      return group.items.map((it) => ({
        product_id: it.product_id,
        name: it.name,
        imageUrl: null,
        distributor: it.distributor,
      }));
    }
    if (!viewProductsUser?.productIds?.length || !productMap) return [];
    return viewProductsUser.productIds.map((pid) => {
      const p = productMap[pid] || {
        product_id: pid,
        name: "-",
        imageUrl: null,
        distributor: "-",
      };
      return p;
    });
  }, [
    viewProductsUser,
    productMap,
    viewMissingDistributor,
    missingByDistributor,
  ]);

  const byUserTableRows = useMemo(
    () =>
      byUser.map((u) => ({
        id: u.id,
        employeeName: u.employeeName,
        uniqueProductCount: u.uniqueProductCount,
        _userRow: u,
      })),
    [byUser]
  );

  const byUserColDefs = useMemo(
    () => [
      { field: "employeeName", headerName: "Employee", flex: 1 },
      {
        field: "uniqueProductCount",
        headerName: "Products updated",
        width: 160,
      },
      {
        field: "actions",
        headerName: "Actions",
        type: "action-column",
        valueGetter: (params) => {
          const row = params.data;
          if (!row?._userRow) return [];
          return [
            {
              label: "View Products",
              onClick: () => {
                setViewProductsUser(row._userRow);
                setViewMissingDistributor(null);
                onOpenViewProducts();
              },
            },
          ];
        },
      },
    ],
    [onOpenViewProducts]
  );

  const viewProductsColDefs = useMemo(
    () => [
      { field: "product_id", headerName: "Product ID", type: "id" },
      {
        field: "imageUrl",
        headerName: "Image",
        type: "image",
        width: 100,
      },
      { field: "name", headerName: "Name", type: "capitalized" },
      { field: "distributor", headerName: "Distributor", type: "capitalized" },
    ],
    []
  );

  const productImageReportColDefs = useMemo(
    () => [
      {
        field: "distributor",
        headerName: "Distributor",
        type: "capitalized",
        cellRenderer: (params) => {
          const dist = params.value ?? params.data?.distributor;
          if (dist == null) return "-";
          return (
            <Link
              href={`/products?distributor=${encodeURIComponent(dist)}`}
              passHref
              target="_blank"
            >
              <Text
                as="span"
                cursor="pointer"
                textDecoration="underline"
                _hover={{ color: "purple.600" }}
              >
                {capitalize(String(params.value).trim() || "-")}
              </Text>
            </Link>
          );
        },
      },
      {
        field: "withImages",
        headerName: "With images",
        cellRenderer: (params) => (
          <Flex alignItems="center" h="100%">
            <Badge size="md" colorScheme="green">
              {params.value}
            </Badge>
          </Flex>
        ),
        valueGetter: (params) => params.data?.withImages ?? 0,
      },
      {
        field: "withoutImages",
        headerName: "Without images",
        cellRenderer: (params) => (
          <Flex alignItems="center" h="100%">
            <Badge size="md" colorScheme="red">
              {params.value}
            </Badge>
          </Flex>
        ),
        valueGetter: (params) => params.data?.withoutImages ?? 0,
      },
      { field: "total", headerName: "Total" },
    ],
    [router]
  );

  return (
    <GlobalWrapper
      title="Products Dashboard"
      permissionKey="view_products_dashboard"
    >
      <Flex flexDirection="column" gap="22px">
        <CustomContainer title="Filter" filledHeader size="xs">
          <Flex gap={4} alignItems="flex-end" flexWrap="wrap">
            <FormControl maxW="180px">
              <FormLabel fontSize="sm">From</FormLabel>
              <Input
                type="date"
                size="sm"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </FormControl>
            <FormControl maxW="180px">
              <FormLabel fontSize="sm">To</FormLabel>
              <Input
                type="date"
                size="sm"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </FormControl>

            <Button
              size="sm"
              colorScheme="purple"
              variant="ghost"
              onClick={() => {
                const today = new Date();
                setDateFrom(formatYYYYMMDD(today));
                setDateTo(formatYYYYMMDD(today));
              }}
            >
              Today
            </Button>
          </Flex>
        </CustomContainer>

        <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
          <CustomContainer
            title="With image vs Without image"
            filledHeader
            size="xs"
          >
            <Box minH={CHART_HEIGHT}>
              {productsLoading ? (
                <Text color="gray.500">Loading...</Text>
              ) : pieData.length === 0 ? (
                <Text color="gray.500">No data</Text>
              ) : (
                <PieChartGraph data={pieData} height={CHART_HEIGHT} />
              )}
            </Box>
          </CustomContainer>

          <CustomContainer
            title="Products updated by user"
            filledHeader
            size="xs"
          >
            <Box minH={CHART_HEIGHT}>
              {logsLoading ? (
                <Text color="gray.500">Loading...</Text>
              ) : (
                <BarChartGraph
                  data={barData}
                  dataKey="products"
                  nameKey="name"
                  barName="Products updated"
                  height={CHART_HEIGHT}
                />
              )}
            </Box>
          </CustomContainer>
        </Grid>

        <CustomContainer title="By user" filledHeader>
          <AgGrid
            rowData={byUserTableRows}
            columnDefs={byUserColDefs}
            tableKey="products-dashboard-by-user"
            gridOptions={{
              getRowId: (params) =>
                String(params.data?.id ?? params.data?.employeeName),
            }}
          />
        </CustomContainer>

        <CustomContainer title="Product Image Report" filledHeader>
          <AgGrid
            rowData={productImageReportByDistributor}
            columnDefs={productImageReportColDefs}
            tableKey="products-dashboard-product-image-report"
            gridOptions={{
              getRowId: (params) => String(params.data?.distributor ?? ""),
            }}
          />
        </CustomContainer>
      </Flex>

      <CustomModal
        isOpen={isViewProductsOpen}
        onClose={onCloseViewProducts}
        title={
          viewMissingDistributor
            ? `Missing images – ${viewMissingDistributor}`
            : viewProductsUser
            ? `Products updated by ${viewProductsUser.employeeName}`
            : "View Products"
        }
        size="4xl"
        scrollBehavior="inside"
      >
        {viewProductsRowData.length === 0 ? (
          <Text color="gray.500">No products</Text>
        ) : (
          <AgGrid
            rowData={viewProductsRowData}
            columnDefs={viewProductsColDefs}
            tableKey="products-dashboard-view-products-modal"
            gridOptions={{
              getRowId: (params) => String(params.data?.product_id),
            }}
          />
        )}
      </CustomModal>
    </GlobalWrapper>
  );
}

export default ProductsDashboard;
