import React, { useMemo } from "react";
import { useRouter } from "next/router";
import { useProducts } from "../../customHooks/useProducts";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Box, Flex, Spinner, Text } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import Badge from "../../components/Badge";

function ProductImageReport() {
  const router = useRouter();
  const { products, loading, error } = useProducts({
    limit: 10000,
    fetchAll: true,
  });

  const byDistributor = useMemo(() => {
    const map = {};
    for (const p of products) {
      const distributor = p.de_distributor || "Unknown";
      if (!map[distributor]) {
        map[distributor] = { withImages: 0, withoutImages: 0 };
      }
      if (p.has_images) {
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

  const handleDistributorClick = (distributor) => {
    router.push(`/products?distributor=${encodeURIComponent(distributor)}`);
  };

  const colDefs = [
    {
      field: "distributor",
      headerName: "Distributor",
      type: "capitalized",
      cellStyle: { cursor: "pointer", textDecoration: "underline" },
      onCellClicked: (params) =>
        handleDistributorClick(params.value ?? params.data?.distributor),
    },
    {
      field: "withImages",
      headerName: "With images",
      cellRenderer: (params) => {
        return (
          <Flex alignItems="center" h="100%">
            <Badge size="md" colorScheme="green">
              {params.value}
            </Badge>
          </Flex>
        );
      },
      valueGetter: (params) => params.data.withImages ?? 0,
    },
    {
      field: "withoutImages",
      headerName: "Without images",
      cellRenderer: (params) => {
        return (
          <Flex alignItems="center" h="100%">
            <Badge size="md" colorScheme="red">
              {params.value}
            </Badge>
          </Flex>
        );
      },
      valueGetter: (params) => params.data.withoutImages ?? 0,
    },
    {
      field: "total",
      headerName: "Total",
    },
  ];

  if (loading) {
    return (
      <GlobalWrapper title="Product Image Report" permissionKey="view_products">
        <CustomContainer title="Product Image Report" filledHeader>
          <Box py={8} display="flex" justifyContent="center">
            <Spinner size="lg" />
          </Box>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (error) {
    return (
      <GlobalWrapper title="Product Image Report" permissionKey="view_products">
        <CustomContainer title="Product Image Report" filledHeader>
          <Text color="red.500">Failed to load products.</Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Product Image Report" permissionKey="view_products">
      <CustomContainer title="Product Image Report" filledHeader>
        <AgGrid
          rowData={byDistributor}
          colDefs={colDefs}
          gridOptions={{
            getRowId: (params) => params.data.distributor,
          }}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ProductImageReport;
