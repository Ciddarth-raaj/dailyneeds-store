import React, {
  useMemo,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import Link from "next/link";
import { Text, Flex, Box, Image, Button } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useProductsExpiryCheckers } from "../../../customHooks/useProductsExpiryCheckers";
import useOutlets from "../../../customHooks/useOutlets";
import { useUser } from "../../../contexts/UserContext";
import ExpiryCheckerItemDrawer from "../../../components/products-expiry-checker/ExpiryCheckerItemDrawer";
import { createOrUpdateExpiryCheckerItem } from "../../../helper/productsExpiryChecker";
import toast from "react-hot-toast";

function ExpiryAssignedProductsPage() {
  const router = useRouter();
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets({ skipIds: [1] });
  const { expiryCheckers, loading, refetch } = useProductsExpiryCheckers();
  const [drawerState, setDrawerState] = useState({
    row: null,
    preselectedBranchId: null,
  });
  const [editRowId, setEditRowId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [sortVerifiedToBottom, setSortVerifiedToBottom] = useState(true);
  const editInputRefs = useRef({ qty: null });
  const gridRef = useRef(null);

  useEffect(() => {
    if (!router.asPath.includes("expiry-checker/assigned-products")) {
      setSortVerifiedToBottom(true);
    }
  }, [router.asPath]);

  const openItemDrawer = useCallback((expiryCheckerRow, branchId) => {
    setDrawerState({ row: expiryCheckerRow, preselectedBranchId: branchId });
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

  const getCurrentQty = useCallback(
    (rowData) => {
      const isEditingThisRow = editRowId === rowData?.id;
      if (isEditingThisRow) {
        return Number(editInputRefs.current.qty?.value) || 0;
      }
      return Number(rowData?.qty) || 0;
    },
    [editRowId]
  );

  const handleSave = useCallback(
    async (rowData) => {
      if (!rowData?._checker) return;
      const qty = getCurrentQty(rowData);
      setSaving(true);
      try {
        await createOrUpdateExpiryCheckerItem({
          products_expiry_checker_id:
            rowData._checker.products_expiry_checker_id,
          branch_id: rowData._branchId,
          qty,
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
    [refetch, exitEditMode, getCurrentQty]
  );

  const handleVerify = useCallback(
    async (rowData) => {
      if (!rowData?._checker) return;
      const qty = getCurrentQty(rowData);
      setSaving(true);
      try {
        await createOrUpdateExpiryCheckerItem({
          products_expiry_checker_id:
            rowData._checker.products_expiry_checker_id,
          branch_id: rowData._branchId,
          qty,
          is_verified: true,
        });
        toast.success("Marked as verified");
        setSortVerifiedToBottom(false);
        refetch();
        exitEditMode();
      } catch (err) {
        toast.error(err?.message || "Failed to verify");
      } finally {
        setSaving(false);
      }
    },
    [refetch, exitEditMode, getCurrentQty]
  );

  const handleUnverify = useCallback(
    async (rowData) => {
      if (!rowData?._checker) return;
      const qty = getCurrentQty(rowData);
      setSaving(true);
      try {
        await createOrUpdateExpiryCheckerItem({
          products_expiry_checker_id:
            rowData._checker.products_expiry_checker_id,
          branch_id: rowData._branchId,
          qty,
          is_verified: false,
        });
        toast.success("Marked as unverified");
        setSortVerifiedToBottom(false);
        refetch();
        exitEditMode();
      } catch (err) {
        toast.error(err?.message || "Failed to unverify");
      } finally {
        setSaving(false);
      }
    },
    [refetch, exitEditMode, getCurrentQty]
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
    const list = Array.isArray(expiryCheckers) ? expiryCheckers : [];
    for (const ec of list) {
      const itemsByBranchId = {};
      (ec?.items ?? []).forEach((it) => {
        const key = it.branch_id ?? it.branch?.outlet_id;
        if (key != null) itemsByBranchId[key] = it;
      });
      for (const outlet of branchesForUser) {
        const branchId = outlet.outlet_id ?? outlet.id;
        const item = itemsByBranchId[branchId];
        const productId = ec.product_id ?? ec.product?.product_id;
        const product = ec.product;
        rows.push({
          id: `${ec.products_expiry_checker_id}-${branchId}`,
          _checker: ec,
          _branchId: branchId,
          _item: item,
          productId,
          productName:
            product?.gf_item_name ||
            product?.de_display_name ||
            `Product ${ec.product_id ?? ec.products_expiry_checker_id}`,
          image_url: product?.image_url,
          branchName: outlet.outlet_name ?? outlet.name ?? "-",
          expiry_date: ec.expiry_date ?? "",
          ref_file: ec.ref_file ?? "",
          qty: item?.qty != null ? item.qty : "",
          is_verified: !!item?.is_verified,
        });
      }
    }
    if (sortVerifiedToBottom) {
      rows.sort((a, b) => (a.is_verified ? 1 : 0) - (b.is_verified ? 1 : 0));
    }
    return rows;
  }, [expiryCheckers, branchesForUser, sortVerifiedToBottom]);

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
      },
      {
        field: "expiry_date",
        headerName: "Expiry Date",
        type: "date",
      },
      {
        field: "qty",
        headerName: "Qty",
        width: 120,
        cellStyle: { padding: 0 },
        cellRenderer: (params) => {
          const data = params.data;
          const isEditing = data && editRowId === data.id;
          if (isEditing) {
            const defaultValue =
              data.qty !== "" && data.qty != null ? String(data.qty) : "";
            return (
              <input
                ref={(el) => (editInputRefs.current.qty = el)}
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
          const v = data?.qty;
          return v !== "" && v != null ? String(v) : "—";
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
          if (!data?._checker) return [];
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
            {
              label: "Open file",
              icon: "fa-solid fa-external-link",
              colorScheme: "blue",
              redirectionUrl: data.ref_file,
              target: "_blank",
            },
            // {
            //   label: "Open drawer",
            //   icon: "fa-solid fa-external-link-alt",
            //   colorScheme: "blue",
            //   onClick: () => openItemDrawer(data._checker, data._branchId),
            // },
          ];
          if (!data.is_verified) {
            const hasData = data.qty !== "" && data.qty != null;
            actions.push({
              label: "Verify",
              icon: "fa-solid fa-circle-check",
              colorScheme: "green",
              onClick: () => handleVerify(data),
              disabled: !hasData,
            });
          }
          if (data.is_verified) {
            actions.push({
              label: "Unverify",
              icon: "fa-solid fa-circle-xmark",
              colorScheme: "red",
              onClick: () => handleUnverify(data),
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
      // openItemDrawer,
    ]
  );

  const handleCellDoubleClick = useCallback(
    (event) => {
      const colId = event.column?.colId ?? event.column?.getColId?.();
      if (colId === "qty") {
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
      title="Expiry Assigned Products"
      permissionKey="view_expiry_assigned_products"
    >
      <ExpiryCheckerItemDrawer
        isOpen={drawerState.row != null}
        onClose={closeItemDrawer}
        row={drawerState.row}
        refetch={refetch}
        preselectedBranchId={drawerState.preselectedBranchId}
      />
      <CustomContainer title="Expiry Assigned Products" filledHeader>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            ref={gridRef}
            rowData={rowData}
            columnDefs={colDefs}
            tableKey="expiry-assigned-products-list"
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

export default ExpiryAssignedProductsPage;
