import React, { useState } from "react";
import { Box, Select, Text, VisuallyHidden } from "@chakra-ui/react";
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import CustomContainer from "../../CustomContainer";
import EmptyData from "../../EmptyData";

/**
 * HEAD COUNT, grouped by Location, Department, Designation or Employee Type.
 *
 * A HORIZONTAL BAR CHART, because the groups are categories with long names
 * and the job is comparing magnitudes - a line between unrelated departments
 * would imply an order that does not exist. One series, one hue; each bar is
 * labelled with its count and opens the employees behind it.
 */
const GROUPS = [
  { key: "location", label: "Location" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "employment_type", label: "Employee Type" },
];
const BAR = "#1B2A5B";
const ROW = 30;

function HeadTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <Box bg="white" borderWidth="1px" borderColor="gray.200" borderRadius="md" px={3} py={2} boxShadow="md" fontSize="sm">
      <Text fontWeight="600">{d.name}</Text>
      <Text>
        {d.count} employees · {d.initialized} initialized
      </Text>
      <Text fontSize="xs" color="gray.500">
        Click to see the employees
      </Text>
    </Box>
  );
}

export default function HeadCountPanel({ headcount, periodLabel, onOpen }) {
  const [groupBy, setGroupBy] = useState("location");
  const data = (headcount && headcount[groupBy]) || [];
  const groupLabel = GROUPS.find((g) => g.key === groupBy).label;
  const open = (entry) => {
    if (!entry) return;
    onOpen({ metric: "HEADCOUNT", group_by: groupBy, group_id: entry.id, title: `Head Count · ${groupLabel}: ${entry.name}` });
  };

  return (
    <CustomContainer
      title="Head Count"
      subtitle={periodLabel}
      size="xs"
      filledHeader
      rightSection={
        <Select size="xs" w="150px" bg="white" value={groupBy} onChange={(e) => setGroupBy(e.target.value)} aria-label="Group head count by">
          {GROUPS.map((g) => (
            <option key={g.key} value={g.key}>
              {g.label}
            </option>
          ))}
        </Select>
      }
    >
      {data.length === 0 ? (
        <EmptyData message="No employees for this month and filters" size="sm" />
      ) : (
        <Box maxH="320px" overflowY="auto" pr={1}>
          <Box h={`${Math.max(data.length * ROW + 30, 280)}px`}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 4 }} barCategoryGap={6}>
                <CartesianGrid horizontal={false} stroke="#EDF2F7" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#718096" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 11, fill: "#4A5568" }} axisLine={false} tickLine={false} interval={0} />
                <Tooltip content={<HeadTooltip />} cursor={{ fill: "#EDF2F7" }} />
                <Bar dataKey="count" fill={BAR} radius={[0, 4, 4, 0]} maxBarSize={18} cursor="pointer" onClick={open} isAnimationActive={false}>
                  <LabelList dataKey="count" position="right" style={{ fontSize: 11, fill: "#2D3748", fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Box>
        </Box>
      )}
      {/* The same numbers as a list, for keyboard and screen-reader users. */}
      <VisuallyHidden as="ul">
        {data.map((d) => (
          <li key={d.id}>
            <button type="button" onClick={() => open(d)}>
              {d.name}: {d.count} employees
            </button>
          </li>
        ))}
      </VisuallyHidden>
    </CustomContainer>
  );
}
