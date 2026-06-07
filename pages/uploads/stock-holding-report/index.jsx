import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  Input,
  Text,
  useDisclosure,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import CustomModal from "../../../components/CustomModal";
import AgGrid from "../../../components/AgGrid";
import FileUploaderWithColumnMapping from "../../../components/FileUploaderWithColumnMapping";
import usePermissions from "../../../customHooks/usePermissions";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import { useProducts } from "../../../customHooks/useProducts";
import useOutlets from "../../../customHooks/useOutlets";
import {
  createStockHoldingReportBatched,
  deleteStockHoldingReport,
  getStockHoldingReports,
} from "../../../helper/stockHoldingReport";

const IMPORT_COLUMN_CONFIG = [
  {
    key: "article_id",
    label: "Article ID",
    required: true,
    suggestedKey: "article_id",
    type: "number",
  },
  {
    key: "store_id",
    label: "Store ID",
    required: true,
    suggestedKey: "store_id",
    type: "number",
  },
  {
    key: "current_stock",
    label: "Current Stock",
    required: false,
    suggestedKey: "current_stock",
    type: "number",
  },
  {
    key: "current_stock_value",
    label: "Current Stock Value",
    required: false,
    suggestedKey: "current_stock_value",
    type: "number",
  },
  {
    key: "stock_duration",
    label: "Stock Duration",
    required: false,
    suggestedKey: "stock_duration",
    type: "string",
  },
  {
    key: "status",
    label: "Status",
    required: false,
    suggestedKey: "status",
    type: "string",
  },
];

const formatToday = () => new Date().toISOString().slice(0, 10);

const normalizeNumberOrZero = (value) => {
  if (value == null || value === "") return 0;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const normalizeStringOrNull = (value) => {
  if (value == null) return null;
  const trimmed = String(value).trim();
  return trimmed === "" ? null : trimmed;
};

const parseDaysValue = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  const trimmed = String(value).trim().toLowerCase();
  if (!trimmed) return null;
  const withoutSuffix = trimmed.endsWith("d")
    ? trimmed.slice(0, -1).trim()
    : trimmed;
  const parsed = Number(withoutSuffix);
  return Number.isNaN(parsed) ? null : Math.trunc(parsed);
};

const getStatusBadge = (status) => {
  const key = String(status ?? "")
    .trim()
    .toLowerCase();
  if (!key) return null;
  const colorMap = { active: "green", inactive: "red", new: "blue" };
  return {
    label: key.charAt(0).toUpperCase() + key.slice(1),
    colorScheme: colorMap[key] ?? "gray",
  };
};

function StockHoldingReportPage() {
  const canAdd = usePermissions("add_stock_holding_report");
  const canDelete = usePermissions("delete_stock_holding_report");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const { getMappedProducts } = useProducts({
    limit: 50000,
    fetchAll: true,
    fetchNonOnline: true,
  });
  const productsMap = useMemo(() => getMappedProducts(), [getMappedProducts]);
  const { outlets } = useOutlets();

  const outletsById = useMemo(() => {
    const map = {};
    (outlets || []).forEach((o) => {
      map[Number(o.outlet_id)] = o;
    });
    return map;
  }, [outlets]);

  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [reportName, setReportName] = useState("");
  const [reportDate, setReportDate] = useState(formatToday());
  const [previewRows, setPreviewRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const {
    isOpen: isImportOpen,
    onOpen: onImportOpen,
    onClose: onImportClose,
  } = useDisclosure();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStockHoldingReports();
      setRows(Array.isArray(response?.data) ? response.data : []);
    } catch (err) {
      toast.error(err?.message || "Failed to load stock holding reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const enrichedPreviewRows = useMemo(() => {
    return (previewRows || []).map((row, index) => {
      const productId = Number(row.article_id);
      const outletId = Number(row.store_id);
      const product =
        productsMap[productId] ??
        productsMap[String(productId)] ??
        productsMap[Number(productId)];
      const outlet = outletsById[outletId];
      const invalidProduct = !productId || Number.isNaN(productId) || !product;
      const invalidOutlet = !outletId || Number.isNaN(outletId) || !outlet;

      return {
        ...row,
        product_id: productId,
        outlet_id: outletId,
        product_name: product?.de_name ?? null,
        image_url: product?.image_url ?? null,
        outlet_name: outlet?.outlet_name ?? null,
        stock_duration_days: parseDaysValue(row.stock_duration),
        is_invalid: invalidProduct || invalidOutlet,
        invalid_reason: invalidProduct
          ? "Invalid article"
          : invalidOutlet
          ? "Invalid store"
          : null,
        _rowKey: `stock-holding-preview-${index}`,
      };
    });
  }, [previewRows, productsMap, outletsById]);

  const validPayloadRows = useMemo(() => {
    return enrichedPreviewRows
      .filter((row) => !row.is_invalid)
      .map((row) => ({
        product_id: Number(row.product_id),
        outlet_id: Number(row.outlet_id),
        current_stock: normalizeNumberOrZero(row.current_stock),
        current_stock_value: normalizeNumberOrZero(row.current_stock_value),
        stock_duration: parseDaysValue(row.stock_duration),
        status: normalizeStringOrNull(row.status),
      }));
  }, [enrichedPreviewRows]);

  const invalidRowsCount = useMemo(
    () => enrichedPreviewRows.filter((row) => row.is_invalid).length,
    [enrichedPreviewRows]
  );

  const handleCloseImport = useCallback(() => {
    onImportClose();
    setPreviewRows([]);
    setReportName("");
    setReportDate(formatToday());
  }, [onImportClose]);

  const handleImportMappedData = useCallback(
    (mappedData) => {
      setPreviewRows(Array.isArray(mappedData) ? mappedData : []);
      setReportName((prev) =>
        prev.trim() ? prev : `Stock Holding ${formatToday()}`
      );
      onImportOpen();
    },
    [onImportOpen]
  );

  const handleSave = useCallback(async () => {
    if (!reportName.trim()) {
      toast.error("Please upload a file to set the report name.");
      return;
    }
    if (!reportDate) {
      toast.error("Please select report date.");
      return;
    }
    if (!validPayloadRows.length) {
      toast.error(
        "No valid rows found. Each row needs a valid article and store."
      );
      return;
    }

    setSaving(true);
    try {
      const response = await createStockHoldingReportBatched({
        report_name: reportName.trim(),
        date: reportDate,
        items: validPayloadRows,
      });
      if (response?.code === 200 || response?.code === 201) {
        toast.success("Stock holding report saved.");
        handleCloseImport();
        fetchReports();
      } else {
        toast.error(
          response?.message || "Failed to save stock holding report."
        );
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save stock holding report.");
    } finally {
      setSaving(false);
    }
  }, [
    fetchReports,
    handleCloseImport,
    reportDate,
    reportName,
    validPayloadRows,
  ]);

  const handleDelete = useCallback(
    (id) => {
      if (!id) return;
      confirmDelete({
        title: "Delete Stock Holding Report",
        message:
          "Are you sure you want to delete this stock holding report? This action cannot be undone.",
        onConfirm: async () => {
          await deleteStockHoldingReport(id);
          toast.success("Stock holding report deleted.");
          fetchReports();
        },
      });
    },
    [confirmDelete, fetchReports]
  );

  const listColumnDefs = useMemo(
    () => [
      {
        field: "stock_holding_report_id",
        headerName: "ID",
        type: "id",
        sort: "desc",
      },
      { field: "report_name", headerName: "Report Name", flex: 1 },
      {
        field: "date",
        headerName: "Date",
        type: "date",
      },
      {
        field: "item_count",
        headerName: "Items",
        type: "number",
      },
      {
        field: "created_by_name",
        headerName: "Created By",
        type: "capitalized",
      },
      {
        field: "created_at",
        headerName: "Created At",
        type: "datetime",
      },
      {
        field: "action",
        headerName: "Action",
        type: "action-column",
        valueGetter: (params) => {
          const actions = [];
          if (canDelete) {
            actions.push({
              label: "Delete",
              value: "delete",
              type: "danger",
              onClick: () => handleDelete(params.data?.stock_holding_report_id),
            });
          }
          return actions;
        },
      },
    ],
    [canDelete, handleDelete]
  );

  const previewColumnDefs = useMemo(
    () => [
      {
        field: "article_id",
        headerName: "Article ID",
        type: "id",
      },
      {
        field: "store_id",
        headerName: "Store ID",
        type: "id",
      },
      {
        field: "image_url",
        headerName: "Image",
        type: "image",
      },
      {
        field: "product_name",
        headerName: "Product",
        type: "capitalized",
        flex: 1,
      },
      {
        field: "outlet_name",
        headerName: "Store",
        type: "capitalized",
        flex: 1,
      },
      {
        field: "current_stock",
        headerName: "S. Qty",
        type: "number",
      },
      {
        field: "current_stock_value",
        headerName: "S. Value",
        type: "currency",
      },
      {
        field: "stock_duration_days",
        headerName: "S. Duration",
        type: "number",
      },
      {
        field: "status",
        headerName: "Status",
        type: "badge-column",
        valueGetter: (params) => getStatusBadge(params.data?.status),
      },
      {
        field: "invalid_reason",
        headerName: "Issue",
        type: "capitalized",
      },
    ],
    []
  );

  return (
    <GlobalWrapper
      title="Stock Holding Report"
      permissionKey="view_stock_holding_report"
    >
      <ConfirmDeleteDialog />
      <CustomContainer
        title="Stock Holding Report"
        filledHeader
        rightSection={
          canAdd ? (
            <FileUploaderWithColumnMapping
              config={IMPORT_COLUMN_CONFIG}
              onMappedData={handleImportMappedData}
              accept=".xlsx,.xls,.csv"
              renderer={(openFileBrowser) => (
                <Button onClick={openFileBrowser} colorScheme="teal" size="sm">
                  Import
                </Button>
              )}
            />
          ) : null
        }
      >
        {loading ? (
          <Text py={4} color="gray.600">
            Loading...
          </Text>
        ) : (
          <AgGrid
            tableKey="stock-holding-report-list"
            rowData={rows}
            columnDefs={listColumnDefs}
          />
        )}
      </CustomContainer>

      <CustomModal
        isOpen={isImportOpen}
        onClose={handleCloseImport}
        title="Import Stock Holding Report"
        size="6xl"
        colorScheme="teal"
        footer={
          <Flex justifyContent="flex-end" gap={4}>
            <Button variant="outline" onClick={handleCloseImport}>
              Cancel
            </Button>
            <Button
              colorScheme="teal"
              onClick={handleSave}
              isLoading={saving}
              loadingText="Saving..."
              isDisabled={!previewRows.length}
            >
              Save
            </Button>
          </Flex>
        }
      >
        <Flex direction="column" gap={4}>
          <Flex gap={4} flexWrap="wrap">
            <Box w={{ base: "100%", md: "280px" }}>
              <Text fontSize="sm" mb={1} color="gray.600">
                Report Name
              </Text>
              <Input
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                placeholder="Stock Holding Report"
              />
            </Box>
            <Box w={{ base: "100%", md: "220px" }}>
              <Text fontSize="sm" mb={1} color="gray.600">
                Date
              </Text>
              <Input
                type="date"
                value={reportDate}
                onChange={(e) => setReportDate(e.target.value)}
              />
            </Box>
          </Flex>

          {previewRows.length > 0 ? (
            <Box>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Preview rows: {enrichedPreviewRows.length}. Valid rows:{" "}
                {validPayloadRows.length}.
                {invalidRowsCount > 0
                  ? ` ${invalidRowsCount} row(s) will be skipped (invalid article or store).`
                  : ""}
              </Text>
              <AgGrid
                tableKey="stock-holding-report-preview"
                rowData={enrichedPreviewRows}
                columnDefs={previewColumnDefs}
                domLayout="autoHeight"
              />
            </Box>
          ) : (
            <Text fontSize="sm" color="gray.600">
              No preview data loaded.
            </Text>
          )}
        </Flex>
      </CustomModal>
    </GlobalWrapper>
  );
}

export default StockHoldingReportPage;
