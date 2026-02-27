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
  const gridRef = useRef(null);

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

  const getCurrentStockValues = useCallback(
    (rowData) => {
      const isEditingThisRow = editRowId === rowData?.id;
      if (isEditingThisRow) {
        return {
          physical_stock: Number(editInputRefs.current.physical?.value) || 0,
          system_stock: Number(editInputRefs.current.system?.value) || 0,
        };
      }
      return {
        physical_stock: Number(rowData?.physical_stock) || 0,
        system_stock: Number(rowData?.system_stock) || 0,
      };
    },
    [editRowId]
  );

  const handleSave = useCallback(
    async (rowData) => {
      if (!rowData?._stockChecker) return;
      const { physical_stock, system_stock } = getCurrentStockValues(rowData);
      setSaving(true);
      try {
        await createOrUpdateStockCheckerItem({
          stock_checker_id: rowData._stockChecker.stock_checker_id,
          branch_id: rowData._branchId,
          physical_stock,
          system_stock,
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
    [refetch, exitEditMode, getCurrentStockValues]
  );

  const handleVerify = useCallback(
    async (rowData) => {
      if (!rowData?._stockChecker) return;
      const { physical_stock, system_stock } = getCurrentStockValues(rowData);
      setSaving(true);
      try {
        await createOrUpdateStockCheckerItem({
          stock_checker_id: rowData._stockChecker.stock_checker_id,
          branch_id: rowData._branchId,
          physical_stock,
          system_stock,
          is_verified: true,
        });
        toast.success("Marked as verified");
        refetch();
        exitEditMode();
      } catch (err) {
        toast.error(err?.message || "Failed to verify");
      } finally {
        setSaving(false);
      }
    },
    [refetch, exitEditMode, getCurrentStockValues]
  );

  const handleUnverify = useCallback(
    async (rowData) => {
      if (!rowData?._stockChecker) return;
      const { physical_stock, system_stock } = getCurrentStockValues(rowData);
      setSaving(true);
      try {
        await createOrUpdateStockCheckerItem({
          stock_checker_id: rowData._stockChecker.stock_checker_id,
          branch_id: rowData._branchId,
          physical_stock,
          system_stock,
          is_verified: false,
        });
        toast.success("Marked as unverified");
        refetch();
        exitEditMode();
      } catch (err) {
        toast.error(err?.message || "Failed to unverify");
      } finally {
        setSaving(false);
      }
    },
    [refetch, exitEditMode, getCurrentStockValues]
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
          _item: item,
          productId,
          productName:
            sc.product?.gf_item_name ||
            sc.product?.de_display_name ||
            `Product ${sc.product_id ?? sc.stock_checker_id}`,
          branchName: outlet.outlet_name ?? outlet.name ?? "-",
          physical_stock:
            item?.physical_stock != null ? item.physical_stock : "",
          system_stock: item?.system_stock != null ? item.system_stock : "",
          is_verified: !!item?.is_verified,
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
        type: "capitalized",
      },
      {
        field: "branchName",
        headerName: "Branch name",
        flex: 1.5,
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
        headerName: "Diff.",
        width: 120,
        cellRenderer: (params) => {
          const data = params.data;
          return data?.system_stock - data?.physical_stock;
        },
      },
      {
        field: "is_verified",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.is_verified
            ? { label: "Verified", colorScheme: "green" }
            : { label: "Unverified", colorScheme: "gray" },
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
          const actions = [
            {
              label: "Edit",
              icon: "fa-solid fa-pen",
              colorScheme: "purple",
              onClick: () => enterEditMode(data),
            },
          ];

          const dataExists =
            data.physical_stock !== "" &&
            data.physical_stock != null &&
            data.system_stock !== "" &&
            data.system_stock != null;

          if (!data.is_verified) {
            actions.push({
              label: "Verify",
              icon: "fa-solid fa-circle-check",
              colorScheme: "green",
              onClick: () => handleVerify(data),
              disabled: !dataExists,
            });
          }
          if (data.is_verified) {
            actions.push({
              label: "Unverify",
              icon: "fa-solid fa-circle-xmark",
              colorScheme: "red",
              onClick: () => handleUnverify(data),
              disabled: !dataExists,
            });
          }
          return actions;
        },
      },
    ],
    [
      editRowId,
      enterEditMode,
      exitEditMode,
      handleSave,
      handleVerify,
      handleUnverify,
    ]
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

  const handleGridReady = useCallback((params) => {
    params.api?.applyColumnState?.({
      state: [{ colId: "is_verified", sort: "asc" }],
    });
  }, []);

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
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            tableKey="assigned-products-list"
            gridOptions={{
              getRowId: (params) => params.data?.id,
              onCellDoubleClicked: handleCellDoubleClick,
              onGridReady: handleGridReady,
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AssignedProductsPage;
