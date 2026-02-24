import React, { useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text, Flex, Switch } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { usePurchaseReturns } from "../../../customHooks/usePurchaseReturns";
import usePermissions from "../../../customHooks/usePermissions";
import { updatePurchaseReturnExtra } from "../../../helper/purchaseReturn";
import toast from "react-hot-toast";
import moment from "moment";

function PurchaseReturnListing() {
  const router = useRouter();
  const canAdd = usePermissions("add_purchase_return");
  const { purchaseReturns, loading, refetch } = usePurchaseReturns();

  const handleStatusChange = useCallback(
    (row, newStatus) => () => {
      const prNo = row?.mprh_pr_no;
      if (!prNo) return;
      toast.promise(
        updatePurchaseReturnExtra(prNo, { status: newStatus }).then(() => {
          refetch();
        }),
        {
          loading: "Updating status...",
          success: `Status set to ${newStatus === "done" ? "Done" : "Open"}`,
          error: (err) => err.message || "Failed to update status",
        }
      );
    },
    [refetch]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "mprh_pr_no",
        headerName: "Return No",
        type: "id",
        hideByDefault: true,
      },
      {
        field: "mprh_pr_refno",
        headerName: "PR No",
      },
      {
        field: "distributor_name",
        headerName: "Distributor",
        valueGetter: (params) =>
          params.data?.distributor?.name ?? params.data?.distributor_id ?? "-",
      },
      {
        field: "mprh_pr_dt",
        headerName: "PR Date",
        type: "date",
      },
      {
        field: "mprh_basic_amount",
        headerName: "Basic Amount",
        valueFormatter: (params) =>
          params.value != null ? Number(params.value).toFixed(2) : "-",
        hideByDefault: true,
      },
      {
        field: "mprh_net_amount",
        headerName: "Net Amount",
        valueFormatter: (params) =>
          params.value != null ? Number(params.value).toFixed(2) : "-",
      },
      {
        field: "no_of_boxes",
        headerName: "Boxes",
        valueGetter: (params) => params.data?.no_of_boxes ?? "-",
      },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) => {
          const status = params.data?.status;
          if (status === "done") {
            return { label: "Done", colorScheme: "green" };
          }
          return { label: "Open", colorScheme: "blue" };
        },
      },
      ...(canAdd
        ? [
            {
              field: "status",
              headerName: "Status",
              hideExport: true,
              valueGetter: (params) => params.data?.status ?? null,
              cellRenderer: (params) => {
                const row = params.data;
                const hasExtra =
                  row?.status != null || row?.no_of_boxes != null;
                const status = row?.status;
                if (!hasExtra) return "-";
                const isDone = status === "done";

                return (
                  <Switch
                    size="sm"
                    colorScheme="purple"
                    isChecked={isDone}
                    onChange={() => {
                      handleStatusChange(row, isDone ? "open" : "done")();
                    }}
                  />
                );
              },
            },
          ]
        : []),
      {
        field: "mprh_pr_no",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const prNo = params.data?.mprh_pr_no;
          const hasExtra =
            params.data?.status != null || params.data?.no_of_boxes != null;
          const actions = [
            {
              label: "View",
              redirectionUrl: `/purchase/purchase-return/view?mprh_pr_no=${encodeURIComponent(
                prNo
              )}`,
            },
          ];
          if (hasExtra && canAdd) {
            actions.push({
              label: "Edit",
              redirectionUrl: `/purchase/purchase-return/edit?mprh_pr_no=${encodeURIComponent(
                prNo
              )}`,
            });
          } else if (!hasExtra && canAdd) {
            actions.push({
              label: "Add extra",
              redirectionUrl: `/purchase/purchase-return/create?mprh_pr_no=${encodeURIComponent(
                prNo
              )}`,
            });
          }
          return actions;
        },
      },
    ],
    [canAdd, handleStatusChange]
  );

  return (
    <GlobalWrapper title="Purchase Return" permissionKey="view_purchase_return">
      <CustomContainer title="Purchase Return" filledHeader>
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={purchaseReturns}
            columnDefs={colDefs}
            tableKey="purchase-return"
            gridOptions={{ getRowId: (params) => params.data?.mprh_pr_no }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseReturnListing;
