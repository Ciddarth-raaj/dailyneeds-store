import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import { useStockCheckers } from "../../customHooks/useStockCheckers";
import useOutlets from "../../customHooks/useOutlets";
import usePermissions from "../../customHooks/usePermissions";
import toast from "react-hot-toast";
import moment from "moment";
import { useConfirmDelete } from "../../customHooks/useConfirmDelete";
import StockCheckerItemDrawer from "../../components/stock-checker/StockCheckerItemDrawer";

function StockCheckerListing() {
  const router = useRouter();
  const canAdd = usePermissions("add_stock_checker");
  const { stockCheckers, loading, deleteStockChecker, refetch } =
    useStockCheckers();
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
        field: "stock_checker_id",
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
        field: "created_by_employee",
        headerName: "Created By",
        valueGetter: (params) =>
          params.data?.created_by_employee?.employee_name,
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
          const id = params.data?.stock_checker_id;
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/stock-checker/view?id=${id}`,
            },
            {
              label: "Add / Edit stock",
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
                  title: "Delete stock checker",
                  message: `Are you sure you want to delete stock checker #${id}?`,
                  onConfirm: async () => {
                    await deleteStockChecker(id);
                    toast.success("Stock checker deleted");
                  },
                }),
            });
          }
          return actions;
        },
      },
    ],
    [totalBranches, canAdd, confirmDelete, deleteStockChecker, openItemDrawer]
  );

  return (
    <GlobalWrapper title="Stock Checker" permissionKey="view_stock_checker">
      <ConfirmDeleteDialog />
      <StockCheckerItemDrawer
        isOpen={itemDrawerRow != null}
        onClose={closeItemDrawer}
        row={itemDrawerRow}
        refetch={refetch}
      />
      <CustomContainer
        title="Stock Checker"
        filledHeader
        rightSection={
          canAdd ? (
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/stock-checker/create")}
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
            rowData={stockCheckers}
            columnDefs={colDefs}
            tableKey="stock-checker-list"
            gridOptions={{
              getRowId: (params) => params.data?.stock_checker_id,
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockCheckerListing;
