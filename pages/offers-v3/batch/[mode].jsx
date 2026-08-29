import React, { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Flex, Grid, Text, Box, Image } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import offersV3 from "../../../helper/offersV3";
import usePermissions from "../../../customHooks/usePermissions";
import { useProducts } from "../../../customHooks/useProducts";
import useOutlets from "../../../customHooks/useOutlets";
import { useOffersV3ById } from "../../../customHooks/useOffersV3ById";
import { OFFER_TYPE_OPTIONS, BATCH_STATUS_LABELS } from "../../../constants/offersV3";

const initialValues = {
  item_code: "",
  outlet_id: "",
  batch_no: "",
  offer_type: "",
  value: "",
};

const validationSchema = Yup.object({
  item_code: Yup.mixed()
    .required("Required")
    .test("is-product", "Select a product", (v) => v != null && v !== "" && Number(v) > 0),
  outlet_id: Yup.mixed()
    .required("Required")
    .test("is-outlet", "Select an outlet", (v) => v != null && v !== "" && Number(v) > 0),
  batch_no: Yup.string().trim().required("Required"),
  offer_type: Yup.string().required("Required"),
  value: Yup.number()
    .moreThan(0, "Must be > 0")
    .required("Required")
    .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v))),
});

function OffersV3BatchForm() {
  const router = useRouter();
  const { mode, id: idQuery } = router.query;
  const id = typeof idQuery === "string" ? idQuery : idQuery?.[0];

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";
  const canAdd = usePermissions("add_offers_v3");

  const { products, loading: productsLoading } = useProducts({ limit: 10000, fetchAll: true });
  const { outlets } = useOutlets();
  const { offer, loading, refetch } = useOffersV3ById(id, "batch", {
    enabled: (editMode || viewMode) && !!id,
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

  const outletOptions = useMemo(
    () => (outlets || []).map((o) => ({ id: o.outlet_id, value: o.outlet_name })),
    [outlets]
  );

  const productCustomRenderer = useCallback(
    (option) => (
      <Flex align="center" gap={3} py={1}>
        <Box flexShrink={0} w="40px" h="40px" borderRadius="md" overflow="hidden" bg="gray.100">
          {option.image_url ? (
            <Image src={option.image_url} alt="" w="100%" h="100%" objectFit="cover" />
          ) : (
            <Flex w="100%" h="100%" align="center" justify="center" fontSize="xs" color="gray.400">
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
    (option) => (option ? `${option.product_name ?? option.value} (ID: ${option.product_id})` : ""),
    []
  );

  const [formInitialValues, setFormInitialValues] = useState(initialValues);

  useEffect(() => {
    if (createMode) {
      const { item_code, outlet_id, batch_no } = router.query;
      setFormInitialValues({
        ...initialValues,
        item_code: item_code ? Number(item_code) : "",
        outlet_id: outlet_id ? Number(outlet_id) : "",
        batch_no: batch_no ? String(batch_no) : "",
      });
      return;
    }
    if (offer) {
      setFormInitialValues({
        item_code: offer.item_code ?? "",
        outlet_id: offer.outlet_id ?? "",
        batch_no: offer.batch_no ?? "",
        offer_type: offer.offer_type ?? "",
        value: offer.value != null ? String(offer.value) : "",
      });
    }
  }, [createMode, offer, router.query]);

  const isReadOnly = viewMode;
  const formDisabled = productsLoading;

  const handleSubmit = async (values) => {
    const payload = {
      item_code: Number(values.item_code),
      outlet_id: Number(values.outlet_id),
      batch_no: values.batch_no.trim(),
      offer_type: values.offer_type,
      value: Number(values.value),
    };

    if (createMode) {
      try {
        await offersV3.batches.create(payload);
        toast.success("Batch-specific offer created");
        router.push("/offers-v3");
      } catch (err) {
        toast.error(err?.message ?? "Failed to create batch offer");
      }
      return;
    }

    if (editMode && id) {
      try {
        await offersV3.batches.update(id, {
          offer_type: payload.offer_type,
          value: payload.value,
        });
        toast.success("Offer updated");
        router.push("/offers-v3");
      } catch (err) {
        toast.error(err?.message ?? "Failed to update offer");
      }
    }
  };

  const handleMakeInactive = async () => {
    try {
      const res = await offersV3.batches.update(id, { status: "inactive" });
      toast.success("Offer marked inactive");
      if (res?._telegramNotify) {
        if (res._telegramNotify.sent) {
          toast.success("Telegram alert sent");
        } else {
          toast.error(`Telegram alert failed: ${res._telegramNotify.error}`);
        }
      }
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Failed to update status");
    }
  };

  const handleEndBatch = async () => {
    try {
      await offersV3.batches.end(id);
      toast.success("Batch marked Zero — Ended");
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Failed to end batch");
    }
  };

  if ((editMode || viewMode) && loading && !offer && id) {
    return (
      <GlobalWrapper title="Batch Offer" permissionKey="view_offers_v3">
        <CustomContainer title="Loading..." filledHeader>
          <Flex py={4}>Loading...</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !offer && id) {
    return (
      <GlobalWrapper title="Batch Offer" permissionKey="view_offers_v3">
        <CustomContainer title="Offer not found" filledHeader>
          <Text py={4}>No batch-specific offer found for ID {id}.</Text>
          <Button colorScheme="purple" onClick={() => router.push("/offers-v3")}>
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode ? "View Batch Offer" : editMode ? "Edit Batch Offer" : "Create Batch-Specific Offer";

  return (
    <GlobalWrapper title={title} permissionKey="view_offers_v3">
      <CustomContainer title={title} filledHeader>
        {(viewMode || editMode) && offer ? (
          <Flex mb={4} align="center" gap={3} flexWrap="wrap">
            <Text fontSize="sm" color="gray.600">
              Status: <b>{BATCH_STATUS_LABELS[offer.status] ?? offer.status}</b>
            </Text>
            {canAdd && offer.status === "zero_stock_flagged" ? (
              <Button size="sm" colorScheme="orange" variant="outline" onClick={handleEndBatch}>
                Confirm Batch Zero — End
              </Button>
            ) : null}
            {canAdd && offer.status !== "inactive" && offer.status !== "batch_zero_ended" ? (
              <Button size="sm" colorScheme="red" variant="outline" onClick={handleMakeInactive}>
                Make Inactive
              </Button>
            ) : null}
          </Flex>
        ) : null}
        <Box opacity={formDisabled ? 0.6 : 1} pointerEvents={formDisabled ? "none" : "auto"} aria-busy={formDisabled}>
          <Formik
            enableReinitialize
            initialValues={formInitialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({ handleSubmit: formikSubmit }) => (
              <form onSubmit={formikSubmit}>
                <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={4} mb={6}>
                  <CustomInput
                    label="Item (Product)"
                    name="item_code"
                    method="searchable-dropdown"
                    values={productOptions}
                    placeholder="Search and select a product"
                    editable={!isReadOnly && !formDisabled && createMode}
                    customRenderer={productCustomRenderer}
                    renderSelected={productRenderSelected}
                  />
                  <CustomInput
                    label="Outlet"
                    name="outlet_id"
                    method="switch"
                    values={outletOptions}
                    editable={!isReadOnly && !formDisabled && createMode}
                  />
                  <CustomInput
                    label="Batch No"
                    name="batch_no"
                    placeholder="Batch No"
                    editable={!isReadOnly && !formDisabled && createMode}
                  />
                  <CustomInput
                    label="Offer Type"
                    name="offer_type"
                    method="switch"
                    values={OFFER_TYPE_OPTIONS}
                    editable={!isReadOnly && !formDisabled}
                  />
                  <CustomInput
                    label="Value"
                    name="value"
                    type="number"
                    placeholder="Value"
                    editable={!isReadOnly && !formDisabled}
                  />
                </Grid>

                <Flex gap={3} justify="flex-end" mt={6}>
                  {viewMode || !canAdd ? (
                    <Button type="button" colorScheme="purple" onClick={() => router.push("/offers-v3")}>
                      Back
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="button"
                        variant="outline"
                        colorScheme="purple"
                        isDisabled={formDisabled}
                        onClick={() => router.push("/offers-v3")}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" colorScheme="purple" isDisabled={formDisabled}>
                        {createMode ? "Create offer" : "Update"}
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

export default OffersV3BatchForm;
