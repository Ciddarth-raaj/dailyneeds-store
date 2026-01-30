import React, { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { useProducts } from "../../customHooks/useProducts";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import AgGrid from "../../components/AgGrid";
import usePermissions from "../../customHooks/usePermissions";
import ProductImageUploadCell from "../../components/ProductImageUploadCell";

function Products() {
  const router = useRouter();
  const { query } = router;
  const gridRef = useRef(null);
  const { products } = useProducts({ limit: 10000, fetchAll: true });
  const canEdit = usePermissions("edit_products");

  useEffect(() => {
    const distributor = query.distributor;
    if (!distributor || typeof distributor !== "string" || !gridRef.current?.api || !Array.isArray(products) || products.length === 0) return;
    gridRef.current.api.setFilterModel({
      de_distributor: { filterType: "text", type: "equals", filter: distributor },
    });
    gridRef.current.api.onFilterChanged();
  }, [products, query.distributor]);

  const colDefs = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "de_display_name",
      headerName: "Name",
      type: "capitalized",
    },
    {
      field: "de_distributor",
      headerName: "Distributor",
      type: "capitalized",
    },
    {
      field: "has_images",
      headerName: "Has Image",
      type: "badge-column",
      valueGetter: (props) =>
        props.data.has_images
          ? { label: "Yes", colorScheme: "green" }
          : { label: "No", colorScheme: "red" },
    },
    {
      field: "images",
      headerName: "Upload Images",
      filter: false,
      cellRenderer: (props) => {
        if (!canEdit) return <span>-</span>;
        return <ProductImageUploadCell value={props.value} data={props.data} api={props.api} />;
      },
    },
    {
      field: "product_id",
      headerName: "Action",
      type: "action-column",
      valueGetter: (props) => {
        const menu = [
          {
            label: "View",
            redirectionUrl: `/products/view?id=${props.data.product_id}`,
          },
        ];

        if (canEdit) {
          menu.push({
            label: "Edit",
            redirectionUrl: `/products/edit?id=${props.data.product_id}`,
          });
        }

        return menu;
      },
    },
  ];

  return (
    <GlobalWrapper title="Products" permissionKey="view_products">
      <CustomContainer title="Products" filledHeader>
        <AgGrid
          ref={gridRef}
          rowData={products}
          colDefs={colDefs}
          gridOptions={{
            getRowId: (params) => params.data.product_id,
          }}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Products;
