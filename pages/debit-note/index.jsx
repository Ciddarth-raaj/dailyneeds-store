import React, { useEffect, useMemo, useState, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import Table from "../../components/table/table";
import moment from "moment";
import currencyFormatter from "../../util/currencyFormatter";
import { Menu, MenuItem } from "@szhsin/react-menu";
import { Button, IconButton } from "@chakra-ui/button";
import { Badge, Checkbox, Flex, Input } from "@chakra-ui/react";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import { useDebitNote } from "../../customHooks/useDebitNote";
import DebitNoteModal from "../../components/Purchase/PurchaseModal/DebitNoteModal";
import { exportToExcel } from "../../util/exportCSVFile";

const HEADINGS = {
  mprh_pr_refno: "MPRH Ref No",
  supplier_name: "Supplier Name",
  supplier_gstn: "GSTN",
  mprh_pr_dt: "MPRH Date",
  tot_item_value: "MPRH Amount",
  total_amount: "Total Amount",
  status: "Status",
  actions: "Actions",
};

function Purchase() {
  const [search, setSearch] = useState("");
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
  const [checkedFilters, setCheckedFilters] = useState({
    isApproved: false,
    isUpdated: false,
    isPending: false,
    isPushed: false,
  });
  const [sortConfig, setSortConfig] = useState({
    key: "mprh_pr_refno",
    direction: "desc",
  });

  const isOpen = selectedPurchase !== null;
  const onClose = () => setSelectedPurchase(null);

  const filters = useMemo(() => {
    const filterItem = {};

    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    filterItem["from_date"] = startOfDay.toISOString();
    filterItem["to_date"] = endOfDay.toISOString();

    if (selectedOutlet) {
      filterItem["store_id"] = selectedOutlet;
    }

    if (checkedFilters.isApproved) {
      filterItem["is_approved"] = true;
    }

    if (checkedFilters.isUpdated) {
      filterItem["has_updated"] = true;
    }

    if (checkedFilters.isPending) {
      filterItem["is_approved"] = false;
      filterItem["is_pushed"] = false;
    }

    if (checkedFilters.isPushed) {
      filterItem["is_pushed"] = true;
    }

    return filterItem;
  }, [selectedOutlet, fromDate, toDate, checkedFilters]);

  const {
    purchase,
    updatePurchase,
    unapprovePurchase,
    deleteDebitNoteTallyResponse,
  } = useDebitNote(filters);

  const handleSort = useCallback((key, direction) => {
    setSortConfig({ key, direction });
  }, []);

  const getStatus = (item) => {
    if (item.has_updated) {
      return <Badge colorScheme="red">Updated</Badge>;
    }

    if (item.tally_response.voucher_no) {
      return <Badge colorScheme="blue">Pushed to Tally</Badge>;
    }

    if (item.is_approved) {
      return <Badge colorScheme="purple">Approved</Badge>;
    }

    return <Badge colorScheme="yellow">Pending</Badge>;
  };

  const getStatusUnformmated = (item) => {
    if (item.has_updated) {
      return "Updated";
    }

    if (item.tally_response.voucher_no) {
      return "Pushed to Tally";
    }

    if (item.is_approved) {
      return "Approved";
    }

    return "Pending";
  };

  const rows = useMemo(() => {
    const sortedPurchase = [...purchase].sort((a, b) => {
      if (sortConfig.direction === null) {
        return b.mmh_mrc_refno - a.mmh_mrc_refno; // Default sort
      }

      const multiplier = sortConfig.direction === "asc" ? 1 : -1;

      switch (sortConfig.key) {
        case "mprh_pr_dt":
          const dateA = new Date(a[sortConfig.key]).getTime();
          const dateB = new Date(b[sortConfig.key]).getTime();
          return multiplier * (dateA - dateB);

        case "mprh_pr_refno":
          return (
            multiplier *
            String(a[sortConfig.key]).localeCompare(
              String(b[sortConfig.key]),
              undefined,
              {
                numeric: true,
              }
            )
          );

        case "tot_item_value":
        case "total_amount":
          const amtA = parseFloat(a[sortConfig.key]);
          const amtB = parseFloat(b[sortConfig.key]);
          return multiplier * (amtA - amtB);

        case "supplier_name":
        case "supplier_gstn":
          return (
            multiplier *
            a[sortConfig.key]
              .toLowerCase()
              .localeCompare(b[sortConfig.key].toLowerCase())
          );

        default:
          return 0;
      }
    });

    const formattedRows = sortedPurchase?.map((item) => ({
      ...item,
      mprh_pr_dt: moment(item.mprh_pr_dt).format("DD-MM-YYYY"),
      tot_item_value: currencyFormatter(item.tot_item_value),
      status: getStatus(item),
      total_amount: item.total_amount
        ? currencyFormatter(item.total_amount)
        : "-",
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
          {item.VoucherNo && (
            <MenuItem
              onClick={() => deleteDebitNoteTallyResponse(item.VoucherNo)}
            >
              Delete Tally Response
            </MenuItem>
          )}

          <MenuItem onClick={() => setSelectedPurchase(item)}>Edit</MenuItem>
        </Menu>
      ),
    }));

    if (!search) return formattedRows;

    const searchLower = search.toLowerCase();
    return formattedRows?.filter((row) => {
      // Search in all columns except actions
      return Object.entries(row)
        .filter(([key]) => key !== "actions")
        .some(([_, value]) => {
          if (value === null || value === undefined) return false;
          if (React.isValidElement(value)) return false; // Skip React components (like Badge)
          return String(value).toLowerCase().includes(searchLower);
        });
    });
  }, [purchase, search, sortConfig]);

  const handleCheckedFilters = (key, value) => {
    setCheckedFilters({
      isApproved: false,
      isUpdated: false,
      isPending: false,
      isPushed: false,
      [key]: value,
    });
  };

  const exportData = () => {
    const data = rows.map((item) => ({
      "MPRH Ref No": item.mprh_pr_refno,
      "Supplier Name": item.supplier_name,
      GSTN: item.supplier_gstn,
      "MPRH Date": item.mprh_pr_dt,
      "MPRH Amount": item.tot_item_value,
      "Total Amount": item.total_amount,
      Status: getStatusUnformmated(item),
    }));

    exportToExcel(
      [data],
      ["Debit Note"],
      `debit-note-${moment(fromDate).format("DD/MM/YYYY")}-${moment(
        toDate
      ).format("DD/MM/YYYY")}.xlsx`
    );
  };

  return (
    <GlobalWrapper>
      <DebitNoteModal
        isOpen={isOpen}
        onClose={onClose}
        item={selectedPurchase}
        updatePurchase={updatePurchase}
        unapprovePurchase={unapprovePurchase}
      />
      <CustomContainer
        title="All Debit Note"
        filledHeader
        rightSection={
          <Button colorScheme="purple" onClick={exportData}>
            Export
          </Button>
        }
      >
        <Input
          placeholder="Search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          mb="22px"
        />

        <FromToDateOutletPicker
          fromDate={fromDate}
          toDate={toDate}
          setFromDate={setFromDate}
          setToDate={setToDate}
          selectedOutlet={selectedOutlet}
          setSelectedOutlet={setSelectedOutlet}
          style={{ marginBottom: "22px" }}
        />

        <Flex style={{ marginBottom: "22px" }} gap="22px">
          <Checkbox
            isChecked={checkedFilters.isApproved}
            colorScheme="purple"
            onChange={(e) =>
              handleCheckedFilters("isApproved", e.target.checked)
            }
          >
            Approved
          </Checkbox>
          <Checkbox
            isChecked={checkedFilters.isPending}
            colorScheme="purple"
            onChange={(e) =>
              handleCheckedFilters("isPending", e.target.checked)
            }
          >
            Pending
          </Checkbox>
          <Checkbox
            isChecked={checkedFilters.isUpdated}
            colorScheme="purple"
            onChange={(e) =>
              handleCheckedFilters("isUpdated", e.target.checked)
            }
          >
            Updated
          </Checkbox>
          <Checkbox
            isChecked={checkedFilters.isPushed}
            colorScheme="purple"
            onChange={(e) => handleCheckedFilters("isPushed", e.target.checked)}
          >
            Pushed to Tally
          </Checkbox>
        </Flex>

        <Table
          variant="plain"
          heading={HEADINGS}
          rows={rows}
          sortCallback={handleSort}
          size="sm"
          showPagination
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Purchase;
