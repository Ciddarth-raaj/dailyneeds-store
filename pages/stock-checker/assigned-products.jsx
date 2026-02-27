import React, { useMemo, useState, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Text } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import { useStockCheckers } from "../../customHooks/useStockCheckers";
import useOutlets from "../../customHooks/useOutlets";
import { useUser } from "../../contexts/UserContext";
import StockCheckerItemDrawer from "../../components/stock-checker/StockCheckerItemDrawer";

function AssignedProductsPage() {
  const { storeId } = useUser().userConfig;
  const { outlets } = useOutlets();
  const { stockCheckers, loading, refetch } = useStockCheckers();
  const [drawerState, setDrawerState] = useState({
    row: null,
    preselectedBranchId: null,
  });

  const openItemDrawer = useCallback((stockCheckerRow, branchId) => {
    setDrawerState({ row: stockCheckerRow, preselectedBranchId: branchId });
  }, []);
  const closeItemDrawer = useCallback(() => {
    setDrawerState({ row: null, preselectedBranchId: null });
  }, []);

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
        rows.push({
          id: `${sc.stock_checker_id}-${branchId}`,
          _stockChecker: sc,
          _branchId: branchId,
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
        field: "physical_stock",
        headerName: "Phy. stock",
      },
      {
        field: "system_stock",
        headerName: "Sys. stock",
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const data = params.data;
          if (!data?._stockChecker) return [];
          return [
            {
              label: "Add / Edit stock",
              icon: "fa-solid fa-plus-circle",
              colorScheme: "purple",
              onClick: () => openItemDrawer(data._stockChecker, data._branchId),
            },
          ];
        },
      },
    ],
    [openItemDrawer]
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
            gridOptions={{ getRowId: (params) => params.data?.id }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default AssignedProductsPage;
