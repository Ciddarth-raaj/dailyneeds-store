import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import { Button, Flex } from "@chakra-ui/react";
import { useRouter } from "next/router";
import CustomInput from "../../../components/customInput/customInput";
import usePeople from "../../../customHooks/usePeople";
import * as Yup from "yup";

const validationSchema = Yup.object({
  purchase_order_number: Yup.string()
    .required("Purchase Order Number is required")
    .max(100, "Purchase Order Number cannot exceed 100 characters"),
  supplier_id: Yup.number()
    .typeError("Select a Supplier")
    .required("Supplier is required"),
  amount: Yup.number()
    .typeError("Amount must be a number")
    .required("Amount is required")
    .min(0.01, "Amount must be greater than 0"),
  reason: Yup.string()
    .required("Reason is required")
    .max(500, "Reason cannot exceed 500 characters"),
  docs: Yup.mixed().optional(),
});

function AdvanceRequestForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const { peopleList } = usePeople();
  const filtersPeopleList = useMemo(
    () =>
      peopleList
        .filter((item) => item.person_type === 2)
        .map((item) => ({
          id: item.person_id,
          value: item.name,
        })),
    [peopleList]
  );

  return (
    <GlobalWrapper>
      <CustomContainer
        title={
          viewMode
            ? "View Advance Request"
            : editMode
            ? "Edit Advance Request"
            : "Create Advance Request"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={{
            purchase_order_number: "",
            supplier_id: null,
            amount: null,
            reason: "",
            docs: null,
          }}
          validationSchema={validationSchema}
          onSubmit={(values) => {
            console.log(values);
          }}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm } = formikProps;

            return (
              <div>
                <Flex gap="12px">
                  <CustomInput
                    label="Purchase Order Number *"
                    name="purchase_order_number"
                    type="text"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Supplier Name *"
                    name="supplier_id"
                    method="switch"
                    values={filtersPeopleList}
                    placeholder="Select Supplier"
                    editable={!viewMode}
                  />
                </Flex>

                <Flex gap="12px">
                  <CustomInput
                    label="Amount *"
                    name="amount"
                    type="number"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Reason *"
                    name="reason"
                    type="text"
                    editable={!viewMode}
                  />
                </Flex>

                <CustomInput
                  label="Docs"
                  name="docs"
                  method="file"
                  editable={!viewMode}
                />

                {!viewMode && (
                  <Flex mt={8} justify="flex-end" gap="12px">
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => resetForm()}
                    >
                      Reset
                    </Button>

                    <Button colorScheme="purple" onClick={handleSubmit}>
                      {editMode ? "Update" : "Create"}
                    </Button>
                  </Flex>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AdvanceRequestForm;
