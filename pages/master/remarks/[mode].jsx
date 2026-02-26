import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomInput from "../../../components/customInput/customInput";
import { Button, Flex } from "@chakra-ui/react";
import { Formik } from "formik";
import * as Yup from "yup";
import toast from "react-hot-toast";
import { useRemarkMasterById } from "../../../customHooks/useRemarkMasterById";
import {
  createRemark,
  updateRemark,
} from "../../../helper/remarksMaster";

const validationSchema = Yup.object({
  label: Yup.string()
    .required("Label is required")
    .max(255, "Label must be at most 255 characters")
    .trim(),
});

const initialValues = {
  label: "",
};

function RemarksMode() {
  const router = useRouter();
  const { mode, id } = router.query;
  const remarkId = id ? parseInt(id, 10) : null;

  const viewMode = mode === "view";
  const editMode = mode === "edit";
  const createMode = mode === "create";

  const { remark, loading } = useRemarkMasterById(remarkId, {
    enabled: (editMode || viewMode) && !!remarkId,
  });

  const [formInitialValues, setFormInitialValues] = useState(initialValues);

  useEffect(() => {
    if (createMode) {
      setFormInitialValues(initialValues);
      return;
    }
    if (remark) {
      setFormInitialValues({
        label: remark.label || "",
      });
    }
  }, [createMode, remark]);

  const isReadOnly = viewMode;

  const handleSubmit = async (values) => {
    if (createMode) {
      try {
        const res = await createRemark({
          label: values.label.trim(),
          is_active: true,
        });
        const newId = res?.remark_id ?? res?.data?.remark_id;
        toast.success("Remark created");
        if (newId) {
          router.push(`/master/remarks/view?id=${newId}`);
        } else {
          router.push("/master/remarks");
        }
      } catch (err) {
        toast.error(err.message || "Failed to create remark");
      }
      return;
    }

    if (editMode && remarkId) {
      try {
        await updateRemark(remarkId, { label: values.label.trim() });
        toast.success("Remark updated");
        router.push("/master/remarks");
      } catch (err) {
        toast.error(err.message || "Failed to update remark");
      }
    }
  };

  if ((editMode || viewMode) && loading && !remark) {
    return (
      <GlobalWrapper title="Remarks Master">
        <CustomContainer title="Loading..." filledHeader>
          <Flex py={4}>Loading...</Flex>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  if ((editMode || viewMode) && !loading && !remark && remarkId) {
    return (
      <GlobalWrapper title="Remarks Master">
        <CustomContainer title="Not found" filledHeader>
          <Flex py={4}>Remark not found.</Flex>
          <Button
            colorScheme="purple"
            onClick={() => router.push("/master/remarks")}
          >
            Back to list
          </Button>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  const title = viewMode
    ? "View Remark"
    : editMode
    ? "Edit Remark"
    : "Create Remark";

  return (
    <GlobalWrapper title={title} permissionKey="view_remarks_master">
      <CustomContainer title={title} filledHeader>
        <Formik
          enableReinitialize
          initialValues={formInitialValues}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ handleSubmit: formikSubmit }) => (
            <form onSubmit={formikSubmit}>
              <Flex flexDirection="column" gap={4} mb={6}>
                <CustomInput
                  label="Label"
                  name="label"
                  type="text"
                  placeholder="Remark label (max 255 chars)"
                  editable={!isReadOnly}
                />
              </Flex>

              <Flex gap={3} justify="flex-end" mt={6}>
                {viewMode ? (
                  <Button
                    type="button"
                    colorScheme="purple"
                    onClick={() => router.push("/master/remarks")}
                  >
                    Back
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => router.push("/master/remarks")}
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

export default RemarksMode;
