import React, { useEffect } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import * as Yup from "yup";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import { Button } from "@chakra-ui/button";
import { PEOPLE_TYPES } from "../../constants/values";
import toast from "react-hot-toast";
import { createPerson } from "../../helper/people";
import { useRouter } from "next/router";
import useOutlets from "../../customHooks/useOutlets";

const validation = Yup.object({
  name: Yup.string().required("Fill Name"),
  person_type: Yup.number().required("Select a Type"),
  store_id: Yup.number()
    .nullable()
    .typeError("Select a Store")
    .required("Select a Store"),
  primary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 characters or More")
    .max(12345678900, "Must be 10 characters or less")
    .required("Fill Primary Phone Number"),
  secondary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 characters or More")
    .max(12345678900, "Must be 10 characters or less"),
});

function CreateMaster() {
  const router = useRouter();
  const { outlets } = useOutlets();
  const outletsMenu = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const handleCreate = (data) => {
    data = {
      ...data,
      primary_phone: data.primary_phone + "",
      secondary_phone: data.secondary_phone + "",
    };

    toast.promise(createPerson(data), {
      loading: "Adding new record!",
      success: (response) => {
        if (response.code === 200) {
          router.push("/master");
          return "Record Added!";
        } else {
          throw err;
        }
      },
      error: (err) => {
        console.log(err);
        return "Error adding record!";
      },
    });
  };

  return (
    <GlobalWrapper title="Create Master">
      <Head />

      <CustomContainer title="Add New Master">
        <Formik
          initialValues={{
            name: "",
            primary_phone: "",
            secondary_phone: "",
            name: "",
            store_id: global?.config?.store_id ?? null,
          }}
          validationSchema={validation}
          onSubmit={handleCreate}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm } = formikProps;

            return (
              <div className={styles.inputContainer}>
                <div className={styles.inputSubContainer}>
                  <CustomInput label="Name *" name="name" type="text" />
                  <CustomInput
                    label="Type *"
                    values={PEOPLE_TYPES}
                    name="person_type"
                    type="text"
                    method="switch"
                  />
                </div>
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

                <CustomInput
                  label="Outlet *"
                  values={outletsMenu}
                  name="store_id"
                  type="text"
                  method="switch"
                />

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
