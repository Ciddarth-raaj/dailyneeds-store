import React, { useMemo, useState, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import AgGrid from "../../components/AgGrid";
import { usePurchase } from "../../customHooks/usePurchase";
import moment from "moment";
import currencyFormatter from "../../util/currencyFormatter";
import { Button } from "@chakra-ui/button";
import { Checkbox, Flex, Input, Text } from "@chakra-ui/react";

import PurchaseModal from "../../components/Purchase/PurchaseModal";
import FromToDateOutletPicker from "../../components/DateOutletPicker/FromToDateOutletPicker";
import { exportToExcel } from "../../util/exportCSVFile";

function getStatusBadge(item) {
  if (!item) return null;
  if (item.tally_response?.voucher_no) {
    return { label: "Pushed to Tally", colorScheme: "blue" };
  }
  if (item.is_approved) {
    return { label: "Approved", colorScheme: "purple" };
  }
  return { label: "Pending", colorScheme: "yellow" };
}

function getStatusLabel(item) {
  return getStatusBadge(item)?.label ?? "";
}

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
    isPending: false,
    isPushed: false,
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
      filterItem["retail_outlet_id"] = selectedOutlet;
    }

    if (checkedFilters.isApproved) {
      filterItem["is_approved"] = true;
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
    loading,
    updatePurchase,
    unapprovePurchase,
    deletePurchaseTallyResponse,
  } = usePurchase(filters);

  const filteredPurchases = useMemo(() => {
    if (!search.trim()) return purchase ?? [];

    const searchLower = search.toLowerCase();
    return (purchase ?? []).filter((item) => {
      const statusLabel = getStatusLabel(item);
      const fields = [
        item.mmh_mrc_refno,
        item.supplier_name,
        item.supplier_gstn,
        item.mmh_mrc_dt,
        item.mmh_dist_bill_dt,
        item.mmh_mrc_amt,
        item.total_amount,
        statusLabel,
      ];
      return fields.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(searchLower)
      );
    });
  }, [purchase, search]);

  const columnDefs = useMemo(
    () => [
      {
        field: "mmh_mrc_refno",
        headerName: "MRC Ref No",
      },
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        type: "capitalized",
      },
      {
        field: "supplier_gstn",
        headerName: "GSTN",
        minWidth: 155,
      },
      {
        field: "mmh_mrc_dt",
        headerName: "MRC Date",
        type: "date",
      },
      {
        field: "mmh_dist_bill_dt",
        headerName: "Dist Bill Date",
        type: "date",
      },
      {
        field: "mmh_mrc_amt",
        headerName: "MRC Amount",
        type: "currency",
      },
      {
        field: "total_amount",
        headerName: "Total Amount",
        type: "currency",
      },
      {
        colId: "status",
        headerName: "Status",
        type: "badge-column",
        minWidth: 130,
        valueGetter: (params) => getStatusBadge(params.data),
      },
      {
        field: "purchase_id",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const item = params.data;
          if (!item) return [];
          const actions = [
            {
              label: "Edit",
              icon: "fa-solid fa-pen",
              colorScheme: "purple",
              onClick: () => setSelectedPurchase(item),
            },
          ];
          if (item.VoucherNo) {
            actions.push({
              label: "Delete Tally Response",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              onClick: () => deletePurchaseTallyResponse(item.VoucherNo),
            });
          }
          return actions;
        },
      },
    ],
    [deletePurchaseTallyResponse]
  );

  const handleCheckedFilters = (key, value) => {
    setCheckedFilters({
      isApproved: false,
      isPending: false,
      isPushed: false,
      [key]: value,
    });
  };

  const exportData = useCallback(() => {
    const data = filteredPurchases.map((item) => ({
      "MRC Ref No": item.mmh_mrc_refno,
      "Supplier Name": item.supplier_name,
      GSTN: item.supplier_gstn,
      "MRC Date": moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
      "Dist Bill Date": moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY"),
      "MRC Amount": currencyFormatter(item.mmh_mrc_amt),
      "Total Amount": item.total_amount
        ? currencyFormatter(item.total_amount)
        : "-",
      Status: getStatusLabel(item),
    }));

    exportToExcel(
      [data],
      ["Purchase"],
      `purchase-${moment(fromDate).format("DD/MM/YYYY")}-${moment(
        toDate
      ).format("DD/MM/YYYY")}.xlsx`
    );
  }, [filteredPurchases, fromDate, toDate]);

  return (
    <GlobalWrapper>
      <PurchaseModal
        isOpen={isOpen}
        onClose={onClose}
        item={selectedPurchase}
        updatePurchase={updatePurchase}
        unapprovePurchase={unapprovePurchase}
      />
      <CustomContainer
        title="All Purchases"
        filledHeader
        rightSection={
          <Button colorScheme="purple" onClick={exportData} size="sm">
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
            isChecked={checkedFilters.isPushed}
            colorScheme="purple"
            onChange={(e) => handleCheckedFilters("isPushed", e.target.checked)}
          >
            Pushed to Tally
          </Checkbox>
        </Flex>

        {loading ? (
          <Text>Loading…</Text>
        ) : (
          <AgGrid
            rowData={filteredPurchases}
            columnDefs={columnDefs}
            tableKey="purchase-all"
            gridOptions={{
              getRowId: (params) => String(params.data?.purchase_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Purchase;
