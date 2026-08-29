import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import CustomInput from "../../components/customInput/customInput";
import { Button, Flex, Grid, Text } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import offersV3 from "../../helper/offersV3";
import usePermissions from "../../customHooks/usePermissions";
import { useOffersV3ById } from "../../customHooks/useOffersV3ById";
import { OFFER_TYPE_OPTIONS } from "../../constants/offersV3";

const initialValues = {
  item_code: "",
  item_name: "",
  offer_type: "",
  value: "",
};

const validationSchema = Yup.object({
  item_code: Yup.string().trim().required("Required"),
  item_name: Yup.string().trim().required("Required"),
  offer_type: Yup.string().required("Required"),
  value: Yup.number()
    .min(0, "Must be ≥ 0")
    .required("Required")
    .transform((v) => (v === "" || Number.isNaN(Number(v)) ? null : Number(v))),
});

function OffersV3Form() {
  const router = useRouter();
  const { mode, id: idQuery } = router.query;
  const id = typeof idQuery === "string" ? idQuery : idQuery?.[0];

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";
  const canAdd = usePermissions("add_offers_v3");

  const { offer, loading } = useOffersV3ById(id, {
    enabled: (editMode || viewMode) && !!id,
  });

  const [formInitialValues, setFormInitialValues] = useState(initialValues);

  useEffect(() => {
    if (createMode) {
      setFormInitialValues(initialValues);
      return;
    }
    if (offer) {
      setFormInitialValues({
        item_code: offer.item_code ?? "",
        item_name: offer.item_name ?? "",
        offer_type: offer.offer_type ?? "",
        value: offer.value != null ? String(offer.value) : "",
      });
    }
  }, [createMode, offer]);

  const isReadOnly = viewMode;

  const handleSubmit = async (values) => {
    const payload = {
      item_code: values.item_code.trim(),
      item_name: values.item_name.trim(),
      offer_type: values.offer_type,
      value: Number(values.value),
    };

    if (createMode) {
      try {
        await offersV3.create(payload);
        toast.success("Offer created");
        router.push("/offers-v3");
      } catch (err) {
        toast.error(err?.message ?? "Failed to create offer");
      }
      return;
    }

    if (editMode && id) {
      try {
        await offersV3.update(id, payload);
        toast.success("Offer updated");
        router.push("/offers-v3");
      } catch (err) {
        toast.error(err?.message ?? "Failed to update offer");
      }
    }
  };

  if ((editMode || viewMode) && loading && !offer && id) {
    return (
      <GlobalWrapper title="Offer" permissionKey="view_offers_v3">
        <CustomContainer title="Loading..." filledHeader>
          <Flex py={4}>Loading...</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !offer && id) {
    return (
      <GlobalWrapper title="Offer" permissionKey="view_offers_v3">
        <CustomContainer title="Offer not found" filledHeader>
          <Text py={4}>No offer found for ID {id}.</Text>
          <Button colorScheme="purple" onClick={() => router.push("/offers-v3")}>
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode ? "View Offer" : editMode ? "Edit Offer" : "Create Offer";

  return (
    <GlobalWrapper title={title} permissionKey="view_offers_v3">
      <CustomContainer title={title} filledHeader>
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
                  label="Item Code"
                  name="item_code"
                  placeholder="Item code"
                  editable={!isReadOnly}
                />
                <CustomInput
                  label="Item Name"
                  name="item_name"
                  placeholder="Item name"
                  editable={!isReadOnly}
                />
                <CustomInput
                  label="Offer Type"
                  name="offer_type"
                  method="switch"
                  values={OFFER_TYPE_OPTIONS}
                  editable={!isReadOnly}
                />
                <CustomInput
                  label="Value"
                  name="value"
                  type="number"
                  placeholder="Value"
                  editable={!isReadOnly}
                />
              </Grid>

              <Flex gap={3} justify="flex-end" mt={6}>
                {viewMode || !canAdd ? (
                  <Button
                    type="button"
                    colorScheme="purple"
                    onClick={() => router.push("/offers-v3")}
                  >
                    Back
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => router.push("/offers-v3")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" colorScheme="purple">
                      {createMode ? "Create offer" : "Update"}
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

export default OffersV3Form;
