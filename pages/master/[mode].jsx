import React, { useEffect, useState } from "react";
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
import { createPerson, getPersonById, updatePerson } from "../../helper/people";
import { useRouter } from "next/router";

const validation = Yup.object({
  name: Yup.string().required("Fill Name"),
  person_type: Yup.number()
    .typeError("Select a Type")
    .required("Select a Type"),
  primary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 characters or More")
    .max(12345678900, "Must be 10 characters or less"),
  secondary_phone: Yup.number()
    .nullable()
    .typeError("Must be a number")
    .min(123456789, "Must be 9 characters or More")
    .max(12345678900, "Must be 10 characters or less"),
});

const EMPTY_MASTER = {
  name: "",
  primary_phone: "",
  secondary_phone: "",
  store_ids: [],
  person_type: null,
};

function MasterForm() {
  const router = useRouter();
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";
  const editMode = mode === "edit";

  const [initialValues, setInitialValues] = useState(EMPTY_MASTER);

  useEffect(() => {
    async function fetchPerson() {
      if (paramId) {
        try {
          const response = await getPersonById(paramId);
          if (response.code === 200) {
            setInitialValues({
              ...response.data,
              primary_phone: response.data.primary_phone || "",
              secondary_phone: response.data.secondary_phone || "",
            });
          }
        } catch (error) {
          console.error("Error fetching person:", error);
          toast.error("Error fetching person details");
        }
      }
    }
    if (editMode || viewMode) {
      fetchPerson();
    }
  }, [paramId, editMode, viewMode]);

  const handleSubmit = (values) => {
    const data = {
      ...values,
      primary_phone: values.primary_phone?.toString() || "",
      secondary_phone: values.secondary_phone?.toString() || "",
      store_ids: [],
    };

    const promise = editMode
      ? updatePerson(data.person_id, {
          name: data.name,
          primary_phone: data.primary_phone,
          secondary_phone: data.secondary_phone,
          person_type: data.person_type,
          status: data.status == 1 ? false : true,
        })
      : createPerson(data);

    toast.promise(promise, {
      loading: editMode ? "Updating record..." : "Adding new record!",
      success: (response) => {
        if (response.code === 200) {
          router.push("/master");
          return editMode ? "Record Updated!" : "Record Added!";
        } else {
          throw new Error(response.message);
        }
      },
      error: (err) => {
        console.error(err);
        return editMode ? "Error updating record!" : "Error adding record!";
      },
    });
  };

  return (
    <GlobalWrapper>
      <CustomContainer
        title={
          viewMode ? "View Master" : editMode ? "Edit Master" : "Add New Master"
        }
        filledHeader
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={validation}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm } = formikProps;

            return (
              <div className={styles.inputContainer}>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Name *"
                    name="name"
                    type="text"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Type *"
                    values={PEOPLE_TYPES}
                    name="person_type"
                    type="text"
                    method="switch"
                    editable={!viewMode}
                  />
                </div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Primary Phone Number"
                    name="primary_phone"
                    type="number"
                    editable={!viewMode}
                  />
                  <CustomInput
                    label="Secondary Phone Number"
                    name="secondary_phone"
                    type="number"
                    editable={!viewMode}
                  />
                </div>

                {!viewMode && (
                  <div className={styles.buttonContainer}>
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

export default MasterForm;
