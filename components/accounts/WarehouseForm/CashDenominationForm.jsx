import { Formik } from "formik";
import React, { useEffect, useMemo, useState } from "react";
import CustomInput from "../../customInput/customInput";
import CustomContainer from "../../CustomContainer";
import { Button, IconButton } from "@chakra-ui/button";
import { ChevronDownIcon, ChevronUpIcon } from "@chakra-ui/icons";
import styles from "../../../styles/master.module.css";
import { Badge } from "@chakra-ui/react";
import { getTotalCashHandover } from "../../../util/account";
import toast from "react-hot-toast";
import {
  createWarehouseCashDenomination,
  updateWarehouseCashDenomination,
} from "../../../helper/accounts";
import useWarehouseDenomination from "../../../customHooks/useWarehouseDenomination";

const EMPPTY_CASH_DENOMINATION_OBJECT = {
  cash_handover_1: 0,
  cash_handover_2: 0,
  cash_handover_5: 0,
  cash_handover_10: 0,
  cash_handover_20: 0,
  cash_handover_50: 0,
  cash_handover_100: 0,
  cash_handover_200: 0,
  cash_handover_500: 0,
};

function CashDenominationForm({ editable, isSaved, selectedDate }) {
  const [initialValues, setInitialValues] = useState(
    EMPPTY_CASH_DENOMINATION_OBJECT
  );
  const [isDenominationOpen, setIsDenominationOpen] = useState(false);

  const filters = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedDate]);

  const { denomination, isSaved: isCashDenominationSaved } =
    useWarehouseDenomination(filters);

  useEffect(() => {
    if (denomination.cash_denomination_id) {
      setInitialValues(denomination);
    } else {
      setInitialValues(EMPPTY_CASH_DENOMINATION_OBJECT);
    }
  }, [denomination]);

  const handleSubmit = (values) => {
    if (isCashDenominationSaved) {
      handleUpdate(values);
    } else {
      handleSave(values);
    }
  };

  const handleUpdate = (values) => {
    try {
      const param = {
        ...values,
        date: selectedDate,
      };

      delete param.cash_denomination_id;

      toast.promise(
        updateWarehouseCashDenomination(
          denomination.cash_denomination_id,
          param
        ),
        {
          loading: "Updating...",
          success: (response) => {
            if (response.code == 200) {
              setIsDenominationOpen(false);
              return "Updated successfully";
            }

            throw "error";
          },
          error: (err) => {
            console.error(err);
            return "Error updating cash denomination";
          },
        }
      );
    } catch (error) {
      console.error(error);
    }
  };

  const handleSave = (values) => {
    try {
      const param = {
        ...values,
        date: selectedDate,
      };

      toast.promise(createWarehouseCashDenomination(param), {
        loading: "Saving...",
        success: (response) => {
          if (response.code == 200) {
            setIsDenominationOpen(false);
            return "Saved successfully";
          }

          throw "error";
        },
        error: (err) => {
          console.error(err);
          return "Error saving sales";
        },
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ marginBottom: "22px", flex: 1 }}>
      <CustomContainer
        smallHeader
        title="Cash Denominations"
        filledHeader
        rightSection={
          <IconButton
            onClick={() => setIsDenominationOpen((val) => !val)}
            icon={isDenominationOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
            colorScheme="whiteAlpha"
          />
        }
      >
        <Formik
          enableReinitialize
          initialValues={initialValues}
          // validationSchema={ACCOUNT_VALIDATION_SCHEMA}
          onSubmit={handleSubmit}
        >
          {(formikProps) => {
            const { values, resetForm, handleSubmit } = formikProps;

            return (
              <div className={styles.cashHandoverContainerWarehouse}>
                {isDenominationOpen && (
                  <>
                    <CustomInput
                      label="₹500"
                      name="cash_handover_500"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹200"
                      name="cash_handover_200"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹100"
                      name="cash_handover_100"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹50"
                      name="cash_handover_50"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹20"
                      name="cash_handover_20"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹10"
                      name="cash_handover_10"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹5"
                      name="cash_handover_5"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹2"
                      name="cash_handover_2"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                    <CustomInput
                      label="₹1"
                      name="cash_handover_1"
                      type="number"
                      position="left"
                      labelWidth="50px"
                      editable={editable}
                      disabled={isSaved}
                    />
                  </>
                )}

                <Badge
                  className={styles.badgeStyle}
                >{`Total ${getTotalCashHandover(values)}`}</Badge>

                {isDenominationOpen && (
                  <div
                    className={styles.buttonContainer}
                    style={{ marginTop: "22px", marginBottom: 0 }}
                  >
                    <Button
                      variant="outline"
                      colorScheme="purple"
                      onClick={resetForm}
                    >
                      Reset
                    </Button>
                    <Button
                      variant="solid"
                      colorScheme="purple"
                      onClick={handleSubmit}
                    >
                      {isCashDenominationSaved ? "Update" : "Save"}
                    </Button>
                  </div>
                )}
              </div>
            );
          }}
        </Formik>
      </CustomContainer>
    </div>
  );
}

export default CashDenominationForm;
