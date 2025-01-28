import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import CustomInput from "../../../components/customInput/customInput";
import styles from "../../../styles/master.module.css";
import useOutlets from "../../../customHooks/useOutlets";
import { Button } from "@chakra-ui/button";
import { DIGIAL_PAYMENT_VALIDATION_SCHEMA } from "../../../validations/accounts";
import toast from "react-hot-toast";
import {
  createDigitalPayment,
  getDigitalPaymentById,
  updateDigitalPayment,
} from "../../../helper/digital-payments";
import { useRouter } from "next/router";

const EMPTY_DIGITAL_PAYMENT = {
  s_no: "",
  store_id: null,
  payment_mid: "",
  paytm_aggregator_id: "",
  payment_tid: "",
  bank_mid: "",
  api_key: "",
  pluxe_outlet_id: "",
  bank_tid: "",
};

function DigitalPaymentForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const [initialValues, setInitialValues] = useState(EMPTY_DIGITAL_PAYMENT);
  const { outlets } = useOutlets();

  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  useEffect(() => {
    async function fetchDigitalPayment() {
      if (paramId) {
        try {
          const response = await getDigitalPaymentById(paramId);
          if (response.code === 200) {
            setInitialValues(response.data);
          }
        } catch (error) {
          console.error("Error fetching digital payment:", error);
          toast.error("Error fetching digital payment details");
        }
      }
    }
    if (editMode || viewMode) {
      fetchDigitalPayment();
    }
  }, [paramId, editMode, viewMode]);

  const handleSubmit = (values) => {
    const promise = editMode
      ? updateDigitalPayment(paramId, values)
      : createDigitalPayment(values);

    toast.promise(promise, {
      loading: editMode
        ? "Updating Digital Payment..."
        : "Creating new Digital Payment",
      success: (response) => {
        if (response.code === 200) {
          router.push("/reconciliation/digital-payments");
          return editMode
            ? "Digital Payment Updated"
            : "Digital Payment Created";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.error(err);
        return editMode
          ? "Error updating Digital Payment"
          : "Error creating Digital Payment";
      },
    });
  };

  return (
    <GlobalWrapper>
      <CustomContainer
        title={
          viewMode
            ? "View Digital Payment"
            : editMode
            ? "Edit Digital Payment"
            : "Create Digital Payment"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={DIGIAL_PAYMENT_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { values, resetForm, handleSubmit } = formikProps;

            return (
              <div className={styles.inputContainer}>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Serial Number"
                    name="s_no"
                    type="string"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Outlet *"
                    name="store_id"
                    type="number"
                    values={OUTLETS_LIST}
                    method="switch"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Paytm MID"
                    name="payment_mid"
                    type="string"
                    editable={!viewMode}
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Paytm Aggregator ID"
                    name="paytm_aggregator_id"
                    type="string"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Paytm TID"
                    name="payment_tid"
                    type="string"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Bank MID"
                    name="bank_mid"
                    type="string"
                    editable={!viewMode}
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Bank TID"
                    name="bank_tid"
                    type="string"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Key"
                    name="api_key"
                    type="string"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Pluxe Outlet ID"
                    name="pluxe_outlet_id"
                    type="string"
                    editable={!viewMode}
                  />
                </div>

                {!viewMode && (
                  <div className={styles.buttonContainer}>
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={resetForm}
                    >
                      Reset
                    </Button>
                    <Button colorScheme="purple" onClick={handleSubmit}>
                      {editMode ? "Update" : "Create"}
                    </Button>
                  </div>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DigitalPaymentForm;
