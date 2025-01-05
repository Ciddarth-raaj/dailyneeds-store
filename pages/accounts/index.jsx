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
import { getCashSales, getTotals, getDenominations } from "../../util/account";
import { Menu, MenuItem } from "@szhsin/react-menu";

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

  const { accounts } = useAccounts(filters);

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
  }, [accounts]);

  const modifiedDenominations = useMemo(() => {
    return getDenominations(accounts);
  }, [accounts]);

  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  return (
    <GlobalWrapper title="Account Sheet">
      <Head />
      <CustomContainer
        title="Account Sheet"
        rightSection={
          usePermissions(["add_account_sheet"]) ? (
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

          <CustomContainer title="Store Account" filledHeader smallHeader>
            <Table heading={HEADINGS} rows={modifiedAccounts} variant="plain" />
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
        </div>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
