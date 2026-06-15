import React from "react";
import { Box, Flex, Grid, Text } from "@chakra-ui/react";
import {
  computeProfitPct,
  formatDeltaDisplay,
  formatSalesCurrency,
  formatSalesQtyDisplay,
} from "../../util/salesDashboard";

const DELTA_BADGE_MIN_HEIGHT = "38px";

function DeltaBadge({ deltaPct, deltaLabel }) {
  const delta = formatDeltaDisplay(null, null, deltaPct);
  const hasPct = Boolean(delta.pctLabel);

  return (
    <Flex
      direction="column"
      align="flex-end"
      justify="flex-start"
      gap={0.5}
      flexShrink={0}
      minH={DELTA_BADGE_MIN_HEIGHT}
    >
      {hasPct ? (
        <Text
          fontSize="xs"
          fontWeight="semibold"
          px={2}
          py={0.5}
          borderRadius="full"
          whiteSpace="nowrap"
          lineHeight="short"
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
      ) : (
        <Text
          fontSize="xs"
          fontWeight="semibold"
          px={2}
          py={0.5}
          lineHeight="short"
          visibility="hidden"
          userSelect="none"
          aria-hidden
        >
          +0.0%
        </Text>
      )}
      {deltaLabel ? (
        <Text fontSize="10px" color="gray.500" whiteSpace="nowrap">
          {deltaLabel}
        </Text>
      ) : (
        <Text fontSize="10px" visibility="hidden" userSelect="none" aria-hidden>
          —
        </Text>
      )}
    </Flex>
  );
}

function ProfitMetricValue({
  profit,
  salesAmount,
  amountSize = "lg",
  accentColor = "purple",
}) {
  const amount = formatSalesCurrency(profit);
  const pct = computeProfitPct(profit, salesAmount);
  const pctText = pct != null ? `${pct.toFixed(2)}%` : null;
  const title = pctText ? `${amount} (${pctText})` : amount;

  return (
    <Text
      as="span"
      display="inline-block"
      maxW="100%"
      fontSize={amountSize}
      fontWeight="bold"
      color="gray.800"
      lineHeight="1.25"
      whiteSpace="nowrap"
      title={title}
    >
      {amount}
      {pctText ? (
        <Text
          as="span"
          fontSize="xs"
          fontWeight="semibold"
          color={`${accentColor}.600`}
          ml={1.5}
        >
          ({pctText})
        </Text>
      ) : null}
    </Text>
  );
}

function MetricCell({
  label,
  value,
  formatValue,
  renderValue,
  compact = false,
}) {
  const formatted = formatValue ? formatValue(value) : null;

  return (
    <Box minW={0} textAlign="center" px={1} py={1}>
      <Text fontSize="xs" color="gray.500" fontWeight="medium" mb={1}>
        {label}
      </Text>
      {renderValue ? (
        renderValue(value)
      ) : (
        <Text
          fontSize={compact ? "md" : "lg"}
          fontWeight="bold"
          color="gray.800"
          lineHeight="1.25"
          title={formatted}
        >
          {formatted}
        </Text>
      )}
    </Box>
  );
}

function MetricRow({ label, value, formatValue, renderValue }) {
  const formatted = formatValue ? formatValue(value) : null;

  return (
    <Flex justify="space-between" align="baseline" gap={3} py={1.5}>
      <Text fontSize="xs" color="gray.500" fontWeight="medium" flexShrink={0}>
        {label}
      </Text>
      {renderValue ? (
        <Box textAlign="right">{renderValue(value)}</Box>
      ) : (
        <Text
          fontSize="sm"
          fontWeight="bold"
          color="gray.800"
          textAlign="right"
          lineHeight="1.25"
          title={formatted}
        >
          {formatted}
        </Text>
      )}
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
      formatValue: formatSalesQtyDisplay,
    },
    {
      label: "Net Amt",
      value: current.sold_value,
      formatValue: formatSalesCurrency,
      compact: isFeatured,
    },
    {
      label: "Profit",
      value: current.sold_profit,
      renderValue: (value) => (
        <ProfitMetricValue
          profit={value}
          salesAmount={current.sold_value}
          amountSize={isRolling ? "sm" : isFeatured ? "md" : "lg"}
          accentColor={color}
        />
      ),
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
        minH="72px"
        borderBottomWidth="1px"
        borderColor={isFeatured ? `${color}.200` : "gray.100"}
      >
        <Box minW={0} flex="1">
          <Text
            fontSize={isRolling ? "sm" : "md"}
            fontWeight="bold"
            color={`${color}.800`}
          >
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
          templateColumns={
            isFeatured ? "0.88fr 1.04fr 1.3fr" : "repeat(3, 1fr)"
          }
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
