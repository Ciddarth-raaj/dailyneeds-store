import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Flex, Grid } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { useStickerTypeById } from "../../../customHooks/useStickerTypeById";
import {
  createStickerType,
  updateStickerType,
} from "../../../helper/stickerTypes";

const validationSchema = Yup.object({
  label: Yup.string()
    .required("Label is required")
    .max(255, "Label must be at most 255 characters")
    .trim(),
});

const initialValues = {
  label: "",
};

function StickerTypeMode() {
  const router = useRouter();
  const { mode, id } = router.query;
  const stickerId = id ? parseInt(id, 10) : null;

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const { stickerType, loading } = useStickerTypeById(stickerId, {
    enabled: (editMode || viewMode) && !!stickerId,
  });

  const [formInitialValues, setFormInitialValues] = useState(initialValues);

  useEffect(() => {
    if (createMode) {
      setFormInitialValues(initialValues);
      return;
    }
    if (stickerType) {
      setFormInitialValues({
        label: stickerType.label || "",
      });
    }
  }, [createMode, stickerType]);

  const isReadOnly = viewMode;

  const handleSubmit = async (values) => {
    const payload = { label: values.label.trim() };

    if (createMode) {
      try {
        const res = await createStickerType(payload);
        if (res?.id) {
          toast.success("Sticker type created");
          router.push("/purchase/sticker-types");
        } else {
          toast.error(res?.msg || "Failed to create sticker type");
        }
      } catch (err) {
        toast.error(err.message || "Failed to create sticker type");
      }
      return;
    }

    if (editMode && stickerId) {
      try {
        await updateStickerType(stickerId, payload);
        toast.success("Sticker type updated");
        router.push("/purchase/sticker-types");
      } catch (err) {
        toast.error(err.message || "Failed to update sticker type");
      }
    }
  };

  if ((editMode || viewMode) && loading && !stickerType) {
    return (
      <GlobalWrapper title="Sticker Types">
        <CustomContainer title="Loading..." filledHeader>
          <Flex py={4}>Loading...</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !stickerType && stickerId) {
    return (
      <GlobalWrapper title="Sticker Types">
        <CustomContainer title="Not found" filledHeader>
          <Flex py={4}>Sticker type not found.</Flex>
          <Button
            colorScheme="purple"
            onClick={() => router.push("/purchase/sticker-types")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Sticker Type"
    : editMode
    ? "Edit Sticker Type"
    : "Create Sticker Type";

  return (
    <GlobalWrapper title={title} permissionKey="view_sticker_types">
      <CustomContainer title={title} filledHeader>
        <Formik
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit }) => (
            <form onSubmit={formikSubmit}>
              <Grid templateColumns={{ base: "1fr", md: "1fr" }} gap={4} mb={6}>
                <CustomInput
                  label="Label"
                  name="label"
                  type="text"
                  placeholder="Display label (max 255 chars)"
                  editable={!isReadOnly}
                />
              </Grid>

              <Flex gap={3} justify="flex-end" mt={6}>
                {viewMode ? (
                  <Button
                    type="button"
                    colorScheme="purple"
                    onClick={() => router.push("/purchase/sticker-types")}
                  >
                    Back
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => router.push("/purchase/sticker-types")}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" colorScheme="purple">
                      {createMode ? "Create" : "Update"}
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

export default StickerTypeMode;
