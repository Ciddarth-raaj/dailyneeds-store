import React, { useMemo } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Button, Text } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useJobWorksheets } from "../../../customHooks/useJobWorksheets";
import useConfirmDelete from "../../../customHooks/useConfirmDelete";
import toast from "react-hot-toast";
import moment from "moment";

function JobWorksheetIndex() {
  const router = useRouter();
  const { jobWorksheets, loading, deleteJobWorksheet } = useJobWorksheets({
    limit: 500,
  });
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const colDefs = useMemo(
    () => [
      {
        field: "id",
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
        valueFormatter: (params) =>
          params.value ? moment(params.value).format("DD-MM-YYYY") : "-",
        flex: 1,
      },
      {
        field: "supplier_name",
        headerName: "Supplier",
        flex: 2,
      },
      {
        field: "supplier_phone",
        headerName: "Phone",
        hideByDefault: true,
        flex: 1,
      },
      {
        field: "item_count",
        headerName: "Items",
        type: "numericColumn",
        width: 100,
      },
      {
        field: "id",
        headerName: "Action",
        type: "action-column",
        width: 120,
        valueGetter: (params) => {
          const id = params.data?.id;
          const grnNo = params.data?.grn_no;
          return [
            {
              label: "View",
              redirectionUrl: `/purchase/job-worksheet/view?id=${id}`,
            },
            {
              label: "Edit",
              redirectionUrl: `/purchase/job-worksheet/edit?id=${id}`,
            },
            {
              label: "Delete",
              onClick: () =>
                confirmDelete({
                  title: "Delete job worksheet",
                  message: `Are you sure you want to delete job worksheet "${grnNo ?? id}"?`,
                  onConfirm: async () => {
                    await deleteJobWorksheet(id);
                    toast.success("Job worksheet deleted");
                  },
                }),
            },
          ];
        },
      },
    ],
    [confirmDelete, deleteJobWorksheet]
  );

  return (
    <GlobalWrapper title="Job Worksheet" permissionKey="view_job_worksheet">
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Job Worksheet"
        filledHeader
        rightSection={
          <Button
            colorScheme="purple"
            size="sm"
            onClick={() => router.push("/purchase/job-worksheet/create")}
          >
            Create
          </Button>
        }
      >
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={jobWorksheets}
            columnDefs={colDefs}
            tableKey="job-worksheet"
            gridOptions={{ getRowId: (params) => params.data?.id }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default JobWorksheetIndex;
