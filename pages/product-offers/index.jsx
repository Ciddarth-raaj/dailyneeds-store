import React, { useMemo, useState, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, Text, Box, useDisclosure, Flex } from "@chakra-ui/react";
import Link from "next/link";
import AgGrid from "../../components/AgGrid";
import CustomModal from "../../components/CustomModal";
import useProductOffers from "../../customHooks/useProductOffers";
import { useProducts } from "../../customHooks/useProducts";
import usePermissions from "../../customHooks/usePermissions";
import { useConfirmDelete } from "../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import productOffers from "../../helper/productOffers";
import FileUploaderWithColumnMapping from "../../components/FileUploaderWithColumnMapping";

const IMPORT_COLUMN_CONFIG = [
  {
    key: "product_id",
    label: "Product ID",
    required: true,
    suggestedKey: "product_id",
    type: "number",
  },
  {
    key: "mrp",
    label: "MRP",
    required: true,
    suggestedKey: "mrp",
    type: "number",
  },
  {
    key: "selling_price",
    label: "Selling Price",
    required: true,
    suggestedKey: "selling_price",
    type: "number",
  },
];

function ProductOffersListing() {
  const canAdd = usePermissions("add_product_offers");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { offers, loading, refetch } = useProductOffers();
  const { getMappedProducts } = useProducts({ limit: 50000, fetchAll: true });
  const productsMap = useMemo(() => getMappedProducts(), [getMappedProducts]);
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();
  const [previewRows, setPreviewRows] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const previewTableRows = useMemo(() => {
    if (!previewRows.length) return [];
    return previewRows.map((row) => {
      const p =
        productsMap[row.product_id] ??
        productsMap[String(row.product_id)] ??
        productsMap[Number(row.product_id)];
      return {
        product_id: row.product_id,
        product_name: p?.gf_item_name ?? "-",
        image_url: p?.image_url ?? null,
        mrp: row.mrp,
        selling_price: row.selling_price,
      };
    });
  }, [previewRows, productsMap]);

  const handleToggleActive = useCallback(
    async (row) => {
      try {
        await productOffers.update(row.product_id, {
          is_active: !row.is_active,
        });
        toast.success(row.is_active ? "Offer deactivated" : "Offer activated");
        refetch();
      } catch (err) {
        toast.error(err?.message ?? "Update failed");
      }
    },
    [refetch]
  );

  const previewColDefs = useMemo(
    () => [
      { field: "product_id", headerName: "ID", type: "id" },
      { field: "image_url", headerName: "Image", type: "image" },
      { field: "product_name", headerName: "Product Name", flex: 2 },
      { field: "mrp", headerName: "MRP", type: "currency" },
      { field: "selling_price", headerName: "Selling Price", type: "currency" },
    ],
    []
  );

  const colDefs = useMemo(
    () => [
      { field: "product_id", headerName: "ID", type: "id" },
      { field: "gf_item_name", headerName: "Product Name", flex: 2 },
      { field: "mrp", headerName: "MRP", type: "currency" },
      { field: "selling_price", headerName: "Selling Price", type: "currency" },
      {
        field: "is_active",
        headerName: "Active",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.is_active
            ? { label: "Yes", colorScheme: "green" }
            : { label: "No", colorScheme: "red" },
      },
      {
        field: "created_at",
        headerName: "Created At",
        type: "datetime",
      },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const productId = row.product_id;
          const actions = [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: `/product-offers/view?product_id=${productId}`,
            },
            {
              label: "Edit",
              iconType: "edit",
              redirectionUrl: `/product-offers/edit?product_id=${productId}`,
            },
          ];
          if (canAdd) {
            actions.unshift({
              label: !row.is_active ? "Make Inactive" : "Make Active",
              icon: !row.is_active
                ? "fa-solid fa-toggle-off"
                : "fa-solid fa-toggle-on",
              colorScheme: !row.is_active ? "red" : "green",
              onClick: () => handleToggleActive(row),
            });
            actions.push({
              label: "Delete",
              iconType: "delete",
              colorScheme: "red",
              onClick: () =>
                confirmDelete({
                  title: "Delete offer",
                  message: `Delete offer for product ${
                    row.gf_item_name || productId
                  }?`,
                  onConfirm: async () => {
                    await productOffers.delete(productId);
                    toast.success("Offer deleted");
                    refetch();
                  },
                }),
            });
          }
          return actions;
        },
      },
    ],
    [confirmDelete, refetch, canAdd, handleToggleActive]
  );

  const handleImportMappedData = (mappedRows) => {
    if (!mappedRows?.length) return;
    setPreviewRows(mappedRows);
    onPreviewOpen();
  };

  const handleConfirmImport = async () => {
    if (!previewRows.length) return;
    setConfirming(true);
    try {
      const res = await productOffers.bulkInsert(previewRows);
      toast.success(`Imported ${res?.inserted ?? previewRows.length} offer(s)`);
      onPreviewClose();
      setPreviewRows([]);
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Import failed");
    } finally {
      setConfirming(false);
    }
  };

  const handlePreviewClose = () => {
    onPreviewClose();
    setPreviewRows([]);
  };

  const handleBulkDelete = useCallback(async () => {
    if (!selectedRows?.length) return;
    setBulkDeleting(true);
    try {
      const ids = selectedRows
        .map((r) => r.product_id)
        .filter((id) => id != null);
      await productOffers.bulkDelete(ids);
      toast.success(`Deleted ${ids.length} offer(s)`);
      setSelectMode(false);
      setSelectedRows([]);
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Bulk delete failed");
    } finally {
      setBulkDeleting(false);
    }
  }, [selectedRows, refetch]);

  const handleCancelSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedRows([]);
  }, []);

  return (
    <GlobalWrapper title="Product Offers" permissionKey="view_product_offers">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Product Offers"
        filledHeader
        rightSection={
          canAdd ? (
            <Box display="flex" gap={2}>
              <FileUploaderWithColumnMapping
                config={IMPORT_COLUMN_CONFIG}
                onMappedData={handleImportMappedData}
                accept=".xlsx,.xls,.csv"
                renderer={(openFileBrowser) => (
                  <Button
                    onClick={openFileBrowser}
                    colorScheme="purple"
                    variant="outline"
                    size="sm"
                  >
                    Import
                  </Button>
                )}
              />
              <Link href="/product-offers/create" passHref>
                <Button colorScheme="purple" size="sm" as="a">
                  Create
                </Button>
              </Link>
            </Box>
          ) : null
        }
      >
        {loading ? (
          <Text py={4} color="gray.600">
            Loading...
          </Text>
        ) : (
          <>
            <Flex
              gap={3}
              align="center"
              mb={3}
              p={3}
              bg="purple.50"
              borderRadius="md"
              borderWidth="1px"
              borderColor="purple.100"
              justify="flex-end"
            >
              {selectMode ? (
                <>
                  <Button
                    size="sm"
                    colorScheme="red"
                    onClick={handleBulkDelete}
                    isLoading={bulkDeleting}
                    loadingText="Deleting..."
                    isDisabled={!selectedRows?.length}
                  >
                    Delete Selected ({selectedRows?.length ?? 0})
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    colorScheme="purple"
                    onClick={handleCancelSelectMode}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  colorScheme="purple"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectMode(true)}
                >
                  Select
                </Button>
              )}
            </Flex>
            <AgGrid
              rowData={offers}
              columnDefs={colDefs}
              tableKey="product-offers-list"
              selectMode={selectMode}
              onSelectionChanged={setSelectedRows}
              getRowId={(params) =>
                String(params.data?.product_id ?? params.data?.id ?? "")
              }
            />
          </>
        )}
      </CustomContainer>

      <CustomModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        title={`Preview import (${previewTableRows.length} rows)`}
        size="4xl"
        scrollBehavior="inside"
        contentProps={{ maxH: "90vh" }}
        bodyProps={{ overflow: "auto" }}
        footer={
          <>
            <Button
              variant="ghost"
              colorScheme="purple"
              onClick={handlePreviewClose}
            >
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleConfirmImport}
              isLoading={confirming}
              loadingText="Importing..."
            >
              Confirm import
            </Button>
          </>
        }
      >
        <Text fontSize="sm" color="gray.600" mb={4}>
          Review the data below and confirm to import these offers.
        </Text>
        <AgGrid
          rowData={previewTableRows}
          columnDefs={previewColDefs}
          tableKey="product-offers-import-preview"
          defaultRows={10}
        />
      </CustomModal>
    </GlobalWrapper>
  );
}

export default ProductOffersListing;
