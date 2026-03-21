import React, { useMemo, useState } from "react";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, Flex, Text } from "@chakra-ui/react";
import Link from "next/link";
import AgGrid from "../../components/AgGrid";
import STOMonthCalendar from "../../components/sto/STOMonthCalendar";
import useStockTransfer from "../../customHooks/useStockTransfer";
import usePermissions from "../../customHooks/usePermissions";
import { useConfirmDelete } from "../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import stoCheck from "../../helper/stoCheck";

/**
 * Same aggregation as buildRowsFromTransfers in [mode].jsx when file_items exist.
 * If there are no file_items, aggregated counts are stored as null (pending upload).
 */
function computeRowFromTransfer(transfer) {
  const fileItems = transfer.file_items || [];
  if (fileItems.length === 0) {
    return {
      dn_no: transfer.Dn_no,
      dn_ref_no: transfer.Dn_Ref_no,
      total_items: null,
      total_file_items: null,
      missing_items: null,
      _raw: transfer,
    };
  }

  const byArticleId = {};

  (transfer.items || []).forEach((item) => {
    const articleId = item.Item_Code;
    const dbQty = item.Item_qty != null ? Number(item.Item_qty) : null;
    if (byArticleId[articleId]) {
      byArticleId[articleId].dbQuantity += dbQty;
    } else {
      byArticleId[articleId] = { articleId, quantity: null, dbQuantity: dbQty };
    }
  });

  fileItems.forEach((fi) => {
    const articleId = fi.product_id;
    const fileQty = fi.file_qty != null ? Number(fi.file_qty) : null;
    if (byArticleId[articleId]) {
      const prev = byArticleId[articleId].quantity;
      byArticleId[articleId].quantity =
        prev != null && fileQty != null ? prev + fileQty : prev ?? fileQty;
    } else {
      byArticleId[articleId] = {
        articleId,
        quantity: fileQty,
        dbQuantity: null,
      };
    }
  });

  const rows = Object.values(byArticleId);
  const totalItems =
    transfer.Tot_Items != null ? Number(transfer.Tot_Items) : rows.length;
  const totalFileItems = fileItems.length;
  const missingItems = rows.filter((row) => {
    const diff = (row.dbQuantity ?? 0) - (row.quantity ?? 0);
    return diff !== 0;
  });

  return {
    dn_no: transfer.Dn_no,
    dn_ref_no: transfer.Dn_Ref_no,
    total_items: totalItems,
    total_file_items: totalFileItems,
    missing_items: missingItems.length,
    _raw: transfer,
  };
}

function STOListing() {
  const canAdd = usePermissions("add_sto");
  const canDelete = usePermissions("delete_sto");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  /** ON = all transfers (current behaviour). OFF = only is_checked === true (legacy list). */
  const [showAll, setShowAll] = useState(false);
  const { transfers, loading, refetch } = useStockTransfer({
    is_checked: showAll ? undefined : true,
  });

  const [selectedDate, setSelectedDate] = useState(() =>
    moment().format("YYYY-MM-DD")
  );
  const [viewingMonth, setViewingMonth] = useState(() =>
    moment().clone().startOf("month")
  );

  const transfersForSelectedDay = useMemo(() => {
    return (transfers || []).filter((t) => {
      if (!t?.DN_date) return false;
      return moment(t.DN_date).format("YYYY-MM-DD") === selectedDate;
    });
  }, [transfers, selectedDate]);

  const rowData = useMemo(() => {
    return transfersForSelectedDay.map(computeRowFromTransfer);
  }, [transfersForSelectedDay]);

  const colDefs = useMemo(
    () => [
      { field: "dn_no", headerName: "DN No" },
      { field: "dn_ref_no", headerName: "DN Ref No" },
      { field: "_raw.Cust_Name", headerName: "To Branch" },
      { field: "_raw.DN_date", headerName: "DN Date", type: "date" },
      {
        field: "total_items",
        headerName: "Total Items",
        valueFormatter: (params) =>
          params.value == null || params.value === ""
            ? "—"
            : String(params.value),
      },
      {
        field: "missing_items",
        headerName: "Missing Items",
        valueFormatter: (params) =>
          params.value == null || params.value === ""
            ? "—"
            : String(params.value),
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const dnRefNo = row.dn_ref_no;
          const fileItems = row._raw?.file_items || [];
          const unfilled = fileItems.length === 0;

          const actions = [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: unfilled
                ? undefined
                : `/sto/view?id=${encodeURIComponent(dnRefNo)}`,
              disabled: unfilled,
            },
            {
              label: "Edit",
              iconType: "edit",
              redirectionUrl: unfilled
                ? `/sto/create?id=${encodeURIComponent(dnRefNo)}`
                : `/sto/edit?id=${encodeURIComponent(dnRefNo)}`,
            },
          ];

          if (canDelete) {
            actions.push({
              label: "Delete",
              iconType: "delete",
              colorScheme: "red",
              disabled: unfilled,
              onClick: unfilled
                ? undefined
                : () =>
                    confirmDelete({
                      title: "Delete STO check",
                      message: `Are you sure you want to delete STO check for ref ${dnRefNo}?`,
                      onConfirm: async () => {
                        await stoCheck.deleteByRef(dnRefNo);
                        toast.success("STO check deleted");
                        refetch();
                      },
                    }),
            });
          }

          return actions;
        },
      },
    ],
    [confirmDelete, refetch, canDelete]
  );

  return (
    <GlobalWrapper title="Stock Transfer Out" permissionKey="view_sto">
      <ConfirmDeleteDialog />
      <Flex flexDirection="column" gap={6}>
        <STOMonthCalendar
          selectedDate={selectedDate}
          onSelectDate={setSelectedDate}
          transfersList={transfers || []}
          viewingMonth={viewingMonth}
          onViewingMonthChange={setViewingMonth}
          loading={loading}
          showAll={showAll}
          onShowAllChange={setShowAll}
        />

        <CustomContainer
          title={`Stock Transfer Out (${moment(selectedDate).format(
            "DD/MM/YYYY"
          )})`}
          filledHeader
          rightSection={
            canAdd ? (
              <Link href="/sto/create" passHref>
                <Button colorScheme="purple" size="sm" as="a">
                  Create
                </Button>
              </Link>
            ) : null
          }
        >
          {loading ? (
            <Text py={4} color="gray.600">
              Loading...
            </Text>
          ) : (
            <AgGrid
              rowData={rowData}
              columnDefs={colDefs}
              tableKey="sto-list"
            />
          )}
        </CustomContainer>
      </Flex>
    </GlobalWrapper>
  );
}

export default STOListing;
