import React, { useEffect, useMemo, useState, useCallback } from "react";
import moment from "moment";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Button,
  Text,
  Box,
  useDisclosure,
  Flex,
  Tabs,
  TabList,
  TabPanel,
  TabPanels,
  Tab,
  Badge,
} from "@chakra-ui/react";
import Link from "next/link";
import AgGrid from "../../components/AgGrid";
import CustomModal from "../../components/CustomModal";
import { useOffersV3Items, useOffersV3Batches } from "../../customHooks/useOffersV3";
import usePermissions from "../../customHooks/usePermissions";
import toast from "react-hot-toast";
import offersV3 from "../../helper/offersV3";
import FileUploaderWithColumnMapping from "../../components/FileUploaderWithColumnMapping";
import { downloadCsv } from "../../util/exportCSVFile";
import {
  OFFER_TYPE_LABELS,
  ITEM_STATUS_LABELS,
  ITEM_STATUS_COLORS,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS,
} from "../../constants/offersV3";

const STOCK_UPLOAD_COLUMNS = [
  {
    key: "item_code",
    label: "Item Code (Product ID)",
    required: true,
    suggestedKey: "item_code",
    aliases: ["itemcode", "product_id", "productid", "item id"],
    type: "number",
  },
  {
    key: "outlet",
    label: "Outlet",
    required: true,
    suggestedKey: "outlet",
    aliases: ["outlet_name", "outletname", "branch", "outlet id", "store"],
    type: "string",
  },
  {
    key: "batch_no",
    label: "Batch No",
    required: true,
    suggestedKey: "batch_no",
    aliases: ["batchno", "batch", "batch number", "lot", "lot no"],
    type: "string",
  },
  {
    key: "stock_qty",
    label: "Stock Qty",
    required: true,
    suggestedKey: "stock_qty",
    aliases: ["stockqty", "qty", "quantity", "stock"],
    type: "number",
  },
];

// Price Checker-style export (Price_Outlet_Batch_Wise_Export). MRP/Selling
// Price always come from Old_MRP/Old_Selling_Price — a fixed rule, not
// auto-detected — so those are the only aliases offered; New_MRP/
// New_Selling_Price are intentionally never suggested.
const PRICE_UPLOAD_COLUMNS = [
  {
    key: "item_code",
    label: "Item Code (Product ID)",
    required: true,
    suggestedKey: "Item_Code",
    aliases: ["itemcode", "product_id", "productid", "item id"],
    type: "number",
  },
  {
    key: "outlet",
    label: "Outlet",
    required: true,
    suggestedKey: "Outlet_Name",
    aliases: ["outlet", "outlet_id", "outletname", "branch", "store"],
    type: "string",
  },
  {
    key: "batch_no",
    label: "Batch No",
    required: true,
    suggestedKey: "Batch_No",
    aliases: ["batchno", "batch", "batch number", "lot"],
    type: "string",
  },
  {
    key: "mrp",
    label: "MRP (always Old_MRP)",
    required: true,
    suggestedKey: "Old_MRP",
    aliases: ["old mrp", "oldmrp"],
    type: "number",
  },
  {
    key: "selling_price",
    label: "Selling Price (always Old_Selling_Price)",
    required: true,
    suggestedKey: "Old_Selling_Price",
    aliases: ["old selling price", "oldsellingprice"],
    type: "number",
  },
];

const IMPORT_COLUMNS = [
  {
    key: "scope",
    label: "Scope (item / batch)",
    required: true,
    suggestedKey: "scope",
    aliases: ["offer scope", "type"],
    type: "string",
  },
  {
    key: "item_code",
    label: "Item Code (Product ID)",
    required: true,
    suggestedKey: "item_code",
    aliases: ["itemcode", "product_id", "productid"],
    type: "number",
  },
  {
    key: "outlet",
    label: "Outlet (batch offers only)",
    required: false,
    suggestedKey: "outlet",
    aliases: ["outlet_name", "outletname", "branch"],
    type: "string",
  },
  {
    key: "batch_no",
    label: "Batch No (batch offers only)",
    required: false,
    suggestedKey: "batch_no",
    aliases: ["batchno", "batch", "batch number", "lot"],
    type: "string",
  },
  {
    key: "offer_type",
    label: "Offer Type",
    required: true,
    suggestedKey: "offer_type",
    aliases: ["offertype", "type of offer"],
    type: "string",
  },
  {
    key: "value",
    label: "Value",
    required: true,
    suggestedKey: "value",
    type: "number",
  },
  {
    key: "threshold_qty",
    label: "Threshold Qty (item offers only; defaults to 0)",
    required: false,
    suggestedKey: "threshold_qty",
    aliases: ["threshold", "low stock threshold", "threshold qty"],
    type: "number",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    suggestedKey: "status",
    type: "string",
  },
];

function StatusBadge({ status, labels, colors }) {
  return <Badge colorScheme={colors[status] ?? "gray"}>{labels[status] ?? status}</Badge>;
}

function downloadSkippedRows(skippedRows, filenamePrefix) {
  if (!skippedRows?.length) return;
  const fileName = `${filenamePrefix}-skipped-${new Date().toISOString().slice(0, 10)}.csv`;
  downloadCsv(skippedRows, fileName);
}

function SkippedRowsDownloadButton({ skippedRows, filenamePrefix }) {
  if (!skippedRows?.length) return null;
  return (
    <Button
      size="sm"
      variant="outline"
      colorScheme="red"
      mt={2}
      onClick={() => downloadSkippedRows(skippedRows, filenamePrefix)}
    >
      Download skipped rows ({skippedRows.length})
    </Button>
  );
}

function ItemOffersTab({ canAdd }) {
  const { offers, loading, refetch } = useOffersV3Items();

  const handleToggleStatus = useCallback(
    async (row) => {
      try {
        await offersV3.items.update(row.id, { status: row.status === "active" ? "inactive" : "active" });
        toast.success(row.status === "active" ? "Offer deactivated" : "Offer reactivated");
        refetch();
      } catch (err) {
        toast.error(err?.message ?? "Update failed");
      }
    },
    [refetch]
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
        valueGetter: (params) => OFFER_TYPE_LABELS[params.data?.offer_type] ?? params.data?.offer_type,
      },
      { field: "value", headerName: "Value", type: "number" },
      { field: "threshold_qty", headerName: "Threshold Qty", type: "number" },
      {
        field: "status",
        headerName: "Status",
        cellRenderer: (params) => (
          <Flex align="center" h="100%">
            <StatusBadge status={params.data?.status} labels={ITEM_STATUS_LABELS} colors={ITEM_STATUS_COLORS} />
          </Flex>
        ),
      },
      { field: "created_by_name", headerName: "Created By", hideByDefault: true },
      { field: "created_at", headerName: "Date Created", type: "datetime" },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const actions = [
            { label: "View", iconType: "view", redirectionUrl: `/offers-v3/item/view?id=${row.id}` },
            { label: "Edit", iconType: "edit", redirectionUrl: `/offers-v3/item/edit?id=${row.id}` },
          ];
          if (canAdd) {
            actions.unshift({
              label: row.status === "active" ? "Make Inactive" : "Reactivate",
              icon: row.status === "active" ? "fa-solid fa-toggle-on" : "fa-solid fa-toggle-off",
              colorScheme: row.status === "active" ? "green" : "red",
              onClick: () => handleToggleStatus(row),
            });
          }
          return actions;
        },
      },
    ],
    [canAdd, handleToggleStatus]
  );

  if (loading) {
    return (
      <Text py={4} color="gray.600">
        Loading...
      </Text>
    );
  }

  return (
    <>
      <Flex justify="flex-end" mb={3}>
        {canAdd ? (
          <Link href="/offers-v3/item/create" passHref>
            <Button colorScheme="purple" size="sm" as="a">
              Create Item-Level Offer
            </Button>
          </Link>
        ) : null}
      </Flex>
      <AgGrid
        rowData={offers}
        columnDefs={colDefs}
        tableKey="offers-v3-items-list"
        getRowId={(params) => String(params.data?.id ?? "")}
      />
    </>
  );
}

function BatchOffersTab({ canAdd }) {
  const { offers, loading, refetch } = useOffersV3Batches();

  const handleEnd = useCallback(
    async (row) => {
      try {
        await offersV3.batches.end(row.id);
        toast.success("Batch marked Zero — Ended");
        refetch();
      } catch (err) {
        toast.error(err?.message ?? "Failed to end batch");
      }
    },
    [refetch]
  );

  const handleMakeInactive = useCallback(
    async (row) => {
      try {
        await offersV3.batches.update(row.id, { status: "inactive" });
        toast.success("Offer marked inactive");
        refetch();
      } catch (err) {
        toast.error(err?.message ?? "Update failed");
      }
    },
    [refetch]
  );

  const colDefs = useMemo(
    () => [
      { field: "id", headerName: "ID", type: "id" },
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "item_name", headerName: "Item Name", flex: 1.5 },
      { field: "outlet_name", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      {
        field: "offer_type",
        headerName: "Offer Type",
        flex: 1,
        valueGetter: (params) => OFFER_TYPE_LABELS[params.data?.offer_type] ?? params.data?.offer_type,
      },
      { field: "value", headerName: "Value", type: "number" },
      {
        field: "status",
        headerName: "Status",
        cellRenderer: (params) => (
          <Flex align="center" h="100%">
            <StatusBadge status={params.data?.status} labels={BATCH_STATUS_LABELS} colors={BATCH_STATUS_COLORS} />
          </Flex>
        ),
      },
      { field: "created_by_name", headerName: "Created By", hideByDefault: true },
      { field: "created_at", headerName: "Date Created", type: "datetime" },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          const actions = [
            { label: "View", iconType: "view", redirectionUrl: `/offers-v3/batch/view?id=${row.id}` },
            { label: "Edit", iconType: "edit", redirectionUrl: `/offers-v3/batch/edit?id=${row.id}` },
          ];
          if (canAdd) {
            if (row.status === "zero_stock_flagged") {
              actions.unshift({
                label: "Confirm Batch Zero — End",
                icon: "fa-solid fa-ban",
                colorScheme: "orange",
                onClick: () => handleEnd(row),
              });
            }
            if (row.status !== "inactive" && row.status !== "batch_zero_ended") {
              actions.push({
                label: "Make Inactive",
                icon: "fa-solid fa-toggle-on",
                colorScheme: "red",
                onClick: () => handleMakeInactive(row),
              });
            }
          }
          return actions;
        },
      },
    ],
    [canAdd, handleEnd, handleMakeInactive]
  );

  if (loading) {
    return (
      <Text py={4} color="gray.600">
        Loading...
      </Text>
    );
  }

  return (
    <>
      <Flex justify="flex-end" mb={3}>
        {canAdd ? (
          <Link href="/offers-v3/batch/create" passHref>
            <Button colorScheme="purple" size="sm" as="a">
              Create Batch-Specific Offer
            </Button>
          </Link>
        ) : null}
      </Flex>
      <AgGrid
        rowData={offers}
        columnDefs={colDefs}
        tableKey="offers-v3-batches-list"
        getRowId={(params) => String(params.data?.id ?? "")}
      />
    </>
  );
}

// Rows/products/last-uploaded-at summary, shown for every Offers V3 upload
// (stock, price, go-live import), matching the Price Checker format.
function UploadMetaSummary({ meta }) {
  if (!meta?.uploaded_at) return null;
  return (
    <Text fontSize="sm" color="gray.600" mb={3}>
      {meta.total_rows} rows · {meta.total_products} products total · uploaded{" "}
      {moment(meta.uploaded_at).format("DD MMM YYYY, HH:mm")}
    </Text>
  );
}

function PriceUploadTab({ onUploaded }) {
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();
  const [previewRows, setPreviewRows] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [uploadMeta, setUploadMeta] = useState(null);

  const fetchUploadMeta = useCallback(() => {
    offersV3
      .uploadMeta()
      .then((data) => setUploadMeta(data.price ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUploadMeta();
  }, [fetchUploadMeta]);

  const previewColDefs = useMemo(
    () => [
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "outlet", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      { field: "mrp", headerName: "MRP", type: "number" },
      { field: "selling_price", headerName: "Selling Price", type: "number" },
    ],
    []
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
      const res = await offersV3.priceUpload(previewRows);
      setLastResult(res);
      toast.success(
        `Upserted ${res.upserted} row(s), skipped ${res.skippedInvalidRows ?? 0}. ${res.untagged?.length ?? 0} new untagged batch(es).`
      );
      if (res.unresolvedOutlets?.length) {
        toast.error(`Could not resolve outlet(s): ${res.unresolvedOutlets.join(", ")}`);
      }
      onPreviewClose();
      setPreviewRows([]);
      onUploaded?.();
      fetchUploadMeta();
    } catch (err) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setConfirming(false);
    }
  };

  const handlePreviewClose = () => {
    onPreviewClose();
    setPreviewRows([]);
  };

  return (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Upload the Price Checker-style export (Item Code, Outlet, Batch No, MRP, Selling Price).
        MRP/Selling Price are always read from Old_MRP/Old_Selling_Price — New_MRP/New_Selling_Price
        are blank in this export, so that mapping is fixed, not auto-detected. Only mrp/selling_price
        are updated for a matching row; stock is untouched. Upload price data before stock each cycle
        so MRP/Selling Price are current by the time zero-stock and mismatch checks run.
      </Text>
      <UploadMetaSummary meta={uploadMeta} />
      <FileUploaderWithColumnMapping config={PRICE_UPLOAD_COLUMNS} onMappedData={handleImportMappedData} />

      {lastResult ? (
        <Box mt={4} p={3} bg="purple.50" borderRadius="md" borderWidth="1px" borderColor="purple.100">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Last upload summary
          </Text>
          <Text fontSize="sm">Rows upserted: {lastResult.upserted}</Text>
          <Text fontSize="sm">Rows skipped (missing Item Code/Batch No): {lastResult.skippedInvalidRows ?? 0}</Text>
          <Text fontSize="sm">New untagged batches: {lastResult.untagged?.length ?? 0}</Text>
          {lastResult.unresolvedOutlets?.length ? (
            <Text fontSize="sm" color="red.600">
              Unresolved outlets: {lastResult.unresolvedOutlets.join(", ")}
            </Text>
          ) : null}
          <SkippedRowsDownloadButton skippedRows={lastResult.skippedRows} filenamePrefix="offers-v3-price-upload" />
        </Box>
      ) : null}

      <CustomModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        title={`Preview price upload (${previewRows.length} rows)`}
        size="4xl"
        scrollBehavior="inside"
        contentProps={{ maxH: "90vh" }}
        bodyProps={{ overflow: "auto" }}
        footer={
          <>
            <Button variant="ghost" colorScheme="purple" onClick={handlePreviewClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleConfirmImport} isLoading={confirming} loadingText="Uploading...">
              Confirm upload
            </Button>
          </>
        }
      >
        <AgGrid rowData={previewRows} columnDefs={previewColDefs} tableKey="offers-v3-price-preview" defaultRows={10} />
      </CustomModal>
    </Box>
  );
}

function StockUploadTab({ onUploaded }) {
  const {
    isOpen: isPreviewOpen,
    onOpen: onPreviewOpen,
    onClose: onPreviewClose,
  } = useDisclosure();
  const [previewRows, setPreviewRows] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [uploadMeta, setUploadMeta] = useState(null);

  const fetchUploadMeta = useCallback(() => {
    offersV3
      .uploadMeta()
      .then((data) => setUploadMeta(data.stock ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchUploadMeta();
  }, [fetchUploadMeta]);

  const previewColDefs = useMemo(
    () => [
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "outlet", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      { field: "stock_qty", headerName: "Stock Qty", type: "number" },
    ],
    []
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
      const res = await offersV3.stockUpload(previewRows);
      setLastResult(res);
      toast.success(
        `Upserted ${res.upserted} row(s), skipped ${res.skippedInvalidRows ?? 0}. ${
          res.flagged?.length ?? 0
        } flagged zero-stock, ${res.reverted?.length ?? 0} reverted, ${
          res.untagged?.length ?? 0
        } new untagged batch(es), ${res.lowStock?.length ?? 0} low-stock warning(s).`
      );
      if (res.unresolvedOutlets?.length) {
        toast.error(`Could not resolve outlet(s): ${res.unresolvedOutlets.join(", ")}`);
      }
      onPreviewClose();
      setPreviewRows([]);
      onUploaded?.();
      fetchUploadMeta();
    } catch (err) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setConfirming(false);
    }
  };

  const handlePreviewClose = () => {
    onPreviewClose();
    setPreviewRows([]);
  };

  return (
    <Box>
      <Text fontSize="sm" color="gray.600" mb={4}>
        Upload the latest batch stock snapshot (Item Code, Outlet, Batch No, Stock Qty) — after
        Price Upload each cycle, so MRP/Selling Price are already current. Matching active batch
        offers are flagged Zero Stock when their stock hits 0, and auto-reverted to Active if stock
        comes back. New batches of items that already carry an active batch-specific offer
        elsewhere are surfaced under Untagged Batches instead of assuming they inherit it —
        items covered by an item-level offer don&apos;t need this, since that offer already applies
        to all current and future stock automatically. For item-level offers, any outlet/batch
        whose stock drops to (or below) the offer&apos;s Threshold Qty is instead surfaced under
        Low Stock Warnings — a heads-up before that batch is replenished at a different cost
        under the same still-active discount.
      </Text>
      <UploadMetaSummary meta={uploadMeta} />
      <FileUploaderWithColumnMapping config={STOCK_UPLOAD_COLUMNS} onMappedData={handleImportMappedData} />

      {lastResult ? (
        <Box mt={4} p={3} bg="purple.50" borderRadius="md" borderWidth="1px" borderColor="purple.100">
          <Text fontSize="sm" fontWeight="medium" mb={1}>
            Last upload summary
          </Text>
          <Text fontSize="sm">Rows upserted: {lastResult.upserted}</Text>
          <Text fontSize="sm">Rows skipped (missing Item Code/Batch No): {lastResult.skippedInvalidRows ?? 0}</Text>
          <Text fontSize="sm">Flagged zero-stock: {lastResult.flagged?.length ?? 0}</Text>
          <Text fontSize="sm">Reverted to active: {lastResult.reverted?.length ?? 0}</Text>
          <Text fontSize="sm">New untagged batches: {lastResult.untagged?.length ?? 0}</Text>
          <Text fontSize="sm">Low-stock warnings (item-level offers): {lastResult.lowStock?.length ?? 0}</Text>
          {lastResult.unresolvedOutlets?.length ? (
            <Text fontSize="sm" color="red.600">
              Unresolved outlets: {lastResult.unresolvedOutlets.join(", ")}
            </Text>
          ) : null}
          <SkippedRowsDownloadButton skippedRows={lastResult.skippedRows} filenamePrefix="offers-v3-stock-upload" />
        </Box>
      ) : null}

      <CustomModal
        isOpen={isPreviewOpen}
        onClose={handlePreviewClose}
        title={`Preview stock upload (${previewRows.length} rows)`}
        size="4xl"
        scrollBehavior="inside"
        contentProps={{ maxH: "90vh" }}
        bodyProps={{ overflow: "auto" }}
        footer={
          <>
            <Button variant="ghost" colorScheme="purple" onClick={handlePreviewClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleConfirmImport} isLoading={confirming} loadingText="Uploading...">
              Confirm upload
            </Button>
          </>
        }
      >
        <AgGrid rowData={previewRows} columnDefs={previewColDefs} tableKey="offers-v3-stock-preview" defaultRows={10} />
      </CustomModal>
    </Box>
  );
}

function UntaggedBatchesTab({ canAdd, refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await offersV3.untaggedBatches.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.message ?? "Failed to fetch untagged batches");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshKey]);

  const handleDismiss = useCallback(
    async (row) => {
      try {
        await offersV3.untaggedBatches.dismiss(row.id);
        toast.success("Alert dismissed");
        fetchRows();
      } catch (err) {
        toast.error(err?.message ?? "Failed to dismiss");
      }
    },
    [fetchRows]
  );

  const colDefs = useMemo(
    () => [
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "item_name", headerName: "Item Name", flex: 1.5 },
      { field: "outlet_name", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      { field: "detected_at", headerName: "Detected At", type: "datetime" },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row || !canAdd) return [];
          return [
            {
              label: "Create Batch Offer",
              icon: "fa-solid fa-plus",
              colorScheme: "purple",
              redirectionUrl: `/offers-v3/batch/create?item_code=${row.item_code}&outlet_id=${row.outlet_id}&batch_no=${encodeURIComponent(
                row.batch_no
              )}`,
            },
            {
              label: "Dismiss",
              icon: "fa-solid fa-xmark",
              colorScheme: "gray",
              onClick: () => handleDismiss(row),
            },
          ];
        },
      },
    ],
    [canAdd, handleDismiss]
  );

  if (loading) {
    return (
      <Text py={4} color="gray.600">
        Loading...
      </Text>
    );
  }

  return (
    <>
      <Text fontSize="sm" color="gray.600" mb={3}>
        New batches seen in a stock or price upload for an item that already has an active
        batch-specific offer elsewhere (items covered by an item-level offer don&apos;t show up
        here — that offer already applies automatically). Confirm by creating a batch offer for
        it, or dismiss if it shouldn&apos;t be tagged.
      </Text>
      <AgGrid
        rowData={rows}
        columnDefs={colDefs}
        tableKey="offers-v3-untagged-batches"
        getRowId={(params) => String(params.data?.id ?? "")}
      />
    </>
  );
}

function LowStockWarningsTab({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await offersV3.lowStockWarnings.list();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.message ?? "Failed to fetch low-stock warnings");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshKey]);

  const handleDismiss = useCallback(
    async (row) => {
      try {
        await offersV3.lowStockWarnings.dismiss(row.id);
        toast.success("Warning dismissed");
        fetchRows();
      } catch (err) {
        toast.error(err?.message ?? "Failed to dismiss");
      }
    },
    [fetchRows]
  );

  const colDefs = useMemo(
    () => [
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "item_name", headerName: "Item Name", flex: 1.5 },
      { field: "outlet_name", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      { field: "stock_qty", headerName: "Stock Qty", type: "number" },
      { field: "threshold_qty", headerName: "Threshold Qty", type: "number" },
      { field: "detected_at", headerName: "Detected At", type: "datetime" },
      {
        field: "actions",
        headerName: "Action",
        type: "action-icons",
        valueGetter: (params) => {
          const row = params.data;
          if (!row) return [];
          return [
            {
              label: "Dismiss",
              icon: "fa-solid fa-xmark",
              colorScheme: "gray",
              onClick: () => handleDismiss(row),
            },
          ];
        },
      },
    ],
    [handleDismiss]
  );

  if (loading) {
    return (
      <Text py={4} color="gray.600">
        Loading...
      </Text>
    );
  }

  return (
    <>
      <Text fontSize="sm" color="gray.600" mb={3}>
        Item-level offers only. An outlet/batch whose stock is above 0 but at or below its
        offer&apos;s Threshold Qty — a window to end the offer before that batch is replenished
        at a different cost under the same still-active discount. The offer&apos;s status stays
        Active; other outlets/batches of the same item are unaffected. Clears automatically once
        stock rises back above the threshold, or when the offer is made inactive.
      </Text>
      <AgGrid
        rowData={rows}
        columnDefs={colDefs}
        tableKey="offers-v3-low-stock-warnings"
        getRowId={(params) => String(params.data?.id ?? "")}
      />
    </>
  );
}

function MismatchesTab({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const data = await offersV3.mismatches();
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error(err?.message ?? "Failed to fetch mismatches");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    fetchRows();
  }, [fetchRows, refreshKey]);

  const colDefs = useMemo(
    () => [
      { field: "scope", headerName: "Scope", flex: 0.7 },
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "item_name", headerName: "Item Name", flex: 1.5 },
      { field: "outlet_name", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      {
        field: "offer_type",
        headerName: "Offer Type",
        flex: 1,
        valueGetter: (params) => OFFER_TYPE_LABELS[params.data?.offer_type] ?? params.data?.offer_type,
      },
      { field: "value", headerName: "Value", type: "number" },
      { field: "mrp", headerName: "MRP", type: "currency" },
      { field: "expected_selling_price", headerName: "Expected SP", type: "currency" },
      { field: "actual_selling_price", headerName: "Actual SP", type: "currency" },
    ],
    []
  );

  if (loading) {
    return (
      <Text py={4} color="gray.600">
        Loading...
      </Text>
    );
  }

  return (
    <>
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="sm" color="gray.600">
          Active offers where the recorded selling price doesn&apos;t match what the offer should
          produce from the current MRP.
        </Text>
        <Button size="sm" variant="outline" colorScheme="purple" onClick={fetchRows}>
          Refresh
        </Button>
      </Flex>
      <AgGrid
        rowData={rows}
        columnDefs={colDefs}
        tableKey="offers-v3-mismatches"
        getRowId={(params) => `${params.data?.scope}-${params.data?.offer_id}`}
      />
    </>
  );
}

function OffersV3Listing() {
  const canAdd = usePermissions("add_offers_v3");
  const [tabIndex, setTabIndex] = useState(0);
  const [dataVersion, setDataVersion] = useState(0);
  const {
    isOpen: isImportPreviewOpen,
    onOpen: onImportPreviewOpen,
    onClose: onImportPreviewClose,
  } = useDisclosure();
  const [importRows, setImportRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [lastImportResult, setLastImportResult] = useState(null);
  const [importUploadMeta, setImportUploadMeta] = useState(null);

  const bumpDataVersion = useCallback(() => setDataVersion((v) => v + 1), []);

  const fetchImportUploadMeta = useCallback(() => {
    offersV3
      .uploadMeta()
      .then((data) => setImportUploadMeta(data.import ?? null))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchImportUploadMeta();
  }, [fetchImportUploadMeta]);

  const importPreviewColDefs = useMemo(
    () => [
      { field: "scope", headerName: "Scope", flex: 0.7 },
      { field: "item_code", headerName: "Item Code", flex: 1 },
      { field: "outlet", headerName: "Outlet", flex: 1 },
      { field: "batch_no", headerName: "Batch No", flex: 1 },
      { field: "offer_type", headerName: "Offer Type", flex: 1 },
      { field: "value", headerName: "Value", type: "number" },
      { field: "threshold_qty", headerName: "Threshold Qty", type: "number" },
      { field: "status", headerName: "Status", flex: 1 },
    ],
    []
  );

  const handleImportMappedData = (mappedRows) => {
    if (!mappedRows?.length) return;
    setImportRows(mappedRows);
    onImportPreviewOpen();
  };

  const handleConfirmImport = async () => {
    if (!importRows.length) return;
    setImporting(true);
    try {
      const res = await offersV3.import(importRows);
      setLastImportResult(res);
      toast.success(
        `Imported ${res.itemInserted} item-level and ${res.batchInserted} batch-specific offer(s). Skipped ${res.skipped}, failed ${res.failed?.length ?? 0}.`
      );
      onImportPreviewClose();
      setImportRows([]);
      bumpDataVersion();
      fetchImportUploadMeta();
    } catch (err) {
      toast.error(err?.message ?? "Import failed");
    } finally {
      setImporting(false);
    }
  };

  const handleImportPreviewClose = () => {
    onImportPreviewClose();
    setImportRows([]);
  };

  return (
    <GlobalWrapper title="Offers V3" permissionKey="view_offers_v3">
      <CustomContainer
        title="Offers V3"
        filledHeader
        rightSection={
          canAdd ? (
            <FileUploaderWithColumnMapping
              config={IMPORT_COLUMNS}
              onMappedData={handleImportMappedData}
              renderer={(openFileBrowser) => (
                <Button onClick={openFileBrowser} colorScheme="purple" variant="outline" size="sm">
                  One-Time Go-Live Import
                </Button>
              )}
            />
          ) : null
        }
      >
        {lastImportResult || importUploadMeta ? (
          <Box mb={4} p={3} bg="purple.50" borderRadius="md" borderWidth="1px" borderColor="purple.100">
            <Text fontSize="sm" fontWeight="medium" mb={1}>
              Last go-live import summary
            </Text>
            <UploadMetaSummary meta={importUploadMeta} />
            {lastImportResult ? (
              <>
                <Text fontSize="sm">Item-level offers created: {lastImportResult.itemInserted}</Text>
                <Text fontSize="sm">Batch-specific offers created: {lastImportResult.batchInserted}</Text>
                <Text fontSize="sm">Rows skipped (validation): {lastImportResult.skipped}</Text>
                <Text fontSize="sm">
                  Rows failed (e.g. unknown item code): {lastImportResult.failed?.length ?? 0}
                </Text>
                <SkippedRowsDownloadButton
                  skippedRows={lastImportResult.skippedRows}
                  filenamePrefix="offers-v3-import"
                />
              </>
            ) : null}
          </Box>
        ) : null}
        <Tabs colorScheme="purple" isLazy lazyBehavior="keepMounted" index={tabIndex} onChange={setTabIndex}>
          <TabList flexWrap="wrap">
            <Tab>Item-Level Offers</Tab>
            <Tab>Batch-Specific Offers</Tab>
            <Tab>Price Upload</Tab>
            <Tab>Stock Upload</Tab>
            <Tab>Untagged Batches</Tab>
            <Tab>Low Stock Warnings</Tab>
            <Tab>Price Mismatches</Tab>
          </TabList>
          <TabPanels>
            <TabPanel px={0}>
              <ItemOffersTab canAdd={canAdd} key={`items-${dataVersion}`} />
            </TabPanel>
            <TabPanel px={0}>
              <BatchOffersTab canAdd={canAdd} key={`batches-${dataVersion}`} />
            </TabPanel>
            <TabPanel px={0}>
              <PriceUploadTab onUploaded={bumpDataVersion} />
            </TabPanel>
            <TabPanel px={0}>
              <StockUploadTab onUploaded={bumpDataVersion} />
            </TabPanel>
            <TabPanel px={0}>
              <UntaggedBatchesTab canAdd={canAdd} refreshKey={dataVersion} />
            </TabPanel>
            <TabPanel px={0}>
              <LowStockWarningsTab refreshKey={dataVersion} />
            </TabPanel>
            <TabPanel px={0}>
              <MismatchesTab refreshKey={dataVersion} />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </CustomContainer>

      <CustomModal
        isOpen={isImportPreviewOpen}
        onClose={handleImportPreviewClose}
        title={`Preview import (${importRows.length} rows)`}
        size="4xl"
        scrollBehavior="inside"
        contentProps={{ maxH: "90vh" }}
        bodyProps={{ overflow: "auto" }}
        footer={
          <>
            <Button variant="ghost" colorScheme="purple" onClick={handleImportPreviewClose}>
              Cancel
            </Button>
            <Button colorScheme="purple" onClick={handleConfirmImport} isLoading={importing} loadingText="Importing...">
              Confirm import
            </Button>
          </>
        }
      >
        <Text fontSize="sm" color="gray.600" mb={4}>
          These rows are treated as already-confirmed offers — no validation or threshold logic is
          applied. Use only for the initial go-live load.
        </Text>
        <AgGrid rowData={importRows} columnDefs={importPreviewColDefs} tableKey="offers-v3-import-preview" defaultRows={10} />
      </CustomModal>
    </GlobalWrapper>
  );
}

export default OffersV3Listing;
