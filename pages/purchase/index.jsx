import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { usePurchase } from "../../customHooks/usePurchase";
import Table from "../../components/table/table";
import moment from "moment";
import currencyFormatter from "../../util/currencyFormatter";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { IconButton } from "@chakra-ui/button";
import { Select } from "@chakra-ui/react";
import useOutlets from "../../customHooks/useOutlets";

import styles from "../../styles/purchase.module.css";

const HEADINGS = {
  mmh_mrc_refno: "MRC Ref No",
  supplier_name: "Supplier Name",
  supplier_gstn: "GSTN",
  mmh_mrc_dt: "MRC Date",
  mmh_dist_bill_dt: "Dist Bill Date",
  mmh_mrc_amt: "MRC Amount",
  actions: "Actions",
};

function Purchase() {
  const [selectedOutlet, setSelectedOutlet] = useState(null);

  const filters = useMemo(() => {
    if (selectedOutlet) {
      return {
        retail_outlet_id: selectedOutlet,
      };
    }

    return {};
  }, [selectedOutlet]);

  const { purchase } = usePurchase(filters);

  const { outlets } = useOutlets();
  const OUTLETS_LIST = outlets.map((item) => ({
    id: item.outlet_id,
    value: item.outlet_name,
  }));

  const rows = useMemo(() => {
    const sortedPurchase = purchase.sort((a, b) => {
      return new Date(b.mmh_mrc_refno) - new Date(a.mmh_mrc_refno);
    });

    return sortedPurchase?.map((item) => ({
      ...item,
      mmh_mrc_dt: moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
      mmh_dist_bill_dt: moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY"),
      mmh_mrc_amt: currencyFormatter(item.mmh_mrc_amt),
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
          <MenuItem>Edit</MenuItem>
        </Menu>
      ),
    }));
  }, [purchase]);

  return (
    <GlobalWrapper>
      <CustomContainer title="All Purchases" filledHeader>
        <div className={styles.selectorContainer}>
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

        <Table variant="plain" heading={HEADINGS} rows={rows} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Purchase;
