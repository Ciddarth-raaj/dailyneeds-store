import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomInput from "../../components/customInput/customInput";
import { Button, Flex, Grid, Text, Box, Image } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import productOffers from "../../helper/productOffers";
import usePermissions from "../../customHooks/usePermissions";
import { useProducts } from "../../customHooks/useProducts";
import { useProductOfferByProductId } from "../../customHooks/useProductOfferByProductId";

const mrpField = Yup.number()
  .min(0, "Must be ≥ 0")
  .required("Required")
  .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)));

const sellingPriceField = Yup.number()
  .min(0, "Must be ≥ 0")
  .required("Required")
  .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v)));

const initialValuesCreate = {
  product_ids: [],
  mrp: "",
  selling_price: "",
};

const initialValuesSingle = {
  product_id: "",
  mrp: "",
  selling_price: "",
};

function ProductOffersForm() {
  const router = useRouter();
  const { mode, product_id: productIdQuery } = router.query;
  const productId =
    typeof productIdQuery === "string" ? productIdQuery : productIdQuery?.[0];

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";
  const canAdd = usePermissions("add_product_offers");

  const { products, loading: productsLoading } = useProducts({
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
        value: `${p.gf_item_name ?? ""} (${p.product_id})`,
        product_id: p.product_id,
        product_name: p.gf_item_name,
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

  const [formInitialValues, setFormInitialValues] = useState(initialValuesSingle);

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
        mrp: mrpField,
        selling_price: sellingPriceField,
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
      mrp: mrpField,
      selling_price: sellingPriceField,
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
        mrp: offer.mrp != null ? String(offer.mrp) : "",
        selling_price:
          offer.selling_price != null ? String(offer.selling_price) : "",
      });
    }
  }, [createMode, offer]);

  const isReadOnly = viewMode;

  const handleSubmit = async (values) => {
    if (createMode) {
      const ids = Array.isArray(values.product_ids) ? values.product_ids : [];
      if (ids.length === 0) {
        toast.error("Select at least one product");
        return;
      }
      const mrp = values.mrp !== "" ? Number(values.mrp) : null;
      const selling_price =
        values.selling_price !== "" ? Number(values.selling_price) : null;
      const toastId = toast.loading(
        ids.length > 1 ? `Creating ${ids.length} offers…` : "Creating offer…"
      );
      try {
        await Promise.all(
          ids.map((pid) =>
            productOffers.create({
              product_id: Number(pid),
              mrp,
              selling_price,
            })
          )
        );
        toast.success(
          ids.length > 1
            ? `Created ${ids.length} offers`
            : "Offer created",
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
          mrp: values.mrp !== "" ? Number(values.mrp) : null,
          selling_price:
            values.selling_price !== "" ? Number(values.selling_price) : null,
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
        <Formik
          key={createMode ? "create-multi" : "single-offer"}
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit }) => (
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
                    editable={!productsLoading}
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
                    editable={!isReadOnly && !productsLoading}
                    customRenderer={productCustomRenderer}
                    renderSelected={productRenderSelected}
                  />
                )}
                <CustomInput
                  label="MRP"
                  name="mrp"
                  type="number"
                  placeholder="MRP"
                  editable={!isReadOnly}
                />
                <CustomInput
                  label="Selling Price"
                  name="selling_price"
                  type="number"
                  placeholder="Selling price"
                  editable={!isReadOnly}
                />
              </Grid>

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
                      onClick={() => router.push("/product-offers")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" colorScheme="purple">
                      {createMode ? "Create offer(s)" : "Update"}
                    </Button>
                  </>
                )}
              </Flex>
            </form>
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ProductOffersForm;
