"use client";

import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import DashboardChartLegend from "./CustomChartLegend";

const DEFAULT_COLORS = [
  "#805AD5",
  "#B794F4",
  "#3182CE",
  "#38A169",
  "#ED8936",
  "#4A5568",
];

export const CHART_HEIGHT = 300;

/**
 * Pie chart graph only. No container/card.
 * Matches A1 EmployeeDonutCard style: custom tooltip (swatch + name (value)), legend below with divider.
 *
 * @param {Array<{ name: string, value: number, color?: string }>} data
 * @param {number|string|Object} [height] - Chart area height (px number, "240px", or { base: "240px", md: "260px" })
 * @param {string} [maxHeight="unset"] - Max height of the chart area
 * @param {string} [emptyMessage] - Shown when no data
 * @param {boolean} [donut] - If true, use innerRadius for donut; otherwise full pie
 */
function PieChartGraph({
  data = [],
  height = CHART_HEIGHT,
  maxHeight = "unset",
  emptyMessage = "No data to display",
  donut = true,
}) {
  const renderTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    return (
      <Flex
        bg="white"
        borderRadius="md"
        boxShadow="md"
        px={3}
        py={2}
        borderWidth="1px"
        borderColor="gray.100"
        flexDirection="column"
        alignItems="flex-start"
        gap={1}
        fontSize="sm"
      >
        {payload
          .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
          .map((item, index) => {
            const color =
              item.color ??
              item.payload?.color ??
              DEFAULT_COLORS[index % DEFAULT_COLORS.length];
            const name = item.name ?? item.payload?.name;
            return (
              <Flex key={`${name}-${index}`} align="center" gap={2}>
                <Box
                  w="8px"
                  h="8px"
                  minW="8px"
                  minH="8px"
                  borderRadius="2px"
                  bg={color}
                  flexShrink={0}
                />
                <Text>
                  {name} {item.value != null ? `(${item.value})` : ""}
                </Text>
              </Flex>
            );
          })}
      </Flex>
    );
  };

  const legendItems = (data || []).map((d, idx) => ({
    name: d.name,
    value: d.value,
    fill: d.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
  }));

  if (!data?.length) {
    return (
      <Box
        w="100%"
        height={height}
        maxHeight={maxHeight}
        display="flex"
        align="center"
        justify="center"
      >
        <Text color="gray.500" fontSize="sm">
          {emptyMessage}
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Box
        w="100%"
        height={height}
        maxHeight={maxHeight}
        tabIndex={-1}
        position="relative"
        sx={{
          "& .recharts-wrapper": { outline: "none" },
          "& .recharts-surface": { outline: "none" },
          "& .recharts-layer": { outline: "none" },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={donut ? 56 : 0}
              // outerRadius={96}
              paddingAngle={1}
              dataKey="value"
              nameKey="name"
            >
              {data.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={
                    entry.color ?? DEFAULT_COLORS[index % DEFAULT_COLORS.length]
                  }
                />
              ))}
            </Pie>
            <RechartsTooltip
              content={renderTooltip}
              cursor={{ fill: "transparent" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </Box>
      <DashboardChartLegend items={legendItems} />
    </>
  );
}

export default PieChartGraph;
