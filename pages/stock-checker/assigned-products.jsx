import React, { useMemo, useState, useCallback, useRef } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import { useStockCheckers } from "../../customHooks/useStockCheckers";
import useOutlets from "../../customHooks/useOutlets";
import { useUser } from "../../contexts/UserContext";
import StockCheckerItemDrawer from "../../components/stock-checker/StockCheckerItemDrawer";
import { createOrUpdateStockCheckerItem } from "../../helper/stockChecker";
import toast from "react-hot-toast";

function AssignedProductsPage() {
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets({ skipIds: [1] });
  const { stockCheckers, loading, refetch } = useStockCheckers();
  const [drawerState, setDrawerState] = useState({
    row: null,
    preselectedBranchId: null,
  });
  const [editRowId, setEditRowId] = useState(null);
  const [saving, setSaving] = useState(false);
  const editInputRefs = useRef({ physical: null, system: null });

  const openItemDrawer = useCallback((stockCheckerRow, branchId) => {
    setDrawerState({ row: stockCheckerRow, preselectedBranchId: branchId });
  }, []);
  const closeItemDrawer = useCallback(() => {
    setDrawerState({ row: null, preselectedBranchId: null });
  }, []);

  const enterEditMode = useCallback((row) => {
    setEditRowId(row.id);
  }, []);

  const exitEditMode = useCallback(() => {
    setEditRowId(null);
  }, []);

  const handleSave = useCallback(
    async (rowData) => {
      if (!rowData?._stockChecker) return;
      const physicalVal = editInputRefs.current.physical?.value ?? "";
      const systemVal = editInputRefs.current.system?.value ?? "";
      setSaving(true);
      try {
        await createOrUpdateStockCheckerItem({
          stock_checker_id: rowData._stockChecker.stock_checker_id,
          branch_id: rowData._branchId,
          physical_stock: Number(physicalVal) || 0,
          system_stock: Number(systemVal) || 0,
        });
        toast.success("Saved");
        refetch();
        exitEditMode();
      } catch (err) {
        toast.error(err?.message || "Failed to save");
      } finally {
        setSaving(false);
      }
    },
    [refetch, exitEditMode]
  );

  const branchesForUser = useMemo(() => {
    const list = Array.isArray(outlets) ? outlets : outlets?.data;
    const all = Array.isArray(list) ? list : [];
    if (storeId != null && storeId !== "") {
      return all.filter((o) => String(o.outlet_id ?? o.id) === String(storeId));
    }
    return all;
  }, [outlets, storeId]);

  const rowData = useMemo(() => {
    const rows = [];
    const list = Array.isArray(stockCheckers) ? stockCheckers : [];
    for (const sc of list) {
      const itemsByBranchId = {};
      (sc?.items ?? []).forEach((it) => {
        const key = it.branch_id ?? it.branch?.outlet_id;
        if (key != null) itemsByBranchId[key] = it;
      });
      for (const outlet of branchesForUser) {
        const branchId = outlet.outlet_id ?? outlet.id;
        const item = itemsByBranchId[branchId];
        const productId = sc.product_id ?? sc.product?.product_id;
        rows.push({
          id: `${sc.stock_checker_id}-${branchId}`,
          _stockChecker: sc,
          _branchId: branchId,
          productId,
          productName:
            sc.product?.de_display_name ||
            sc.product?.gf_item_name ||
            `Product ${sc.product_id ?? sc.stock_checker_id}`,
          branchName: outlet.outlet_name ?? outlet.name ?? "-",
          physical_stock:
            item?.physical_stock != null ? item.physical_stock : "",
          system_stock: item?.system_stock != null ? item.system_stock : "",
        });
      }
    }
    return rows;
  }, [stockCheckers, branchesForUser]);

  const colDefs = useMemo(
    () => [
      {
        field: "productId",
        headerName: "ID",
        type: "id",
      },
      {
        field: "productName",
        headerName: "Product",
        flex: 2,
      },
      {
        field: "branchName",
        headerName: "Branch name",
        flex: 2,
      },
      {
        field: "system_stock",
        headerName: "Sys. stock",
        width: 120,
        cellStyle: {
          padding: 0,
        },
        cellRenderer: (params) => {
          const data = params.data;
          const isEditing = data && editRowId === data.id;
          if (isEditing) {
            const defaultValue =
              data.system_stock !== "" && data.system_stock != null
                ? String(data.system_stock)
                : "";
            return (
              <input
                ref={(el) => (editInputRefs.current.system = el)}
                style={{
                  height: "100%",
                  width: "100%",
                  padding: "0 10px",
                }}
                placeholder="0"
                min={0}
                type="number"
                defaultValue={defaultValue}
              />
            );
          }
          const v = data?.system_stock;
          return v !== "" && v != null ? String(v) : "—";
        },
      },
      {
        field: "physical_stock",
        headerName: "Phy. stock",
        width: 120,
        cellStyle: {
          padding: 0,
        },
        cellRenderer: (params) => {
          const data = params.data;
          const isEditing = data && editRowId === data.id;
          if (isEditing) {
            const defaultValue =
              data.physical_stock !== "" && data.physical_stock != null
                ? String(data.physical_stock)
                : "";
            return (
              <input
                ref={(el) => (editInputRefs.current.physical = el)}
                style={{
                  height: "100%",
                  width: "100%",
                  padding: "0 10px",
                }}
                placeholder="0"
                min={0}
                type="number"
                defaultValue={defaultValue}
              />
            );
          }
          const v = data?.physical_stock;
          return v !== "" && v != null ? String(v) : "—";
        },
      },
      {
        field: "difference",
        headerName: "Difference",
        width: 120,
        cellRenderer: (params) => {
          const data = params.data;
          return data?.system_stock - data?.physical_stock;
        },
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const data = params.data;
          if (!data?._stockChecker) return [];
          const isEditing = editRowId === data.id;
          if (isEditing) {
            return [
              {
                label: "Save",
                icon: "fa-solid fa-check",
                colorScheme: "green",
                onClick: () => handleSave(data),
              },
              {
                label: "Close",
                icon: "fa-solid fa-times",
                colorScheme: "red",
                onClick: () => exitEditMode(),
              },
            ];
          }
          return [
            {
              label: "Edit",
              icon: "fa-solid fa-pen",
              colorScheme: "purple",
              onClick: () => enterEditMode(data),
            },
          ];
        },
      },
    ],
    [editRowId, enterEditMode, exitEditMode, handleSave]
  );

  const handleCellDoubleClick = useCallback(
    (event) => {
      const colId = event.column?.colId ?? event.column?.getColId?.();
      if (colId === "physical_stock" || colId === "system_stock") {
        if (event.data) enterEditMode(event.data);
      }
    },
    [enterEditMode]
  );

  return (
    <GlobalWrapper
      title="Assigned Products"
      permissionKey="view_assigned_products"
    >
      <StockCheckerItemDrawer
        isOpen={drawerState.row != null}
        onClose={closeItemDrawer}
        row={drawerState.row}
        refetch={refetch}
        preselectedBranchId={drawerState.preselectedBranchId}
      />
      <CustomContainer title="Assigned Products" filledHeader>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={rowData}
            columnDefs={colDefs}
            tableKey="assigned-products-list"
            gridOptions={{
              getRowId: (params) => params.data?.id,
              onCellDoubleClicked: handleCellDoubleClick,
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AssignedProductsPage;
