import React, { useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Head from "../../util/head";
import Link from "next/link";
import { Button } from "@chakra-ui/button";
import { CustomDateTimeInput } from "../../components/customInput/customInput";
import DatePicker from "react-datepicker";
import { Select } from "@chakra-ui/react";
import styles from "../../styles/accounts.module.css";
import usePermissions from "../../customHooks/usePermissions";
import NormalOutletView from "../../components/accounts/NormalOutletView";
import { useUser } from "../../contexts/UserContext";
import useOutlets from "../../customHooks/useOutlets";
import WarehouseView from "../../components/accounts/WarehouseView";
import { WAREHHOUSE_ID } from "../../constants";

function Index() {
  const { storeId: ownStoreId } = useUser().userConfig;
  // Accounts Executive reviews every branch's sheet without being given
  // `all_stores`, which unlocks the store on every screen. This key unlocks
  // it here only.
  const canViewAllStores = usePermissions(["account_sheet_all_stores"]);
  const storeId = canViewAllStores ? null : ownStoreId;

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  // The dropdown needs an id and a name; the full outlet record is gated on
  // `view_stores`, which an accounts user does not hold.
  const { outlets } = useOutlets({ directory: true });
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const canAddSheet = usePermissions(["add_account_sheet"]);

  return (
    <GlobalWrapper title="Account Sheet">
      <CustomContainer
        title="Account Sheet"
        filledHeader
        rightSection={
          canAddSheet ? (
            <Link href="/accounts/create" passHref>
              <Button colorScheme="purple" size="sm">
                Add New Sheet
              </Button>
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
              disabled={storeId !== null}
            >
              {OUTLETS_LIST?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.value}
                </option>
              ))}
            </Select>
          </div>

          {selectedOutlet == WAREHHOUSE_ID ? (
            <WarehouseView selectedDate={selectedDate} />
          ) : (
            <NormalOutletView
              selectedDate={selectedDate}
              setSelectedDate={setSelectedDate}
              selectedOutlet={selectedOutlet}
              setSelectedOutlet={setSelectedOutlet}
              OUTLETS_LIST={OUTLETS_LIST}
              storeId={storeId}
            />
          )}
        </div>
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Index;
