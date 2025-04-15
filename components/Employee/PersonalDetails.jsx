import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import CustomInput from "../../components/customInput/customInput";
import * as Yup from "yup";

import styles from "../../styles/registration.module.css";
import { BloodGroup } from "../../constants/values";
import { Formik } from "formik";
import moment from "moment";

// Add validation schema
const validationSchema = Yup.object().shape({
  marital_status: Yup.string()
    .required("Marital status is required")
    .oneOf(["Married", "Un Married", "Widowed", "Divorced", "Separated"]),

  dob: Yup.date()
    .required("Date of birth is required")
    .max(new Date(), "Date of birth cannot be in the future"),

  marriage_date: Yup.date()
    .nullable()
    .when("marital_status", {
      is: "Married",
      then: Yup.date()
        .nullable()
        .max(new Date(), "Marriage date cannot be in the future")
        .min(Yup.ref("dob"), "Marriage date must be after date of birth"),
    }),

  permanent_address: Yup.string()
    .required("Permanent address is required")
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address cannot exceed 200 characters"),

  residential_address: Yup.string()
    .required("Residential address is required")
    .min(10, "Address must be at least 10 characters")
    .max(200, "Address cannot exceed 200 characters"),

  father_name: Yup.string()
    .required("Father's name is required")
    .min(3, "Name must be at least 3 characters")
    .matches(/^[a-zA-Z\s]*$/, "Name can only contain letters"),

  spouse_name: Yup.string()
    .nullable()
    .when("marital_status", {
      is: "Married",
      then: Yup.string()
        .nullable()
        .min(3, "Name must be at least 3 characters")
        .matches(/^[a-zA-Z\s]*$/, "Name can only contain letters"),
    }),

  blood_group: Yup.string()
    .nullable()
    .oneOf([...BloodGroup.map((bg) => bg.id), null], "Invalid blood group"),
});

function PersonalDetails({ editViewMode, updateEmployee, id, initialValues }) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        setEditMode(false);
        updateEmployee(
          {
            ...values,
            dob: values.dob ? moment(values.dob).format("YYYY-MM-DD") : null,
            marriage_date: values.marriage_date
              ? moment(values.marriage_date).format("YYYY-MM-DD")
              : null,
          },
          setLoading
        );
      }}
    >
      {({ handleSubmit, values, setFieldValue }) => {
        return (
          <CustomContainer
            title="Personal Details"
            smallHeader
            rightSection={
              editViewMode && (
                <Button
                  isLoading={loading}
                  variant="outline"
                  leftIcon={
                    editMode ? (
                      <i className="fa fa-floppy-o" aria-hidden="true" />
                    ) : (
                      <i className="fa fa-pencil" aria-hidden="true" />
                    )
                  }
                  colorScheme="purple"
                  onClick={() => {
                    if (editMode) {
                      handleSubmit();
                    } else {
                      setEditMode(true);
                    }
                  }}
                >
                  {editMode ? "Save" : "Edit"}
                </Button>
              )
            }
          >
            <div>
              <div className={styles.inputHolder}>
                <CustomInput
                  label="Marital Status *"
                  values={[
                    {
                      id: "Married",
                      value: "Married",
                    },
                    {
                      id: "Un Married",
                      value: "Un Married",
                    },
                    {
                      id: "Widowed",
                      value: "Widowed",
                    },
                    {
                      id: "Divorced",
                      value: "Divorced",
                    },
                    {
                      id: "Separated",
                      value: "Separated",
                    },
                  ]}
                  name="marital_status"
                  type="text"
                  method="switch"
                  editable={editViewMode ? editMode : !editMode}
                />
                <div className={styles.inputHolder}>
                  <CustomInput
                    label="Date of Birth *"
                    name="dob"
                    type="text"
                    method="datepicker"
                    editable={editViewMode ? editMode : !editMode}
                  />
                </div>
              </div>
              <div className={styles.personalInputHolder}>
                {values?.marital_status === "Married" && (
                  <CustomInput
                    label="Marriage Date"
                    name="marriage_date"
                    type="text"
                    method="datepicker"
                    editable={editViewMode ? editMode : !editMode}
                  />
                )}
              </div>
              <div className={styles.personalInputHolder}>
                <CustomInput
                  label="Permanent Address *"
                  name="permanent_address"
                  type="text"
                  method="TextArea"
                  editable={editViewMode ? editMode : !editMode}
                />
              </div>
              <div className={styles.inputHolder}>
                <CustomInput
                  label="Residential Address *"
                  name="residential_address"
                  type="text"
                  method="TextArea"
                  editable={editViewMode ? editMode : !editMode}
                />
              </div>
              {id === null && (
                <div className={styles.personalInputHolder}>
                  <Button
                    mb={"40px"}
                    colorScheme="purple"
                    onClick={() =>
                      setFieldValue(
                        "residential_address",
                        values.permanent_address
                      )
                    }
                  >
                    Same As Permanent Address
                  </Button>
                </div>
              )}
              <div className={styles.inputHolder}>
                <CustomInput
                  label="Father Name *"
                  name="father_name"
                  type="text"
                  editable={editViewMode ? editMode : !editMode}
                />
                {values?.marital_status === "Married" && (
                  <CustomInput
                    label="Spouse Name"
                    name="spouse_name"
                    type="text"
                    editable={editViewMode ? editMode : !editMode}
                  />
                )}
              </div>
              <div className={styles.personalInputHolder}>
                <CustomInput
                  label="Blood Group"
                  values={BloodGroup.map((m) => ({
                    id: m.id,
                    value: m.value,
                  }))}
                  name="blood_group"
                  type="text"
                  method="switch"
                  editable={editViewMode ? editMode : !editMode}
                />
              </div>
            </div>
          </CustomContainer>
        );
      }}
    </Formik>
  );
}

export default PersonalDetails;
