import React, { useEffect, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import Head from "../../util/head";
import CustomContainer from "../../components/CustomContainer";
import { Formik } from "formik";
import toast from "react-hot-toast";
import {
  checkSheetSaved,
  createAccount,
  getAccountById,
} from "../../helper/accounts";
import { useRouter } from "next/router";
import FilesHelper from "../../helper/asset";
import { ACCOUNT_VALIDATION_SCHEMA } from "../../validations/accounts";
import { EMPTY_ACCOUNT_OBJECT } from "../../constants/accounts";
import AccountForm from "../../components/accounts/AccountForm";
import { useUser } from "../../contexts/UserContext";
import { Alert, AlertIcon } from "@chakra-ui/react";

function Create() {
  const router = useRouter();

  const { storeId } = useUser().userConfig;
  const { mode, id: paramId } = router.query;
  const viewMode = mode === "view";

  const [isSaved, setIsSaved] = useState(false);
  const [initialValues, setInitialValues] = useState({
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
  });

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

  useEffect(() => {
    async function fetchAccount() {
      if (paramId) {
        const response = await getAccountById(paramId);

        if (response.code === 200) {
          const data = response.data;
          data.accounts = data.sales;

          setIsSaved(response.is_saved);
          setInitialValues(data);
        }
      }
    }
    fetchAccount();
  }, [paramId]);

  const handleDateChange = async (date) => {
    if (!date) return;

    try {
      const response = await checkSheetSaved({
        date: date.toISOString().split("T")[0],
        store_id: storeId ?? 3,
      });

      if (response.code === 200) {
        setIsSaved(response.is_saved);
      }
    } catch (err) {
      console.error("Error checking sheet status:", err);
    }
  };

  useEffect(() => {
    handleDateChange(initialValues.date);
  }, [initialValues.date]);

  return (
    <GlobalWrapper title="Add Account Sheet">
      <Head />

      <CustomContainer title="Add New Account Sheet" filledHeader>
        {(mode === "create" || mode === "edit") && isSaved && (
          <Alert status="warning" mb="22px" borderRadius="10px">
            <AlertIcon />
            Data was already saved for this date
          </Alert>
        )}

        <Formik
          enableReinitialize
          initialValues={initialValues}
          validationSchema={ACCOUNT_VALIDATION_SCHEMA}
          onSubmit={addAccountHandler}
        >
          {(formikProps) => (
            <AccountForm
              formikProps={formikProps}
              isViewMode={viewMode}
              isSaved={isSaved}
              mode={mode}
              onDateChange={handleDateChange}
            />
          )}
        </Formik>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Create;
