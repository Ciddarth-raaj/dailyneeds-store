import React, { useCallback, useEffect, useMemo, useState } from "react";
import moment from "moment";
import {
  Badge,
  Box,
  Button,
  Flex,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  Tooltip,
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import AgGrid from "../../../components/AgGrid";
import CustomContainer from "../../../components/CustomContainer";
import GlobalWrapper from "../../../components/globalWrapper/globalWrapper";
import apiSyncLog from "../../../helper/apiSyncLog";
import { capitalize } from "../../../util/string";

const STATUS_COLORS = {
  success: "green",
  failed: "red",
  missed: "orange",
  pending: "gray",
  upcoming: "purple",
};

const LOG_TYPE_BADGES = {
  product_sync: { label: "Product Sync", colorScheme: "purple" },
  employee_sync: { label: "Employee Sync", colorScheme: "blue" },
  stock_holding_report_sync: {
    label: "Stock Holding Report",
    colorScheme: "teal",
  },
  purchase_bulk: { label: "Purchase Bulk", colorScheme: "orange" },
  product_sales_bulk: { label: "Product Sales", colorScheme: "cyan" },
  debit_note_bulk: { label: "Debit Note", colorScheme: "pink" },
  dead_stock_items_bulk: { label: "Dead Stock", colorScheme: "red" },
  product_distributors_hq_import: {
    label: "HQ Distributor",
    colorScheme: "green",
  },
  item_markupdown_bulk: { label: "Item Markup/Down", colorScheme: "yellow" },
};

const SOURCE_BADGES = {
  cron: { label: "Cron", colorScheme: "orange" },
  manual: { label: "Manual", colorScheme: "purple" },
  external: { label: "External", colorScheme: "gray" },
};

function formatShortDateTime(value) {
  if (!value) return "-";
  const m = moment(value);
  return `${m.format("DD MMM")} · ${m.format("HH:mm")}`;
}

function formatDuration(ms) {
  if (ms == null || ms === "") return "-";
  const totalSec = Math.round(Number(ms) / 1000);
  if (!Number.isFinite(totalSec) || totalSec < 0) return "-";
  if (totalSec < 60) return `${totalSec}s`;
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return sec ? `${min}m ${sec}s` : `${min}m`;
}

function getLogTypeBadge(data) {
  const type = data?.log_type;
  if (!type) return null;
  return (
    LOG_TYPE_BADGES[type] || {
      label: capitalize(String(type).replace(/_/g, " ")),
      colorScheme: "gray",
    }
  );
}

function getStatusBadge(data) {
  const status = data?.status;
  if (!status) return null;
  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    colorScheme: STATUS_COLORS[status] || "gray",
  };
}

function getSourceBadge(data) {
  const source = data?.source;
  if (!source) return null;
  return (
    SOURCE_BADGES[source] || {
      label: capitalize(String(source)),
      colorScheme: "gray",
    }
  );
}

function SlotPill({ slot }) {
  const color = STATUS_COLORS[slot.status] || "gray";
  const title = [slot.status, slot.error_message || slot.log?.error_message]
    .filter(Boolean)
    .join(": ");
  return (
    <Box
      title={title}
      px={1.5}
      py={0.5}
      borderRadius="sm"
      fontSize="10px"
      bg={`${color}.100`}
      color={`${color}.700`}
    >
      {moment(slot.expected_at).format("DD MMM")} ·{" "}
      {moment(slot.expected_at).format("HH:mm")}
    </Box>
  );
}

function SyncTimelineCard({ item }) {
  return (
    <Box borderWidth="1px" borderRadius="md" px={3} py={2.5} bg="white">
      <Flex justify="space-between" align="center" gap={2} mb={1.5}>
        <Text fontWeight="medium" fontSize="sm">
          {item.label}
        </Text>
        {item.last_run ? (
          <Badge
            colorScheme={STATUS_COLORS[item.last_run.status]}
            fontSize="xs"
          >
            {item.last_run.status}
          </Badge>
        ) : (
          <Badge colorScheme="gray" fontSize="xs">
            no runs
          </Badge>
        )}
      </Flex>

      <Flex gap={3} flexWrap="wrap" fontSize="xs" color="gray.600">
        <Text>
          Last: {formatShortDateTime(item.last_run?.created_at)}
          {item.last_run?.row_count != null
            ? ` · ${item.last_run.row_count} rows`
            : ""}
        </Text>
        <Text>Next: {formatShortDateTime(item.next_sync_at)}</Text>
        <Text fontFamily="mono">{item.cron_expression || "-"}</Text>
      </Flex>

      {item.last_run?.error_message ? (
        <Text fontSize="xs" color="red.500" mt={1.5} noOfLines={3}>
          {item.last_run.error_message}
        </Text>
      ) : null}

      {item.slots?.length > 0 ? (
        <Flex gap={1} flexWrap="wrap" mt={2}>
          {item.slots.map((slot) => (
            <SlotPill key={slot.expected_at} slot={slot} />
          ))}
        </Flex>
      ) : null}
    </Box>
  );
}

function LogTable({ logs }) {
  const columnDefs = useMemo(
    () => [
      {
        field: "created_at",
        headerName: "Time",
        type: "datetime",
      },
      {
        colId: "log_type",
        headerName: "Type",
        type: "badge-column",
        flex: 1.2,
        valueGetter: (params) => getLogTypeBadge(params.data),
      },
      {
        colId: "status",
        headerName: "Status",
        type: "badge-column",
        flex: 0.8,
        valueGetter: (params) => getStatusBadge(params.data),
      },
      {
        colId: "source",
        headerName: "Source",
        type: "badge-column",
        flex: 0.8,
        valueGetter: (params) => getSourceBadge(params.data),
      },
      {
        field: "row_count",
        headerName: "Rows",
        type: "id",
        flex: 0.6,
        valueFormatter: (params) =>
          params.value != null ? String(params.value) : "-",
      },
      {
        field: "duration_ms",
        headerName: "Duration",
        flex: 0.7,
        sortable: true,
        comparator: (valueA, valueB) =>
          (Number(valueA) || 0) - (Number(valueB) || 0),
        cellRenderer: (params) => formatDuration(params.value),
      },
      {
        field: "path",
        headerName: "Path",
        flex: 1,
        minWidth: 120,
        hideByDefault: true,
      },
      {
        field: "error_message",
        headerName: "Error",
        cellRenderer: (params) => {
          if (!params.value) return "-";
          return (
            <Tooltip label={params.value} hasArrow openDelay={200}>
              <Text
                fontSize="xs"
                color="red.500"
                noOfLines={1}
                cursor="default"
              >
                {params.value}
              </Text>
            </Tooltip>
          );
        },
      },
    ],
    []
  );

  return (
    <AgGrid rowData={logs} columnDefs={columnDefs} tableKey="api-sync-logs" />
  );
}

export default function ApiLogsPage() {
  const [syncTimeline, setSyncTimeline] = useState([]);
  const [bulkTimeline, setBulkTimeline] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tabIndex, setTabIndex] = useState(0);

  const activeCategory = tabIndex === 0 ? "sync" : "bulk";
  const activeTypes = useMemo(
    () =>
      (tabIndex === 0 ? syncTimeline : bulkTimeline).map(
        (item) => item.log_type
      ),
    [tabIndex, syncTimeline, bulkTimeline]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [timelineData, logData] = await Promise.all([
        apiSyncLog.getTimeline({ days: 7 }),
        apiSyncLog.getLogs({ limit: 300 }),
      ]);
      setSyncTimeline(timelineData?.sync || []);
      setBulkTimeline(timelineData?.bulk || []);
      setLogs(logData);
    } catch (err) {
      toast.error(err?.message || "Failed to load API logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLogs = useMemo(() => {
    const typeSet = new Set(activeTypes);
    return logs.filter((log) => typeSet.has(log.log_type));
  }, [logs, activeTypes]);

  return (
    <GlobalWrapper title="API Logs" permissionKey="view_api_logs">
      <CustomContainer
        title="API Logs"
        filledHeader
        rightSection={
          <Button
            size="sm"
            variant="outline"
            onClick={loadData}
            isLoading={loading}
          >
            Refresh
          </Button>
        }
      >
        <Tabs
          index={tabIndex}
          onChange={setTabIndex}
          colorScheme="purple"
          mb={6}
        >
          <TabList>
            <Tab>Sync Jobs</Tab>
            <Tab>Bulk Imports</Tab>
          </TabList>

          <TabPanels>
            <TabPanel px={0}>
              {loading && syncTimeline.length === 0 ? (
                <Text py={4} fontSize="sm" color="gray.500">
                  Loading...
                </Text>
              ) : (
                <VStack align="stretch" spacing={2} mb={6}>
                  {syncTimeline.map((item) => (
                    <SyncTimelineCard key={item.log_type} item={item} />
                  ))}
                </VStack>
              )}
            </TabPanel>

            <TabPanel px={0}>
              {loading && bulkTimeline.length === 0 ? (
                <Text py={4} fontSize="sm" color="gray.500">
                  Loading...
                </Text>
              ) : (
                <VStack align="stretch" spacing={2} mb={6}>
                  {bulkTimeline.map((item) => (
                    <SyncTimelineCard key={item.log_type} item={item} />
                  ))}
                </VStack>
              )}
            </TabPanel>
          </TabPanels>
        </Tabs>

        <CustomContainer
          title={`Recent ${
            activeCategory === "sync" ? "sync" : "bulk"
          } log entries`}
          smallHeader
          filledHeader
        >
          <LogTable logs={filteredLogs} />
        </CustomContainer>
      </CustomContainer>
    </GlobalWrapper>
  );
}
