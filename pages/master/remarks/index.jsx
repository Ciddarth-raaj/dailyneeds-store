import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useRemarksMaster } from "../../../customHooks/useRemarksMaster";
import usePermissions from "../../../customHooks/usePermissions";
import toast from "react-hot-toast";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { updateRemark } from "../../../helper/remarksMaster";

function RemarksListing() {
  const router = useRouter();
  const canAdd = usePermissions("add_remarks_master");
  const { remarks, loading, deleteRemark, refetch } = useRemarksMaster();
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const handleToggleStatus = useCallback(
    (row) => {
      const id = row?.remark_id;
      if (id == null) return;
      const nextActive = !(row?.is_active === true || row?.is_active === 1);
      toast.promise(
        updateRemark(id, { is_active: nextActive }).then(() => refetch()),
        {
          loading: "Updating...",
          success: nextActive
            ? "Remark set to Active"
            : "Remark set to Inactive",
          error: (err) => err?.message || "Failed to update",
        }
      );
    },
    [refetch]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "remark_id",
        headerName: "ID",
        type: "id",
      },
      {
        field: "label",
        headerName: "Label",
        flex: 2,
      },
      {
        field: "is_active",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) =>
          params.data?.is_active === true || params.data?.is_active === 1
            ? { label: "Active", colorScheme: "green" }
            : { label: "Inactive", colorScheme: "red" },
      },
      {
        field: "actions",
        type: "action-icons",
        headerName: "Actions",
        valueGetter: (params) => {
          const row = params.data;
          const id = row?.remark_id;
          const isActive = row?.is_active === true || row?.is_active === 1;
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/master/remarks/view?id=${id}`,
            },
          ];
          if (canAdd) {
            actions.unshift({
              label: isActive ? "Make Inactive" : "Make Active",
              icon: isActive
                ? "fa-solid fa-toggle-off"
                : "fa-solid fa-toggle-on",
              colorScheme: isActive ? "red" : "green",
              onClick: () => handleToggleStatus(row),
            });

            actions.push(
              {
                label: "Edit",
                icon: "fa-solid fa-pen",
                redirectionUrl: `/master/remarks/edit?id=${id}`,
              },
              {
                label: "Delete",
                icon: "fa-solid fa-trash",
                colorScheme: "red",
                onClick: () =>
                  confirmDelete({
                    title: "Delete remark",
                    message: `Are you sure you want to delete "${
                      row?.label ?? id
                    }"?`,
                    onConfirm: async () => {
                      await deleteRemark(id);
                      toast.success("Remark deleted");
                    },
                  }),
              }
            );
          }
          return actions;
        },
      },
    ],
    [canAdd, confirmDelete, deleteRemark, handleToggleStatus]
  );

  return (
    <GlobalWrapper title="Remarks Master" permissionKey="view_remarks_master">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Remarks Master"
        filledHeader
        rightSection={
          canAdd ? (
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/master/remarks/create")}
            >
              Add
            </Button>
          ) : null
        }
      >
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={remarks}
            columnDefs={colDefs}
            tableKey="master-remarks"
            gridOptions={{
              getRowId: (params) => String(params.data?.remark_id ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default RemarksListing;
