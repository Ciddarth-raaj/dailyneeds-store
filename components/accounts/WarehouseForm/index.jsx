import React, { useState } from "react";
import CustomContainer from "../../CustomContainer";
import { FieldArray, Formik } from "formik";
import CustomInput from "../../customInput/customInput";
import {
  EMPTY_ACCOUNT_OBJECT,
  MODIFIED_PEOPLE_TYPES,
} from "../../../constants/accounts";
import { PAYMENT_TYPES_ACCOUNTS } from "../../../constants/values";
import styles from "../../../styles/master.module.css";
import { Button, IconButton } from "@chakra-ui/button";
import usePeople from "../../../customHooks/usePeople";
import { useUser } from "../../../contexts/UserContext";
import Table from "../../table/table";
import { Menu, MenuItem } from "@szhsin/react-menu";
import Link from "next/link";

const HEADING = {
  person_type: "Type",
  payment_type: "Payment Type",
  person_id: "Name",
  description: "Narration",
  amount: "Amount",
  receipt: "Receipt",
  actions: "Actions",
};

const EMPTY_WAREHOUSE_OBJECT = {
  ...EMPTY_ACCOUNT_OBJECT,
  date: new Date(),
};

function WarehouseForm() {
  const { storeId } = useUser().userConfig;
  const { peopleList } = usePeople();

  const [initialValues, setInitialValues] = useState(EMPTY_WAREHOUSE_OBJECT);
  const [salesList, setSalesList] = useState([]);

  const editable = true;
  const isSaved = false;

  const SALES_ROWS = salesList.map((item) => ({
    ...item,
    actions: (
      <Menu
        align="end"
        gap={5}
        menuButton={
          <IconButton
            disabled={isSaved}
            variant="ghost"
            colorScheme="purple"
            icon={<i className={`fa fa-ellipsis-v`} />}
          />
        }
        transition
      >
        <MenuItem>Edit</MenuItem>
        <MenuItem>Delete</MenuItem>
      </Menu>
    ),
  }));

  const getPeopleList = (personType) => {
    if (personType === undefined || personType == 5) {
      return [];
    }

    return peopleList
      .filter((item) => {
        if (
          item.person_type == personType &&
          (storeId === null ||
            item.store_ids == null ||
            item.store_ids.includes(parseInt(storeId)))
        ) {
          return true;
        }

        return false;
      })
      .map((item) => ({ id: item.person_id, value: item.name }));
  };

  const onSubmit = (values, resetForm) => {
    setSalesList([...salesList, values]);

    resetForm();
  };

  return (
    <>
      <CustomContainer title="Add New Account Sheet" filledHeader>
        <Formik
          enableReinitialize
          initialValues={initialValues}
          // validationSchema={ACCOUNT_VALIDATION_SCHEMA}
          onSubmit={onSubmit}
        >
          {(formikProps) => {
            const { values, handleSubmit, resetForm } = formikProps;
            return (
              <div>
                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Date *"
                    name="date"
                    type="date"
                    method="datepicker"
                    editable={editable}
                    disabled={isSaved}
                  />
                  <CustomInput
                    label="Type *"
                    name={`person_type`}
                    type="number"
                    values={MODIFIED_PEOPLE_TYPES}
                    method="switch"
                    editable={editable}
                    disabled={isSaved}
                  />
                </div>

                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Payment Type *"
                    name={`payment_type`}
                    type="number"
                    values={PAYMENT_TYPES_ACCOUNTS}
                    method="switch"
                    editable={editable}
                    disabled={isSaved}
                  />

                  <CustomInput
                    label="Name *"
                    name={`person_id`}
                    type="number"
                    values={getPeopleList(values.person_type)}
                    method="switch"
                    editable={editable}
                    disabled={isSaved}
                  />
                </div>

                <div className={styles.inputSubContainer}>
                  <CustomInput
                    label="Narration *"
                    name={`description`}
                    type="text"
                    editable={editable}
                    disabled={isSaved}
                  />

                  <CustomInput
                    label="Amount *"
                    name={`amount`}
                    type="number"
                    editable={editable}
                    disabled={isSaved}
                  />
                </div>

                <CustomInput
                  label="Receipt"
                  name={`receipt`}
                  method="file"
                  editable={editable}
                  disabled={isSaved}
                />

                <div className={styles.buttonContainer}>
                  <Button
                    onClick={resetForm}
                    colorScheme="purple"
                    variant="outline"
                  >
                    Reset
                  </Button>
                  <Button
                    onClick={(values) => {
                      handleSubmit(values);
                      resetForm();
                    }}
                    colorScheme="purple"
                  >
                    Save
                  </Button>
                </div>
              </div>
            );
          }}
        </Formik>
      </CustomContainer>

      <div style={{ marginTop: "22px" }}>
        <CustomContainer title="List of Payment and Receipts" smallHeader>
          <Table heading={HEADING} rows={SALES_ROWS} />
        </CustomContainer>
      </div>
    </>
  );
}

export default WarehouseForm;
