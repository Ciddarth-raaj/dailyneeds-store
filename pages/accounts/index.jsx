import React, { useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Head from "../../util/head";
import Link from "next/link";
import { Button } from "@chakra-ui/button";
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

const HEADINGS = {
  si_number: "SI No",
  cashier_name: "Cashier Name",
  total_sales: "Total Sales",
  card_sales: "Card Sales",
  cash_sales: "Cash Sales",
  sales_return: "Sales Return",
  loyalty: "Loyalty",
  actions: "Actions",
};

function Index() {
  const { storeId } = useUser().userConfig;
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOutlet, setSelectedOutlet] = useState(storeId);

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
            <Table heading={HEADINGS} rows={[]} variant="plain" />
          </CustomContainer>
        </div>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
