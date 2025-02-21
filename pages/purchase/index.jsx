import React, { useMemo, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { usePurchase } from "../../customHooks/usePurchase";
import Table from "../../components/table/table";
import moment from "moment";
import currencyFormatter from "../../util/currencyFormatter";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { IconButton } from "@chakra-ui/button";
import { Badge } from "@chakra-ui/react";

import PurchaseModal from "../../components/Purchase/PurchaseModal";
import toast from "react-hot-toast";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";

const HEADINGS = {
  mmh_mrc_refno: "MRC Ref No",
  supplier_name: "Supplier Name",
  supplier_gstn: "GSTN",
  mmh_mrc_dt: "MRC Date",
  mmh_dist_bill_dt: "Dist Bill Date",
  mmh_mrc_amt: "MRC Amount",
  status: "Status",
  actions: "Actions",
};

function Purchase() {
  const [fromDate, setFromDate] = useState(new Date(new Date().setDate(1)));
  const [toDate, setToDate] = useState(
    new Date(
      new Date().setDate(
        new Date().getDate() +
          (new Date(
            new Date().getFullYear(),
            new Date().getMonth() + 1,
            0
          ).getDate() -
            new Date().getDate())
      )
    )
  );
  const [selectedOutlet, setSelectedOutlet] = useState(null);
  const [selectedPurchase, setSelectedPurchase] = useState(null);
  const isOpen = selectedPurchase !== null;
  const onClose = () => setSelectedPurchase(null);

  const filters = useMemo(() => {
    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    if (selectedOutlet) {
      return {
        retail_outlet_id: selectedOutlet,
        from_date: startOfDay.toISOString(),
        to_date: endOfDay.toISOString(),
      };
    }

    return {
      from_date: startOfDay.toISOString(),
      to_date: endOfDay.toISOString(),
    };
  }, [selectedOutlet, fromDate, toDate]);

  const { purchase, updatePurchase, updatePurchaseFlags } =
    usePurchase(filters);

  const getStatus = (item) => {
    if (item.has_updated) {
      return <Badge colorScheme="red">Updated</Badge>;
    }

    if (item.is_approved) {
      return <Badge colorScheme="purple">Approved</Badge>;
    }

    return <Badge colorScheme="yellow">Pending</Badge>;
  };

  const approvePurchase = (item) => {
    toast.promise(
      updatePurchaseFlags(item.purchase_id, {
        is_approved: true,
        has_updated: false,
      }),
      {
        loading: "Approving purchase...",
        success: "Purchase approved successfully",
        error: "Failed to approve purchase",
      }
    );
  };

  const unapprovePurchase = (item) => {
    toast.promise(
      updatePurchaseFlags(item.purchase_id, {
        is_approved: false,
        has_updated: false,
      }),
      {
        loading: "Unapproving purchase...",
        success: "Purchase unapproved successfully",
        error: "Failed to unapprove purchase",
      }
    );
  };

  const rows = useMemo(() => {
    const sortedPurchase = purchase.sort((a, b) => {
      return b.mmh_mrc_refno - a.mmh_mrc_refno;
    });

    return sortedPurchase?.map((item) => ({
      ...item,
      mmh_mrc_dt: moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
      mmh_dist_bill_dt: moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY"),
      mmh_mrc_amt: currencyFormatter(item.mmh_mrc_amt),
      status: getStatus(item),
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
          <MenuItem onClick={() => setSelectedPurchase(item)}>Edit</MenuItem>
          {item.has_updated || !item.is_approved ? (
            <MenuItem onClick={() => approvePurchase(item)}>
              Mark as Approved
            </MenuItem>
          ) : (
            <MenuItem onClick={() => unapprovePurchase(item)}>
              Mark as Unapproved
            </MenuItem>
          )}
        </Menu>
      ),
    }));
  }, [purchase]);

  return (
    <GlobalWrapper>
      <PurchaseModal
        isOpen={isOpen}
        onClose={onClose}
        item={selectedPurchase}
        updatePurchase={updatePurchase}
      />
      <CustomContainer title="All Purchases" filledHeader>
        <FromToDateOutletPicker
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          selectedOutlet={selectedOutlet}
          setSelectedOutlet={setSelectedOutlet}
          style={{ marginBottom: "22px" }}
        />

        <Table variant="plain" heading={HEADINGS} rows={rows} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Purchase;
