import React, { useCallback, useEffect, useState } from "react";
import {
  Box,
  Button,
  Flex,
  SimpleGrid,
  Text,
} from "@chakra-ui/react";
import moment from "moment";
import toast from "react-hot-toast";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../../components/CustomContainer";
import usePermissions from "../../../customHooks/usePermissions";
import { useConfirmDelete } from "../../../customHooks/useConfirmDelete";
import {
  deleteStockHoldingReport,
  getStockHoldingReports,
  syncStockHoldingReport,
} from "../../../helper/stockHoldingReport";
import { clearAllCachedReports } from "../../../util/stockHoldingDashboardCache";

function formatReportDate(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY") : String(value);
}

function formatDateTime(value) {
  if (!value) return "—";
  const m = moment(value);
  return m.isValid() ? m.format("DD MMM YYYY, hh:mm A") : String(value);
}

function ReportDetail({ label, value }) {
  return (
    <Box>
      <Text fontSize="xs" fontWeight="medium" color="gray.500" textTransform="uppercase">
        {label}
      </Text>
      <Text fontSize="md" fontWeight="semibold" color="gray.800" mt={1}>
        {value}
      </Text>
    </Box>
  );
}

function StockHoldingReportPage() {
  const canSync = usePermissions("add_stock_holding_report");
  const canDelete = usePermissions("delete_stock_holding_report");
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [currentReport, setCurrentReport] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getStockHoldingReports();
      const list = Array.isArray(response?.data) ? response.data : [];
      const latest = list.length
        ? [...list].sort(
            (a, b) =>
              Number(b.stock_holding_report_id) - Number(a.stock_holding_report_id)
          )[0]
        : null;
      setCurrentReport(latest);
    } catch (err) {
      toast.error(err?.message || "Failed to load stock holding report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleSync = useCallback(async () => {
    setSyncing(true);
    try {
      const response = await syncStockHoldingReport();
      await clearAllCachedReports();
      toast.success(
        `Stock holding report synced (${Number(
          response?.data?.imported_rows ?? response?.data?.item_count ?? 0
        ).toLocaleString()} rows).`
      );
      fetchReports();
    } catch (err) {
      toast.error(err?.message || "Failed to sync stock holding report.");
    } finally {
      setSyncing(false);
    }
  }, [fetchReports]);

  const handleDelete = useCallback(() => {
    const id = currentReport?.stock_holding_report_id;
    if (!id) return;
    confirmDelete({
      title: "Delete Stock Holding Report",
      message:
        "Are you sure you want to delete the current stock holding report? This action cannot be undone.",
      onConfirm: async () => {
        await deleteStockHoldingReport(id);
        await clearAllCachedReports();
        toast.success("Stock holding report deleted.");
        fetchReports();
      },
    });
  }, [confirmDelete, currentReport, fetchReports]);

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
          canSync ? (
            <Button
              onClick={handleSync}
              colorScheme="teal"
              size="sm"
              isLoading={syncing}
              loadingText="Syncing..."
            >
              Sync Now
            </Button>
          ) : null
        }
      >
        <Text fontSize="sm" color="gray.600" mb={4}>
          Stock holding data is fetched automatically from Delium every day at
          7:30 AM. Each successful sync replaces the previous report and powers
          the stock holding dashboard.
        </Text>

        {loading ? (
          <Text py={4} color="gray.600">
            Loading...
          </Text>
        ) : currentReport ? (
          <Box
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            overflow="hidden"
            bg="white"
          >
            <Flex
              justify="space-between"
              align={{ base: "stretch", md: "center" }}
              direction={{ base: "column", md: "row" }}
              gap={4}
              px={5}
              py={4}
              bg="gray.50"
              borderBottomWidth="1px"
              borderColor="gray.200"
            >
              <Box>
                <Text fontSize="lg" fontWeight="semibold" color="gray.800">
                  {currentReport.report_name || "Stock Holding Report"}
                </Text>
                <Text fontSize="sm" color="gray.500" mt={1}>
                  Report #{currentReport.stock_holding_report_id}
                </Text>
              </Box>
              {canDelete ? (
                <Button
                  colorScheme="red"
                  variant="outline"
                  size="sm"
                  alignSelf={{ base: "flex-start", md: "center" }}
                  onClick={handleDelete}
                >
                  Delete Report
                </Button>
              ) : null}
            </Flex>

            <Box px={5} py={5}>
              <SimpleGrid columns={{ base: 1, sm: 2, lg: 3 }} spacing={5}>
                <ReportDetail
                  label="Report date"
                  value={formatReportDate(currentReport.date)}
                />
                <ReportDetail
                  label="Last synced"
                  value={formatDateTime(currentReport.created_at)}
                />
                <ReportDetail
                  label="Synced by"
                  value={currentReport.created_by_name || "System"}
                />
              </SimpleGrid>
            </Box>
          </Box>
        ) : (
          <Box
            borderWidth="1px"
            borderRadius="md"
            borderColor="gray.200"
            p={6}
            bg="gray.50"
          >
            <Text color="gray.600">
              No stock holding report available yet. Data will appear after the
              next scheduled sync at 7:30 AM, or use Sync Now if you have
              permission.
            </Text>
          </Box>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}

export default StockHoldingReportPage;
