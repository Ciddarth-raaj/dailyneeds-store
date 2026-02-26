import React, { useMemo, useCallback, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text, Button, Flex } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { usePurchaseAcknowledgements } from "../../../customHooks/usePurchaseAcknowledgements";
import { usePurchaseAcknowledgementPrint } from "../../../customHooks/usePurchaseAcknowledgementPrint";
import usePermissions from "../../../customHooks/usePermissions";
import ConfirmDeleteModal from "../../../components/ConfirmDeleteModal";
import toast from "react-hot-toast";
import { useRouter } from "next/router";

function PurchaseAckListing() {
  const router = useRouter();
  const canAdd = usePermissions("add_purchase_acknowledgement");
  const { purchaseAcknowledgements, loading, remove, refetch } =
    usePurchaseAcknowledgements();
  const { print: printAcknowledgement, download: downloadAcknowledgementPdf } =
    usePurchaseAcknowledgementPrint();
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = useCallback((row) => {
    setDeleteItem(row);
  }, []);

  const handleDeleteClose = useCallback(() => {
    if (!deleting) setDeleteItem(null);
  }, [deleting]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteItem?.purchase_acknowledgement_id) return;
    setDeleting(true);
    try {
      await remove(deleteItem.purchase_acknowledgement_id);
      toast.success("Deleted");
      setDeleteItem(null);
    } catch (err) {
      toast.error(err.message || "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }, [deleteItem, remove]);

  const colDefs = useMemo(
    () => [
      {
        field: "purchase_acknowledgement_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "distributor_id",
        headerName: "Distributor ID",
        type: "id",
        hideByDefault: true,
      },
      {
        field: "distributor_name",
        headerName: "Distributor",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "invoices",
        headerName: "Invoices",
        type: "number",
        valueGetter: (params) => {
          const invoices = params.data?.invoices;
          return Array.isArray(invoices) ? invoices.length : 0;
        },
      },
      {
        field: "invoices_total_amount",
        headerName: "Total Amount",
        type: "currency",
        valueGetter: (params) => {
          const invoices = params.data?.invoices;
          if (!Array.isArray(invoices)) return null;
          return invoices.reduce(
            (sum, inv) => sum + (Number(inv?.amount) || 0),
            0
          );
        },
      },
      {
        field: "purchase_acknowledgement_id",
        type: "action-icons",
        headerName: "Action",
        minWidth: 150,
        maxWidth: 150,
        width: 150,
        valueGetter: (params) => {
          const row = params.data;
          const id = row?.purchase_acknowledgement_id;
          const actions = [
            {
              label: "Print",
              icon: "fa-solid fa-print",
              colorScheme: "blue",
              onClick: () => printAcknowledgement(row),
            },
            {
              label: "Download",
              icon: "fa-solid fa-file-pdf",
              colorScheme: "red",
              onClick: () => downloadAcknowledgementPdf(row),
            },
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/purchase/purchase-acknowledgement/view?id=${encodeURIComponent(
                id
              )}`,
            },
          ];
          if (canAdd) {
            actions.push({
              label: "Edit",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/purchase/purchase-acknowledgement/edit?id=${encodeURIComponent(
                id
              )}`,
            });
            actions.push({
              label: "Delete",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              onClick: () => handleDeleteClick(row),
            });
          }
          return actions;
        },
      },
    ],
    [
      canAdd,
      handleDeleteClick,
      printAcknowledgement,
      downloadAcknowledgementPdf,
    ]
  );

  return (
    <GlobalWrapper
      title="Purchase Acknowledgement"
      permissionKey="view_purchase_acknowledgement"
    >
      <ConfirmDeleteModal
        isOpen={deleteItem != null}
        onClose={handleDeleteClose}
        onConfirm={handleDeleteConfirm}
        isLoading={deleting}
        title="Delete Purchase Acknowledgement"
        body="Are you sure you want to delete this purchase acknowledgement?"
      />
      <CustomContainer
        title="Purchase Acknowledgement"
        filledHeader
        rightSection={
          canAdd && (
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() =>
                router.push("/purchase/purchase-acknowledgement/create")
              }
            >
              Add
            </Button>
          )
        }
      >
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={purchaseAcknowledgements}
            columnDefs={colDefs}
            tableKey="purchase-acknowledgement"
            gridOptions={{
              getRowId: (params) =>
                String(params.data?.purchase_acknowledgement_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseAckListing;
