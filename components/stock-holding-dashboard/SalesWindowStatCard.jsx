import React from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import { formatCurrency } from "../../util/string";
import { formatDeltaDisplay } from "../../util/salesDashboard";

function DeltaBadge({ deltaPct, deltaLabel }) {
  const delta = formatDeltaDisplay(null, null, deltaPct);

  if (delta.pctLabel) {
    return (
      <Flex direction="column" align="flex-end" gap={0.5} flexShrink={0}>
        <Text
          fontSize="xs"
          fontWeight="semibold"
          px={2}
          py={0.5}
          borderRadius="full"
          whiteSpace="nowrap"
          bg={
            delta.direction === "up"
              ? "green.50"
              : delta.direction === "down"
                ? "red.50"
                : "gray.100"
          }
          color={
            delta.direction === "up"
              ? "green.700"
              : delta.direction === "down"
                ? "red.700"
                : "gray.600"
          }
        >
          {delta.pctLabel}
        </Text>
        {deltaLabel ? (
          <Text fontSize="10px" color="gray.500" whiteSpace="nowrap">
            {deltaLabel}
          </Text>
        ) : null}
      </Flex>
    );
  }

  return (
    <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
      {deltaLabel ? `— ${deltaLabel}` : "—"}
    </Text>
  );
}

function MetricCell({ label, value, formatValue }) {
  const formatted = formatValue(value);

  return (
    <Box minW={0} textAlign="center" px={2}>
      <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>
        {label}
      </Text>
      <Text
        fontSize="lg"
        fontWeight="bold"
        color="gray.800"
        lineHeight="1.3"
        title={formatted}
      >
        {formatted}
      </Text>
    </Box>
  );
}

function MetricRow({ label, value, formatValue }) {
  const formatted = formatValue(value);

  return (
    <Flex justify="space-between" align="baseline" gap={3} py={1.5}>
      <Text fontSize="xs" color="gray.500" fontWeight="medium" flexShrink={0}>
        {label}
      </Text>
      <Text
        fontSize="sm"
        fontWeight="bold"
        color="gray.800"
        textAlign="right"
        title={formatted}
      >
        {formatted}
      </Text>
    </Flex>
  );
}

export default function SalesWindowStatCard({
  days,
  windowSummary,
  color = "purple",
  periodLabel,
  deltaLabel,
  variant = "default",
}) {
  const current = windowSummary?.current ?? {};
  const label =
    periodLabel ??
    windowSummary?.periodLabel ??
    (days != null ? `Last ${days} Days` : "Today");
  const isFeatured = variant === "featured";
  const isRolling = variant === "rolling";

  const metrics = [
    {
      label: "Net Qty",
      value: current.sold_qty,
      formatValue: (v) => Number(v ?? 0).toLocaleString("en-IN"),
    },
    {
      label: "Net Amt",
      value: current.sold_value,
      formatValue: formatCurrency,
    },
    {
      label: "Profit",
      value: current.sold_profit,
      formatValue: formatCurrency,
    },
  ];

  return (
    <Box
      borderWidth="1px"
      borderColor={isFeatured ? `${color}.300` : `${color}.200`}
      borderRadius="12px"
      bg={isFeatured ? `${color}.50` : "white"}
      boxShadow={isFeatured ? "sm" : "xs"}
      overflow="hidden"
      h="100%"
      w="100%"
    >
      <Flex
        align="flex-start"
        justify="space-between"
        px={4}
        pt={4}
        pb={2}
        gap={3}
        borderBottomWidth="1px"
        borderColor={isFeatured ? `${color}.200` : "gray.100"}
      >
        <Box minW={0} flex="1">
          <Text fontSize={isRolling ? "sm" : "md"} fontWeight="bold" color={`${color}.800`}>
            {label}
          </Text>
          {windowSummary?.periodSubtitle && !isRolling ? (
            <Text fontSize="xs" color="gray.500" mt={0.5}>
              {windowSummary.periodSubtitle}
            </Text>
          ) : null}
        </Box>
        <DeltaBadge
          deltaPct={windowSummary?.delta_value_pct}
          deltaLabel={deltaLabel}
        />
      </Flex>

      {isRolling ? (
        <Box px={4} py={3}>
          {metrics.map((metric) => (
            <MetricRow key={metric.label} {...metric} />
          ))}
        </Box>
      ) : (
        <Grid
          templateColumns="repeat(3, 1fr)"
          gap={0}
          px={3}
          py={4}
          sx={{
            "& > *:not(:last-child)": {
              borderRightWidth: "1px",
              borderColor: isFeatured ? `${color}.200` : "gray.100",
            },
          }}
        >
          {metrics.map((metric) => (
            <MetricCell key={metric.label} {...metric} />
          ))}
        </Grid>
      )}
    </Box>
  );
}
