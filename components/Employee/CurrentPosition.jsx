import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import CustomInput from "../customInput/customInput";
import * as Yup from "yup";
import styles from "../../styles/registration.module.css";
import { Formik } from "formik";

const validationSchema = Yup.object().shape({
  store_id: Yup.string().nullable().min(1, "Store is required"),
  department_id: Yup.string().nullable().min(1, "Department is required"),
  designation_id: Yup.string().nullable().min(1, "Designation is required"),
  shift_id: Yup.string().nullable().min(1, "Shift is required"),
});

function CurrentPosition({
  editViewMode,
  updateEmployee,
  initialValues,
  department = [],
  designation = [],
  branch = [],
  shift = [],
  formikProps: formikPropsFromProps,
}) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const getForm = ({ handleSubmit, values }) => {
    return (
      <CustomContainer
        title="Current Position"
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
          <div className={styles.personalInputHolder}>
            <div className={styles.inputHolder}>
              <CustomInput
                label="Select Store *"
                values={branch.map((m) => ({
                  id: m.outlet_id,
                  value: m.outlet_name,
                }))}
                name="store_id"
                type="text"
                method="switch"
                editable={editViewMode ? editMode : !editMode}
              />
              <CustomInput
                label="Select Department *"
                values={department.map((m) => ({
                  id: m.id,
                  value: m.value,
                }))}
                name="department_id"
                type="text"
                method="switch"
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
            <div className={styles.inputHolder}>
              <CustomInput
                label="Select Designation *"
                values={designation.map((m) => ({
                  id: m.id,
                  value: m.value,
                }))}
                name="designation_id"
                type="text"
                method="switch"
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
            <div className={styles.inputHolder}>
              <CustomInput
                label="Shift Details"
                values={shift.map((m) => ({
                  id: m.id,
                  value: m.value,
                }))}
                name="shift_id"
                type="text"
                method="switch"
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
          </div>
        </div>
      </CustomContainer>
    );
  };

  if (!editViewMode) {
    return getForm(formikPropsFromProps);
  }

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={(values) => {
        setEditMode(false);
        updateEmployee(values, setLoading);
      }}
    >
      {(formikProps) => {
        return getForm(formikProps);
      }}
    </Formik>
  );
}

export default CurrentPosition;
