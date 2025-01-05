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
import { createAccount } from "../../helper/accounts";
import { useRouter } from "next/router";
import FilesHelper from "../../helper/asset";

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
  const router = useRouter();
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

  const getAmmountDifference = (values) => {
    try {
      const { total_sales, card_sales, loyalty, sales_return, accounts } =
        values;

      let calculated_sales =
        getTotalCashHandover(values, true) +
        (card_sales ? parseFloat(card_sales) : 0) +
        (loyalty ? parseFloat(loyalty) : 0) +
        (sales_return ? parseFloat(sales_return) : 0);

      accounts.forEach((item) => {
        if (item.payment_type == 1) {
          // Payment
          calculated_sales += item.amount ? parseFloat(item.amount) : 0;
        } else {
          // Receipt
          calculated_sales -= item.amount ? parseFloat(item.amount) : 0;
        }
      });

      return total_sales - calculated_sales;
    } catch (err) {
      console.log(err);
      return "Invalid!";
    }
  };

  const addAccountHandler = (values) => {
    toast.promise(addAccount(values), {
      loading: "Adding new Account Record!",
      success: (response) => {
        if (response.code === 200) {
          router.push("/accounts");
          return "Acount Record Added!";
        } else {
          throw err;
        }
      },
      error: (err) => {
        console.log(err);
        return "Error adding Account Record!";
      },
    });
  };

  const addAccount = (values) => {
    return new Promise(async (resolve, reject) => {
      try {
        const sales = [];
        for (const item of values.accounts) {
          const tmpItem = structuredClone(item);
          let receiptPath = null;
          if (tmpItem.receipt) {
            try {
              const res = await FilesHelper.upload(
                tmpItem.receipt,
                tmpItem.receipt.name,
                "receipts"
              );

              if (res.code === 200) {
                receiptPath = res.remoteUrl;
              }
            } catch (err) {
              console.log(err);
            }
          }

          delete tmpItem.receipt;
          sales.push({
            ...tmpItem,
            receipt_path: receiptPath,
          });
        }

        const param = {
          ...values,
          sales,
          date: values.date.toISOString().slice(0, 19).replace("T", " "),
        };

        delete param.accounts;

        resolve(await createAccount(param));
      } catch (err) {
        reject(err);
      }
    });
  };

  const getTotalCashHandover = (values, noFormat = false) => {
    const {
      cash_handover_1,
      cash_handover_2,
      cash_handover_5,
      cash_handover_10,
      cash_handover_20,
      cash_handover_50,
      cash_handover_100,
      cash_handover_200,
      cash_handover_500,
    } = values;
    let totalCashHandover = 0;

    totalCashHandover += parseInt(cash_handover_1) * 1;
    totalCashHandover += parseInt(cash_handover_2) * 2;
    totalCashHandover += parseInt(cash_handover_5) * 5;
    totalCashHandover += parseInt(cash_handover_10) * 10;
    totalCashHandover += parseInt(cash_handover_20) * 20;
    totalCashHandover += parseInt(cash_handover_50) * 50;
    totalCashHandover += parseInt(cash_handover_100) * 100;
    totalCashHandover += parseInt(cash_handover_200) * 200;
    totalCashHandover += parseInt(cash_handover_500) * 500;

    if (noFormat) {
      return totalCashHandover;
    }

    return currencyFormatter(totalCashHandover);
  };

  return (
    <GlobalWrapper title="Add Account Sheet">
      <Head />

      <CustomContainer title="Add New Account Sheet" filledHeader>
        <Formik
          initialValues={{
            date: new Date(),
            total_sales: null,
            cash_handover_1: 0,
            cash_handover_2: 0,
            cash_handover_5: 0,
            cash_handover_10: 0,
            cash_handover_20: 0,
            cash_handover_50: 0,
            cash_handover_100: 0,
            cash_handover_200: 0,
            cash_handover_500: 0,
            card_sales: null,
            loyalty: null,
            sales_return: null,
            accounts: [EMPTY_ACCOUNT_OBJECT],
            cashier_id: null,
          }}
          validationSchema={validation}
          onSubmit={addAccountHandler}
        >
          {(formikProps) => {
            const { handleSubmit, resetForm, values, setFieldValue } =
              formikProps;

            const differenceAmount = getAmmountDifference(values);

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
                            name="cash_handover_500"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹200"
                            name="cash_handover_200"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹100"
                            name="cash_handover_100"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹50"
                            name="cash_handover_50"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹20"
                            name="cash_handover_20"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹10"
                            name="cash_handover_10"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹5"
                            name="cash_handover_5"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹2"
                            name="cash_handover_2"
                            type="number"
                            position="left"
                            labelWidth="50px"
                          />
                          <CustomInput
                            label="₹1"
                            name="cash_handover_1"
                            type="number"
                            position="left"
                            labelWidth="50px"
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
                            label="Narration *"
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
                  <Badge className={styles.badgeStyle} style={{ marginTop: 0 }}>
                    Total Difference
                    <p
                      style={{ color: differenceAmount >= 0 ? "green" : "red" }}
                    >
                      {` ${currencyFormatter(differenceAmount)}`}
                    </p>
                  </Badge>

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
