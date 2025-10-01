/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import CustomContainer from "../CustomContainer";
import { Button } from "@chakra-ui/button";
import { Formik } from "formik";
import CustomInput from "../customInput/customInput";
import * as Yup from "yup";
import styles from "../../styles/registration.module.css";
import { PaymentType } from "../../constants/values";
import FilesHelper from "../../helper/asset";
import moment from "moment";
import toast from "react-hot-toast";

const validationSchema = Yup.object().shape({
  payment_type: Yup.string().required("Payment type is required"),
  bank_name: Yup.string()
    .nullable()
    .when("payment_type", {
      is: "1",
      then: Yup.string().nullable().required("Bank name is required"),
    }),
  ifsc: Yup.string()
    .nullable()
    .when("payment_type", {
      is: "1",
      then: Yup.string().nullable().required("IFSC code is required"),
    }),
  account_no: Yup.string()
    .nullable()
    .when("payment_type", {
      is: "1",
      then: Yup.string().nullable().required("Account number is required"),
    }),
  aadhaar_card_no: Yup.string()
    .nullable()
    .required("Aadhaar card number is required"),
  aadhaar_card_name: Yup.string()
    .nullable()
    .required("Name in Aadhaar card is required"),
});

function EmployeeIdentification({
  editViewMode,
  updateEmployee,
  id,
  initialValues,
  formikProps: formikPropsFromProps,
}) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (values) => {
    setLoading(true);
    let employeeImage = null;

    if (
      values.aadhaar_card_image &&
      typeof values.aadhaar_card_image === "object"
    ) {
      employeeImage = await FilesHelper.upload(
        values.aadhaar_card_image,
        `${values.aadhaar_card_image.name}_${moment().format(
          "YYYYMMDDHHmmss"
        )}`,
        "employee_image"
      );
    }

    if (
      (employeeImage && employeeImage.code === 200) ||
      employeeImage == null
    ) {
      const tmpData = { ...values };
      delete tmpData.aadhaar_card_image;

      updateEmployee(
        {
          ...tmpData,
          employee_id: id ? id + "" : null,
          aadhaar_card_image: employeeImage?.remoteUrl || null,
        },
        setLoading
      );
    } else {
      toast.error("Failed to upload employee image");
    }
  };

  const getForm = ({ handleSubmit, values, setFieldValue }) => {
    return (
      <CustomContainer
        title="Employee Identification"
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
              label="Payment Type *"
              values={PaymentType}
              name="payment_type"
              type="text"
              method="switch"
              editable={editViewMode ? editMode : !editMode}
            />
          </div>

          {values.payment_type === "1" && (
            <>
              <div className={styles.inputHolder}>
                <CustomInput
                  label="Bank Name *"
                  name="bank_name"
                  type="text"
                  editable={editViewMode ? editMode : !editMode}
                />

                <CustomInput
                  label="IFSC Code *"
                  name="ifsc"
                  type="text"
                  editable={editViewMode ? editMode : !editMode}
                />
              </div>
              <div className={styles.inputHolder}>
                <CustomInput
                  label="Account Number *"
                  name="account_no"
                  type="text"
                  editable={editViewMode ? editMode : !editMode}
                />
              </div>
            </>
          )}

          <div className={styles.inputHolder}>
            <CustomInput
              label="Adhaar Card Number *"
              name={"aadhaar_card_no"}
              type="text"
              containerStyle={{
                marginBottom: 0,
              }}
              editable={editViewMode ? editMode : !editMode}
            />
            <CustomInput
              label="Name in Adhaar Card *"
              name={"aadhaar_card_name"}
              type="text"
              containerStyle={{
                marginBottom: 0,
              }}
              editable={editViewMode ? editMode : !editMode}
            />
          </div>

          <div style={{ marginTop: "40px" }}>
            {editViewMode &&
              (values.aadhaar_card_image &&
              typeof values.aadhaar_card_image === "string" ? (
                <div className={styles.employeeImageHolder}>
                  <img
                    src={values.aadhaar_card_image}
                    alt="Adhaar Card Image"
                    className={styles.employeeImage}
                  />

                  {editMode && (
                    <Button
                      variant="outline"
                      colorScheme="red"
                      onClick={() => {
                        setFieldValue("aadhaar_card_image", null);
                      }}
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ) : (
                <CustomInput
                  label="Upload Adhaar Card Image *"
                  name="aadhaar_card_image"
                  method="file"
                />
              ))}
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
        handleUpdate(values);
      }}
    >
      {(formikProps) => {
        return getForm(formikProps);
      }}
    </Formik>
  );
}

export default EmployeeIdentification;
