import React, { useEffect, useState } from "react";
import { Box, Flex, Progress, Text } from "@chakra-ui/react";
import {
  cancelStockHoldingBackgroundFetch,
  getStockHoldingBackgroundFetchState,
  subscribeStockHoldingBackgroundFetch,
} from "../../util/stockHoldingBackgroundFetch";

function BackgroundLoadProgress({ progress, title }) {
  const loaded = progress?.loaded ?? 0;
  const total = progress?.total;
  const hasTotal = total != null && total > 0;
  const percent = hasTotal
    ? Math.min(100, Math.round((loaded / total) * 100))
    : null;

  const countLabel = hasTotal
    ? `${loaded.toLocaleString()} / ${total.toLocaleString()} rows`
    : loaded > 0
      ? `${loaded.toLocaleString()} rows`
      : "Starting…";

  return (
    <Box w="100%">
      <Flex justify="space-between" align="center" mb={2} gap={2}>
        <Text fontSize="sm" fontWeight="semibold" color="gray.800">
          {title}
        </Text>
        <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
          {countLabel}
          {percent != null ? ` (${percent}%)` : ""}
        </Text>
      </Flex>
      <Progress
        value={hasTotal ? percent : undefined}
        isIndeterminate={!hasTotal && loaded === 0}
        hasStripe={!hasTotal && loaded > 0}
        isAnimated
        size="sm"
        colorScheme="purple"
        borderRadius="md"
      />
    </Box>
  );
}

export default function StockHoldingBackgroundLoadToast() {
  const [fetchState, setFetchState] = useState(() =>
    getStockHoldingBackgroundFetchState()
  );

  useEffect(() => subscribeStockHoldingBackgroundFetch(setFetchState), []);

  const visible = fetchState.active && fetchState.showFloatingIndicator;
  if (!visible) return null;

  const title = fetchState.forceRefresh
    ? "Refreshing stock holding report"
    : "Loading stock holding report";

  return (
    <Box
      position="fixed"
      bottom={{ base: 3, md: 4 }}
      right={{ base: 3, md: 4 }}
      zIndex={1600}
      w={{ base: "calc(100vw - 24px)", sm: "360px" }}
      maxW="360px"
      bg="white"
      borderWidth="1px"
      borderColor="purple.200"
      borderRadius="12px"
      boxShadow="lg"
      px={4}
      py={3}
    >
      <BackgroundLoadProgress progress={fetchState.progress} title={title} />
      <Flex justify="flex-end" mt={2}>
        <Text
          as="button"
          type="button"
          fontSize="xs"
          color="red.600"
          fontWeight="medium"
          onClick={cancelStockHoldingBackgroundFetch}
        >
          Stop
        </Text>
      </Flex>
    </Box>
  );
}
