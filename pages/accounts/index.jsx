import React, { useState, useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Head from "../../util/head";
import Link from "next/link";
import { Button, IconButton } from "@chakra-ui/button";
import usePermissions from "../../customHooks/usePermissions";
import CustomInput, {
  CustomDateTimeInput,
} from "../../components/customInput/customInput";
import DatePicker from "react-datepicker";
import useOutlets from "../../customHooks/useOutlets";
import { Select } from "@chakra-ui/react";
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
} from "../../util/account";
import { Menu, MenuItem } from "@szhsin/react-menu";
import EmptyData from "../../components/EmptyData";
import { TableSkeleton } from "../../components/Skeleton";
import toast from "react-hot-toast";

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

function Index() {
  const { storeId } = useUser().userConfig;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOutlet, setSelectedOutlet] = useState(storeId);

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

  const { accounts, loading, isSaved, saveSheet, unsaveSheet } =
    useAccounts(filters);

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
          <MenuItem>View</MenuItem>
          <MenuItem>Edit</MenuItem>
          <MenuItem>Delete</MenuItem>
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
    return getCashBook(accounts);
  }, [accounts]);

  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

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

  const canAddSheet = usePermissions(["add_account_sheet"]);
  const canSaveSheet = usePermissions(["save_account_sheet"]);
  const canUnsaveSheet = usePermissions(["unsave_account_sheet"]);

  return (
    <GlobalWrapper title="Account Sheet">
      <Head />
      <CustomContainer
        title="Account Sheet"
        rightSection={
          canAddSheet ? (
            <Link href="/accounts/create" passHref>
              <Button colorScheme="purple">Add New Sheet</Button>
            </Link>
          ) : null
        }
      >
        <div className={styles.mainContainer}>
          <div className={styles.selectorContainer}>
            <DatePicker
              selected={selectedDate}
              customInput={
                <CustomDateTimeInput style={{ backgroundColor: "white" }} />
              }
              onChange={(val) => {
                setSelectedDate(val);
              }}
            />

            <Select
              placeholder="Select Outlet"
              value={selectedOutlet}
              onChange={(val) => setSelectedOutlet(val.target.value)}
              style={{ backgroundColor: "white" }}
            >
              {OUTLETS_LIST?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.value}
                </option>
              ))}
            </Select>
          </div>

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
                <Table
                  heading={HEADINGS}
                  rows={modifiedAccounts}
                  variant="plain"
                />
              </CustomContainer>

              <CustomContainer
                title="Cash Denomination Summary"
                filledHeader
                smallHeader
              >
                <Table
                  heading={HEADINGS_DENOMINATION}
                  rows={modifiedDenominations}
                  variant="plain"
                />
              </CustomContainer>

              <CustomContainer title="Cash Book" filledHeader smallHeader>
                <Table
                  heading={HEADINGS_CASHBOOK}
                  rows={modifiedCashBook}
                  variant="plain"
                />

                <div className={styles.buttonContainer}>
                  <Button colorScheme="purple" variant="outline">
                    Print
                  </Button>
                  {canSaveSheet && selectedOutlet && (
                    <Button
                      colorScheme="purple"
                      disabled={isSaved}
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
              </CustomContainer>
            </div>
          )}

          {!loading && accounts.length === 0 && (
            <EmptyData
              message="No account sheets found for the selected date"
              size="lg"
            />
          )}
        </div>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
