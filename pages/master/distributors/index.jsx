import React, { useMemo, useCallback, useState } from "react";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import { Text, Button, Box, Flex, useDisclosure } from "@chakra-ui/react";
import AgGrid from "../../../components/AgGrid";
import { useDistributors } from "../../../customHooks/useDistributors";
import usePermissions from "../../../customHooks/usePermissions";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import {
  bulkUpsertProductDistributorMappings,
  bulkImportProductDistributorHoldingDays,
} from "../../../helper/productDistributors";
import { parseDaysValue } from "../../../util/stockHoldingDashboard";
import toast from "react-hot-toast";

const BULK_IMPORT_MAX_ROWS = 2000;

const DISTRIBUTOR_IMPORT_COLUMN_CONFIG = [
  {
    key: "CID",
    label: "CID",
    required: true,
    suggestedKey: "CID",
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

const HOLDING_DAYS_IMPORT_COLUMN_CONFIG = [
  {
    key: "cid",
    label: "Supplier Id",
    required: true,
    suggestedKey: "Supplier Id",
    type: "string",
  },
  {
    key: "holding_days",
    label: "Holding Days",
    required: true,
    suggestedKey: "Holding Days",
    type: "number",
  },
];

const listPermissionKeys = [
  "view_product_distributors",
  "view_product_distributor",
];

const INVALID_CELL_STYLE = {
  color: "#E53E3E",
};

function validateHoldingDaysRow(row, knownCids) {
  const cid = String(row.cid ?? "").trim();
  const parsedDays = parseDaysValue(row.holding_days);

  const invalidCid = !cid || !knownCids.has(cid);
  const invalidHoldingDays =
    row.holding_days === "" ||
    row.holding_days === null ||
    row.holding_days === undefined ||
    parsedDays == null;

  const reasons = [];
  if (!cid) reasons.push("Supplier Id required");
  else if (!knownCids.has(cid)) reasons.push("Unknown supplier id");
  if (invalidHoldingDays) reasons.push("Invalid holding days");

  return {
    cid,
    holding_days: row.holding_days,
    holding_days_parsed: parsedDays,
    invalid_cid: invalidCid,
    invalid_holding_days: invalidHoldingDays,
    is_invalid: invalidCid || invalidHoldingDays,
    invalid_reason: reasons.length ? reasons.join("; ") : null,
  };
}

function DistributorListing() {
  const { distributors, loading, refetch } = useDistributors();
  const canAssignBuyer = usePermissions(["add_product_distributor"]);
  const {
    isOpen: isHoldingDaysImportOpen,
    onOpen: onHoldingDaysImportOpen,
    onClose: onHoldingDaysImportClose,
  } = useDisclosure();
  const [holdingDaysPreviewRows, setHoldingDaysPreviewRows] = useState([]);
  const [savingHoldingDays, setSavingHoldingDays] = useState(false);

  const knownCids = useMemo(() => {
    const set = new Set();
    (distributors || []).forEach((d) => {
      const cid = d?.CID != null ? String(d.CID).trim() : "";
      if (cid) set.add(cid);
    });
    return set;
  }, [distributors]);

  const handleImportMappedData = useCallback(
    async (mappedRows) => {
      if (!mappedRows?.length) return;

      const items = mappedRows
        .map((row) => {
          const cid = String(row.CID ?? "").trim();
          const rawBid = row.buyer_id;
          const buyer_id =
            rawBid === "" ||
            rawBid === null ||
            rawBid === undefined ||
            (typeof rawBid === "number" && Number.isNaN(rawBid))
              ? null
              : Number(rawBid);
          return { CID: cid, buyer_id };
        })
        .filter((r) => r.CID !== "");

      const skipped = mappedRows.length - items.length;
      if (!items.length) {
        toast.error("No valid rows: CID is required on each row.");
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
          skipped > 0 ? ` (${skipped} row(s) skipped without CID)` : "";
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

  const enrichedHoldingDaysPreviewRows = useMemo(
    () =>
      (holdingDaysPreviewRows || [])
        .map((row, index) => ({
          ...validateHoldingDaysRow(row, knownCids),
          _rowKey: `holding-days-preview-${index}`,
        }))
        .sort((a, b) => {
          if (a.is_invalid === b.is_invalid) return 0;
          return a.is_invalid ? -1 : 1;
        }),
    [holdingDaysPreviewRows, knownCids]
  );

  const validHoldingDaysItems = useMemo(
    () =>
      enrichedHoldingDaysPreviewRows
        .filter((row) => !row.is_invalid)
        .map((row) => ({
          cid: row.cid,
          holding_days: row.holding_days_parsed,
        })),
    [enrichedHoldingDaysPreviewRows]
  );

  const invalidHoldingDaysCount = useMemo(
    () => enrichedHoldingDaysPreviewRows.filter((row) => row.is_invalid).length,
    [enrichedHoldingDaysPreviewRows]
  );

  const handleHoldingDaysMappedData = useCallback(
    (mappedRows) => {
      setHoldingDaysPreviewRows(Array.isArray(mappedRows) ? mappedRows : []);
      onHoldingDaysImportOpen();
    },
    [onHoldingDaysImportOpen]
  );

  const handleCloseHoldingDaysImport = useCallback(() => {
    onHoldingDaysImportClose();
    setHoldingDaysPreviewRows([]);
  }, [onHoldingDaysImportClose]);

  const handleSaveHoldingDays = useCallback(async () => {
    const items = validHoldingDaysItems;
    if (!items.length) {
      toast.error("No valid rows to import.");
      return;
    }
    if (items.length > BULK_IMPORT_MAX_ROWS) {
      toast.error(
        `Maximum ${BULK_IMPORT_MAX_ROWS} rows per import. Your file has ${items.length} valid rows.`
      );
      return;
    }

    setSavingHoldingDays(true);
    const toastId = toast.loading(
      `Importing holding days for ${items.length} supplier${
        items.length === 1 ? "" : "s"
      }…`
    );
    try {
      const res = await bulkImportProductDistributorHoldingDays(items);
      const count = res?.count ?? 0;
      const notFound = res?.skipped ?? 0;
      const extraParts = [];
      if (invalidHoldingDaysCount > 0) {
        extraParts.push(`${invalidHoldingDaysCount} row(s) skipped as invalid`);
      }
      if (notFound > 0) {
        extraParts.push(`${notFound} supplier id(s) not found`);
      }
      const extra = extraParts.length > 0 ? ` (${extraParts.join("; ")})` : "";
      toast.success(`Updated holding days for ${count} supplier(s).${extra}`, {
        id: toastId,
      });
      handleCloseHoldingDaysImport();
      refetch();
    } catch (err) {
      toast.error(err?.message ?? "Holding days import failed", {
        id: toastId,
      });
    } finally {
      setSavingHoldingDays(false);
    }
  }, [
    validHoldingDaysItems,
    invalidHoldingDaysCount,
    handleCloseHoldingDaysImport,
    refetch,
  ]);

  const holdingDaysPreviewColumnDefs = useMemo(
    () => [
      {
        field: "cid",
        headerName: "Supplier Id",
        type: "id",
        maxWidth: 120,
        cellStyle: (params) =>
          params.data?.invalid_cid ? INVALID_CELL_STYLE : null,
      },
      {
        field: "holding_days",
        headerName: "Holding Days",
        cellStyle: (params) =>
          params.data?.invalid_holding_days ? INVALID_CELL_STYLE : null,
      },
      {
        field: "holding_days_parsed",
        headerName: "Parsed Days",
        type: "number",
        cellStyle: (params) =>
          params.data?.invalid_holding_days ? INVALID_CELL_STYLE : null,
      },
      {
        field: "invalid_reason",
        headerName: "Issue",
        type: "capitalized",
        flex: 1,
        cellStyle: (params) =>
          params.data?.is_invalid ? INVALID_CELL_STYLE : null,
      },
    ],
    []
  );

  const colDefs = useMemo(
    () => [
      {
        field: "CID",
        headerName: "CID",
        type: "id",
        maxWidth: 120,
      },
      {
        field: "MDM_DIST_CODE",
        headerName: "Medishop Code",
        hideByDefault: true,
        type: "id",
      },
      {
        field: "HQ_DIST_CODE",
        headerName: "HQ Code",
        hideByDefault: true,
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
        field: "holding_days",
        headerName: "H. Days",
        type: "number",
      },
      {
        colId: "actions",
        headerName: "Action",
        type: "action-icons",
        sortable: false,
        filter: false,
        valueGetter: (params) => {
          const cid = params.data?.CID;
          const actions = [
            {
              label: "View",
              icon: "fa-solid fa-eye",
              redirectionUrl: `/master/distributors/view?cid=${encodeURIComponent(
                cid
              )}`,
            },
          ];
          if (canAssignBuyer) {
            actions.push({
              label: "Edit",
              icon: "fa-solid fa-pen",
              redirectionUrl: `/master/distributors/edit?cid=${encodeURIComponent(
                cid
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
                config={HOLDING_DAYS_IMPORT_COLUMN_CONFIG}
                onMappedData={handleHoldingDaysMappedData}
                accept=".xlsx,.xls,.csv"
                renderer={(openFileBrowser) => (
                  <Button
                    onClick={openFileBrowser}
                    colorScheme="purple"
                    variant="outline"
                    size="sm"
                  >
                    Import Holding Days
                  </Button>
                )}
              />
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
              getRowId: (params) => String(params.data?.CID ?? ""),
            }}
          />
        )}
      </CustomContainer>

      <CustomModal
        isOpen={isHoldingDaysImportOpen}
        onClose={handleCloseHoldingDaysImport}
        title="Import Holding Days"
        size="6xl"
        colorScheme="purple"
        footer={
          <Flex justifyContent="flex-end" gap={4}>
            <Button variant="outline" onClick={handleCloseHoldingDaysImport}>
              Cancel
            </Button>
            <Button
              colorScheme="purple"
              onClick={handleSaveHoldingDays}
              isLoading={savingHoldingDays}
              loadingText="Saving..."
              isDisabled={!holdingDaysPreviewRows.length}
            >
              Save
            </Button>
          </Flex>
        }
      >
        {holdingDaysPreviewRows.length > 0 ? (
          <Box>
            <Text fontSize="sm" color="gray.600" mb={3}>
              Preview rows: {enrichedHoldingDaysPreviewRows.length}. Valid rows:{" "}
              {validHoldingDaysItems.length}.
              {invalidHoldingDaysCount > 0
                ? ` ${invalidHoldingDaysCount} row(s) will be skipped (highlighted in red).`
                : ""}
            </Text>
            <AgGrid
              tableKey="master-distributors-holding-days-preview"
              rowData={enrichedHoldingDaysPreviewRows}
              columnDefs={holdingDaysPreviewColumnDefs}
              domLayout="autoHeight"
              gridOptions={{
                getRowId: (params) =>
                  String(params.data?._rowKey ?? params.data?.cid ?? ""),
              }}
            />
          </Box>
        ) : (
          <Text fontSize="sm" color="gray.600">
            No preview data loaded.
          </Text>
        )}
      </CustomModal>
    </GlobalWrapper>
  );
}

export default DistributorListing;
