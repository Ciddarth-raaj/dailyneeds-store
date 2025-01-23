import React, { useState, useMemo, useRef, useEffect } from "react";
import CustomContainer from "../../components/CustomContainer";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import usePermissions from "../../customHooks/usePermissions";
import { Badge } from "@chakra-ui/react";
import { useUser } from "../../contexts/UserContext";
import styles from "../../styles/accounts.module.css";
import Table from "../../components/table/table";
import { useAccounts } from "../../customHooks/useAccounts";
import currencyFormatter from "../../util/currencyFormatter";
import {
  getCashSales,
  getTotals,
  getDenominations,
  getCashBook,
  getEbook,
} from "../../util/account";
import { Menu, MenuItem } from "@szhsin/react-menu";
import EmptyData from "../../components/EmptyData";
import { TableSkeleton } from "../../components/Skeleton";
import toast from "react-hot-toast";
import { useReactToPrint } from "react-to-print";
import moment from "moment";
import { useConfirmation } from "../../hooks/useConfirmation";
import { deleteAccount } from "../../helper/accounts";
import useEmployees from "../../customHooks/useEmployees";
import useOutlets from "../../customHooks/useOutlets";
import { downloadCsv, exportToExcel } from "../../util/exportCSVFile";

const OUTLET_CASH_ID_MAP = {
  4: "Dn1",
  3: "Dn2",
  5: "Dn3",
  6: "Dn4",
};

const HEADINGS = {
  cashier_name: "Cashier Name",
  cash_sales: "Cash Sales",
  card_sales: "Card Sales",
  sales_return: "Sales Return",
  loyalty: "Loyalty",
  total_sales: "Total Sales",
  actions: "Actions",
};

const HEADINGS_DENOMINATION = {
  denomination: "Denomination",
  count: "Count",
  total: "Total Value",
};

const HEADINGS_CASHBOOK = {
  particulars: "Particulars",
  narration: "Narration",
  debit: "Debit",
  credit: "Credit",
};

function NormalOutletView({
  selectedDate,
  setSelectedDate,
  selectedOutlet,
  setSelectedOutlet,
  OUTLETS_LIST,
}) {
  const { outlets } = useOutlets();
  const cashDenominationRef = useRef(null);
  const { storeId } = useUser().userConfig;
  const { confirm } = useConfirmation();
  const { employees: allEmployees } = useEmployees({
    store_ids: storeId === null ? [] : [storeId],
    designation_ids: [],
  });

  const printCashDenomination = useReactToPrint({
    contentRef: cashDenominationRef,
  });

  const filters = useMemo(() => {
    const startOfDay = new Date(selectedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(selectedDate);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      store_id: selectedOutlet,
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedOutlet, selectedDate]);

  const {
    accounts,
    loading,
    isSaved,
    saveSheet,
    unsaveSheet,
    epayments,
    outletData,
    refetch,
    mappedAccounts,
  } = useAccounts(filters);

  const getOutletById = (store_id) =>
    outlets.find((item) => item.outlet_id == store_id);

  const exportAccountSheet = () => {
    const list = [];

    Object.keys(mappedAccounts).forEach((key) => {
      const outlet = getOutletById(key);
      list.push({
        Date: moment(selectedDate).format("DD/MM/YYYY"),
        Particulars: `Cash (${OUTLET_CASH_ID_MAP[key] ?? "N/A"})`,
        "Cost Center": outlet.outlet_name,
        Narration: "",
        Debit:
          parseInt(mappedAccounts[key].cash_sales) +
          parseInt(mappedAccounts[key].loyalty) -
          parseInt(mappedAccounts[key].sales_return),
        Credit: "",
      });

      list.push({
        Date: moment(selectedDate).format("DD/MM/YYYY"),
        Particulars: "Card Sales",
        "Cost Center": outlet.outlet_name,
        Narration: "",
        Debit: mappedAccounts[key].card_sales,
        Credit: "",
      });

      list.push({
        Date: moment(selectedDate).format("DD/MM/YYYY"),
        Particulars: "Sales Return",
        "Cost Center": outlet.outlet_name,
        Narration: "",
        Debit: "",
        Credit:
          parseInt(mappedAccounts[key].card_sales) +
          (parseInt(mappedAccounts[key].cash_sales) +
            parseInt(mappedAccounts[key].loyalty) -
            parseInt(mappedAccounts[key].sales_return)),
      });
    });

    console.log("CIDD", list);

    exportToExcel(
      [list],
      ["Journal"],
      `account_sheet-${moment(selectedDate).format("DD/MM/YYYY")}.xlsx`
    );
  };

  useEffect(() => {
    if (storeId) {
      setSelectedOutlet(storeId);
    }
  }, [storeId]);

  const modifiedAccounts = useMemo(() => {
    const modified = accounts.map((item) => ({
      ...item,
      total_sales: currencyFormatter(item.total_sales),
      card_sales: currencyFormatter(item.card_sales),
      sales_return: currencyFormatter(item.sales_return),
      loyalty: currencyFormatter(item.loyalty),
      cash_sales: currencyFormatter(getCashSales(item)),
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
          <Link href={`/accounts/view?id=${item.accounts_id}`} passHref>
            <a target="_blank" rel="noopener noreferrer">
              <MenuItem>View</MenuItem>
            </a>
          </Link>
          <Link href={`/accounts/edit?id=${item.accounts_id}`} passHref>
            <MenuItem>Edit</MenuItem>
          </Link>
          <MenuItem onClick={() => handleDelete(item.accounts_id)}>
            Delete
          </MenuItem>
        </Menu>
      ),
    }));

    modified.push({
      cashier_name: <b>Total</b>,
      ...getTotals(accounts),
    });

    return modified;
  }, [accounts, isSaved]);

  const modifiedDenominations = useMemo(() => {
    return getDenominations(accounts);
  }, [accounts]);

  const modifiedCashBook = useMemo(() => {
    return getCashBook(accounts, outletData, allEmployees);
  }, [accounts, outletData, allEmployees]);

  const isOpeningClosingNotEqual = () => {
    try {
      const openingCash = modifiedCashBook[0].debit;
      const closingCash =
        modifiedCashBook[modifiedCashBook.length - 2].credit === ""
          ? 0
          : modifiedCashBook[modifiedCashBook.length - 2].credit;

      return openingCash != closingCash;
    } catch (err) {
      return false;
    }
  };

  const modifiedEbook = useMemo(() => {
    return getEbook(epayments, getTotals(accounts, true));
  }, [epayments, accounts]);

  const isEbookNotEqual = useMemo(() => {
    return modifiedEbook.some((item) => item.isNotEqual);
  }, [modifiedEbook]);

  const isCashBookNotEqual = useMemo(() => {
    return modifiedCashBook.some((item) => item.isNotEqual);
  }, [modifiedCashBook]);

  const handleSaveSheet = async () => {
    try {
      toast.promise(saveSheet(), {
        loading: "Saving account sheet",
        success: "Account sheet saved successfully!",
        error: "Failed to save account sheet",
      });
    } catch (error) {
      console.error("Error saving sheet:", error);
    }
  };

  const handleUnsaveSheet = async () => {
    try {
      toast.promise(unsaveSheet(), {
        loading: "Unlocking account sheet",
        success: "Account sheet unlocked successfully!",
        error: "Failed to unlock account sheet",
      });
    } catch (error) {
      console.error("Error unsaving sheet:", error);
    }
  };

  const canSaveSheet = usePermissions(["save_account_sheet"]);
  const canUnsaveSheet = usePermissions(["unsave_account_sheet"]);

  const getSelectedOutlet = () => {
    const selectedOutletValue = OUTLETS_LIST.find(
      (item) => item.id == selectedOutlet
    );

    return selectedOutletValue?.value ?? "All Outlets";
  };

  const handleDelete = async (id) => {
    const shouldDelete = await confirm(
      "Are you sure? You can't undo this action afterwards.",
      {
        title: "Delete Account",
        type: "error",
        confirmText: "Delete",
      }
    );

    if (shouldDelete) {
      toast.promise(deleteAccount(id), {
        loading: "Deleting account",
        success: (response) => {
          if (response.code === 200) {
            refetch();
            return "Account deleted successfully";
          } else {
            throw err;
          }
        },
        error: "Failed to delete account",
      });
    }
  };

  return (
    <>
      {loading && (
        <div className={styles.childDiv}>
          <CustomContainer title="Store Account" filledHeader smallHeader>
            <TableSkeleton rows={3} columns={7} />
          </CustomContainer>

          <CustomContainer
            title="Cash Denomination Summary"
            filledHeader
            smallHeader
          >
            <TableSkeleton rows={3} columns={3} />
          </CustomContainer>

          <CustomContainer title="Cash Book" filledHeader smallHeader>
            <TableSkeleton rows={3} columns={4} />
          </CustomContainer>
        </div>
      )}

      {!loading && accounts.length > 0 && (
        <div className={styles.childDiv}>
          <CustomContainer title="Store Account" filledHeader smallHeader>
            <Table heading={HEADINGS} rows={modifiedAccounts} variant="plain" />
          </CustomContainer>

          <div ref={cashDenominationRef} className="print-container">
            <CustomContainer
              title={
                <p>
                  <span className="only-print" style={{ fontWeight: 600 }}>
                    {getSelectedOutlet()}
                  </span>
                  Cash Denomination Summary
                </p>
              }
              filledHeader
              smallHeader
            >
              <Table
                heading={HEADINGS_DENOMINATION}
                rows={modifiedDenominations}
                variant="plain"
              />

              <span className="only-print" style={{ textAlign: "right" }}>
                {moment(selectedDate).format("DD-MM-YYYY")}
              </span>
            </CustomContainer>
          </div>

          <CustomContainer title="Cash Book" filledHeader smallHeader>
            <Table
              heading={HEADINGS_CASHBOOK}
              rows={modifiedCashBook}
              variant="plain"
            />
          </CustomContainer>

          <CustomContainer title="E-Book" filledHeader smallHeader>
            <Table
              heading={HEADINGS_CASHBOOK}
              rows={modifiedEbook}
              variant="plain"
            />
          </CustomContainer>
        </div>
      )}

      {!loading && accounts.length > 0 && (
        <div className={styles.bottomContainer}>
          <div className={styles.badgeContainer}>
            {isSaved && <Badge colorScheme="green">Saved</Badge>}
            {isCashBookNotEqual && (
              <Badge colorScheme="red">Cashbook Not Equal</Badge>
            )}
            {isEbookNotEqual && (
              <Badge colorScheme="red">EBook Not Equal</Badge>
            )}
            {isOpeningClosingNotEqual() && (
              <Badge colorScheme="red">Opening Closing Not Equal</Badge>
            )}
          </div>
          <div className={styles.buttonContainer}>
            <Button
              colorScheme="purple"
              variant="outline"
              onClick={exportAccountSheet}
            >
              Export Account Sheet
            </Button>
            <Button
              colorScheme="purple"
              variant="outline"
              onClick={printCashDenomination}
            >
              Print
            </Button>
            {canSaveSheet && selectedOutlet && (
              <Button
                colorScheme="purple"
                disabled={
                  isSaved ||
                  isEbookNotEqual ||
                  isCashBookNotEqual ||
                  isOpeningClosingNotEqual()
                }
                onClick={handleSaveSheet}
              >
                Submit Sheet
              </Button>
            )}

            {canUnsaveSheet && selectedOutlet && (
              <Button
                colorScheme="purple"
                disabled={!isSaved}
                onClick={handleUnsaveSheet}
              >
                Unlock Sheet
              </Button>
            )}
          </div>
        </div>
      )}

      {!loading && accounts.length === 0 && (
        <EmptyData
          message="No account sheets found for the selected date"
          size="lg"
        />
      )}
    </>
  );
}

export default NormalOutletView;
