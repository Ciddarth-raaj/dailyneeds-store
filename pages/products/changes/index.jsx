import React, { useCallback, useMemo, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import AgGrid from "../../../components/AgGrid";
import { useProductsChanges } from "../../../customHooks/useProductsChanges";
import ProductChangeViewDrawer from "../../../components/products-changes/ProductChangeViewDrawer";

function ProductChangesPage() {
  const { data, refetch, approve } = useProductsChanges({
    limit: 100,
    offset: 0,
  });
  const [drawerRow, setDrawerRow] = useState(null);

  const openViewDrawer = useCallback((row) => setDrawerRow(row), []);
  const closeViewDrawer = useCallback(() => setDrawerRow(null), []);

  const colDefs = useMemo(
    () => [
      {
        field: "products_change_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "product_id",
        headerName: "Product ID",
        type: "capitalized",
        flex: 1,
      },
      {
        field: "is_approved",
        headerName: "Approved",
        type: "badge-column",
        width: "auto",
        valueGetter: (params) =>
          params.data?.is_approved
            ? { label: "Yes", colorScheme: "green" }
            : { label: "No", colorScheme: "orange" },
      },
      {
        field: "created_at",
        headerName: "Created At",
        type: "datetime",
        flex: 1,
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => [
          {
            label: "View",
            iconType: "view",
            onClick: () => openViewDrawer(params.data),
          },
        ],
      },
    ],
    [openViewDrawer]
  );

  return (
    <GlobalWrapper title="Product Changes" permissionKey="view_product_changes">
      <ProductChangeViewDrawer
        isOpen={drawerRow != null}
        onClose={closeViewDrawer}
        row={drawerRow}
        onApprove={approve}
        refetch={refetch}
      />
      <CustomContainer title="Product Changes" filledHeader>
        <AgGrid
          rowData={data}
          colDefs={colDefs}
          tableKey="product-changes"
          gridOptions={{
            getRowId: (params) =>
              String(params.data?.products_change_id ?? params.data?.id ?? ""),
          }}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default ProductChangesPage;
