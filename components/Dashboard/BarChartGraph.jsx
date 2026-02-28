"use client";

import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";
import DashboardChartLegend from "./CustomChartLegend";
import EmptyData from "../EmptyData";

const TICK_FILL = "#4A5568";
const TICK_FONT_SIZE = 10;
const CHART_MARGIN = { top: 12, right: 8, left: 0, bottom: 0 };
const BAR_CATEGORY_GAP = 16;
const Y_AXIS_WIDTH = 28;
const X_AXIS_HEIGHT = 20;
const LABEL_FONT_SIZE = 12;

const BAR_COLOR = "var(--chakra-colors-purple-500)";

export const CHART_HEIGHT = 300;

const XAxisTick = (props) => {
  const { x, y, payload, angle = -35, dy = 6 } = props;
  const value = String(payload?.value ?? "");
  const rotation = angle ?? 0;
  const offset = dy ?? 6;
  return (
    <text
      x={x}
      y={y}
      textAnchor={rotation !== 0 ? "end" : "middle"}
      fill={TICK_FILL}
      dy={offset}
      transform={rotation !== 0 ? `rotate(${rotation}, ${x}, ${y})` : undefined}
      style={{ fontSize: TICK_FONT_SIZE }}
    >
      {value}
    </text>
  );
};

const YAxisTick = (props) => {
  const { x, y, payload } = props;
  return (
    <text
      x={x}
      y={y}
      dx={-4}
      dy={3}
      textAnchor="end"
      fill={TICK_FILL}
      style={{ fontSize: TICK_FONT_SIZE }}
    >
      {payload?.value}
    </text>
  );
};

const valueDomain = [
  (dataMax) => 0,
  (dataMax) => (dataMax != null ? dataMax + 2 : 2),
];
const valueFormatter = (v) => (v === 0 ? "" : v);

/**
 * Bar chart graph only. No container/card.
 * Matches A1 DashboardBarChart style: custom ticks, custom tooltip, label on top, legend below.
 *
 * @param {number|string|Object} [height] - Chart area height (px number, "240px", or { base: "240px", md: "260px" })
 * @param {string} [maxHeight="unset"] - Max height of the chart area
 */
function BarChartGraph({
  data = [],
  dataKey = "products",
  nameKey = "name",
  barName = "Products updated",
  height = CHART_HEIGHT,
  maxHeight = "unset",
  emptyMessage = "No data to display",
  xAxisAngle = -35,
}) {
  const defaultTooltip = (params) => {
    const { active, payload } = params;
    if (!active || !payload?.length) return null;
    const p = payload[0].payload;
    const name = p[nameKey] ?? payload[0].name;
    const value = payload[0].value;
    return (
      <Flex
        bg="white"
        borderRadius="md"
        boxShadow="md"
        px={3}
        py={2}
        borderWidth="1px"
        borderColor="gray.100"
        align="center"
        gap={2}
        fontSize="sm"
      >
        <Box
          w="8px"
          h="8px"
          minW="8px"
          minH="8px"
          borderRadius="2px"
          bg={BAR_COLOR}
          flexShrink={0}
        />
        <Text>
          {name} ({value})
        </Text>
      </Flex>
    );
  };

  const legendItems = [{ name: barName, fill: BAR_COLOR }];

  if (!data || data.length === 0) {
    return (
      <>
        <Flex
          w="100%"
          height={height}
          maxHeight={maxHeight}
          alignItems="center"
          justifyContent="center"
        >
          <EmptyData size="md" message={emptyMessage} />
        </Flex>
        <DashboardChartLegend items={legendItems} />
      </>
    );
  }

  return (
    <>
      <Box
        w="100%"
        height={height}
        maxHeight={maxHeight}
        tabIndex={-1}
        sx={{
          "& .recharts-wrapper": { outline: "none" },
          "& .recharts-surface": { outline: "none" },
          "& .recharts-layer": { outline: "none" },
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            barCategoryGap={BAR_CATEGORY_GAP}
            margin={CHART_MARGIN}
          >
            <XAxis
              dataKey={nameKey}
              tick={(props) => <XAxisTick {...props} angle={xAxisAngle} />}
              interval={0}
              tickLine={true}
              height={X_AXIS_HEIGHT + (xAxisAngle ? 32 : 0)}
            />
            <YAxis
              tick={<YAxisTick />}
              allowDecimals={false}
              width={Y_AXIS_WIDTH}
              domain={valueDomain}
              tickLine={true}
            />
            <RechartsTooltip
              cursor={{ fill: "transparent" }}
              content={defaultTooltip}
            />
            <Bar
              dataKey={dataKey}
              name={barName}
              fill={BAR_COLOR}
              radius={[3, 3, 0, 0]}
              maxBarSize={40}
            >
              <LabelList
                dataKey={dataKey}
                position="top"
                fill={TICK_FILL}
                style={{ fontSize: LABEL_FONT_SIZE }}
                formatter={valueFormatter}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
      <DashboardChartLegend items={legendItems} />
    </>
  );
}

export default BarChartGraph;
