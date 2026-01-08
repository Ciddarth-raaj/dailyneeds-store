import React from "react";
import { useProducts } from "../../customHooks/useProducts";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button } from "@chakra-ui/button";
import AgGrid from "../../components/AgGrid";
import usePermissions from "../../customHooks/usePermissions";

function Products() {
  const { products } = useProducts({ limit: 10000, fetchAll: true });
  const canEdit = usePermissions("edit_products");

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
        <AgGrid rowData={products} colDefs={colDefs} />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default Products;
