import React, { useMemo, useState, useCallback } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import { Button, Text, Box, useDisclosure, Flex } from "@chakra-ui/react";
import Link from "next/link";
import AgGrid from "../../components/AgGrid";
import CustomModal from "../../components/CustomModal";
import useOffersV3 from "../../customHooks/useOffersV3";
import usePermissions from "../../customHooks/usePermissions";
import { useConfirmDelete } from "../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import offersV3 from "../../helper/offersV3";
import FileUploaderWithColumnMapping from "../../components/FileUploaderWithColumnMapping";
import { OFFER_TYPE_LABELS, normalizeOfferType } from "../../constants/offersV3";

const IMPORT_COLUMN_CONFIG = [
  {
    key: "item_code",
    label: "Item Code",
    required: true,
    suggestedKey: "item_code",
    type: "string",
  },
  {
    key: "item_name",
    label: "Item Name",
    required: true,
    suggestedKey: "item_name",
    type: "string",
  },
  {
    key: "offer_type",
    label: "Offer Type",
    required: true,
    suggestedKey: "offer_type",
    type: "string",
  },
  {
    key: "value",
    label: "Value",
    required: true,
    suggestedKey: "value",
    type: "number",
  },
];

function OffersV3Listing() {
  const canAdd = usePermissions("add_offers_v3");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { offers, loading, refetch } = useOffersV3();
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

  const handleToggleActive = useCallback(
    async (row) => {
      try {
        await offersV3.update(row.id, { is_active: !row.is_active });
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
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "item_name", headerName: "Item Name", flex: 2 },
      {
        field: "offer_type",
        headerName: "Offer Type",
        flex: 1,
        valueGetter: (params) =>
          OFFER_TYPE_LABELS[normalizeOfferType(params.data?.offer_type)] ??
          params.data?.offer_type,
      },
      { field: "value", headerName: "Value", type: "number" },
    ],
    []
  );

  const colDefs = useMemo(
    () => [
      { field: "id", headerName: "ID", type: "id" },
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "item_name", headerName: "Item Name", flex: 2 },
      {
        field: "offer_type",
        headerName: "Offer Type",
        flex: 1,
        valueGetter: (params) =>
          OFFER_TYPE_LABELS[params.data?.offer_type] ?? params.data?.offer_type,
      },
      { field: "value", headerName: "Value", type: "number" },
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
          const actions = [
            {
              label: "View",
              iconType: "view",
              redirectionUrl: `/offers-v3/view?id=${row.id}`,
            },
            {
              label: "Edit",
              iconType: "edit",
              redirectionUrl: `/offers-v3/edit?id=${row.id}`,
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
                  message: `Delete offer for item ${row.item_name || row.item_code}?`,
                  onConfirm: async () => {
                    await offersV3.delete(row.id);
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
    const normalized = mappedRows.map((row) => ({
      ...row,
      offer_type: normalizeOfferType(row.offer_type),
    }));
    setPreviewRows(normalized);
    onPreviewOpen();
  };

  const handleConfirmImport = async () => {
    if (!previewRows.length) return;
    setConfirming(true);
    try {
      const res = await offersV3.bulkInsert(previewRows);
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
      const ids = selectedRows.map((r) => r.id).filter((id) => id != null);
      await offersV3.bulkDelete(ids);
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
    <GlobalWrapper title="Offers V3" permissionKey="view_offers_v3">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Offers V3"
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
              <Link href="/offers-v3/create" passHref>
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
            <Flex justify="flex-end" mb={3} gap={3}>
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
              tableKey="offers-v3-list"
              selectMode={selectMode}
              onSelectionChanged={setSelectedRows}
              getRowId={(params) => String(params.data?.id ?? "")}
            />
          </>
        )}
      </CustomContainer>

      <CustomModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        title={`Preview import (${previewRows.length} rows)`}
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
          Review the data below and confirm to import these offers. Existing
          offers with a matching item code will be updated.
        </Text>
        <AgGrid
          rowData={previewRows}
          columnDefs={previewColDefs}
          tableKey="offers-v3-import-preview"
          defaultRows={10}
        />
      </CustomModal>
    </GlobalWrapper>
  );
}

export default OffersV3Listing;
