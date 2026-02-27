import React, { useMemo } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Box, Button, Flex, Text, Image, Grid } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { createStockChecker } from "../../helper/stockChecker";
import { useProducts } from "../../customHooks/useProducts";
import { useStockCheckerById } from "../../customHooks/useStockCheckerById";
import useOutlets from "../../customHooks/useOutlets";
import CustomInput from "../../components/customInput/customInput";
import AgGrid from "../../components/AgGrid";

const validationSchema = Yup.object({
  product_id: Yup.mixed()
    .required("Required")
    .test(
      "is-product",
      "Select a product",
      (v) => v != null && v !== "" && Number(v) > 0
    ),
});

const initialValues = {
  product_id: "",
};

function StockCheckerForm() {
  const router = useRouter();
  const { mode, id: queryId } = router.query;
  const createMode = mode === "create";
  const viewMode = mode === "view";
  const stockCheckerId = queryId != null ? parseInt(String(queryId), 10) : null;

  const { stockChecker, loading: detailLoading } = useStockCheckerById(
    stockCheckerId,
    { enabled: viewMode && !!stockCheckerId }
  );
  const { outlets } = useOutlets();
  const branchesList = useMemo(() => {
    const list = Array.isArray(outlets) ? outlets : outlets?.data;
    return Array.isArray(list) ? list : [];
  }, [outlets]);

  const itemsByBranchId = useMemo(() => {
    const items = stockChecker?.items ?? [];
    const map = {};
    items.forEach((it) => {
      const key = it.branch_id ?? it.branch?.outlet_id;
      if (key != null) map[key] = it;
    });
    return map;
  }, [stockChecker?.items]);

  const branchRows = useMemo(() => {
    return branchesList.map((outlet) => {
      const outletId = outlet.outlet_id ?? outlet.id;
      const item = itemsByBranchId[outletId];
      return {
        branchName: outlet.outlet_name ?? outlet.name ?? "-",
        systemStock: item?.system_stock != null ? item.system_stock : "",
        physicalStock: item?.physical_stock != null ? item.physical_stock : "",
      };
    });
  }, [branchesList, itemsByBranchId]);

  const branchColDefs = useMemo(
    () => [
      { field: "branchName", headerName: "Branch name", flex: 2 },
      {
        field: "systemStock",
        headerName: "System stock",
        valueGetter: (params) =>
          params.data.systemStock !== ""
            ? parseInt(params.data.systemStock)
            : null,
      },
      {
        field: "physicalStock",
        headerName: "Physical stock",
        valueGetter: (params) =>
          params.data.physicalStock !== ""
            ? parseInt(params.data.physicalStock)
            : null,
      },
      {
        headerName: "Difference",
        valueGetter: (params) =>
          params.data.systemStock
            ? parseInt(params.data.systemStock) -
              parseInt(params.data.physicalStock)
            : null,
      },
    ],
    []
  );

  const { products, loading: productsLoading } = useProducts({
    limit: 10000,
    fetchAll: true,
  });

  const productOptions = React.useMemo(
    () =>
      (products || []).map((p) => ({
        id: p.product_id,
        value:
          p.product_name ||
          p.name ||
          p.gf_item_name ||
          p.de_display_name ||
          `Product ${p.product_id}`,
        product_id: p.product_id,
        product_name:
          p.product_name ||
          p.name ||
          p.gf_item_name ||
          p.de_display_name ||
          `Product ${p.product_id}`,
        image_url: p.image_url,
      })),
    [products]
  );

  const productCustomRenderer = React.useCallback(
    (option) => (
      <Flex align="center" gap={3} py={1}>
        <Box
          flexShrink={0}
          w="40px"
          h="40px"
          borderRadius="md"
          overflow="hidden"
          bg="gray.100"
        >
          {option.image_url ? (
            <Image
              src={option.image_url}
              alt=""
              w="100%"
              h="100%"
              objectFit="cover"
            />
          ) : (
            <Flex
              w="100%"
              h="100%"
              align="center"
              justify="center"
              fontSize="xs"
              color="gray.400"
            >
              No image
            </Flex>
          )}
        </Box>
        <Flex direction="column" minW={0} flex={1}>
          <Text fontSize="sm" fontWeight={500} noOfLines={1}>
            {option.product_name ?? option.value}
          </Text>
          <Text fontSize="xs" color="gray.500">
            ID: {option.product_id}
          </Text>
        </Flex>
      </Flex>
    ),
    []
  );

  const productRenderSelected = React.useCallback(
    (option) =>
      option
        ? `${option.product_name ?? option.value} (ID: ${option.product_id})`
        : "",
    []
  );

  const handleSubmit = async (values) => {
    if (!createMode) return;
    try {
      const res = await createStockChecker({
        product_id: Number(values.product_id),
      });
      const newId = res?.stock_checker_id ?? res?.data?.stock_checker_id;
      toast.success("Stock checker created");
      if (newId) {
        router.push(`/stock-checker/view?id=${newId}`);
      } else {
        router.push("/stock-checker");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to create stock checker");
    }
  };

  if (viewMode) {
    if (detailLoading && !stockChecker) {
      return (
        <GlobalWrapper title="Stock Checker" permissionKey="view_stock_checker">
          <CustomContainer title="View Stock Checker" filledHeader>
            <Text py={4}>Loading...</Text>
          </CustomContainer>
        </GlobalWrapper>
      );
    }
    if (!stockChecker && !detailLoading) {
      return (
        <GlobalWrapper title="Stock Checker" permissionKey="view_stock_checker">
          <CustomContainer title="Not found" filledHeader>
            <Text py={4}>Stock checker not found.</Text>
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/stock-checker")}
            >
              Back to list
            </Button>
          </CustomContainer>
        </GlobalWrapper>
      );
    }

    const product = stockChecker?.product;
    const productName =
      product?.de_display_name || product?.gf_item_name || "-";
    const createdByName =
      stockChecker?.created_by_employee?.employee_name ?? "-";

    return (
      <GlobalWrapper
        title="View Stock Checker"
        permissionKey="view_stock_checker"
      >
        <CustomContainer title="View Stock Checker" filledHeader>
          <Formik
            enableReinitialize
            initialValues={{
              product_name: productName,
              created_by: createdByName,
            }}
            onSubmit={() => {}}
          >
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4}>
              <CustomInput
                label="Product"
                name="product_name"
                editable={false}
              />
              <CustomInput
                label="Created By"
                name="created_by"
                editable={false}
              />
            </Grid>
          </Formik>

          <CustomContainer title="Branch-wise stock" filledHeader>
            <AgGrid
              rowData={branchRows}
              columnDefs={branchColDefs}
              tableKey="stock-checker-branch-table"
              gridOptions={{ getRowId: (params) => String(params.rowIndex) }}
            />
          </CustomContainer>

          <Flex mt={4} justify="flex-end">
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/stock-checker")}
            >
              Back to list
            </Button>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if (!createMode) {
    return (
      <GlobalWrapper title="Stock Checker" permissionKey="view_stock_checker">
        <CustomContainer title="Stock Checker" filledHeader>
          <Flex py={4} gap={2}>
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/stock-checker")}
            >
              Back to list
            </Button>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = "Create Stock Checker";

  return (
    <GlobalWrapper title={title} permissionKey="add_stock_checker">
      <CustomContainer title={title} filledHeader>
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ isSubmitting }) => (
            <Form>
              <Flex direction="column" gap={4} maxW="400px">
                <CustomInput
                  label="Product"
                  name="product_id"
                  method="searchable-dropdown"
                  values={productOptions}
                  placeholder="Select product"
                  editable={!productsLoading}
                  customRenderer={productCustomRenderer}
                  renderSelected={productRenderSelected}
                />
                <Flex gap={2}>
                  <Button
                    type="submit"
                    colorScheme="purple"
                    size="sm"
                    isLoading={isSubmitting}
                    loadingText="Creating..."
                  >
                    Create
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => router.push("/stock-checker")}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Flex>
            </Form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockCheckerForm;
