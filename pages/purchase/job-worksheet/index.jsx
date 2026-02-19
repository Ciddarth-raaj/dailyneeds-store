import React, { useMemo, useState, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, Text, Box, Flex, Switch } from "@chakra-ui/react";
import CustomModal from "../../../components/CustomModal";
import AgGrid from "../../../components/AgGrid";
import { useJobWorksheets } from "../../../customHooks/useJobWorksheets";
import { useJobWorksheetById } from "../../../customHooks/useJobWorksheetById";
import { useProducts } from "../../../customHooks/useProducts";
import { useStickerTypes } from "../../../customHooks/useStickerTypes";
import { updateJobWorksheetItem } from "../../../helper/jobWorksheet";
import toast from "react-hot-toast";
import moment from "moment";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import Badge from "../../../components/Badge";
import usePermissions from "../../../customHooks/usePermissions";
import Link from "next/link";

function JobWorksheetIndex() {
  const router = useRouter();
  const [viewProductsWorksheetId, setViewProductsWorksheetId] = useState(null);
  const canAdd = usePermissions("add_job_worksheet");

  const { jobWorksheets, loading, deleteJobWorksheet, refetch } =
    useJobWorksheets({
      limit: 500,
    });
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const {
    worksheet: worksheetWithItems,
    loading: loadingWorksheet,
    refetch: refetchWorksheet,
  } = useJobWorksheetById(viewProductsWorksheetId, {
    enabled: !!viewProductsWorksheetId,
    withItems: true,
  });
  const { products } = useProducts({ limit: 10000, fetchAll: true });
  const { stickerTypes } = useStickerTypes({ limit: 500 });

  const productMap = useMemo(() => {
    const map = {};
    (products || []).forEach((p) => {
      const imageUrl = p.image_url;
      map[p.product_id] = {
        gf_item_name: p.gf_item_name ?? p.de_display_name ?? "-",
        imageUrl,
      };
    });
    return map;
  }, [products]);

  const stickerOptions = useMemo(
    () =>
      (stickerTypes || []).map((s) => ({ id: s.sticker_id, value: s.label })),
    [stickerTypes]
  );

  const viewProductsGridRows = useMemo(() => {
    const items = worksheetWithItems?.items || [];

    return items.map((item, idx) => {
      const info = productMap[item.product_id] || {};
      const label1 = item.sticker_type_1_label ?? "-";
      const label2 = item.sticker_type_2_label ?? "-";
      const isSingle = (item.material_type || "Single") === "Single";
      const statusVal = item.status || "open";
      const itemId = item.id ?? item.job_worksheet_item_id;
      return {
        id: `row-${viewProductsWorksheetId}-${itemId}`,
        item_id: itemId,
        product_id: item.product_id,
        gf_item_name: info.gf_item_name,
        imageUrl: info.imageUrl,
        material_type: item.material_type || "Single",
        sticker_label_1: label1,
        sticker_label_2: label2,
        sticker_display: isSingle ? label1 : `${label1} / ${label2}`,
        qty: item.qty,
        mrp: item.mrp,
        status: statusVal,
        status_display: statusVal === "done" ? "Done" : "Open",
      };
    });
  }, [worksheetWithItems?.items, productMap, viewProductsWorksheetId]);

  const handleSetItemStatus = useCallback(
    (itemRow, newStatus) => async () => {
      if (!viewProductsWorksheetId || itemRow?.item_id == null) return;
      try {
        await updateJobWorksheetItem(viewProductsWorksheetId, itemRow.item_id, {
          product_id: itemRow.product_id,
          qty: itemRow.qty,
          mrp: itemRow.mrp,
          status: newStatus,
        });
        toast.success(
          `Status set to ${newStatus === "done" ? "Done" : "Open"}`
        );
        refetchWorksheet();
      } catch (err) {
        toast.error(err.message || "Failed to update status");
      }
    },
    [viewProductsWorksheetId]
  );

  const viewProductsColDefs = useMemo(
    () => [
      {
        field: "imageUrl",
        headerName: "Image",
        type: "image",
      },
      { field: "gf_item_name", headerName: "Name" },
      { field: "material_type", headerName: "Material Type" },
      { field: "sticker_display", headerName: "Sticker Type" },
      { field: "qty", headerName: "Qty" },
      { field: "mrp", headerName: "MRP" },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (props) => {
          return props.data?.status === "done"
            ? { label: "Done", colorScheme: "green" }
            : { label: "Open", colorScheme: "blue" };
        },
      },
      {
        field: "item_id",
        headerName: "Mark done",
        width: 120,
        cellRenderer: (params) => {
          const row = params.data;
          if (!row || row.item_id == null) return null;
          const isDone = row.status === "done";
          return (
            <Flex align="center" h="100%">
              <Switch
                size="sm"
                colorScheme="purple"
                isChecked={isDone}
                onChange={() => {
                  handleSetItemStatus(row, isDone ? "open" : "done")();
                }}
              />
              <Text ml={2} fontSize="xs" color="gray.600">
                {isDone ? "Done" : "Open"}
              </Text>
            </Flex>
          );
        },
      },
    ],
    [handleSetItemStatus]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "job_worksheet_id",
        headerName: "ID",
        type: "id",
        width: 90,
      },
      {
        field: "grn_no",
        headerName: "GRN No",
        flex: 1,
      },
      {
        field: "date",
        headerName: "Date",
        type: "date",
      },
      {
        field: "supplier_id",
        headerName: "Supplier",
        valueGetter: (params) =>
          params.data?.supplier_id ?? params.data?.supplier_name ?? "",
      },
      {
        field: "supplier_phone",
        headerName: "Phone",
        hideByDefault: true,
      },
      {
        field: "item_count",
        headerName: "Items",
      },
      {
        field: "status_count",
        headerName: "Status Count",
        cellRenderer: (props) => {
          const doneCount = props.data?.status_count?.done ?? 0;
          const openCount = props.data?.status_count?.open ?? 0;

          if (openCount == 0) {
            return "-";
          }

          return (
            <Flex
              gap="4px"
              p="4px"
              alignItems="center"
              flexWrap="wrap"
              h="full"
            >
              <Badge colorScheme="purple">{`${doneCount} / ${
                doneCount + openCount
              }`}</Badge>
            </Flex>
          );
        },
      },
      {
        field: "status_count",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (props) => {
          const openCount = props.data?.status_count?.open ?? 0;

          if (openCount === 0) {
            return {
              label: "Done",
              colorScheme: "green",
            };
          }

          return {
            label: "In Progress",
            colorScheme: "blue",
          };
        },
      },
      {
        field: "job_worksheet_id",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const id = params.data?.job_worksheet_id;
          const grnNo = params.data?.grn_no;

          const actions = [
            {
              label: "View Products",
              onClick: () => setViewProductsWorksheetId(id),
            },
            {
              label: "View",
              redirectionUrl: `/purchase/job-worksheet/view?id=${id}`,
            },
          ];

          if (canAdd) {
            actions.push({
              label: "Edit",
              redirectionUrl: `/purchase/job-worksheet/edit?id=${id}`,
            });

            actions.push({
              label: "Delete",
              onClick: () =>
                confirmDelete({
                  title: "Delete job worksheet",
                  message: `Are you sure you want to delete job worksheet "${
                    grnNo ?? id
                  }"?`,
                  onConfirm: async () => {
                    await deleteJobWorksheet(id);
                    toast.success("Job worksheet deleted");
                  },
                }),
            });
          }

          return actions;
        },
      },
    ],
    [confirmDelete, deleteJobWorksheet]
  );

  const closeViewProducts = () => {
    refetch();
    setViewProductsWorksheetId(null);
  };

  return (
    <GlobalWrapper title="Job Worksheet" permissionKey="view_job_worksheet">
      <ConfirmDeleteDialog />
      <CustomModal
        isOpen={!!viewProductsWorksheetId}
        onClose={closeViewProducts}
        title={`Products${
          worksheetWithItems?.grn_no ? ` – ${worksheetWithItems.grn_no}` : ""
        }`}
        size="6xl"
        scrollBehavior="inside"
        trapFocus={false}
        autoFocus={false}
      >
        {loadingWorksheet ? (
          <Text>Loading products...</Text>
        ) : (
          <Box>
            <AgGrid
              rowData={viewProductsGridRows}
              columnDefs={viewProductsColDefs}
            />
          </Box>
        )}
      </CustomModal>
      <CustomContainer
        title="Job Worksheet"
        filledHeader
        rightSection={
          canAdd && (
            <Link href="/purchase/job-worksheet/create" passHref>
              <Button colorScheme="purple">Create</Button>
            </Link>
          )
        }
      >
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={jobWorksheets}
            columnDefs={colDefs}
            tableKey="job-worksheet"
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default JobWorksheetIndex;
