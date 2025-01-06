import React, { useState } from "react";
import { getAmmountDifference, getTotalCashHandover } from "../../util/account";
import CustomInput from "../customInput/customInput";
import { Badge, Button, Flex, IconButton } from "@chakra-ui/react";
import { FieldArray } from "formik";
import {
  EMPTY_ACCOUNT_OBJECT,
  MODIFIED_PEOPLE_TYPES,
} from "../../constants/accounts";
import currencyFormatter from "../../util/currencyFormatter";
import styles from "../../styles/master.module.css";
import { PAYMENT_TYPES_ACCOUNTS } from "../../constants/values";
import usePeople from "../../customHooks/usePeople";
import { useUser } from "../../contexts/UserContext";
import useEmployees from "../../customHooks/useEmployees";
import { CASHIER_DESIGNATION } from "../../constants/designations";

function AccountForm({ formikProps, isViewMode }) {
  const { handleSubmit, resetForm, values } = formikProps;
  const editable = !isViewMode;

  // custom hooks
  const { peopleList } = usePeople();
  const { storeId } = useUser().userConfig;
  const { employees } = useEmployees({
    store_ids: storeId === null ? [] : [storeId],
    designation_ids: [CASHIER_DESIGNATION],
  });

  const [isDenominationOpen, setIsDenominationOpen] = useState(false);

  const differenceAmount = getAmmountDifference(values);

  const EMPLOYEES_MENU = employees.map((item) => ({
    id: item.employee_id,
    value: item.employee_name,
  }));

  const getPeopleList = (personType) => {
    if (personType === undefined || personType == 4) {
      return [];
    }

    return peopleList
      .filter((item) => {
        if (
          item.person_type == personType &&
          (storeId === null ||
            item.store_ids == null ||
            item.store_ids.includes(storeId))
        ) {
          return true;
        }

        return false;
      })
      .map((item) => ({ id: item.person_id, value: item.name }));
  };

  return (
    <div className={styles.inputContainer}>
      <div className={styles.leftRightContainer}>
        <div className={styles.leftContainer}>
          <CustomInput
            label="Date *"
            name="date"
            type="text"
            method="datepicker"
            editable={editable}
          />
          <CustomInput
            label="Cashier *"
            name={`cashier_id`}
            type="number"
            values={EMPLOYEES_MENU}
            method="switch"
            editable={editable}
          />
          <CustomInput
            label="Total Sales *"
            name="total_sales"
            type="number"
            editable={editable}
          />
          <CustomInput
            label="Card Sales *"
            name="card_sales"
            type="number"
            editable={editable}
          />
          <CustomInput
            label="Loyalty *"
            name="loyalty"
            type="number"
            editable={editable}
          />
          <CustomInput
            label="Sales Return *"
            name="sales_return"
            type="number"
            editable={editable}
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
                onClick={() => setIsDenominationOpen(!isDenominationOpen)}
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
                  editable={editable}
                />
                <CustomInput
                  label="₹200"
                  name="cash_handover_200"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹100"
                  name="cash_handover_100"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹50"
                  name="cash_handover_50"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹20"
                  name="cash_handover_20"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹10"
                  name="cash_handover_10"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹5"
                  name="cash_handover_5"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹2"
                  name="cash_handover_2"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
                <CustomInput
                  label="₹1"
                  name="cash_handover_1"
                  type="number"
                  position="left"
                  labelWidth="50px"
                  editable={editable}
                />
              </>
            )}

            <Badge className={styles.badgeStyle}>{`Total ${getTotalCashHandover(
              values
            )}`}</Badge>
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
                  editable={editable}
                />
                <CustomInput
                  label="Payment Type *"
                  name={`accounts.${index}.payment_type`}
                  type="number"
                  values={PAYMENT_TYPES_ACCOUNTS}
                  method="switch"
                  editable={editable}
                />
                <CustomInput
                  label="Name *"
                  name={`accounts.${index}.person_id`}
                  type="number"
                  values={getPeopleList(account.person_type)}
                  method="switch"
                  editable={editable}
                />
                <CustomInput
                  label="Narration *"
                  name={`accounts.${index}.description`}
                  type="text"
                  editable={editable}
                />
                <CustomInput
                  label="Amount *"
                  name={`accounts.${index}.amount`}
                  type="number"
                  editable={editable}
                />

                <CustomInput
                  label="Receipt"
                  name={`accounts.${index}.receipt`}
                  method="file"
                  editable={editable}
                />

                {editable && (
                  <IconButton
                    mb="24px"
                    variant="outline"
                    colorScheme="red"
                    onClick={() => arrayHelpers.remove(index)}
                  >
                    <i className="fa fa-trash" aria-hidden="true" />
                  </IconButton>
                )}
              </div>
            ))}

            {editable && (
              <Button
                onClick={() => arrayHelpers.push(EMPTY_ACCOUNT_OBJECT)}
                variant="ghost"
                colorScheme="purple"
              >
                Add Row
              </Button>
            )}
          </div>
        )}
      />

      <div className={styles.buttonContainer}>
        <Badge className={styles.badgeStyle} style={{ marginTop: 0 }}>
          Total Difference
          <p style={{ color: differenceAmount >= 0 ? "green" : "red" }}>
            {` ${currencyFormatter(differenceAmount)}`}
          </p>
        </Badge>

        {editable && (
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

export default AccountForm;
