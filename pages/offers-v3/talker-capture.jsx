import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Select,
  Spinner,
  Text,
  VStack,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import offersV3Talker from "../../helper/offersV3Talker";
import OutletDropdown from "../../components/MaterialsRequest/OutletDropdown";
import { useUser } from "../../contexts/UserContext";
import { prepareTalkerImage } from "../../util/talkerImage";
import { useTalkerUploadQueue } from "../../customHooks/useTalkerUploadQueue";

const TIER_STYLES = {
  1: { label: "Must shoot today", bg: "red.50", border: "red.300", scheme: "red" },
  2: { label: "Rotation", bg: "white", border: "gray.200", scheme: "gray" },
  3: { label: "HQ asked for this", bg: "purple.50", border: "purple.300", scheme: "purple" },
};

const VERDICT_STYLES = {
  accept: { scheme: "green", text: "Accepted" },
  retake: { scheme: "orange", text: "Retake needed" },
  reject: { scheme: "red", text: "Problem found" },
};

function QueueRow({ row, onShoot, busy, isNext }) {
  const tier = TIER_STYLES[row.tier] ?? TIER_STYLES[2];
  return (
    <Box
      borderWidth={row.tier === 1 ? "2px" : "1px"}
      borderColor={isNext ? "blue.400" : tier.border}
      bg={tier.bg}
      borderRadius="lg"
      p={4}
      mb={3}
    >
      <Flex justify="space-between" align="flex-start" gap={3} mb={2} wrap="wrap">
        <Box flex="1" minW={0}>
          <Text fontWeight="bold" fontSize="md">
            {row.group_label}
          </Text>
          <Text fontSize="sm" color="gray.600">
            {row.discovery
              ? "New here — photograph every spot this brand sits"
              : row.location_label}
            {!row.discovery && row.group_location_count > 1
              ? ` · ${row.group_location_count} spots in this store`
              : ""}
          </Text>
        </Box>
        <Badge colorScheme={tier.scheme}>{tier.label}</Badge>
      </Flex>

      {row.talker_text ? (
        <Text fontSize="sm" mb={1}>
          Sign should read: <b>{row.talker_text}</b>
        </Text>
      ) : null}
      {row.expected_pct_off != null ? (
        <Text fontSize="sm" mb={1}>
          Expected: <b>{row.expected_pct_off}% off</b>
        </Text>
      ) : null}
      {row.expected_price != null ? (
        <Text fontSize="sm" mb={1}>
          Expected price: <b>₹{row.expected_price}</b>
        </Text>
      ) : null}

      {row.pending_age_days > 1 ? (
        <Text fontSize="xs" color="red.600" mb={1}>
          Owed for {row.pending_age_days} days
        </Text>
      ) : null}
      {row.last_verdict && row.last_verdict !== "accept" ? (
        <Text fontSize="xs" color="orange.600" mb={1}>
          Last attempt: {VERDICT_STYLES[row.last_verdict]?.text}
        </Text>
      ) : null}

      <Button
        mt={2}
        w="100%"
        colorScheme={row.tier === 1 ? "red" : "blue"}
        onClick={() => onShoot(row)}
        isDisabled={busy}
      >
        {row.discovery ? "Add a spot & photograph" : "Photograph this talker"}
      </Button>
    </Box>
  );
}

const LOCATION_TYPES = [
  { value: "aisle", label: "Aisle" },
  { value: "floor_display", label: "Floor display" },
  { value: "end_cap", label: "End cap" },
  { value: "other", label: "Somewhere else" },
];

export default function TalkerCapture() {
  const { userConfig } = useUser();

  // Outlet staff are pinned to their own store and get no picker - they should
  // never be able to shoot for somewhere they aren't standing. Users with
  // all_stores have storeId deliberately nulled by UserContext, so they choose
  // which store they're in.
  const ownStoreId = userConfig?.storeId ?? userConfig?.fetched?.store_id ?? null;
  const [pickedOutlet, setPickedOutlet] = useState("");
  const canPickOutlet = !ownStoreId;
  const outletId = ownStoreId ?? (pickedOutlet ? Number(pickedOutlet) : null);

  const [queue, setQueue] = useState([]);
  const [meta, setMeta] = useState(null);
  const [discoveryLeft, setDiscoveryLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeRow, setActiveRow] = useState(null);
  const [discoveryLabel, setDiscoveryLabel] = useState("");
  const [discoveryType, setDiscoveryType] = useState("aisle");
  const [lastResult, setLastResult] = useState(null);
  const fileInputRef = useRef(null);

  const fetchQueue = useCallback(() => {
    if (!outletId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    offersV3Talker.queue
      .forOutlet(outletId)
      .then((res) => {
        setQueue(res.data ?? []);
        setMeta({ round_date: res.round_date, accept_rate: res.accept_rate });
        setDiscoveryLeft(res.discovery_remaining ?? 0);
      })
      .catch((err) => toast.error(err.message ?? "Could not load your list"))
      .finally(() => setLoading(false));
  }, [outletId]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleResult = useCallback(
    ({ result }) => {
      setLastResult(result);
      if (result.verdict === "accept") {
        toast.success("Accepted");
      } else if (result.verdict === "retake") {
        toast(result.reason ?? "Please retake", { icon: "🔁" });
      } else {
        toast.error(result.reason ?? "Problem found");
      }
      // Auto-advance: refresh so the next row moves to the top.
      fetchQueue();
    },
    [fetchQueue]
  );

  const { jobs, enqueue, pendingCount, clearFinished, retryFailed } =
    useTalkerUploadQueue({ onResult: handleResult });

  const onShoot = (row) => {
    setActiveRow(row);
    setDiscoveryLabel("");
    if (row.discovery) {
      // Ask where it is before opening the camera.
      return;
    }
    fileInputRef.current?.click();
  };

  const onDiscoveryContinue = () => {
    fileInputRef.current?.click();
  };

  const onFileChosen = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !activeRow) return;

    const prepared = await prepareTalkerImage(file);
    if (!prepared.ok) {
      toast.error(prepared.reason);
      return;
    }

    if (activeRow.discovery) {
      enqueue({
        file: prepared.file,
        discovery: true,
        label: `${activeRow.group_label} — ${
          LOCATION_TYPES.find((t) => t.value === discoveryType)?.label ?? ""
        }${discoveryLabel ? ` ${discoveryLabel}` : ""}`,
        payload: {
          group_id: activeRow.group_id,
          outlet_id: outletId,
          label: discoveryLabel.trim(),
          location_type: discoveryType,
        },
      });
    } else {
      enqueue({
        file: prepared.file,
        label: `${activeRow.group_label} — ${activeRow.location_label}`,
        payload: { location_id: activeRow.location_id, tier: activeRow.tier },
      });
    }
    setActiveRow(null);
    setDiscoveryLabel("");
  };

  /**
   * A brand's stock can sit in more than one place, so a spot can be added at
   * any time - same flow as first-time discovery, just for a group that
   * already has one.
   */
  const addAnotherSpot = (row) => {
    setActiveRow({ ...row, discovery: true, location_id: null });
    setDiscoveryLabel("");
  };

  const markGone = async (row) => {
    try {
      await offersV3Talker.locations.markGone(row.location_id);
      toast.success("Marked gone");
      fetchQueue();
    } catch (err) {
      toast.error(err.message ?? "Could not update");
    }
  };

  const tier1Count = useMemo(
    () => queue.filter((r) => r.tier === 1).length,
    [queue]
  );

  // Only a store-scoped login with no store set is genuinely stuck; an
  // all-stores user just hasn't picked one yet, and gets the picker below.
  if (!outletId && !canPickOutlet) {
    return (
      <GlobalWrapper title="Talker Check" permissionKey="add_offers_v3_talker_proofs">
        <CustomContainer title="Talker Check" filledHeader>
          <Text p={4}>
            Your login isn’t linked to a store, so there’s no list to show.
            Ask HQ to set your store.
          </Text>
        </CustomContainer>
      </GlobalWrapper>
    );
  }

  return (
    <GlobalWrapper title="Talker Check" permissionKey="add_offers_v3_talker_proofs">
      <CustomContainer title="Talker Check" filledHeader>
        <Box p={3} maxW="720px" mx="auto">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChosen}
            style={{ display: "none" }}
          />

          {canPickOutlet ? (
            <Box
              bg="purple.50"
              borderWidth="1px"
              borderColor="purple.200"
              borderRadius="md"
              p={3}
              mb={4}
            >
              <Text fontSize="sm" fontWeight="medium" mb={2}>
                You have access to every store — pick the one you’re in.
              </Text>
              <OutletDropdown
                selectedOutlet={pickedOutlet}
                setSelectedOutlet={setPickedOutlet}
              />
            </Box>
          ) : null}

          <Box bg="blue.50" borderRadius="md" p={3} mb={4}>
            <Text fontSize="sm">
              Get the <b>talker and the product in the same photo</b>. Hold
              steady and get close enough to read the sign.
            </Text>
          </Box>

          {pendingCount > 0 ? (
            <Box bg="orange.50" borderWidth="1px" borderColor="orange.200" borderRadius="md" p={3} mb={4}>
              <Flex align="center" gap={2}>
                <Spinner size="sm" />
                <Text fontSize="sm">
                  {pendingCount} photo{pendingCount > 1 ? "s" : ""} still
                  sending — keep this page open.
                </Text>
              </Flex>
            </Box>
          ) : null}

          {jobs.filter((j) => j.status === "failed").map((job) => (
            <Box key={job.id} bg="red.50" borderWidth="1px" borderColor="red.200" borderRadius="md" p={3} mb={3}>
              <Text fontSize="sm" mb={2}>
                Couldn’t send “{job.label}”: {job.reason}
              </Text>
              <Button size="sm" onClick={() => retryFailed(job.id)}>
                Try again
              </Button>
            </Box>
          ))}

          {lastResult ? (
            <Box
              bg={`${VERDICT_STYLES[lastResult.verdict]?.scheme ?? "gray"}.50`}
              borderWidth="1px"
              borderColor={`${VERDICT_STYLES[lastResult.verdict]?.scheme ?? "gray"}.300`}
              borderRadius="md"
              p={3}
              mb={4}
            >
              <Flex justify="space-between" align="center" gap={2}>
                <Box>
                  <Badge colorScheme={VERDICT_STYLES[lastResult.verdict]?.scheme}>
                    {VERDICT_STYLES[lastResult.verdict]?.text}
                  </Badge>
                  {lastResult.reason ? (
                    <Text fontSize="sm" mt={1}>
                      {lastResult.reason}
                    </Text>
                  ) : null}
                </Box>
                <Button size="xs" variant="ghost" onClick={() => { setLastResult(null); clearFinished(); }}>
                  Dismiss
                </Button>
              </Flex>
            </Box>
          ) : null}

          {activeRow?.discovery ? (
            <Box borderWidth="2px" borderColor="blue.400" borderRadius="lg" p={4} mb={4}>
              <Text fontWeight="bold" mb={1}>
                {activeRow.group_label}
              </Text>
              <Text fontSize="sm" color="gray.600" mb={3}>
                Where in the store is this one?
              </Text>
              {/* A type rather than free text: "Aisle 3" and "aisle3" used to
                  be different places, which made it impossible to ask whether
                  every store had covered its end caps. */}
              <Select
                value={discoveryType}
                onChange={(e) => setDiscoveryType(e.target.value)}
                mb={2}
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
              <Input
                placeholder="Which one? e.g. Aisle 3 (optional)"
                value={discoveryLabel}
                onChange={(e) => setDiscoveryLabel(e.target.value)}
                mb={3}
              />
              <Flex gap={2}>
                <Button colorScheme="blue" flex="1" onClick={onDiscoveryContinue}>
                  Open camera
                </Button>
                <Button variant="ghost" onClick={() => setActiveRow(null)}>
                  Cancel
                </Button>
              </Flex>
            </Box>
          ) : null}

          <Flex justify="space-between" align="center" mb={1}>
            <Text fontWeight="bold">
              {!outletId
                ? "No store selected"
                : loading
                ? "Loading…"
                : `${queue.length} to check today`}
            </Text>
            {tier1Count > 0 ? (
              <Badge colorScheme="red">{tier1Count} must-shoot</Badge>
            ) : null}
          </Flex>
          {discoveryLeft > 0 ? (
            <Text fontSize="xs" color="gray.500" mb={3}>
              {discoveryLeft} more brand{discoveryLeft === 1 ? "" : "s"} to find
              after today’s — a few each day, no rush.
            </Text>
          ) : null}

          {!outletId ? (
            <Box textAlign="center" p={8}>
              <Text fontSize="sm" color="gray.600">
                Pick a store above to see what needs checking.
              </Text>
            </Box>
          ) : loading ? (
            <Flex justify="center" p={8}>
              <Spinner />
            </Flex>
          ) : queue.length === 0 ? (
            <Box textAlign="center" p={8}>
              <Text fontSize="lg" mb={1}>
                Nothing left today.
              </Text>
              <Text fontSize="sm" color="gray.600">
                New checks appear as offers start and end.
              </Text>
            </Box>
          ) : (
            <VStack align="stretch" spacing={0}>
              {queue.map((row, index) => (
                <Box key={`${row.group_id}-${row.location_id ?? "new"}`}>
                  <QueueRow
                    row={row}
                    onShoot={onShoot}
                    busy={Boolean(activeRow)}
                    isNext={index === 0}
                  />
                  {!row.discovery ? (
                    <Flex justify="flex-end" mt={-2} mb={3} gap={1}>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="blue"
                        onClick={() => addAnotherSpot(row)}
                      >
                        Another spot for this brand
                      </Button>
                      <Button
                        size="xs"
                        variant="ghost"
                        colorScheme="gray"
                        onClick={() => markGone(row)}
                      >
                        This spot is gone
                      </Button>
                    </Flex>
                  ) : null}
                </Box>
              ))}
            </VStack>
          )}
        </Box>
      </CustomContainer>
    </GlobalWrapper>
  );
}
