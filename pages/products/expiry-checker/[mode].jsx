import React, { useMemo, useCallback, useState, useEffect } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Box, Button, Flex, Text, Image, Grid } from "@chakra-ui/react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import {
  createProductsExpiryChecker,
  createOrUpdateExpiryCheckerItem,
} from "../../../helper/productsExpiryChecker";
import asset from "../../../helper/asset";
import { useProducts } from "../../../customHooks/useProducts";
import { useProductsExpiryCheckerById } from "../../../customHooks/useProductsExpiryCheckerById";
import useOutlets from "../../../customHooks/useOutlets";
import { useUser } from "../../../contexts/UserContext";
import CustomInput from "../../../components/customInput/customInput";
import AgGrid from "../../../components/AgGrid";

const validationSchema = Yup.object({
  branch_id: Yup.mixed().required("Branch is required"),
  product_id: Yup.mixed()
    .required("Required")
    .test(
      "is-product",
      "Select a product",
      (v) => v != null && v !== "" && Number(v) > 0
    ),
  expiry_date: Yup.date().required("Expiry date is required"),
  qty: Yup.number().required("Qty is required").min(0, "Must be ≥ 0"),
  ref_file: Yup.mixed().test(
    "ref-file",
    "Ref file is required",
    (v) => v != null && (typeof v === "string" || (v && v instanceof File))
  ),
});

const initialValues = {
  branch_id: "",
  product_id: "",
  expiry_date: "",
  qty: "",
  ref_file: null,
};

function ExpiryCheckerForm() {
  const router = useRouter();
  const { storeId } = useUser().userConfig;
  const { mode, id: queryId } = router.query;
  const createMode = mode === "create";
  const viewMode = mode === "view";
  const expiryCheckerId =
    queryId != null ? parseInt(String(queryId), 10) : null;

  const {
    expiryChecker,
    loading: detailLoading,
    refetch: refetchExpiryChecker,
  } = useProductsExpiryCheckerById(expiryCheckerId, {
    enabled: viewMode && !!expiryCheckerId,
  });
  const { outlets } = useOutlets({ skipIds: [1] });
  const branchesList = useMemo(() => {
    const list = Array.isArray(outlets) ? outlets : outlets?.data;
    return Array.isArray(list) ? list : [];
  }, [outlets]);

  const itemsByBranchId = useMemo(() => {
    const items = expiryChecker?.items ?? [];
    const map = {};
    items.forEach((it) => {
      const key = it.branch_id ?? it.branch?.outlet_id;
      if (key != null) map[key] = it;
    });
    return map;
  }, [expiryChecker?.items]);

  const [sortVerifiedToBottom, setSortVerifiedToBottom] = useState(true);
  useEffect(() => {
    if (!viewMode) setSortVerifiedToBottom(true);
  }, [viewMode]);

  const branchRows = useMemo(() => {
    const rows = branchesList.map((outlet) => {
      const outletId = outlet.outlet_id ?? outlet.id;
      const item = itemsByBranchId[outletId];
      return {
        branchId: outletId,
        branchName: outlet.outlet_name ?? outlet.name ?? "-",
        qty: item?.qty != null ? item.qty : "",
        isVerified: !!item?.is_verified,
      };
    });
    if (sortVerifiedToBottom) {
      rows.sort((a, b) => (a.isVerified ? 1 : 0) - (b.isVerified ? 1 : 0));
    }
    return rows;
  }, [branchesList, itemsByBranchId, sortVerifiedToBottom]);

  const handleVerifyBranch = useCallback(
    async (rowData) => {
      if (!expiryCheckerId || rowData?.branchId == null) return;
      const qty = Number(rowData?.qty) || 0;
      try {
        await createOrUpdateExpiryCheckerItem({
          products_expiry_checker_id: expiryCheckerId,
          branch_id: rowData.branchId,
          qty,
          is_verified: true,
        });
        toast.success("Marked as verified");
        setSortVerifiedToBottom(false);
        refetchExpiryChecker();
      } catch (err) {
        toast.error(err?.message || "Failed to verify");
      }
    },
    [expiryCheckerId, refetchExpiryChecker]
  );

  const handleUnverifyBranch = useCallback(
    async (rowData) => {
      if (!expiryCheckerId || rowData?.branchId == null) return;
      const qty = Number(rowData?.qty) || 0;
      try {
        await createOrUpdateExpiryCheckerItem({
          products_expiry_checker_id: expiryCheckerId,
          branch_id: rowData.branchId,
          qty,
          is_verified: false,
        });
        toast.success("Marked as unverified");
        setSortVerifiedToBottom(false);
        refetchExpiryChecker();
      } catch (err) {
        toast.error(err?.message || "Failed to unverify");
      }
    },
    [expiryCheckerId, refetchExpiryChecker]
  );

  const branchColDefs = useMemo(
    () => [
      { field: "branchName", headerName: "Branch name", flex: 2 },
      {
        field: "qty",
        headerName: "Qty",
        valueGetter: (params) =>
          params.data.qty !== "" ? parseInt(params.data.qty) : null,
      },
      {
        field: "is_verified",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.isVerified
            ? { label: "Verified", colorScheme: "green" }
            : { label: "Unverified", colorScheme: "gray" },
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const data = params.data;
          if (!data) return [];
          const actions = [];
          const hasData = data.qty !== "" && data.qty != null;
          if (!data.isVerified) {
            actions.push({
              label: "Verify",
              icon: "fa-solid fa-circle-check",
              colorScheme: "green",
              disabled: !hasData,
              onClick: () => handleVerifyBranch(data),
            });
          }
          if (data.isVerified) {
            actions.push({
              label: "Unverify",
              icon: "fa-solid fa-circle-xmark",
              colorScheme: "red",
              onClick: () => handleUnverifyBranch(data),
            });
          }
          return actions;
        },
      },
    ],
    [handleVerifyBranch, handleUnverifyBranch]
  );

  const { products, loading: productsLoading } = useProducts({
    limit: 10000,
    fetchAll: true,
  });

  const productOptions = React.useMemo(
    () =>
      (products || []).map((p) => ({
        id: p.product_id,
        value: `${p.gf_item_name} (${p.product_id})`,
        product_id: p.product_id,
        product_name: p.gf_item_name,
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

  const branchOptions = useMemo(
    () =>
      branchesList.map((o) => ({
        id: o.outlet_id ?? o.id,
        value: o.outlet_name ?? o.name ?? `Branch ${o.outlet_id ?? o.id}`,
      })),
    [branchesList]
  );

  const initialBranchId = useMemo(() => {
    if (storeId != null && storeId !== "") {
      const id = Number(storeId);
      if (!Number.isNaN(id)) return id;
    }
    return "";
  }, [storeId]);

  const isBranchDisabled = storeId != null && storeId !== "";

  const UPLOAD_TOAST_ID = "expiry-checker-ref-file-upload";

  const handleSubmit = async (values) => {
    if (!createMode) return;
    try {
      let refFileUrl = values.ref_file;
      if (values.ref_file && values.ref_file instanceof File) {
        toast.loading("Uploading ref file...", { id: UPLOAD_TOAST_ID });
        try {
          const uploadRes = await asset.upload(
            values.ref_file,
            values.ref_file.name,
            "expiry-checker"
          );
          if (uploadRes?.remoteUrl) {
            refFileUrl = uploadRes.remoteUrl;
          } else {
            return;
          }
        } catch (uploadErr) {
          toast.error(uploadErr?.message || "Failed to upload ref file", {
            id: UPLOAD_TOAST_ID,
          });
          return;
        }
      }
      const branchId = Number(values.branch_id);
      const res = await createProductsExpiryChecker({
        product_id: Number(values.product_id),
        expiry_date: values.expiry_date,
        ref_file: refFileUrl,
        items: [{ branch_id: branchId, qty: Number(values.qty) }],
      });
      const newId =
        res?.products_expiry_checker_id ??
        res?.data?.products_expiry_checker_id;
      toast.success("Expiry checker created", { id: UPLOAD_TOAST_ID });
      if (newId) {
        router.push(`/products/expiry-checker/view?id=${newId}`);
      } else {
        router.push("/products/expiry-checker");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to create expiry checker", {
        id: UPLOAD_TOAST_ID,
      });
    }
  };

  if (viewMode) {
    if (detailLoading && !expiryChecker) {
      return (
        <GlobalWrapper
          title="Expiry Checker"
          permissionKey="view_expiry_checker"
        >
          <CustomContainer title="View Expiry Checker" filledHeader>
            <Text py={4}>Loading...</Text>
          </CustomContainer>
        </GlobalWrapper>
      );
    }
    if (!expiryChecker && !detailLoading) {
      return (
        <GlobalWrapper
          title="Expiry Checker"
          permissionKey="view_expiry_checker"
        >
          <CustomContainer title="Not found" filledHeader>
            <Text py={4}>Expiry checker not found.</Text>
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/products/expiry-checker")}
            >
              Back to list
            </Button>
          </CustomContainer>
        </GlobalWrapper>
      );
    }

    const product = expiryChecker?.product;
    const productName =
      product?.gf_item_name || product?.de_display_name || "-";
    const refFile = expiryChecker?.ref_file ?? "-";

    return (
      <GlobalWrapper
        title="View Expiry Checker"
        permissionKey="view_expiry_checker"
      >
        <CustomContainer title="View Expiry Checker" filledHeader>
          <Formik
            enableReinitialize
            initialValues={{
              product_name: productName,
              expiry_date: expiryChecker?.expiry_date ?? "-",
              ref_file: refFile && refFile !== "-" ? [refFile] : [],
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
                label="Expiry Date"
                name="expiry_date"
                editable={false}
                method="datepicker"
              />
              <CustomInput
                label="Ref File"
                name="ref_file"
                method="file"
                editable={false}
              />
            </Grid>
          </Formik>

          <CustomContainer title="Branch-wise qty" filledHeader>
            <AgGrid
              rowData={branchRows}
              columnDefs={branchColDefs}
              tableKey="expiry-checker-branch-table"
            />
          </CustomContainer>

          <Flex mt={4} justify="flex-end">
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/products/expiry-checker")}
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
      <GlobalWrapper title="Expiry Checker" permissionKey="view_expiry_checker">
        <CustomContainer title="Expiry Checker" filledHeader>
          <Flex py={4} gap={2}>
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/products/expiry-checker")}
            >
              Back to list
            </Button>
          </Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = "Create Expiry Checker";

  return (
    <GlobalWrapper title={title} permissionKey="add_expiry_checker">
      <CustomContainer title={title} filledHeader>
        <Formik
          initialValues={{
            ...initialValues,
            branch_id: initialBranchId,
          }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ isSubmitting }) => (
            <Form>
              <Grid templateColumns="1fr 1fr" gap={4}>
                <CustomInput
                  label="Branch"
                  name="branch_id"
                  method="searchable-dropdown"
                  values={branchOptions}
                  placeholder="Select branch"
                  editable={!isBranchDisabled}
                />
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
                <CustomInput
                  label="Expiry Date"
                  name="expiry_date"
                  type="date"
                  method="datepicker"
                />
                <CustomInput
                  label="Qty"
                  name="qty"
                  type="number"
                  placeholder="0"
                />
                <CustomInput label="Ref File" name="ref_file" method="file" />
              </Grid>

              <Flex gap={2} w="100%" justify="flex-end">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => router.push("/products/expiry-checker")}
                >
                  Cancel
                </Button>

                <Button
                  type="submit"
                  colorScheme="purple"
                  size="sm"
                  isLoading={isSubmitting}
                  loadingText="Creating..."
                >
                  Create
                </Button>
              </Flex>
            </Form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ExpiryCheckerForm;
