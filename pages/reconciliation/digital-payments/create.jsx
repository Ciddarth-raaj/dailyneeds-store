import React from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Formik } from "formik";
import CustomInput from "../../../components/customInput/customInput";

import styles from "../../../styles/master.module.css";
import useOutlets from "../../../customHooks/useOutlets";
import { Button } from "@chakra-ui/button";
import { DIGIAL_PAYMENT_VALIDATION_SCHEMA } from "../../../validations/accounts";
import toast from "react-hot-toast";
import { createDigitalPayment } from "../../../helper/digital-payments";
import { useRouter } from "next/router";

function Create() {
  const router = useRouter();

  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const initialValues = {
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

  const handleSubmit = (values) => {
    console.log("CIDD", values);
    toast.promise(createDigitalPayment(values), {
      loading: "Creating new Digital Payment",
      success: (response) => {
        if (response.code === 200) {
          router.push("/reconciliation/digital-payments");
          return "Digital Payment Created";
        } else {
          throw response;
        }
      },
      error: (error) => {
        console.log(error);
        return "Error creating Digital Payment";
      },
    });
  };

  return (
    <GlobalWrapper>
      <CustomContainer title="Create Digital Payment" filledHeader>
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
                    type="number"
                  />
                  <CustomInput
                    label="Outlet *"
                    name="store_id"
                    type="number"
                    values={OUTLETS_LIST}
                    method="switch"
                  />
                  <CustomInput
                    label="Paytm MID"
                    name="payment_mid"
                    type="string"
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Paytm Aggregator ID"
                    name="paytm_aggregator_id"
                    type="string"
                  />
                  <CustomInput
                    label="Paytm TID"
                    name="payment_tid"
                    type="number"
                  />
                  <CustomInput label="Bank MID" name="bank_mid" type="string" />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput label="Bank TID" name="bank_tid" type="string" />
                  <CustomInput label="Key" name="api_key" type="string" />
                  <CustomInput
                    label="Pluxe Outlet ID"
                    name="pluxe_outlet_id"
                    type="string"
                  />
                </div>

                <div className={styles.buttonContainer}>
                  <Button
                    variant="outline"
                    colorScheme="red"
                    onClick={resetForm}
                  >
                    Reset
                  </Button>
                  <Button colorScheme="purple" onClick={handleSubmit}>
                    Create
                  </Button>
                </div>
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Create;
