import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button, Switch } from "@chakra-ui/react";
import CustomInput from "../customInput/customInput";
import * as Yup from "yup";
import styles from "../../styles/registration.module.css";
import { Formik } from "formik";

const validationSchema = Yup.object().shape({
  pan_no: Yup.string().nullable(),
  pf_number: Yup.string().nullable(),
  UAN: Yup.string().nullable(),
  esi_number: Yup.string().nullable(),
});

function PFAndESI({
  editViewMode,
  updateEmployee,
  initialValues,
  id,
  formikProps: formikPropsFromProps,
}) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pfToggle, setPfToggle] = useState(false);
  const [esiToggle, setEsiToggle] = useState(false);

  const getForm = ({ handleSubmit, values }) => {
    return (
      <CustomContainer
        title="PF & ESI"
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
            {id === null && (
              <div className={styles.switchHolder}>
                <label>PF Number & UAN Number & Pan</label>
                <Switch
                  className={styles.switch}
                  id="email-alerts"
                  onChange={() => setPfToggle(!pfToggle)}
                />
              </div>
            )}
          </div>
          {(pfToggle || editViewMode) && (
            <div className={styles.inputHolder}>
              <CustomInput
                label="PAN No"
                name="pan_no"
                type="text"
                editable={editViewMode ? editMode : !editMode}
              />
              <CustomInput
                label="PF Number"
                name="pf_number"
                type="text"
                editable={editViewMode ? editMode : !editMode}
              />
              <CustomInput
                label="UAN Number"
                name="UAN"
                type="text"
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
          )}

          {id === null && (
            <div className={styles.switchHolder}>
              <label>ESI Number</label>
              <Switch
                className={styles.switch}
                id="email-alerts"
                onChange={() => setEsiToggle(!esiToggle)}
              />
            </div>
          )}
          {(esiToggle || editViewMode) && (
            <div className={styles.inputHolder}>
              <CustomInput
                label="ESI Number"
                name="esi_number"
                type="text"
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
          )}
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

export default PFAndESI;
