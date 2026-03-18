import React, { useMemo } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import Link from "next/link";
import AgGrid from "../../components/AgGrid";
import useStockTransfer from "../../customHooks/useStockTransfer";
import usePermissions from "../../customHooks/usePermissions";
import { useConfirmDelete } from "../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import stoCheck from "../../helper/stoCheck";

/**
 * Same aggregation as buildRowsFromTransfers in [mode].jsx: per-article dbQuantity from items,
 * quantity from file_items. Difference = dbQuantity - quantity; "has difference" when !== 0.
 */
function computeRowFromTransfer(transfer) {
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

  (transfer.file_items || []).forEach((fi) => {
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
  const totalFileItems = (transfer.file_items || []).length;
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
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { transfers, loading, refetch } = useStockTransfer({
    is_checked: true,
  });

  const rowData = useMemo(() => {
    return (transfers || []).map(computeRowFromTransfer);
  }, [transfers]);

  const colDefs = useMemo(
    () => [
      { field: "dn_no", headerName: "DN No" },
      { field: "dn_ref_no", headerName: "DN Ref No" },
      { field: "_raw.Cust_Name", headerName: "To Branch" },
      { field: "_raw.DN_date", headerName: "DN Date", type: "date" },
      { field: "total_items", headerName: "Total Items" },
      { field: "missing_items", headerName: "Missing Items" },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const dnRefNo = row.dn_ref_no;
          const actions = [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: `/sto/view?id=${dnRefNo}`,
            },
            {
              label: "Edit",
              iconType: "edit",
              redirectionUrl: `/sto/edit?id=${dnRefNo}`,
            },
          ];

          if (canAdd) {
            actions.push({
              label: "Delete",
              iconType: "delete",
              colorScheme: "red",
              onClick: () =>
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
    [confirmDelete, refetch, canAdd]
  );

  return (
    <GlobalWrapper title="Stock Transfer Out" permissionKey="view_sto">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Stock Transfer Out"
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
          <AgGrid rowData={rowData} columnDefs={colDefs} tableKey="sto-list" />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default STOListing;
