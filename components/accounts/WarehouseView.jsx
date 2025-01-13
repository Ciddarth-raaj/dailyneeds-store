import React, { useMemo } from "react";
import useWarehouseSales from "../../customHooks/useWarehouseSales";
import CustomContainer from "../CustomContainer";
import Table from "../table/table";
import {
  getTotalCashHandover,
  getWarehouseCashbook,
  getWarehouseDenominations,
} from "../../util/account";
import useWarehouseDenomination from "../../customHooks/useWarehouseDenomination";
import EmptyData from "../EmptyData";
import { Button } from "@chakra-ui/button";
import styles from "./styles.module.css";
import { addStartingCash } from "../../helper/accounts";
import toast from "react-hot-toast";
import usePermissions from "../../customHooks/usePermissions";

const HEADINGS_CASHBOOK = {
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
};

const HEADINGS_DENOMINATION = {
  denomination: "Denomination",
  count: "Count",
  total: "Total Value",
};

function WarehouseView({ selectedDate }) {
  const canSaveSheet = usePermissions(["save_account_sheet"]);
  const canUnsaveSheet = usePermissions(["unsave_account_sheet"]);

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

  const {
    sales,
    denominations: allDenominations,
    startingCash,
    presetOpeningCash,
    saveSheet,
    unsaveSheet,
    isSaved,
    isCarriedForward,
    setIsCarriedForward,
  } = useWarehouseSales(filters);
  const { denomination } = useWarehouseDenomination(filters);

  const modifiedDenominations = useMemo(() => {
    return getWarehouseDenominations(denomination);
  }, [denomination]);

  const modifiedCashBook = useMemo(() => {
    return getWarehouseCashbook(
      sales,
      denomination,
      allDenominations,
      startingCash,
      presetOpeningCash
    );
  }, [sales, denomination, allDenominations, startingCash, presetOpeningCash]);

  const handleSubmitPress = async () => {
    saveSheet();
    handleSubmit(false);
  };

  const handleSubmit = async (carryForward) => {
    let totalCashHandover = getTotalCashHandover(denomination, true);

    if (carryForward) {
      for (let item of modifiedCashBook) {
        if (item.isClosingCash) {
          totalCashHandover =
            item.debit === ""
              ? item.credit.props.children.replaceAll("₹", "")
              : item.debit.props.children.replaceAll("₹", "");
          break;
        }
      }
    }

    toast.promise(
      addStartingCash({
        date: selectedDate,
        starting_cash: totalCashHandover,
        can_carry_forward: carryForward,
      }),
      {
        loading: carryForward ? "Carrying forward!" : "Submitting sheet!",
        success: (response) => {
          if (response.code === 200) {
            setIsCarriedForward(carryForward);
            return carryForward
              ? "Carried forward successfully!"
              : "Sheet submitted successfully!";
          } else {
            throw err;
          }
        },
        error: (err) => {
          console.log(err);
          return carryForward
            ? "Error carrying forward!"
            : "Error submitting sheet!";
        },
      }
    );
  };

  return (
    <div>
      <CustomContainer
        title="Cash Denomination Summary"
        filledHeader
        smallHeader
        style={{ marginBottom: "22px" }}
      >
        {denomination?.length === 0 ? (
          <EmptyData />
        ) : (
          <Table
            heading={HEADINGS_DENOMINATION}
            rows={modifiedDenominations}
            variant="plain"
          />
        )}
      </CustomContainer>

      <CustomContainer title="Cash Book" filledHeader>
        {sales?.length === 0 &&
        denomination?.length === 0 &&
        allDenominations?.length === 0 ? (
          <EmptyData />
        ) : (
          <Table
            heading={HEADINGS_CASHBOOK}
            rows={modifiedCashBook}
            variant="plain"
          />
        )}
      </CustomContainer>

      <div className={styles.buttonContainer}>
        {isSaved && (
          <Button
            variant="outline"
            colorScheme="purple"
            onClick={() => handleSubmit(!isCarriedForward)}
          >
            {isCarriedForward ? "Uncarry Forward" : "Carry Forward"}
          </Button>
        )}

        {canSaveSheet && (
          <Button
            colorScheme="purple"
            onClick={() => handleSubmitPress(true)}
            isDisabled={isSaved}
          >
            Submit Sheet
          </Button>
        )}

        {canUnsaveSheet && (
          <Button
            colorScheme="purple"
            onClick={unsaveSheet}
            isDisabled={!isSaved}
          >
            Unlock Sheet
          </Button>
        )}
      </div>
    </div>
  );
}

export default WarehouseView;
