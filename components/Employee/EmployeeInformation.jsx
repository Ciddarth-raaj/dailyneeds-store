/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import CustomInput from "../customInput/customInput";
import * as Yup from "yup";
import styles from "../../styles/registration.module.css";
import { Formik } from "formik";
import FilesHelper from "../../helper/asset";
import moment from "moment";
import toast from "react-hot-toast";

const validationSchema = Yup.object().shape({
  employee_id: Yup.string().nullable().required("Employee ID is required"),
  employee_name: Yup.string().nullable().required("Name is required"),
  gender: Yup.string()
    .nullable()
    .required("Gender is required")
    .oneOf(["Male", "Female", "Transgendar"]),
  email_id: Yup.string().nullable().email("Invalid email format"),
  primary_contact_number: Yup.string()
    .nullable()
    .required("Primary contact number is required"),
  alternate_contact_number: Yup.string().nullable(),
  date_of_joining: Yup.date()
    .nullable()
    .required("Date of joining is required"),
  telegram_username: Yup.string().nullable(),
});

function EmployeeInformation({
  editViewMode,
  updateEmployee,
  initialValues,
  formikProps: formikPropsFromProps,
}) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (values) => {
    setLoading(true);
    let employeeImage = null;

    if (values.employee_image && typeof values.employee_image === "object") {
      employeeImage = await FilesHelper.upload(
        values.employee_image,
        `${values.employee_image.name}_${moment().format("YYYYMMDDHHmmss")}`,
        "dashboard_file"
      );
    }

    if (
      (employeeImage && employeeImage.code === 200) ||
      employeeImage == null
    ) {
      const tmpData = { ...values };
      delete tmpData.employee_image;

      updateEmployee(
        {
          ...tmpData,
          employee_id: tmpData.employee_id ? tmpData.employee_id + "" : null,
          modified_employee_image: employeeImage?.remoteUrl || null,
        },
        setLoading
      );
    } else {
      toast.error("Failed to upload employee image");
    }
  };

  const getForm = ({ handleSubmit, values, setValues }) => {
    return (
      <CustomContainer
        title="Employee Information"
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
              {(editViewMode ? editMode : !editMode) &&
                (values.employee_image &&
                typeof values.employee_image === "string" ? (
                  <div className={styles.employeeImageHolder}>
                    <img
                      src={values.employee_image}
                      alt="Employee Image"
                      className={styles.employeeImage}
                    />

                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => {
                        setValues({ ...values, employee_image: null });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ) : (
                  <CustomInput
                    label="Upload Employee Image *"
                    name="employee_image"
                    method="file"
                  />
                ))}

              {!(editViewMode ? editMode : !editMode) &&
                (typeof values.employee_image === "string" ? (
                  <div className={styles.employeeImageHolder}>
                    <img
                      src={values.employee_image}
                      alt="Employee Image"
                      className={styles.employeeImage}
                    />
                  </div>
                ) : (
                  <div className={styles.employeeImageHolder}>
                    {values.employee_image ? (
                      <img
                        src={values.employee_image}
                        alt="Employee Image"
                        className={styles.employeeImage}
                      />
                    ) : (
                      <p style={{ color: "gray", fontSize: "14px" }}>
                        No Image
                      </p>
                    )}
                  </div>
                ))}
            </div>
            <div className={styles.inputHolder}>
              <CustomInput
                label="Employee ID *"
                name="employee_id"
                type="number"
                editable={editViewMode ? editMode : !editMode}
              />
              <CustomInput
                label="Name *"
                name="employee_name"
                type="text"
                editable={editViewMode ? editMode : !editMode}
              />
            </div>
          </div>
          <div className={styles.inputHolder}>
            <CustomInput
              label="Gender *"
              values={[
                { id: "Male", value: "Male" },
                { id: "Female", value: "Female" },
                { id: "Transgendar", value: "Transgendar" },
              ]}
              name="gender"
              type="text"
              method="switch"
              editable={editViewMode ? editMode : !editMode}
            />
            <CustomInput
              label="Email ID"
              name="email_id"
              type="text"
              editable={editViewMode ? editMode : !editMode}
            />
          </div>
          <div className={styles.inputHolder}>
            <CustomInput
              label="Primary Mobile Number *"
              name="primary_contact_number"
              type="number"
              editable={editViewMode ? editMode : !editMode}
            />
            <CustomInput
              label="Alternate Mobile Number"
              name="alternate_contact_number"
              type="number"
              editable={editViewMode ? editMode : !editMode}
            />
          </div>
          <div className={styles.inputHolder}>
            <CustomInput
              label="Date of Joining *"
              name="date_of_joining"
              type="text"
              method="datepicker"
              editable={editViewMode ? editMode : !editMode}
            />
            <CustomInput
              label="Telegram Username"
              name="telegram_username"
              type="text"
              editable={editViewMode ? editMode : !editMode}
            />
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
      enableReinitialize
      validationSchema={validationSchema}
      onSubmit={(values) => {
        setEditMode(false);
        handleUpdate(values);
      }}
    >
      {(formikProps) => {
        return getForm(formikProps);
      }}
    </Formik>
  );
}

export default EmployeeInformation;
