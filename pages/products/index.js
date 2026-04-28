import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { useProducts } from "../../customHooks/useProducts";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, HStack } from "@chakra-ui/react";
import AgGrid from "../../components/AgGrid";
import usePermissions from "../../customHooks/usePermissions";
import ProductImageUploadCell from "../../components/ProductImageUploadCell";
import product from "../../helper/product";
import toast from "react-hot-toast";
import ImagesArchiveDownloadControl from "../../components/products/ImagesArchiveDownloadControl";

function Products() {
  const router = useRouter();
  const { query } = router;
  const gridRef = useRef(null);
  const { products, refetch } = useProducts({ limit: 10000, fetchAll: true });
  const canEdit = usePermissions("edit_products");
  const canSync = usePermissions("allow_product_sync");
  const canViewImageDownloadLog = usePermissions("view_images_download_log");
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await product.sync();
      const detail =
        res?.productsProcessed != null
          ? ` (${res.productsProcessed} products, ${
              res.categoriesProcessed ?? 0
            } categories)`
          : "";
      toast.success(`${res?.msg || "Sync completed"}${detail}`);
      refetch();
    } catch (err) {
      toast.error(err?.message || "Product sync failed");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    const distributor = query.distributor;
    if (
      !distributor ||
      typeof distributor !== "string" ||
      !gridRef.current?.api ||
      !Array.isArray(products) ||
      products.length === 0
    )
      return;
    gridRef.current.api.setFilterModel({
      de_distributor: {
        filterType: "text",
        type: "equals",
        filter: distributor,
      },
    });
    gridRef.current.api.onFilterChanged();
  }, [products, query.distributor]);

  const rightSection = canSync || canViewImageDownloadLog ? (
    <HStack spacing={2}>
      {canSync ? (
        <Button
          colorScheme="purple"
          size="sm"
          onClick={handleSync}
          isLoading={syncing}
          leftIcon={<i className="fa fa-sync-alt" />}
        >
          Sync
        </Button>
      ) : null}
      {canViewImageDownloadLog ? <ImagesArchiveDownloadControl /> : null}
    </HStack>
  ) : null;

  const colDefs = [
    {
      field: "product_id",
      headerName: "ID",
      type: "id",
    },
    {
      field: "image_url",
      headerName: "Image",
      type: "image",
    },
    {
      field: "gf_item_name",
      headerName: "Name",
      type: "capitalized",
      flex: 2,
    },
    {
      field: "de_display_name",
      hideByDefault: true,
      headerName: "Delium Name",
      type: "capitalized",
      flex: 2,
    },
    {
      field: "non_offer_stock",
      hideByDefault: true,
      headerName: "NOS",
      type: "number",
      filter: false,
    },
    {
      field: "offer_stock",
      hideByDefault: true,
      headerName: "OS",
      type: "number",
      filter: false,
    },
    {
      field: "de_distributor",
      headerName: "Distributor",
      type: "capitalized",
      flex: 2,
    },
    {
      field: "has_images",
      headerName: "Has Image",
      type: "badge-column",
      width: "auto",
      valueGetter: (props) =>
        props.data.has_images
          ? { label: "Yes", colorScheme: "green" }
          : { label: "No", colorScheme: "red" },
    },
    {
      field: "images",
      headerName: "Upload Images",
      filter: false,
      minWidth: 140,
      hideExport: true,
      cellRenderer: (props) => {
        if (!canEdit) return <span>-</span>;
        return (
          <ProductImageUploadCell
            value={props.value}
            data={props.data}
            api={props.api}
          />
        );
      },
    },
    {
      field: "product_id",
      headerName: "Action",
      type: "action-icons",
      valueGetter: (props) => {
        const menu = [
          {
            label: "View",
            iconType: "view",
            redirectionUrl: `/products/view?id=${props.data.product_id}`,
          },
        ];

        if (canEdit) {
          menu.push({
            label: "Edit",
            iconType: "edit",
            redirectionUrl: `/products/edit?id=${props.data.product_id}`,
          });
        }

        return menu;
      },
    },
  ];

  return (
    <GlobalWrapper title="Products" permissionKey="view_products">
      <CustomContainer
        title="Products"
        filledHeader
        rightSection={rightSection}
      >
        <AgGrid
          ref={gridRef}
          rowData={products}
          colDefs={colDefs}
          tableKey="products"
          gridOptions={{
            getRowId: (params) => params.data.product_id,
          }}
        />
      </CustomContainer>

    </GlobalWrapper>
  );
}

export default Products;
