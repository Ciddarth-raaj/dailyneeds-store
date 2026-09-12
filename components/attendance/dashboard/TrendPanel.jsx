import React from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import CustomContainer from "../../CustomContainer";
import { PALETTE, displayDate, trendChartData, trendMessage } from "../../../util/attendanceDashboard";

/**
 * Panel D - Attendance Trend: the last 14 COMPLETED attendance days, with a
 * month option.
 *
 * THE OPEN DAY IS NOT ON THIS CHART. An in-progress day's check-in rate is not
 * comparable with a finished day's - half a night shift has not punched yet -
 * so plotting it beside them would read as a collapse in attendance that never
 * happened. The server excludes it and the caption says so.
 *
 * A DAY WITH NO APPLICABLE POPULATION IS A GAP, NOT A ZERO. `connectNulls` is
 * deliberately off: the line breaks where there is no rate to draw, rather
 * than dropping to the floor and inventing a catastrophe.
 *
 * INSUFFICIENT HISTORY IS SAID OUT LOUD. `trendMessage` turns "no completed
 * days yet" and "only 3 of 14 available" into a sentence, so a short line is
 * never mistaken for a complete one.
 *
 * The Y axis is fixed to 0-100 because it is a percentage, and an
 * auto-scaled axis would make a 4-point variation look like a cliff.
 */
export default function TrendPanel({ trend, days, onDaysChange, loading }) {
  const data = trendChartData(trend);
  const message = trendMessage(trend);

  return (
    <CustomContainer
      title="Attendance Trend"
      filledHeader
      size="xs"
      rightSection={
        <Flex gap={1}>
          {[
            { label: "14 days", value: 14 },
            { label: "Month", value: 30 },
          ].map((opt) => (
            <Button
              key={opt.value}
              size="xs"
              variant={days === opt.value ? "solid" : "outline"}
              colorScheme="purple"
              onClick={() => onDaysChange(opt.value)}
              isDisabled={loading}
            >
              {opt.label}
            </Button>
          ))}
        </Flex>
      }
    >
      {data.length === 0 ? (
        <Flex minH="180px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            {message || "No trend to show."}
          </Text>
        </Flex>
      ) : (
        <>
          <Box h="180px" w="100%">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EDF2F7" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} unit="%" />
                <RechartsTooltip
                  contentStyle={{ fontSize: "12px" }}
                  formatter={(value, _name, entry) => [
                    `${value}% — ${entry.payload.checked_in} of ${entry.payload.applicable}`,
                    "Checked in",
                  ]}
                  labelFormatter={(_label, payload) =>
                    payload && payload.length ? displayDate(payload[0].payload.date) : ""
                  }
                />
                <Line
                  type="monotone"
                  dataKey="percent"
                  stroke={PALETTE.green.chart}
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  isAnimationActive={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
          <Text fontSize="10px" color="gray.500" mt={1}>
            Completed attendance days only — a day still open is not plotted. Rate = Checked In ÷
            applicable employees for that day; the tooltip shows both counts. A day with no
            applicable employees is left as a gap rather than drawn as 0%.
          </Text>
          {message ? (
            <Text fontSize="10px" color="orange.600" mt={1}>
              {message}
            </Text>
          ) : null}
        </>
      )}
    </CustomContainer>
  );
}
