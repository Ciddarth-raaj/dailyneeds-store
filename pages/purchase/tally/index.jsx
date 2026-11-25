import React, { useCallback, useMemo, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import GstModuleWrapper from "../../../components/gst/GstModuleWrapper";
import { ModuleTableThemeProvider } from "../../../contexts/ModuleTableThemeContext";
import { usePurchaseGst } from "../../../customHooks/usePurchaseGst";
import moment from "moment";
import currencyFormatter from "../../../util/currencyFormatter";
import { Button } from "@chakra-ui/button";
import { Flex, Input, Text } from "@chakra-ui/react";
import toast from "react-hot-toast";

import PurchaseModal from "../../../components/Purchase/PurchaseModal";
import { useUser } from "../../../contexts/UserContext";
import FromToDateOutletPicker from "../../../components/DateOutletPicker/FromToDateOutletPicker";
import { exportToExcel } from "../../../util/exportCSVFile";
import { getPurchaseTotalTax } from "../../../util/gstr2aPurchaseRegister";
import {
  bulkDeletePurchaseGst,
  deletePurchaseGst,
} from "../../../helper/purchaseGst";
import { capitalize } from "../../../util/string";

function getSourceBadge(item) {
  const source = item?.source;
  if (!source) return null;
  if (source === "tally") {
    return { label: "Tally", colorScheme: "blue" };
  }
  if (source === "system") {
    return { label: "System", colorScheme: "purple" };
  }
  return { label: capitalize(String(source)), colorScheme: "gray" };
}

function getSourceLabel(item) {
  return getSourceBadge(item)?.label ?? "";
}

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
  const [deleting, setDeleting] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const { userConfig } = useUser();

  const canDelete = useMemo(
    () =>
      Array.isArray(userConfig?.permissions) &&
      userConfig.permissions.some(
        (p) => p?.permission_key === "delete_tally_purchases"
      ),
    [userConfig]
  );

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

  const {
    purchaseGst,
    loading,
    fetchPurchaseGstById,
    refetch,
  } = usePurchaseGst(filters);

  const filteredPurchases = useMemo(() => {
    if (!search.trim()) return purchaseGst ?? [];

    const searchLower = search.toLowerCase();
    return (purchaseGst ?? []).filter((item) => {
      const fields = [
        item.mmh_mrc_refno,
        item.supplier_name,
        item.supplier_gstn,
        item.source,
        getSourceLabel(item),
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

  const handleDelete = useCallback(
    async (row) => {
      const id = row?.gst_tally_purchase_id;
      if (id == null) return;

      const label = [row.mmh_mrc_refno, row.supplier_name]
        .filter(Boolean)
        .join(" - ");
      const ok = window.confirm(
        `Delete ${label || "this purchase"}? It is removed from this list along ` +
          `with any GSTR-2A match against it. Tally is not touched - if the ` +
          `voucher still exists there, the next sync brings it back.`
      );
      if (!ok) return;

      setDeleting(true);
      try {
        const data = await deletePurchaseGst(id);
        if (data?.code !== 200) {
          toast.error(data?.msg || "Could not delete");
          return;
        }
        await refetch(true);
        setSelectedRows([]);
        toast.success("Deleted");
      } catch (e) {
        toast.error(e?.message || "Could not delete");
      } finally {
        setDeleting(false);
      }
    },
    [refetch]
  );

  const handleSelectionChanged = useCallback((rows) => {
    setSelectedRows(Array.isArray(rows) ? rows : []);
  }, []);

  /** Only what Tally owns can go, so only those rows can be ticked. */
  const isRowSelectable = useCallback(
    (node) => canDelete && node?.data?.source === "tally",
    [canDelete]
  );

  const handleBulkDelete = useCallback(async () => {
    const ids = selectedRows
      .map((r) => r?.gst_tally_purchase_id)
      .filter((id) => id != null);
    if (!ids.length) return;

    const ok = window.confirm(
      `Delete ${ids.length} purchase${ids.length === 1 ? "" : "s"}? They are ` +
        `removed from this list along with any GSTR-2A match against them. ` +
        `Tally is not touched - any voucher that still exists there comes ` +
        `back on the next sync.`
    );
    if (!ok) return;

    setDeleting(true);
    try {
      const data = await bulkDeletePurchaseGst(ids);
      if (data?.code !== 200) {
        toast.error(data?.msg || "Could not delete");
        return;
      }
      await refetch(true);
      setSelectedRows([]);
      const skipped = (data.skipped ?? []).length;
      toast.success(
        `Deleted ${data.deleted}` +
          (skipped ? `. ${skipped} skipped - not synced from Tally.` : "")
      );
    } catch (e) {
      toast.error(e?.message || "Could not delete");
    } finally {
      setDeleting(false);
    }
  }, [selectedRows, refetch]);

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
        colId: "source",
        headerName: "Source",
        type: "badge-column",
        minWidth: 110,
        valueGetter: (params) => getSourceBadge(params.data),
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
        colId: "totalTax",
        headerName: "Total Tax",
        type: "currency",
        sortable: true,
        minWidth: 120,
        // IGST for an interstate supplier, CGST + SGST otherwise - the same
        // figure the GSTR-2A pages compare against, so the two agree.
        valueGetter: (params) =>
          params.data ? getPurchaseTotalTax(params.data) : null,
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
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              colorScheme: "blue",
              onClick: () => handleView(item),
            },
          ];

          // A system row is the snapshot of a purchase in our own system;
          // only what Tally owns can be removed from here.
          if (canDelete && item.source === "tally") {
            actions.push({
              label: "Delete",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              onClick: () => handleDelete(item),
            });
          }

          return actions;
        },
      },
    ],
    [handleView, handleDelete, canDelete]
  );

  const exportData = useCallback(() => {
    const data = filteredPurchases.map((item) => ({
      "MRC Ref No": item.mmh_mrc_refno,
      "Supplier Name": item.supplier_name,
      GSTN: item.supplier_gstn,
      Source: getSourceLabel(item) || "-",
      "MRC Date": moment(item.mmh_mrc_dt).format("DD-MM-YYYY"),
      "Dist Bill Date": moment(item.mmh_dist_bill_dt).format("DD-MM-YYYY"),
      "Dist Bill No": item.mmh_dist_bill_no,
      "MRC Amount": currencyFormatter(item.mmh_mrc_amt),
      "Total Tax": currencyFormatter(getPurchaseTotalTax(item)),
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
      <GstModuleWrapper>
        <ModuleTableThemeProvider colorScheme="blue">
          <PurchaseModal
            isOpen={isOpen}
            onClose={onClose}
            item={selectedPurchase}
            readOnly
          />
          <CustomContainer
            title="All Tally Purchases"
            filledHeader
            colorScheme="blue"
            rightSection={
              <Flex gap={2}>
                {canDelete && selectedRows.length > 0 ? (
                  <Button
                    colorScheme="red"
                    variant="outline"
                    onClick={handleBulkDelete}
                    size="sm"
                    isLoading={deleting}
                  >
                    {`Delete selected (${selectedRows.length})`}
                  </Button>
                ) : null}
                <Button
                  colorScheme="blue"
                  onClick={exportData}
                  size="sm"
                  isDisabled={viewLoading || deleting}
                >
                  Export
                </Button>
              </Flex>
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
                selectMode={canDelete}
                isRowSelectable={isRowSelectable}
                onSelectionChanged={handleSelectionChanged}
                gridOptions={{
                  getRowId: (params) =>
                    String(params.data?.gst_tally_purchase_id ?? ""),
                }}
              />
            )}
          </CustomContainer>
        </ModuleTableThemeProvider>
      </GstModuleWrapper>
    </GlobalWrapper>
  );
}

export default AllTallyPurchases;
