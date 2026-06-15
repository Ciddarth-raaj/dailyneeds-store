import React, { memo, useMemo } from "react";
import { Center, Text } from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import BarChartCard from "./BarChartCard";

function SalesSoldUnsoldBarChart({
  data = [],
  title = "Products Sold vs Unsold",
  onBarClick,
}) {
  const chartData = useMemo(
    () => (data || []).filter((entry) => Number(entry.value) > 0),
    [data]
  );

  if (chartData.length === 0) {
    return (
      <CustomContainer title={title} filledHeader size="xs">
        <Center minH="140px">
          <Text color="gray.500" fontSize="sm">
            No product data for the selected date.
          </Text>
        </Center>
      </CustomContainer>
    );
  }

  return (
    <BarChartCard
      title={title}
      data={chartData}
      onBarClick={onBarClick}
      valueFormatter={(v) => (v == null ? "" : Number(v).toLocaleString())}
      legendValueFormatter={(v) => `${Number(v ?? 0).toLocaleString()} products`}
    />
  );
}

export default memo(SalesSoldUnsoldBarChart);
