import React, { useMemo, useCallback, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text, Switch } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import PrintDrawer from "../../../components/purchase-return/PrintDrawer";
import { usePurchaseReturns } from "../../../customHooks/usePurchaseReturns";
import usePermissions from "../../../customHooks/usePermissions";
import { useUser } from "../../../contexts/UserContext";
import { updatePurchaseReturnExtra } from "../../../helper/purchaseReturn";
import { downloadPurchaseReturnLabelsPdf } from "../../../helper/purchaseReturnLabelsPdf";
import toast from "react-hot-toast";

function PurchaseReturnListing() {
  const canAdd = usePermissions("add_purchase_return");
  const canUpdateStatus = usePermissions("update_purchase_return_status");
  const { purchaseReturns, loading, refetch } = usePurchaseReturns();
  const { userConfig } = useUser();
  const { employeeId, fetched } = userConfig;
  const currentUserName =
    userConfig?.userType === "2" ? "Vinodh" : fetched?.employee_name ?? "—";

  const [printDrawerRow, setPrintDrawerRow] = useState(null);

  const handleClosePrintDrawer = useCallback(() => setPrintDrawerRow(null), []);
  const handleOpenPrintDrawer = useCallback(
    (row) => setPrintDrawerRow(row),
    []
  );

  const handleDownloadPdf = useCallback(
    (row) => {
      const boxes = row?.no_of_boxes;
      if (boxes != null && Number(boxes) >= 1) {
        const createdByName =
          row?.status != null || row?.no_of_boxes != null
            ? row.created_by_name ?? "—"
            : currentUserName;
        downloadPurchaseReturnLabelsPdf(row, Number(boxes), {
          enteredBy: createdByName || currentUserName || "—",
          print: false,
        });
        toast.success("Download started");
      } else {
        setPrintDrawerRow(row);
      }
    },
    [currentUserName]
  );

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
        type: "id",
      },
      {
        field: "distributor_name",
        headerName: "Distributor",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "mprh_pr_dt",
        headerName: "PR Date",
        type: "date",
      },
      {
        field: "mprh_basic_amount",
        headerName: "Basic Amount",
        type: "currency",
        hideByDefault: true,
      },
      {
        field: "mprh_net_amount",
        headerName: "Net Amount",
        type: "currency",
      },
      {
        field: "no_of_boxes",
        headerName: "Boxes",
        type: "number",
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
      ...(canUpdateStatus
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
        type: "action-icons",
        headerName: "Action",
        valueGetter: (params) => {
          const row = params.data;
          const prNo = row?.mprh_pr_no;
          const hasExtra = row?.status != null || row?.no_of_boxes != null;
          const actions = [
            {
              label: "Print",
              icon: "fa-solid fa-print",
              onClick: () => handleOpenPrintDrawer(row),
              colorScheme: "blue",
            },
            {
              label: "Download PDF",
              icon: "fa-solid fa-file-pdf",
              onClick: () => handleDownloadPdf(row),
              colorScheme: "red",
            },
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/purchase/purchase-return/view?mprh_pr_no=${encodeURIComponent(
                prNo
              )}`,
            },
          ];

          if (hasExtra && canAdd) {
            actions.push({
              label: "Edit",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/purchase/purchase-return/edit?mprh_pr_no=${encodeURIComponent(
                prNo
              )}`,
            });
          } else if (!hasExtra && canAdd) {
            actions.push({
              label: "Add extra",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/purchase/purchase-return/create?mprh_pr_no=${encodeURIComponent(
                prNo
              )}`,
            });
          }

          return actions;
        },
      },
    ],
    [canAdd, handleStatusChange, handleOpenPrintDrawer, handleDownloadPdf]
  );

  return (
    <GlobalWrapper title="Purchase Return" permissionKey="view_purchase_return">
      <PrintDrawer
        isOpen={printDrawerRow != null}
        onClose={handleClosePrintDrawer}
        row={printDrawerRow}
        refetch={refetch}
        employeeId={employeeId}
        currentUserName={currentUserName}
      />
      <CustomContainer title="Purchase Return" filledHeader>
        <AgGrid
          rowData={purchaseReturns}
          columnDefs={colDefs}
          tableKey="purchase-return"
          gridOptions={{ getRowId: (params) => params.data?.mprh_pr_no }}
        />
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default PurchaseReturnListing;
