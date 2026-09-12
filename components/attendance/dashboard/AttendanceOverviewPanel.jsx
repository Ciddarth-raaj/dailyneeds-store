import React from "react";
import { Alert, AlertIcon, Box, Flex, Text } from "@chakra-ui/react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import CustomContainer from "../../CustomContainer";
import { overviewChartData, overviewLegend, tone } from "../../../util/attendanceDashboard";

/**
 * Panel A - Attendance Overview: the mutually exclusive headcount breakdown.
 *
 * EVERY APPLICABLE EMPLOYEE IS IN EXACTLY ONE SLICE, so the slices add up to
 * the filtered population. `reconciles` comes from the server and is asserted
 * here rather than assumed: if it were ever false the panel says so loudly,
 * because a breakdown that does not add up is worse than no breakdown.
 *
 * NEED ACTION, LATE/EARLY AND OT ARE NOT SLICES. Each can also be true of
 * somebody who is Checked In, so putting them on this chart would count
 * attended employees twice and the total would stop meaning anything. They
 * have their own card and their own panel.
 *
 * UNKNOWN IS NOT ZERO. Coverage this screen cannot settle - an unresolvable
 * shift, a closed day with a missing punch, a rostered rest day - is its own
 * explicitly labelled slice rather than being folded into Absent or quietly
 * dropped. The rest-day count is named under the chart, because v2 has no
 * weekly-off rule and this screen is not the place to invent one.
 */
export default function AttendanceOverviewPanel({ overview, isOpenDay, onOpenSlice }) {
  const data = overviewChartData(overview);
  const legend = overviewLegend(overview);
  const total = Number(overview && overview.total) || 0;

  return (
    <CustomContainer title="Attendance Overview" filledHeader size="xs">
      {total === 0 ? (
        <Flex minH="200px" align="center" justify="center">
          <Text fontSize="sm" color="gray.500">
            No employees match these filters for this date.
          </Text>
        </Flex>
      ) : (
        <Flex direction={{ base: "column", md: "row" }} align="center" gap={3}>
          <Box h="170px" w={{ base: "100%", md: "150px" }} flexShrink={0}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={45}
                  outerRadius={75}
                  paddingAngle={1}
                  isAnimationActive={false}
                >
                  {data.map((entry) => (
                    <Cell key={entry.slice} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip
                  formatter={(value, name) => [`${value} of ${total}`, name]}
                  contentStyle={{ fontSize: "12px" }}
                />
              </PieChart>
            </ResponsiveContainer>
          </Box>

          <Box flex="1" w="100%">
            {legend.map((row) => (
              <Flex
                key={row.slice}
                as="button"
                type="button"
                w="100%"
                align="center"
                justify="space-between"
                py="3px"
                onClick={() => onOpenSlice(row.slice)}
                _hover={{ bg: "gray.50" }}
                borderRadius="sm"
                px={1}
              >
                <Flex align="center" gap={2} minW={0}>
                  <Box w="8px" h="8px" borderRadius="full" bg={tone(row.color).chart} flexShrink={0} />
                  {/* Two lines, not one: "Not Yet Checked In" clipped to
                      "Not Yet Checke..." stops being a category anybody can
                      read, and the label IS the meaning of the slice. */}
                  <Text fontSize="xs" color="gray.700" noOfLines={2} textAlign="left" lineHeight="1.25">
                    {row.name}
                  </Text>
                </Flex>
                <Text fontSize="xs" fontWeight="600" color="gray.800" flexShrink={0} ml={2}>
                  {row.count}
                  {row.share === null ? "" : ` · ${row.share}%`}
                </Text>
              </Flex>
            ))}

            <Text fontSize="10px" color="gray.500" mt={2}>
              {total} applicable {total === 1 ? "employee" : "employees"}
              {overview.rest_day_no_punch > 0
                ? ` · includes ${overview.rest_day_no_punch} on a rostered rest day with no punch, reported as unresolved rather than absent`
                : ""}
            </Text>
            {isOpenDay ? (
              <Text fontSize="10px" color="orange.600" mt={1}>
                This attendance day is still open — these are counts observed so far, not finalized
                attendance.
              </Text>
            ) : null}
          </Box>
        </Flex>
      )}

      {overview && overview.reconciles === false ? (
        <Alert status="error" fontSize="xs" mt={2} borderRadius="md">
          <AlertIcon />
          These slices do not add up to the applicable population. Do not rely on this breakdown —
          please report it.
        </Alert>
      ) : null}
    </CustomContainer>
  );
}
