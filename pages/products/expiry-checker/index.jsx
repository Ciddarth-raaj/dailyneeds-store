import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useProductsExpiryCheckers } from "../../../customHooks/useProductsExpiryCheckers";
import useOutlets from "../../../customHooks/useOutlets";
import usePermissions from "../../../customHooks/usePermissions";
import toast from "react-hot-toast";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import ExpiryCheckerItemDrawer from "../../../components/products-expiry-checker/ExpiryCheckerItemDrawer";

function ExpiryCheckerListing() {
  const router = useRouter();
  const canAdd = usePermissions("add_expiry_checker");
  const { expiryCheckers, loading, deleteProductsExpiryChecker, refetch } =
    useProductsExpiryCheckers();
  const { outlets } = useOutlets({ skipIds: [1] });
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const [itemDrawerRow, setItemDrawerRow] = useState(null);

  const openItemDrawer = useCallback((row) => setItemDrawerRow(row), []);
  const closeItemDrawer = useCallback(() => setItemDrawerRow(null), []);

  const totalBranches = useMemo(() => {
    const list = Array.isArray(outlets) ? outlets : outlets?.data;
    return Array.isArray(list) ? list.length : 0;
  }, [outlets]);

  const colDefs = useMemo(
    () => [
      {
        field: "products_expiry_checker_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "product_id",
        headerName: "PID",
        type: "id",
      },
      {
        field: "product.gf_item_name",
        headerName: "Product",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "expiry_date",
        headerName: "Expiry Date",
        type: "date",
      },
      {
        field: "ref_file",
        headerName: "Ref File",
        valueGetter: (params) => {
          const url = params.data?.ref_file;
          return url ? "Yes" : "-";
        },
        hideByDefault: true,
      },
      {
        field: "branches",
        headerName: "Branches",
        valueGetter: (params) => {
          const row = params.data;
          const filled = (row?.items || []).length;
          return `${filled}/${totalBranches}`;
        },
      },
      {
        field: "created_at",
        headerName: "Created At",
        type: "datetime",
        hideByDefault: true,
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const id = params.data?.products_expiry_checker_id;
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/products/expiry-checker/view?id=${id}`,
            },
            {
              label: "Add / Edit qty",
              icon: "fa-solid fa-plus-circle",
              colorScheme: "purple",
              onClick: () => openItemDrawer(params.data),
            },
          ];
          if (canAdd) {
            actions.push({
              label: "Delete",
              icon: "fa-solid fa-trash",
              colorScheme: "red",
              onClick: () =>
                confirmDelete({
                  title: "Delete expiry checker",
                  message: `Are you sure you want to delete expiry checker #${id}?`,
                  onConfirm: async () => {
                    await deleteProductsExpiryChecker(id);
                    toast.success("Expiry checker deleted");
                  },
                }),
            });
          }
          return actions;
        },
      },
    ],
    [
      totalBranches,
      canAdd,
      confirmDelete,
      deleteProductsExpiryChecker,
      openItemDrawer,
    ]
  );

  return (
    <GlobalWrapper title="Expiry Checker" permissionKey="view_expiry_checker">
      <ConfirmDeleteDialog />
      <ExpiryCheckerItemDrawer
        isOpen={itemDrawerRow != null}
        onClose={closeItemDrawer}
        row={itemDrawerRow}
        refetch={refetch}
      />
      <CustomContainer
        title="Expiry Checker"
        filledHeader
        rightSection={
          canAdd ? (
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/products/expiry-checker/create")}
            >
              Add
            </Button>
          ) : null
        }
      >
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={expiryCheckers}
            columnDefs={colDefs}
            tableKey="expiry-checker-list"
            gridOptions={{
              getRowId: (params) => params.data?.products_expiry_checker_id,
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ExpiryCheckerListing;
