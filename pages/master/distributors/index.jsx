import React, { useMemo, useCallback } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import { Text, Button, Box } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useDistributors } from "../../../customHooks/useDistributors";
import usePermissions from "../../../customHooks/usePermissions";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import { bulkUpsertProductDistributorMappings } from "../../../helper/productDistributors";
import toast from "react-hot-toast";

const BULK_IMPORT_MAX_ROWS = 2000;

const DISTRIBUTOR_IMPORT_COLUMN_CONFIG = [
  {
    key: "MDM_DIST_CODE",
    label: "MDM_DIST_CODE",
    required: true,
    suggestedKey: "MDM_DIST_CODE",
    type: "string",
  },
  {
    key: "buyer_id",
    label: "buyer_id",
    required: false,
    suggestedKey: "buyer_id",
    type: "number",
  },
];

const listPermissionKeys = [
  "view_product_distributors",
  "view_product_distributor",
];

function DistributorListing() {
  const { distributors, loading, refetch } = useDistributors();
  const canAssignBuyer = usePermissions(["add_product_distributor"]);

  const handleImportMappedData = useCallback(
    async (mappedRows) => {
      if (!mappedRows?.length) return;

      const items = mappedRows
        .map((row) => {
          const code = String(row.MDM_DIST_CODE ?? "").trim();
          const rawBid = row.buyer_id;
          const buyer_id =
            rawBid === "" ||
            rawBid === null ||
            rawBid === undefined ||
            (typeof rawBid === "number" && Number.isNaN(rawBid))
              ? null
              : Number(rawBid);
          return { MDM_DIST_CODE: code, buyer_id };
        })
        .filter((r) => r.MDM_DIST_CODE !== "");

      const skipped = mappedRows.length - items.length;
      if (!items.length) {
        toast.error("No valid rows: MDM_DIST_CODE is required on each row.");
        return;
      }
      if (items.length > BULK_IMPORT_MAX_ROWS) {
        toast.error(
          `Maximum ${BULK_IMPORT_MAX_ROWS} rows per import. Your file has ${items.length} valid rows.`
        );
        return;
      }

      const toastId = toast.loading(
        `Importing ${items.length} row${items.length === 1 ? "" : "s"}…`
      );
      try {
        const res = await bulkUpsertProductDistributorMappings(items);
        const count = res?.count ?? items.length;
        const extra =
          skipped > 0 ? ` (${skipped} row(s) skipped without code)` : "";
        toast.success(`Updated ${count} distributor mapping(s).${extra}`, {
          id: toastId,
        });
        refetch();
      } catch (err) {
        toast.error(err?.message ?? "Bulk import failed", { id: toastId });
      }
    },
    [refetch]
  );

  const colDefs = useMemo(
    () => [
      {
        field: "MDM_DIST_CODE",
        headerName: "ID",
        type: "id",
      },
      {
        field: "MDM_DIST_NAME",
        headerName: "Name",
        type: "capitalized",
        flex: 2,
      },
      {
        field: "MDM_SHORT_NAME",
        headerName: "Short Name",
      },
      {
        field: "buyer_name",
        headerName: "Buyer",
        type: "capitalized",
      },
      {
        colId: "actions",
        headerName: "Action",
        type: "action-icons",
        sortable: false,
        filter: false,
        valueGetter: (params) => {
          const distCode = params.data?.MDM_DIST_CODE;
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/master/distributors/view?code=${encodeURIComponent(
                distCode
              )}`,
            },
          ];
          if (canAssignBuyer) {
            actions.push({
              label: "Edit",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/master/distributors/edit?code=${encodeURIComponent(
                distCode
              )}`,
            });
          }
          return actions;
        },
      },
    ],
    [canAssignBuyer]
  );

  return (
    <GlobalWrapper
      title="Product Distributors"
      permissionKey={listPermissionKeys}
    >
      <CustomContainer
        title="Product Distributors"
        filledHeader
        rightSection={
          canAssignBuyer ? (
            <Box display="flex" gap={2}>
              <FileUploaderWithColumnMapping
                config={DISTRIBUTOR_IMPORT_COLUMN_CONFIG}
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
            </Box>
          ) : null
        }
      >
        {loading ? (
          <Text>Loading...</Text>
        ) : (
          <AgGrid
            rowData={distributors}
            columnDefs={colDefs}
            tableKey="master-distributors"
            gridOptions={{
              getRowId: (params) => String(params.data?.MDM_DIST_CODE ?? ""),
            }}
          />
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default DistributorListing;
