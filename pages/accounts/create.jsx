import React from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import toast from "react-hot-toast";
import useEmployees from "../../customHooks/useEmployees";
import { CASHIER_DESIGNATION } from "../../constants/designations";
import { createAccount } from "../../helper/accounts";
import { useRouter } from "next/router";
import FilesHelper from "../../helper/asset";
import { ACCOUNT_VALIDATION_SCHEMA } from "../../validations/accounts";
import { EMPTY_ACCOUNT_OBJECT } from "../../constants/accounts";
import AccountForm from "../../components/accounts/AccountForm";
import { useUser } from "../../contexts/UserContext";

function Create() {
  const router = useRouter();

  const { storeId } = useUser().userConfig;
  const { employees } = useEmployees({
    store_ids: storeId === null ? [] : [storeId],
    designation_ids: [CASHIER_DESIGNATION],
  });

  const EMPLOYEES_MENU = employees.map((item) => ({
    id: item.employee_id,
    value: item.employee_name,
  }));

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
          validationSchema={ACCOUNT_VALIDATION_SCHEMA}
          onSubmit={addAccountHandler}
        >
          {(formikProps) => (
            <AccountForm
              formikProps={formikProps}
              EMPLOYEES_MENU={EMPLOYEES_MENU}
            />
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Create;
