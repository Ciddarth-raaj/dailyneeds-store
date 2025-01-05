import React, { useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Field, FieldArray, Formik } from "formik";
import CustomInput from "../../components/customInput/customInput";
import styles from "../../styles/master.module.css";
import * as Yup from "yup";
import { Button, IconButton } from "@chakra-ui/button";
import { PAYMENT_TYPES_ACCOUNTS, PEOPLE_TYPES } from "../../constants/values";
import usePeople from "../../customHooks/usePeople";
import toast from "react-hot-toast";
import { Badge, Flex } from "@chakra-ui/react";
import currencyFormatter from "../../util/currencyFormatter";
import useEmployees from "../../customHooks/useEmployees";
import { CASHIER_DESIGNATION } from "../../constants/designations";

const EMPTY_ACCOUNT_OBJECT = {
  person_type: null,
  payment_type: null,
  person_id: null,
  description: "",
  amount: null,
};

const validation = Yup.object({
  date: Yup.date().required("Fill Date"),
  cashier_id: Yup.number()
    .typeError("Select a Cashier")
    .required("Select a Cashier"),
  total_sales: Yup.number()
    .typeError("Must be a number")
    .required("Fill Total Sales"),
  // cash_handover: Yup.number()
  //   .typeError("Must be a number")
  //   .required("Fill Cash Handover"),
  card_sales: Yup.number()
    .typeError("Must be a number")
    .required("Fill Card Sales"),
  loyalty: Yup.number().typeError("Must be a number").required("Fill Loyalty"),
  sales_return: Yup.number()
    .typeError("Must be a number")
    .required("Fill Sales Return"),
  accounts: Yup.array(
    Yup.object({
      person_type: Yup.number()
        .typeError("Select a Type")
        .required("Select a Type"),
      payment_type: Yup.number()
        .typeError("Select a Type")
        .required("Select a Type"),
      person_id: Yup.number()
        .typeError("Select a Person")
        .required("Select a Person"),
      description: Yup.string()
        .typeError("Fill the description")
        .required("Fill the description"),
      amount: Yup.number()
        .typeError("Fill the amount")
        .required("Fill the amount"),
    }).required("Fill Accounts")
  ),
});

const MODIFIED_PEOPLE_TYPES = [
  {
    id: 4,
    value: "Employee",
  },
  ...PEOPLE_TYPES,
];

function Create() {
  const { peopleList } = usePeople();

  const loggedInUserStoreID = global.config.store_id;
  const { employees } = useEmployees({
    store_ids: loggedInUserStoreID == "null" ? [] : [loggedInUserStoreID],
    designation_ids: [CASHIER_DESIGNATION],
  });
  const [isDenominationOpen, setIsDenominationOpen] = useState(false);

  const getPeopleList = (personType) => {
    if (personType === undefined || personType == 4) {
      return [];
    }

    return peopleList
      .filter((item) => {
        if (
          item.person_type == personType &&
          (loggedInUserStoreID == "null" ||
            item.store_ids == null ||
            item.store_ids.includes(loggedInUserStoreID))
        ) {
          return true;
        }

        return false;
      })
      .map((item) => ({ id: item.person_id, value: item.name }));
  };

  const EMPLOYEES_MENU = employees.map((item) => ({
    id: item.employee_id,
    value: item.employee_name,
  }));

  const validateAccountEntries = (values) => {
    try {
      const {
        total_sales,
        cash_handover,
        card_sales,
        loyalty,
        sales_return,
        accounts,
      } = values;
      let calculated_sales =
        getTotalCashHandover({ cash_handover }, true) +
        card_sales +
        loyalty +
        sales_return;

      accounts.forEach((item) => {
        if (item.payment_type == 1) {
          // Payment
          calculated_sales += item.amount;
        } else {
          // Receipt
          calculated_sales -= item.amount;
        }
      });

      if (calculated_sales != total_sales) {
        toast.error(
          `There is a different of ${currencyFormatter(
            calculated_sales > total_sales
              ? calculated_sales - total_sales
              : total_sales - calculated_sales
          )}`
        );
        return;
      }
    } catch (err) {
      console.log(err);
    }
  };

  const getTotalCashHandover = (values, noFormat = false) => {
    const { cash_handover } = values;
    let totalCashHandover = 0;

    Object.keys(cash_handover).map((denomination) => {
      totalCashHandover += denomination * cash_handover[denomination];
    });

    if (noFormat) {
      return totalCashHandover;
    }

    return currencyFormatter(totalCashHandover);
  };

  return (
    <GlobalWrapper title="Add Account Sheet">
      <Head />

      <CustomContainer title="Add New Account Sheet">
        <Formik
          initialValues={{
            date: new Date(),
            total_sales: null,
            cash_handover: {
              1: 0,
              2: 0,
              5: 0,
              10: 0,
              20: 0,
              50: 0,
              100: 0,
              200: 0,
              500: 0,
            },
            card_sales: null,
            loyalty: null,
            sales_return: null,
            accounts: [EMPTY_ACCOUNT_OBJECT],
            cashier_id: null,
          }}
          validationSchema={validation}
          onSubmit={validateAccountEntries}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values, setFieldValue } =
              formikProps;

            return (
              <div className={styles.inputContainer}>
                <div className={styles.leftRightContainer}>
                  <div className={styles.leftContainer}>
                    <CustomInput
                      label="Date *"
                      name="date"
                      type="text"
                      method="datepicker"
                    />
                    <CustomInput
                      label="Cashier *"
                      name={`cashier_id`}
                      type="number"
                      values={EMPLOYEES_MENU}
                      method="switch"
                    />
                    <CustomInput
                      label="Total Sales *"
                      name="total_sales"
                      type="number"
                    />
                    <CustomInput
                      label="Card Sales *"
                      name="card_sales"
                      type="number"
                    />
                    <CustomInput
                      label="Loyalty *"
                      name="loyalty"
                      type="number"
                    />
                    <CustomInput
                      label="Sales Return *"
                      name="sales_return"
                      type="number"
                    />
                  </div>

                  <div>
                    <label className={styles.label}>Cash Handover</label>
                    <div className={styles.cashHandoverContainer}>
                      <Flex justifyContent="center">
                        <Button
                          variant="ghost"
                          colorScheme="purple"
                          size="sm"
                          onClick={() =>
                            setIsDenominationOpen(!isDenominationOpen)
                          }
                        >
                          {isDenominationOpen ? "Close" : "Expand"}
                        </Button>
                      </Flex>

                      {isDenominationOpen && (
                        <>
                          <CustomInput
                            label="₹500"
                            name="cash_handover.500"
                            type="number"
                          />
                          <CustomInput
                            label="₹200"
                            name="cash_handover.200"
                            type="number"
                          />
                          <CustomInput
                            label="₹100"
                            name="cash_handover.100"
                            type="number"
                          />
                          <CustomInput
                            label="₹50"
                            name="cash_handover.50"
                            type="number"
                          />
                          <CustomInput
                            label="₹20"
                            name="cash_handover.20"
                            type="number"
                          />
                          <CustomInput
                            label="₹10"
                            name="cash_handover.10"
                            type="number"
                          />
                          <CustomInput
                            label="₹5"
                            name="cash_handover.5"
                            type="number"
                          />
                          <CustomInput
                            label="₹2"
                            name="cash_handover.2"
                            type="number"
                          />
                          <CustomInput
                            label="₹1"
                            name="cash_handover.1"
                            type="number"
                          />
                        </>
                      )}

                      <Badge
                        className={styles.badgeStyle}
                      >{`Total ${getTotalCashHandover(values)}`}</Badge>
                    </div>
                  </div>
                </div>

                <div className="line" />

                <FieldArray
                  name="accounts"
                  render={(arrayHelpers) => (
                    <div>
                      {values.accounts.map((account, index) => (
                        <div key={index} className={styles.inputSubContainer}>
                          <CustomInput
                            label="Type *"
                            name={`accounts.${index}.person_type`}
                            type="number"
                            values={MODIFIED_PEOPLE_TYPES}
                            method="switch"
                          />
                          <CustomInput
                            label="Payment Type *"
                            name={`accounts.${index}.payment_type`}
                            type="number"
                            values={PAYMENT_TYPES_ACCOUNTS}
                            method="switch"
                          />
                          <CustomInput
                            label="Name *"
                            name={`accounts.${index}.person_id`}
                            type="number"
                            values={getPeopleList(account.person_type)}
                            method="switch"
                          />
                          <CustomInput
                            label="Description *"
                            name={`accounts.${index}.description`}
                            type="text"
                          />
                          <CustomInput
                            label="Amount *"
                            name={`accounts.${index}.amount`}
                            type="number"
                          />

                          <CustomInput
                            label="Receipt"
                            name={`accounts.${index}.receipt`}
                            method="file"
                          />

                          <IconButton
                            mb="24px"
                            variant="outline"
                            colorScheme="red"
                            onClick={() => arrayHelpers.remove(index)}
                          >
                            <i className="fa fa-trash-o" aria-hidden="true" />
                          </IconButton>
                        </div>
                      ))}

                      <Button
                        onClick={() => arrayHelpers.push(EMPTY_ACCOUNT_OBJECT)}
                        variant="ghost"
                        colorScheme="purple"
                      >
                        Add Row
                      </Button>
                    </div>
                  )}
                />

                <div className={styles.buttonContainer}>
                  <Button
                    variant="outline"
                    colorScheme="red"
                    onClick={() => resetForm()}
                  >
                    Reset
                  </Button>

                  <Button
                    colorScheme="purple"
                    onClick={() => {
                      handleSubmit();
                    }}
                  >
                    Create
                  </Button>
                </div>
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Create;
