import React, { useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { usePurchase } from "../../customHooks/usePurchase";
import Table from "../../components/table/table";
import moment from "moment";
import currencyFormatter from "../../util/currencyFormatter";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { IconButton } from "@chakra-ui/button";

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
  const { purchase } = usePurchase();

  const rows = useMemo(
    () =>
      purchase?.map((item) => ({
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
      })),
    [purchase]
  );

  return (
    <GlobalWrapper>
      <CustomContainer title="All Purchases" filledHeader>
        <Table variant="plain" heading={HEADINGS} rows={rows} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Purchase;
