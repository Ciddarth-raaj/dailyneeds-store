import React from "react";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import CustomModal from "../CustomModal";
import CustomInput from "../customInput/customInput";
import offersV3 from "../../helper/offersV3";
import { OFFER_TYPE_OPTIONS } from "../../constants/offersV3";

const initialValues = {
  offer_type: "",
  value: "",
  threshold_qty: "",
};

const validationSchema = Yup.object({
  offer_type: Yup.string().required("Required"),
  value: Yup.number()
    .moreThan(0, "Must be > 0")
    .required("Required")
    .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v))),
  threshold_qty: Yup.number()
    .integer("Must be a whole number")
    .min(0, "Must be 0 or greater")
    .required("Required")
    .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v))),
});

export default function AddToOfferV3Modal({
  isOpen,
  onClose,
  productId,
  productName,
  onCreated,
}) {
  const handleSubmit = async (values, { resetForm }) => {
    if (productId == null) return;
    try {
      await offersV3.items.create({
        item_code: productId,
        offer_type: values.offer_type,
        value: values.value,
        threshold_qty: values.threshold_qty,
      });
      toast.success("Item-level offer created");
      resetForm();
      onCreated?.();
    } catch (err) {
      toast.error(err?.message ?? "Failed to create offer");
    }
  };

  const titleParts = [`Add Offer — ${productId ?? ""}`];
  if (productName) titleParts.push(productName);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={titleParts.filter(Boolean).join(" · ")}
      size="md"
    >
      <Formik
        enableReinitialize
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ handleSubmit: formikSubmit, isSubmitting }) => (
          <form onSubmit={formikSubmit}>
            <Grid templateColumns="1fr" gap={4} mb={2}>
              <CustomInput
                label="Offer Type"
                name="offer_type"
                method="switch"
                values={OFFER_TYPE_OPTIONS}
                editable
              />
              <CustomInput
                label="Value"
                name="value"
                type="number"
                placeholder="Value"
                editable
              />
              <CustomInput
                label="Threshold Qty (low-stock warning)"
                name="threshold_qty"
                type="number"
                placeholder="Threshold Qty"
                editable
              />
            </Grid>

            <Flex gap={3} justify="flex-end" mt={6}>
              <Button type="button" variant="outline" colorScheme="purple" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" colorScheme="purple" isLoading={isSubmitting}>
                Create offer
              </Button>
            </Flex>
          </form>
        )}
      </Formik>
    </CustomModal>
  );
}
