import React, { memo, useMemo } from "react";
import { Box, Center, Flex, Text } from "@chakra-ui/react";
import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomContainer from "../CustomContainer";
import DashboardChartLegend from "../Dashboard/CustomChartLegend";
import { formatShorthandNumber } from "../../util/string";

const CHART_HEIGHT = 240;

function BarChartCard({
  title,
  data,
  onBarClick,
  valueFormatter,
  legendValueFormatter,
  showPctInTooltip = false,
}) {
  const chartData = (data || []).filter((entry) => Number(entry.value) > 0);

  const formatLegendValue =
    legendValueFormatter ?? ((v) => formatShorthandNumber(v ?? 0));
  const formatBarLabel =
    valueFormatter ??
    ((v) => (v === 0 || v == null ? "" : formatShorthandNumber(v)));

  const yMax = useMemo(() => {
    const maxVal = Math.max(0, ...chartData.map((d) => Number(d.value) || 0));
    if (maxVal <= 0) return 2;
    return Math.max(maxVal * 1.08, 1);
  }, [chartData]);

  const legendItems = chartData.map((d) => ({
    name: d.name,
    value: legendValueFormatter
      ? legendValueFormatter(d.value, d)
      : formatLegendValue(d.displayValue ?? d.value),
    fill: d.fill,
  }));

  return (
    <CustomContainer title={title} filledHeader size="xs">
      {chartData.length === 0 ? (
        <Center minH={`${CHART_HEIGHT}px`}>
          <Text color="gray.500" fontSize="sm">
            No data available
          </Text>
        </Center>
      ) : (
        <>
          <Box h={`${CHART_HEIGHT}px`} w="100%">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barCategoryGap={8} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} height={40} />
                <YAxis
                  tick={{ fontSize: 10 }}
                  width={28}
                  domain={[0, yMax]}
                  allowDecimals={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  cursor={{ fill: "transparent" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const row = payload[0]?.payload;
                    const name = row?.name ?? payload[0]?.name;
                    const value = row?.displayValue ?? row?.value;
                    const fill = row?.fill ?? payload[0]?.color;
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
                        <Box w="8px" h="8px" borderRadius="2px" bg={fill || "gray.400"} flexShrink={0} />
                        <Text>
                          {name} ({formatBarLabel(value)}
                          {showPctInTooltip && row?.pct != null ? ` · ${row.pct}%` : ""})
                        </Text>
                      </Flex>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[3, 3, 0, 0]} maxBarSize={40}>
                  {chartData.map((entry) => (
                    <Cell
                      key={entry.name}
                      fill={entry.fill}
                      onClick={() => onBarClick?.(entry)}
                      style={onBarClick ? { cursor: "pointer" } : undefined}
                    />
                  ))}
                  <LabelList
                    dataKey="value"
                    position="top"
                    fill="#4A5568"
                    style={{ fontSize: 12 }}
                    formatter={formatBarLabel}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
          <DashboardChartLegend items={legendItems} columns={2} truncateLabelOnly />
        </>
      )}
    </CustomContainer>
  );
}

export default memo(BarChartCard);
