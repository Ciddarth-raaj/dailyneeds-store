import React, { useCallback, useEffect, useState } from "react";
import { Badge, Box, Button, Flex, SimpleGrid, Spinner, Text, VStack } from "@chakra-ui/react";
import toast from "react-hot-toast";
import moment from "moment";
import CustomContainer from "../../components/CustomContainer";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import usePermissions from "../../customHooks/usePermissions";
import retailPilotSync from "../../helper/retailPilotSync";
import { formatIstDateTime } from "../../util/apiSyncCron";

const PAGE_PERMISSIONS = ["sync_retailpilot_stock", "allow_product_sync", "sync_retailpilot_purchases", "add_product_distributor"];
const STATUS_COLORS = { success: "green", failed: "red" };

function formatDuration(ms) {
  const n = Number(ms);
  if (!Number.isFinite(n) || n <= 0) return null;
  if (n < 1000) return `${n} ms`;
  const s = Math.round(n / 1000);
  return s < 60 ? `${s} s` : `${Math.floor(s / 60)} min ${s % 60} s`;
}

function RunLine({ label, run }) {
  if (!run) {
    return (
      <Text fontSize="sm" color="gray.500">
        {label}: never
      </Text>
    );
  }
  const details = [
    run.source ? (run.source === "cron" ? "scheduled" : run.source) : null,
    formatDuration(run.duration_ms),
    run.row_count != null ? `${run.row_count} rows` : null,
  ].filter(Boolean);
  return (
    <Box>
      <Flex gap={2} align="center" wrap="wrap">
        <Text fontSize="sm" fontWeight="semibold">
          {label}:
        </Text>
        <Text fontSize="sm">{formatIstDateTime(run.at)}</Text>
        <Text fontSize="xs" color="gray.500">
          ({moment(run.at).fromNow()})
        </Text>
        <Badge colorScheme={STATUS_COLORS[run.status] || "gray"}>{run.status}</Badge>
      </Flex>
      {details.length ? (
        <Text fontSize="xs" color="gray.500">
          {details.join(" · ")}
        </Text>
      ) : null}
      {run.status === "failed" && run.error_message ? (
        <Text fontSize="xs" color="red.500" noOfLines={3}>
          {run.error_message}
        </Text>
      ) : null}
    </Box>
  );
}

function SyncCard({ sync, starting, onStart }) {
  const allowed = usePermissions([sync.permission]);
  // The card leads with the schedule: the last run the schedule made and
  // when it runs next. A manual "Sync now" is shown only when it is newer.
  const scheduled = sync.last_scheduled;
  const atOf = (run) => (run ? new Date(run.at).getTime() : 0);
  const manualNewer = sync.last_run && sync.last_run.source !== "cron" && atOf(sync.last_run) > atOf(scheduled);
  const newest = manualNewer ? sync.last_run : scheduled;
  const showLastSuccess = sync.last_success && (!newest || newest.status !== "success");
  return (
    <Box borderWidth="1px" borderRadius="md" p={4} bg="white">
      <Flex justify="space-between" align="flex-start" gap={3}>
        <Box>
          <Flex gap={2} align="center">
            <Text fontWeight="bold" fontSize="lg">
              {sync.label}
            </Text>
            {sync.running ? (
              <Badge colorScheme="purple">
                <Flex align="center" gap={1}>
                  <Spinner size="xs" /> Running
                </Flex>
              </Badge>
            ) : sync.waiting_for ? (
              <Badge colorScheme="orange">Waiting for {sync.waiting_for}</Badge>
            ) : null}
          </Flex>
          <Text fontSize="sm" color="gray.600">
            {sync.description}
          </Text>
          <Text fontSize="xs" color="gray.500" mt={1}>
            Schedule: {sync.schedule}
          </Text>
        </Box>
        {allowed ? (
          <Button
            size="sm"
            colorScheme="purple"
            onClick={() => onStart(sync)}
            isLoading={starting}
            isDisabled={sync.running || Boolean(sync.waiting_for)}
          >
            Sync now
          </Button>
        ) : null}
      </Flex>
      <VStack align="stretch" spacing={2} mt={3}>
        <RunLine label="Last scheduled sync" run={scheduled} />
        <Text fontSize="sm">
          <Text as="span" fontWeight="semibold">
            Next scheduled sync:
          </Text>{" "}
          {sync.next_run ? `${formatIstDateTime(sync.next_run)} (${moment(sync.next_run).fromNow()})` : "not scheduled"}
        </Text>
        {manualNewer ? <RunLine label="Last manual sync" run={sync.last_run} /> : null}
        {showLastSuccess && atOf(sync.last_success) !== atOf(newest) ? (
          <RunLine label="Last successful sync" run={sync.last_success} />
        ) : null}
      </VStack>
    </Box>
  );
}

export default function RetailPilotSyncPage() {
  const [syncs, setSyncs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState({});

  const load = useCallback(async () => {
    try {
      setSyncs(await retailPilotSync.status());
    } catch (err) {
      toast.error(err?.message ?? "Failed to fetch RetailPilot sync status");
    } finally {
      setLoading(false);
    }
  }, []);

  const anyRunning = syncs.some((s) => s.running) || Object.values(starting).some(Boolean);

  useEffect(() => {
    load();
  }, [load]);

  // Refresh every 5 s while a sync runs, else every minute.
  useEffect(() => {
    const id = setInterval(load, anyRunning ? 5000 : 60000);
    return () => clearInterval(id);
  }, [load, anyRunning]);

  const handleStart = async (sync) => {
    setStarting((s) => ({ ...s, [sync.key]: true }));
    setTimeout(load, 1000);
    try {
      const res = await retailPilotSync.start(sync.key);
      toast.success(res?.msg || res?.message || `${sync.label} sync done`);
    } catch (err) {
      toast.error(err?.message ?? "Sync failed");
    } finally {
      setStarting((s) => ({ ...s, [sync.key]: false }));
      load();
    }
  };

  return (
    <GlobalWrapper title="RetailPilot Sync" permissionKey={PAGE_PERMISSIONS}>
      <CustomContainer
        title="RetailPilot Sync"
        filledHeader
        rightSection={
          <Button size="sm" variant="outline" colorScheme="purple" onClick={load} isLoading={loading}>
            Refresh
          </Button>
        }
      >
        {loading && !syncs.length ? (
          <Flex justify="center" py={10}>
            <Spinner />
          </Flex>
        ) : (
          <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={4}>
            {syncs.map((sync) => (
              <SyncCard key={sync.key} sync={sync} starting={Boolean(starting[sync.key])} onStart={handleStart} />
            ))}
          </SimpleGrid>
        )}
      </CustomContainer>
    </GlobalWrapper>
  );
}
