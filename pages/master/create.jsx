import React from "react";
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

const validation = Yup.object({
  name: Yup.string().required("Fill Name"),
  person_type: Yup.number()
    .typeError("Select a Type")
    .required("Select a Type"),
  // store_ids: Yup.array(
  //   Yup.number()
  //     .nullable()
  //     .typeError("Select a Store")
  //     .required("Select a Store")
  // ).required("Fill Accounts"),
  primary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 characters or More")
    .max(12345678900, "Must be 10 characters or less"),
  // .required("Fill Primary Phone Number"),
  secondary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 characters or More")
    .max(12345678900, "Must be 10 characters or less"),
});

function CreateMaster() {
  const router = useRouter();

  const handleCreate = (data) => {
    data = {
      ...data,
      primary_phone: data.primary_phone + "",
      secondary_phone: data.secondary_phone + "",
      store_ids: [],
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

      <CustomContainer title="Add New Master" filledHeader>
        <Formik
          initialValues={{
            name: "",
            primary_phone: "",
            secondary_phone: "",
            name: "",
            store_ids: [global?.config?.store_id],
            person_type: null,
          }}
          validationSchema={validation}
          onSubmit={handleCreate}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values } = formikProps;

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
                    label="Primary Phone Number"
                    name="primary_phone"
                    type="number"
                  />
                  <CustomInput
                    label="Secondary Phone Number"
                    name="secondary_phone"
                    type="number"
                  />
                </div>

                {/* <FieldArray
                  name="store_ids"
                  render={(arrayHelpers) => (
                    <div>
                      {values.store_ids.map((account, index) => (
                        <div key={index} className={styles.inputSubContainer}>
                          <CustomInput
                            label="Store *"
                            values={outletsMenu}
                            name={`store_ids.${index}`}
                            type="text"
                            method="switch"
                          />

                          {values.store_ids.length > 1 && (
                            <IconButton
                              mb="24px"
                              variant="outline"
                              colorScheme="red"
                              onClick={() => arrayHelpers.remove(index)}
                            >
                              <i className="fa fa-trash-o" aria-hidden="true" />
                            </IconButton>
                          )}
                        </div>
                      ))}

                      <Button
                        onClick={() => arrayHelpers.push({})}
                        variant="ghost"
                        colorScheme="purple"
                      >
                        Add Store
                      </Button>
                    </div>
                  )}
                /> */}

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
