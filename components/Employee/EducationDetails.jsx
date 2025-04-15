import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import CustomInput from "../customInput/customInput";
import * as Yup from "yup";
import styles from "../../styles/registration.module.css";
import { Formik } from "formik";

const validationSchema = Yup.object().shape({
  qualification: Yup.string()
    .nullable()
    .min(2, "Qualification must be at least 2 characters"),

  previous_experience: Yup.string()
    .nullable()
    .min(3, "Experience details must be at least 3 characters"),

  additional_course: Yup.string()
    .nullable()
    .min(3, "Course details must be at least 3 characters"),
});

function EducationDetails({ editViewMode, updateEmployee, initialValues }) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        setEditMode(false);
        updateEmployee(values, setLoading);
      }}
    >
      {({ handleSubmit, values }) => {
        return (
          <CustomContainer
            title="Education Details"
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
                  label="Educational Qualification"
                  name="qualification"
                  type="text"
                  editable={editViewMode ? editMode : !editMode}
                />
                <CustomInput
                  label="Previous Experience"
                  name="previous_experience"
                  type="text"
                  editable={editViewMode ? editMode : !editMode}
                />
              </div>
              <div className={styles.personalInputHolder}>
                <CustomInput
                  label="Additional Courses"
                  name="additional_course"
                  type="text"
                  method="TextArea"
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

export default EducationDetails;
