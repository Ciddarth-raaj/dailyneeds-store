import React from "react";
import { Flex, FormControl, FormLabel, Input, Button } from "@chakra-ui/react";
import CustomContainer from "../CustomContainer";
import { formatYYYYMMDD } from "../../util/dateRange";

export function DateRangeFilter({
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
  onToday,
  size = "xs",
  title = "Filter",
}) {
  const handleToday = () => {
    const today = new Date();
    const date = formatYYYYMMDD(today);
    onDateFromChange?.(date);
    onDateToChange?.(date);
    onToday?.(date, date);
  };

  const handleThisMonth = () => {
    const today = new Date();
    const date = formatYYYYMMDD(today);
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDayOfMonth = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    );
    const firstDayOfMonthStr = formatYYYYMMDD(firstDayOfMonth);
    const lastDayOfMonthStr = formatYYYYMMDD(lastDayOfMonth);
    onDateFromChange?.(firstDayOfMonthStr);
    onDateToChange?.(lastDayOfMonthStr);
    onToday?.(firstDayOfMonthStr, lastDayOfMonthStr);
  };

  return (
    <CustomContainer title={title} filledHeader size={size}>
      <Flex gap={4} alignItems="flex-end" flexWrap="wrap">
        <FormControl maxW="180px">
          <FormLabel fontSize="sm">From</FormLabel>
          <Input
            type="date"
            size="sm"
            value={dateFrom}
            onChange={(e) => onDateFromChange?.(e.target.value)}
          />
        </FormControl>
        <FormControl maxW="180px">
          <FormLabel fontSize="sm">To</FormLabel>
          <Input
            type="date"
            size="sm"
            value={dateTo}
            onChange={(e) => onDateToChange?.(e.target.value)}
          />
        </FormControl>
        <Button
          size="sm"
          colorScheme="purple"
          variant="outline"
          onClick={handleToday}
        >
          Today
        </Button>
        <Button
          size="sm"
          colorScheme="purple"
          variant="outline"
          onClick={handleThisMonth}
        >
          This Month
        </Button>
      </Flex>
    </CustomContainer>
  );
}

export default DateRangeFilter;
