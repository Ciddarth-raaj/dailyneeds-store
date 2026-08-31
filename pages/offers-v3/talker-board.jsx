import React, { useCallback, useEffect, useState } from "react";
import GlobalWrapper from "../../components/globalWrapper/globalWrapper";
import CustomContainer from "../../components/CustomContainer";
import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  SimpleGrid,
  Spinner,
  Text,
  Textarea,
} from "@chakra-ui/react";
import moment from "moment";
import toast from "react-hot-toast";
import offersV3Talker from "../../helper/offersV3Talker";
import ProductImageZoom from "../../components/purchase-ref/ProductImageZoom";
import usePermissions from "../../customHooks/usePermissions";

function OutletCard({ outlet }) {
  const done = Number(outlet.shot_today ?? 0);
  const pending = Number(outlet.pending_locations ?? 0);
  const openRejects = Number(outlet.open_rejects ?? 0);

  return (
    <Box borderWidth="1px" borderRadius="lg" p={4} bg="white">
      <Text fontWeight="bold" fontSize="md" mb={2}>
        {outlet.outlet_name}
      </Text>
      <Flex gap={4} wrap="wrap">
        <Box>
          <Text fontSize="xs" color="gray.500">
            Shot today
          </Text>
          <Text fontSize="xl" fontWeight="bold">
            {done}
          </Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">
            Still owed
          </Text>
          <Text fontSize="xl" fontWeight="bold" color={pending > 0 ? "orange.600" : "gray.700"}>
            {pending}
          </Text>
        </Box>
        <Box>
          <Text fontSize="xs" color="gray.500">
            Open problems
          </Text>
          <Text fontSize="xl" fontWeight="bold" color={openRejects > 0 ? "red.600" : "green.600"}>
            {openRejects}
          </Text>
        </Box>
      </Flex>
      <Text fontSize="xs" color="gray.500" mt={2}>
        {outlet.total_locations} spot{outlet.total_locations === 1 ? "" : "s"} mapped
      </Text>
    </Box>
  );
}

function ExceptionCard({ proof, canVerify, onOverride, onConfirm, busy }) {
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const ai = proof.ai_response ?? {};

  return (
    <Box borderWidth="1px" borderColor="red.200" bg="red.50" borderRadius="lg" p={4} mb={3}>
      <Flex justify="space-between" gap={3} wrap="wrap" mb={2}>
        <Box flex="1" minW="200px">
          <Text fontWeight="bold">{proof.group_label}</Text>
          <Text fontSize="sm" color="gray.700">
            {proof.outlet_name} · {proof.location_label}
          </Text>
          <Text fontSize="xs" color="gray.500">
            {moment(proof.uploaded_at).format("DD MMM YYYY, HH:mm")}
            {proof.uploaded_by_name ? ` · ${proof.uploaded_by_name}` : ""}
          </Text>
        </Box>
        <Flex gap={2} align="flex-start">
          {(proof.images ?? []).map((img) => (
            <ProductImageZoom key={img.id} src={img.s3_url} thumbSize="64px" />
          ))}
        </Flex>
      </Flex>

      <Badge colorScheme="red" mb={2}>
        {ai.talker_present === false
          ? "No talker on the rack"
          : ai.brand_match === false
          ? "Wrong brand on the sign"
          : ai.price_match === false
          ? "Price on the sign is wrong"
          : "Flagged"}
      </Badge>
      {ai.reason ? (
        <Text fontSize="sm" mb={2}>
          {ai.reason}
        </Text>
      ) : null}
      {proof.talker_text ? (
        <Text fontSize="xs" color="gray.600" mb={2}>
          Sign should read: {proof.talker_text}
        </Text>
      ) : null}
      <Text fontSize="xs" color="gray.500" mb={3}>
        Checked by {proof.ai_model ?? "n/a"}
        {ai.confidence != null ? ` · confidence ${Math.round(ai.confidence * 100)}%` : ""}
      </Text>

      {canVerify ? (
        open ? (
          <Box>
            <Textarea
              size="sm"
              placeholder="Why is this being closed? e.g. handwritten talker, verified by phone"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              mb={2}
              bg="white"
            />
            <Flex gap={2}>
              <Button
                size="sm"
                colorScheme="green"
                isDisabled={busy}
                onClick={() => onOverride(proof.id, note)}
              >
                It’s fine — close it
              </Button>
              <Button
                size="sm"
                colorScheme="red"
                variant="outline"
                isDisabled={busy}
                onClick={() => onConfirm(proof.id, note)}
              >
                Confirm problem — send back
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
                Cancel
              </Button>
            </Flex>
          </Box>
        ) : (
          <Button size="sm" onClick={() => setOpen(true)}>
            Review
          </Button>
        )
      ) : null}
    </Box>
  );
}

export default function TalkerBoard() {
  const canVerify = usePermissions("verify_offers_v3_talker_proofs");
  const [board, setBoard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [roundDate, setRoundDate] = useState(moment().format("YYYY-MM-DD"));

  const fetchBoard = useCallback(() => {
    setLoading(true);
    offersV3Talker.board
      .get(roundDate)
      .then(setBoard)
      .catch((err) => toast.error(err.message ?? "Could not load the board"))
      .finally(() => setLoading(false));
  }, [roundDate]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  const handleOverride = async (id, note) => {
    setBusy(true);
    try {
      await offersV3Talker.proofs.override(id, note);
      toast.success("Closed");
      fetchBoard();
    } catch (err) {
      toast.error(err.message ?? "Could not close it");
    } finally {
      setBusy(false);
    }
  };

  const handleConfirm = async (id, note) => {
    setBusy(true);
    try {
      await offersV3Talker.proofs.confirmReject(id, note);
      toast.success("Sent back to the outlet’s list");
      fetchBoard();
    } catch (err) {
      toast.error(err.message ?? "Could not confirm");
    } finally {
      setBusy(false);
    }
  };

  const exceptions = board?.exceptions ?? [];

  return (
    <GlobalWrapper title="Talker Board" permissionKey="view_offers_v3_talker_proofs">
      <CustomContainer title="Talker Board" filledHeader>
        <Box p={4}>
          <Flex justify="space-between" align="center" mb={4} gap={3} wrap="wrap">
            <Text fontSize="sm" color="gray.600">
              Only failures need you. Everything else is already settled.
            </Text>
            <Flex gap={2} align="center">
              <Input
                type="date"
                size="sm"
                value={roundDate}
                max={moment().format("YYYY-MM-DD")}
                onChange={(e) => setRoundDate(e.target.value)}
                w="170px"
              />
              <Button size="sm" onClick={fetchBoard} isLoading={loading}>
                Refresh
              </Button>
            </Flex>
          </Flex>

          {loading && !board ? (
            <Flex justify="center" p={10}>
              <Spinner />
            </Flex>
          ) : (
            <>
              <SimpleGrid columns={{ base: 1, md: 2, lg: 3, xl: 5 }} spacing={3} mb={6}>
                {(board?.outlets ?? []).map((outlet) => (
                  <OutletCard key={outlet.outlet_id} outlet={outlet} />
                ))}
              </SimpleGrid>

              <Flex align="center" gap={2} mb={3}>
                <Text fontWeight="bold" fontSize="lg">
                  Problems to deal with
                </Text>
                <Badge colorScheme={exceptions.length ? "red" : "green"}>
                  {exceptions.length}
                </Badge>
              </Flex>

              {exceptions.length === 0 ? (
                <Box borderWidth="1px" borderRadius="lg" p={8} textAlign="center" bg="green.50">
                  <Text fontSize="lg" mb={1}>
                    Nothing outstanding.
                  </Text>
                  <Text fontSize="sm" color="gray.600">
                    Talkers that passed the check don’t appear here.
                  </Text>
                </Box>
              ) : (
                exceptions.map((proof) => (
                  <ExceptionCard
                    key={proof.id}
                    proof={proof}
                    canVerify={canVerify}
                    onOverride={handleOverride}
                    onConfirm={handleConfirm}
                    busy={busy}
                  />
                ))
              )}
            </>
          )}
        </Box>
      </CustomContainer>
    </GlobalWrapper>
  );
}
