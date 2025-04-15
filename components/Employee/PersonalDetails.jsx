import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import CustomInput from "../../components/customInput/customInput";

import styles from "../../styles/registration.module.css";
import { BloodGroup } from "../../constants/values";
import { Formik } from "formik";
import moment from "moment";

function PersonalDetails({
  editViewMode,
  updateEmployee,
  setState,
  permanent_trigger,
  id,
  initialValues,
}) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Formik
      initialValues={initialValues}
      //   validationSchema={validationSchema}
      onSubmit={(values) => {
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
      {({ handleSubmit, values }) => {
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
                    }
                    setEditMode(!editMode);
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
                  name={
                    permanent_trigger !== true
                      ? "residential_address"
                      : "permanent_address"
                  }
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
                      setState({
                        permanent_trigger: !permanent_trigger,
                      })
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
