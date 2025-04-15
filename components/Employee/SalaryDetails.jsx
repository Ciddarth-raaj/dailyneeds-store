import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import CustomInput from "../customInput/customInput";
import * as Yup from "yup";
import styles from "../../styles/registration.module.css";
import { Formik } from "formik";

const validationSchema = Yup.object().shape({
  salary: Yup.string().nullable().required("Salary is required"),
});

function SalaryDetails({ editViewMode, updateEmployee, initialValues }) {
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
            title="Salary Details"
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
            <div className={styles.inputHolder}>
              <CustomInput
                label="Salary / Month *"
                name="salary"
                type="text"
                containerStyle={{ marginBottom: 0 }}
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
          </CustomContainer>
        );
      }}
    </Formik>
  );
}

export default SalaryDetails;
