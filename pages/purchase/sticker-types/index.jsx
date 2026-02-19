import React, { useMemo } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useStickerTypes } from "../../../customHooks/useStickerTypes";
import usePermissions from "../../../customHooks/usePermissions";
import toast from "react-hot-toast";
import moment from "moment";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";

function StickerTypesIndex() {
  const router = useRouter();
  const canAdd = usePermissions("add_sticker_types");
  const { stickerTypes, loading, deleteStickerType } = useStickerTypes({
    limit: 500,
  });
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const colDefs = useMemo(
    () => [
      {
        field: "sticker_id",
        headerName: "ID",
        type: "id",
        width: 90,
      },
      {
        field: "label",
        headerName: "Label",
        flex: 2,
      },
      {
        field: "created_at",
        headerName: "Created",
        valueFormatter: (params) =>
          params.value ? moment(params.value).format("DD-MM-YYYY HH:mm") : "-",
        hideByDefault: true,
        flex: 1,
      },
      {
        field: "updated_at",
        headerName: "Updated",
        valueFormatter: (params) =>
          params.value ? moment(params.value).format("DD-MM-YYYY HH:mm") : "-",
        hideByDefault: true,
        flex: 1,
      },
      {
        field: "sticker_id",
        headerName: "Action",
        type: "action-column",
        width: 120,
        valueGetter: (params) => {
          const id = params.data?.sticker_id;
          const label = params.data?.label;
          const actions = [
            {
              label: "View",
              redirectionUrl: `/purchase/sticker-types/view?id=${id}`,
            },
          ];
          if (canAdd) {
            actions.push(
              {
                label: "Edit",
                redirectionUrl: `/purchase/sticker-types/edit?id=${id}`,
              },
              {
                label: "Delete",
                onClick: () =>
                  confirmDelete({
                    title: "Delete sticker type",
                    message: `Are you sure you want to delete "${
                      label ?? id
                    }"?`,
                    onConfirm: async () => {
                      await deleteStickerType(id);
                      toast.success("Sticker type deleted");
                    },
                  }),
              }
            );
          }
          return actions;
        },
      },
    ],
    [canAdd, confirmDelete, deleteStickerType]
  );

  return (
    <GlobalWrapper title="Sticker Types" permissionKey="view_sticker_types">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Sticker Types"
        filledHeader
        rightSection={
          canAdd ? (
            <Button
              colorScheme="purple"
              size="sm"
              onClick={() => router.push("/purchase/sticker-types/create")}
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
            rowData={stickerTypes}
            columnDefs={colDefs}
            tableKey="sticker-types"
            gridOptions={{ getRowId: (params) => params.data?.sticker_id }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StickerTypesIndex;
