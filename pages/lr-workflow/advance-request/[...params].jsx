import React, { useMemo } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import { Button, Flex } from "@chakra-ui/react";
import { useRouter } from "next/router";
import CustomInput from "../../../components/customInput/customInput";
import usePeople from "../../../customHooks/usePeople";
import * as Yup from "yup";

// Each stage collects its own fields, so each needs its own schema and initial
// values. Validating every stage against A1's schema left A1.1, A2 and A3
// permanently invalid — they have none of the fields it requires.
const STAGE_FORMS = {
  a1: {
    initialValues: {
      purchase_order_number: "",
      supplier_id: null,
      amount: null,
      reason: "",
      docs: null,
    },
    validationSchema: Yup.object({
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
    }),
  },
  "a1.1": {
    initialValues: {
      pending_bills: null,
      previous_advance_balance: null,
      remarks: "",
    },
    validationSchema: Yup.object({
      pending_bills: Yup.number()
        .typeError("Pending Bills must be a number")
        .required("Pending Bills is required")
        .min(0, "Pending Bills cannot be negative"),
      previous_advance_balance: Yup.number()
        .typeError("Previous Advance Balance must be a number")
        .required("Previous Advance Balance is required")
        .min(0, "Previous Advance Balance cannot be negative"),
      remarks: Yup.string()
        .required("Remarks is required")
        .max(500, "Remarks cannot exceed 500 characters"),
    }),
  },
  a2: {
    initialValues: {
      approval_status: null,
      note: "",
    },
    validationSchema: Yup.object({
      approval_status: Yup.number()
        .typeError("Select an Approval Status")
        .required("Approval Status is required")
        .oneOf([0, 1], "Select an Approval Status"),
      note: Yup.string().max(500, "Note cannot exceed 500 characters"),
    }),
  },
  a3: {
    initialValues: {
      a3_amount: null,
      utr: "",
      bank: null,
      payment_date: null,
      proof: null,
    },
    validationSchema: Yup.object({
      a3_amount: Yup.number()
        .typeError("Amount must be a number")
        .required("Amount is required")
        .min(0.01, "Amount must be greater than 0"),
      utr: Yup.string()
        .required("UTR is required")
        .max(100, "UTR cannot exceed 100 characters"),
      bank: Yup.number()
        .typeError("Select a Bank")
        .required("Bank is required"),
      payment_date: Yup.date()
        .typeError("Select a Payment Date")
        .required("Payment Date is required"),
      proof: Yup.mixed().required("Proof of Payment is required"),
    }),
  },
};

const STAGE_MAP = {
  a1: 1,
  "a1.1": 2,
  a2: 3,
  a3: 4,
};

// Routes may omit the stage (e.g. the "Create" menu links to
// /lr-workflow/advance-request/create). Fall back to the first stage so the
// form renders instead of collapsing to an empty page.
const DEFAULT_STAGE = "a1";

function AdvanceRequestForm() {
  const router = useRouter();
  // const mode = router.query.params[0];
  const mode = router.query.params?.[0];
  const stageParam = router.query.params?.[1];
  const stage = STAGE_MAP[stageParam] ? stageParam : DEFAULT_STAGE;
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

  const shouldBeVisible = (key) => {
    if (STAGE_MAP[key] <= STAGE_MAP[stage]) {
      return true;
    }

    return false;
  };

  const shouldBeEditable = (key) => {
    if (STAGE_MAP[key] >= STAGE_MAP[stage]) {
      return true;
    }

    return false;
  };

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
        <Flex gap="22px" flexDirection="column">
          {shouldBeVisible("a1") && (
            <CustomContainer title="Stage - A1" smallHeader>
              <Formik
                enableReinitialize
                initialValues={STAGE_FORMS["a1"].initialValues}
                validationSchema={STAGE_FORMS["a1"].validationSchema}
                onSubmit={(values) => {
                  console.log(values);
                }}
              >
                {(formikProps) => {
                  const { handleSubmit, resetForm } = formikProps;
                  const editable = shouldBeEditable("a1");

                  return (
                    <div>
                      <Flex gap="12px">
                        <CustomInput
                          label="Purchase Order Number *"
                          name="purchase_order_number"
                          type="text"
                          editable={editable && !viewMode}
                        />
                        <CustomInput
                          label="Supplier Name *"
                          name="supplier_id"
                          method="switch"
                          values={filtersPeopleList}
                          placeholder="Select Supplier"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      <Flex gap="12px">
                        <CustomInput
                          label="Amount *"
                          name="amount"
                          type="number"
                          editable={editable && !viewMode}
                        />
                        <CustomInput
                          label="Reason *"
                          name="reason"
                          type="text"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      <CustomInput
                        label="Docs"
                        name="docs"
                        method="file"
                        editable={editable && !viewMode}
                      />

                      {!viewMode && editable && (
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
          )}

          {shouldBeVisible("a1.1") && (
            <CustomContainer title="Stage - A1.1" smallHeader>
              <Formik
                enableReinitialize
                initialValues={STAGE_FORMS["a1.1"].initialValues}
                validationSchema={STAGE_FORMS["a1.1"].validationSchema}
                onSubmit={(values) => {
                  console.log(values);
                }}
              >
                {(formikProps) => {
                  const { handleSubmit, resetForm } = formikProps;
                  const editable = shouldBeEditable("a1.1");

                  return (
                    <div>
                      <Flex gap="12px">
                        <CustomInput
                          label="Pending Bills *"
                          name="pending_bills"
                          type="number"
                          editable={editable && !viewMode}
                        />
                        <CustomInput
                          label="Previous Advance Balance *"
                          name="previous_advance_balance"
                          type="number"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      <Flex gap="12px">
                        <CustomInput
                          label="Remarks *"
                          name="remarks"
                          type="text"
                          method="TextArea"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      {!viewMode && editable && (
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
          )}

          {shouldBeVisible("a2") && (
            <CustomContainer title="Stage - A2" smallHeader>
              <Formik
                enableReinitialize
                initialValues={STAGE_FORMS["a2"].initialValues}
                validationSchema={STAGE_FORMS["a2"].validationSchema}
                onSubmit={(values) => {
                  console.log(values);
                }}
              >
                {(formikProps) => {
                  const { handleSubmit, resetForm } = formikProps;
                  const editable = shouldBeEditable("a2");

                  return (
                    <div>
                      <Flex gap="12px">
                        <CustomInput
                          label="Approval Status *"
                          name="approval_status"
                          method="switch"
                          values={[
                            { id: 1, value: "Approved" },
                            { id: 0, value: "Rejected" },
                          ]}
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      <Flex gap="12px">
                        <CustomInput
                          label="Note"
                          name="note"
                          type="text"
                          method="TextArea"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      {!viewMode && editable && (
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
          )}

          {shouldBeVisible("a3") && (
            <CustomContainer title="Stage - A3" smallHeader>
              <Formik
                enableReinitialize
                initialValues={STAGE_FORMS["a3"].initialValues}
                validationSchema={STAGE_FORMS["a3"].validationSchema}
                onSubmit={(values) => {
                  console.log(values);
                }}
              >
                {(formikProps) => {
                  const { handleSubmit, resetForm } = formikProps;
                  const editable = shouldBeEditable("a3");

                  return (
                    <div>
                      <Flex gap="12px">
                        <CustomInput
                          label="Amount *"
                          name="a3_amount"
                          type="number"
                          editable={editable && !viewMode}
                        />

                        <CustomInput
                          label="UTR *"
                          name="utr"
                          type="text"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      <Flex gap="12px">
                        <CustomInput
                          label="Bank *"
                          name="bank"
                          method="switch"
                          values={[
                            { id: 1, value: "Bank 1" },
                            { id: 2, value: "Bank 2" },
                          ]}
                          editable={editable && !viewMode}
                        />

                        <CustomInput
                          label="Payment Date *"
                          name="payment_date"
                          method="datepicker"
                          editable={editable && !viewMode}
                        />
                      </Flex>

                      <CustomInput
                        label="Proof of Payment *"
                        name="proof"
                        method="file"
                        editable={editable && !viewMode}
                      />

                      {!viewMode && editable && (
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
          )}
        </Flex>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AdvanceRequestForm;
