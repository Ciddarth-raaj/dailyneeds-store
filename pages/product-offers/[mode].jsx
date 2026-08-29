import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomInput from "../../components/customInput/customInput";
import {
  Button,
  Flex,
  Grid,
  Text,
  Box,
  Image,
  Progress,
} from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import productOffers from "../../helper/productOffers";
import usePermissions from "../../customHooks/usePermissions";
import { useProducts } from "../../customHooks/useProducts";
import { useProductOfferByProductId } from "../../customHooks/useProductOfferByProductId";
import { OFFER_TYPES, OFFER_TYPE_OPTIONS } from "../../constants/productOffers";

const offerValueField = Yup.number()
  .min(0, "Must be ≥ 0")
  .required("Required")
  .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)));

const initialValuesCreate = {
  product_ids: [],
  offer_type: OFFER_TYPES.PERCENT_OFF,
  offer_value: "",
};

const initialValuesSingle = {
  product_id: "",
  offer_type: OFFER_TYPES.PERCENT_OFF,
  offer_value: "",
};

const OFFER_VALUE_LABELS = {
  [OFFER_TYPES.SPECIAL_PRICE]: "Value (Special Price)",
  [OFFER_TYPES.SAVE]: "Value (Save Amount)",
  [OFFER_TYPES.PERCENT_OFF]: "Value (% Off)",
};

const OFFER_VALUE_PLACEHOLDERS = {
  [OFFER_TYPES.SPECIAL_PRICE]: "Special price",
  [OFFER_TYPES.SAVE]: "Amount to save",
  [OFFER_TYPES.PERCENT_OFF]: "Discount %",
};

function ProductsFetchProgress({ progress }) {
  const loaded = progress?.loaded ?? 0;
  const total = progress?.total;
  const hasTotal = total != null && total > 0;
  const percent = hasTotal
    ? Math.min(100, Math.round((loaded / total) * 100))
    : null;

  const countLabel = hasTotal
    ? `${loaded.toLocaleString()} / ${total.toLocaleString()} products`
    : loaded > 0
    ? `${loaded.toLocaleString()} products loaded`
    : "Starting…";

  return (
    <Box mb={4} w="100%">
      <Flex
        justify="space-between"
        align="center"
        mb={2}
        gap={3}
        flexWrap="wrap"
      >
        <Text fontSize="sm" fontWeight="medium" color="gray.700">
          Loading products
        </Text>
        <Text fontSize="sm" color="gray.600">
          {countLabel}
          {percent != null ? ` (${percent}%)` : ""}
        </Text>
      </Flex>
      <Progress
        value={hasTotal ? percent : undefined}
        isIndeterminate={!hasTotal && loaded === 0}
        hasStripe={!hasTotal && loaded > 0}
        isAnimated
        size="sm"
        colorScheme="purple"
        borderRadius="md"
      />
    </Box>
  );
}

function ProductOffersForm() {
  const router = useRouter();
  const { mode, product_id: productIdQuery } = router.query;
  const productId =
    typeof productIdQuery === "string" ? productIdQuery : productIdQuery?.[0];

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";
  const canAdd = usePermissions("add_product_offers");

  const {
    products,
    loading: productsLoading,
    fetchProgress,
  } = useProducts({
    limit: 10000,
    fetchAll: true,
  });
  const { offer, loading } = useProductOfferByProductId(productId, {
    enabled: (editMode || viewMode) && !!productId,
  });

  const productOptions = useMemo(
    () =>
      (products || []).map((p) => ({
        id: p.product_id,
        value: `${p.de_name ?? ""} (${p.product_id})`,
        product_id: p.product_id,
        product_name: p.de_name,
        image_url: p.image_url,
      })),
    [products]
  );

  const productCustomRenderer = useCallback(
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

  const productRenderSelected = useCallback(
    (option) =>
      option
        ? `${option.product_name ?? option.value} (ID: ${option.product_id})`
        : "",
    []
  );

  const [formInitialValues, setFormInitialValues] =
    useState(initialValuesSingle);

  const offerFields = {
    offer_type: Yup.string()
      .oneOf(Object.values(OFFER_TYPES))
      .required("Required"),
    offer_value: offerValueField.when("offer_type", {
      is: OFFER_TYPES.PERCENT_OFF,
      then: (schema) => schema.max(100, "Must be ≤ 100"),
      otherwise: (schema) => schema,
    }),
  };

  const validationSchema = useMemo(() => {
    if (createMode) {
      return Yup.object({
        product_ids: Yup.array()
          .of(Yup.mixed())
          .min(1, "Select at least one product")
          .required("Select at least one product")
          .test(
            "has-ids",
            "Select at least one product",
            (arr) => Array.isArray(arr) && arr.length > 0
          ),
        ...offerFields,
      });
    }
    return Yup.object({
      product_id: Yup.mixed()
        .required("Required")
        .test(
          "is-product",
          "Select a product",
          (v) => v != null && v !== "" && Number(v) > 0
        ),
      ...offerFields,
    });
  }, [createMode]);

  useEffect(() => {
    if (createMode) {
      setFormInitialValues(initialValuesCreate);
      return;
    }
    if (offer) {
      setFormInitialValues({
        product_id: offer.product_id ?? "",
        offer_type: offer.offer_type ?? OFFER_TYPES.PERCENT_OFF,
        offer_value: offer.offer_value != null ? String(offer.offer_value) : "",
      });
    }
  }, [createMode, offer]);

  const isReadOnly = viewMode;
  const formDisabled = productsLoading;

  const handleSubmit = async (values) => {
    const offer_type = values.offer_type;
    const offer_value = values.offer_value !== "" ? Number(values.offer_value) : null;

    if (createMode) {
      const ids = Array.isArray(values.product_ids) ? values.product_ids : [];
      if (ids.length === 0) {
        toast.error("Select at least one product");
        return;
      }
      const toastId = toast.loading(
        ids.length > 1 ? `Creating ${ids.length} offers…` : "Creating offer…"
      );
      try {
        await Promise.all(
          ids.map((pid) =>
            productOffers.create({
              product_id: Number(pid),
              offer_type,
              offer_value,
            })
          )
        );
        toast.success(
          ids.length > 1 ? `Created ${ids.length} offers` : "Offer created",
          { id: toastId }
        );
        router.push("/product-offers");
      } catch (err) {
        toast.error(err?.message ?? "Failed to create offer(s)", {
          id: toastId,
        });
      }
      return;
    }

    if (editMode && productId) {
      try {
        await productOffers.update(productId, {
          offer_type,
          offer_value,
        });
        toast.success("Offer updated");
        router.push("/product-offers");
      } catch (err) {
        toast.error(err?.message ?? "Failed to update offer");
      }
    }
  };

  if ((editMode || viewMode) && loading && !offer && productId) {
    return (
      <GlobalWrapper title="Product Offer" permissionKey="view_product_offers">
        <CustomContainer title="Loading..." filledHeader>
          <Flex py={4}>Loading...</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !offer && productId) {
    return (
      <GlobalWrapper title="Product Offer" permissionKey="view_product_offers">
        <CustomContainer title="Offer not found" filledHeader>
          <Text py={4}>No offer found for product ID {productId}.</Text>
          <Button
            colorScheme="purple"
            onClick={() => router.push("/product-offers")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Offer"
    : editMode
    ? "Edit Offer"
    : "Create Offer";

  return (
    <GlobalWrapper title={title} permissionKey="view_product_offers">
      <CustomContainer title={title} filledHeader>
        {productsLoading ? (
          <ProductsFetchProgress progress={fetchProgress} />
        ) : null}
        <Box
          opacity={formDisabled ? 0.6 : 1}
          pointerEvents={formDisabled ? "none" : "auto"}
          aria-busy={formDisabled}
        >
          <Formik
            key={createMode ? "create-multi" : "single-offer"}
            enableReinitialize
            initialValues={formInitialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ handleSubmit: formikSubmit, values }) => (
              <form onSubmit={formikSubmit}>
                <Grid
                  templateColumns={{ base: "1fr", md: "1fr 1fr" }}
                  gap={4}
                  mb={6}
                >
                  {createMode ? (
                    <CustomInput
                      label="Products (bulk create)"
                      name="product_ids"
                      method="searchable-dropdown"
                      values={productOptions}
                      multiple
                      placeholder="Search and select one or more products"
                      editable={!isReadOnly && !formDisabled}
                      customRenderer={productCustomRenderer}
                      renderSelected={productRenderSelected}
                    />
                  ) : (
                    <CustomInput
                      label="Product"
                      name="product_id"
                      method="searchable-dropdown"
                      values={productOptions}
                      placeholder="Select product"
                      editable={!isReadOnly && !formDisabled}
                      customRenderer={productCustomRenderer}
                      renderSelected={productRenderSelected}
                    />
                  )}
                  <CustomInput
                    label="Offer Type"
                    name="offer_type"
                    method="switch"
                    values={OFFER_TYPE_OPTIONS}
                    editable={!isReadOnly && !formDisabled}
                  />
                  <CustomInput
                    label={OFFER_VALUE_LABELS[values.offer_type] ?? "Value"}
                    name="offer_value"
                    type="number"
                    placeholder={OFFER_VALUE_PLACEHOLDERS[values.offer_type] ?? "Value"}
                    editable={!isReadOnly && !formDisabled}
                  />
                </Grid>

                <Text fontSize="xs" color="gray.500" mt={-4} mb={6}>
                  MRP and Selling Price are not entered here — Price Checker
                  cross-checks this offer against MRP data separately.
                </Text>

                <Flex gap={3} justify="flex-end" mt={6}>
                  {viewMode ? (
                    <Button
                      type="button"
                      colorScheme="purple"
                      onClick={() => router.push("/product-offers")}
                    >
                      Back
                    </Button>
                  ) : !canAdd ? (
                    <Button
                      type="button"
                      colorScheme="purple"
                      onClick={() => router.push("/product-offers")}
                    >
                      Back
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        colorScheme="purple"
                        isDisabled={formDisabled}
                        onClick={() => router.push("/product-offers")}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        colorScheme="purple"
                        isDisabled={formDisabled}
                      >
                        {createMode ? "Create offer(s)" : "Update"}
                      </Button>
                    </>
                  )}
                </Flex>
              </form>
            )}
          </Formik>
        </Box>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ProductOffersForm;
