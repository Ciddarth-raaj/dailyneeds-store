import React, { useCallback, useMemo, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import { usePurchaseGst } from "../../../customHooks/usePurchaseGst";
import moment from "moment";
import currencyFormatter from "../../../util/currencyFormatter";
import { Button } from "@chakra-ui/button";
import { Input, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";

import PurchaseModal from "../../../components/Purchase/PurchaseModal";
import FromToDateOutletPicker from "../../../components/DateOutletPicker/FromToDateOutletPicker";
import { exportToExcel } from "../../../util/exportCSVFile";

function AllTallyPurchases() {
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
  const [viewLoading, setViewLoading] = useState(false);

  const isOpen = selectedPurchase !== null;
  const onClose = () => setSelectedPurchase(null);

  const filters = useMemo(() => {
    const filterItem = {};

    const startOfDay = new Date(fromDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(toDate);
    endOfDay.setHours(23, 59, 59, 999);

    filterItem.from_date = startOfDay.toISOString();
    filterItem.to_date = endOfDay.toISOString();

    if (selectedOutlet) {
      filterItem.retail_outlet_id = selectedOutlet;
    }

    return filterItem;
  }, [selectedOutlet, fromDate, toDate]);

  const { purchaseGst, loading, fetchPurchaseGstById } = usePurchaseGst(filters);

  const filteredPurchases = useMemo(() => {
    if (!search.trim()) return purchaseGst ?? [];

    const searchLower = search.toLowerCase();
    return (purchaseGst ?? []).filter((item) => {
      const fields = [
        item.mmh_mrc_refno,
        item.supplier_name,
        item.supplier_gstn,
        item.master_id,
        item.mmh_dist_bill_no,
        item.outlet_name,
        item.mmh_mrc_dt,
        item.mmh_dist_bill_dt,
        item.mmh_mrc_amt,
        item.total_amount,
      ];
      return fields.some((value) =>
        String(value ?? "")
          .toLowerCase()
          .includes(searchLower)
      );
    });
  }, [purchaseGst, search]);

  const handleView = useCallback(
    async (row) => {
      const id = row?.gst_tally_purchase_id;
      if (id == null) {
        setSelectedPurchase(row);
        return;
      }
      setViewLoading(true);
      try {
        const detail = await fetchPurchaseGstById(id);
        setSelectedPurchase(detail ?? row);
      } catch (e) {
        toast.error(e?.message || "Failed to load purchase");
      } finally {
        setViewLoading(false);
      }
    },
    [fetchPurchaseGstById]
  );

  const columnDefs = useMemo(
    () => [
      {
        field: "mmh_mrc_refno",
        headerName: "MRC Ref No",
        filter: true,
        sortable: true,
        minWidth: 120,
      },
      {
        field: "supplier_name",
        headerName: "Supplier Name",
        type: "capitalized",
        filter: true,
        sortable: true,
        minWidth: 160,
      },
      {
        field: "supplier_gstn",
        headerName: "GSTN",
        filter: true,
        sortable: true,
        minWidth: 150,
      },
      {
        field: "mmh_mrc_dt",
        headerName: "MRC Date",
        type: "date",
        sortable: true,
        minWidth: 118,
      },
      {
        field: "mmh_dist_bill_dt",
        headerName: "Dist Bill Date",
        type: "date",
        sortable: true,
        minWidth: 130,
      },
      {
        field: "mmh_dist_bill_no",
        headerName: "Dist Bill No",
        filter: true,
        sortable: true,
        minWidth: 130,
      },
      {
        field: "mmh_mrc_amt",
        headerName: "MRC Amount",
        type: "currency",
        sortable: true,
        minWidth: 120,
      },
      {
        field: "total_amount",
        headerName: "Total Amount",
        type: "currency",
        sortable: true,
        minWidth: 120,
      },
      {
        field: "master_id",
        headerName: "Master ID",
        filter: true,
        sortable: true,
        minWidth: 140,
        hideByDefault: true,
      },
      {
        field: "outlet_name",
        headerName: "Outlet",
        type: "capitalized",
        filter: true,
        sortable: true,
        minWidth: 130,
        hideByDefault: true,
      },
      {
        field: "gst_tally_purchase_id",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const item = params.data;
          if (!item) return [];
          return [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              colorScheme: "purple",
              onClick: () => handleView(item),
            },
          ];
        },
      },
    ],
    [handleView]
  );

  const exportData = useCallback(() => {
    const data = filteredPurchases.map((item) => ({
      "MRC Ref No": item.mmh_mrc_refno,
      "Supplier Name": item.supplier_name,
      GSTN: item.supplier_gstn,
      "MRC Date": moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
      "Dist Bill Date": moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY"),
      "Dist Bill No": item.mmh_dist_bill_no,
      "MRC Amount": currencyFormatter(item.mmh_mrc_amt),
      "Total Amount": item.total_amount
        ? currencyFormatter(item.total_amount)
        : "-",
      "Master ID": item.master_id,
      Outlet: item.outlet_name ?? "",
    }));

    exportToExcel(
      [data],
      ["Tally Purchases"],
      `tally-purchase-${moment(fromDate).format("DD/MM/YYYY")}-${moment(
        toDate
      ).format("DD/MM/YYYY")}.xlsx`
    );
  }, [filteredPurchases, fromDate, toDate]);

  return (
    <GlobalWrapper
      title="All Tally Purchases"
      permissionKey="view_tally_purchases"
    >
      <PurchaseModal
        isOpen={isOpen}
        onClose={onClose}
        item={selectedPurchase}
        readOnly
      />
      <CustomContainer
        title="All Tally Purchases"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            onClick={exportData}
            size="sm"
            isDisabled={viewLoading}
          >
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

        {loading || viewLoading ? (
          <Text>Loading…</Text>
        ) : (
          <AgGrid
            rowData={filteredPurchases}
            columnDefs={columnDefs}
            tableKey="purchase-tally-all"
            gridOptions={{
              getRowId: (params) =>
                String(params.data?.gst_tally_purchase_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AllTallyPurchases;
