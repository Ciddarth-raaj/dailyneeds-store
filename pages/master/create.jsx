import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import { IssueValidation } from "../../util/validation";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import { Button } from "@chakra-ui/button";

const validation = Yup.object({
  name: Yup.string().required("Fill Name"),
  primary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Primary Phone Number"),
  secondary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 or More")
    .max(12345678900, "Must be 10 characters or less"),
});

function CreateMaster() {
  return (
    <GlobalWrapper title="Create Master">
      <Head />

      <CustomContainer title="Add New Master">
        <Formik
          initialValues={{
            name: "",
            email: "",
            primary_contact_no: "",
            secondary_contact_no: "",
            description: "",
            address: "",
          }}
          validationSchema={validation}
          onSubmit={(values) => {
            console.log("CIDD", values);
          }}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm } = formikProps;

            return (
              <div className={styles.inputContainer}>
                <CustomInput label="Name *" name="name" type="text" />
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Primary Phone Number *"
                    name="primary_phone"
                    type="number"
                  />
                  <CustomInput
                    label="Secondary Phone Number"
                    name="secondary_phone"
                    type="number"
                  />
                </div>

                <div className={styles.buttonContainer}>
                  <Button
                    variant="outline"
                    colorScheme="red"
                    onClick={() => resetForm()}
                  >
                    Reset
                  </Button>

                  <Button
                    colorScheme="purple"
                    onClick={() => {
                      handleSubmit();
                    }}
                  >
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

export default CreateMaster;
