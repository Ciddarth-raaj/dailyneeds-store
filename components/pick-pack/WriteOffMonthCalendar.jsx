import React, { useMemo } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import moment from "moment";
import CustomContainer from "../CustomContainer";

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
];

/**
 * Day colors: red = no records, yellow = has records but not all verified, green = all verified.
 */
function WriteOffMonthCalendar({
  selectedDate,
  onSelectDate,
  writeOffsList = [],
  viewingMonth,
  onViewingMonthChange,
}) {
  const year = viewingMonth.year();
  const month = viewingMonth.month() + 1;

  const dates = useMemo(() => {
    const start = viewingMonth.clone().startOf("month");
    const end = viewingMonth.clone().endOf("month");
    const dateArray = [];
    let current = start.clone();
    while (current.isSameOrBefore(end, "day")) {
      dateArray.push(current.clone());
      current.add(1, "day");
    }
    return dateArray;
  }, [viewingMonth]);

  /** Per day: total rows + verified count */
  const dayAggregation = useMemo(() => {
    const map = {};
    writeOffsList.forEach((row) => {
      if (!row?.date) return;
      const d = moment(row.date).format("YYYY-MM-DD");
      if (!map[d]) map[d] = { total: 0, verified: 0 };
      map[d].total += 1;
      if (
        row.is_verified === true ||
        row.is_verified === 1 ||
        row.is_verified === "1"
      ) {
        map[d].verified += 1;
      }
    });
    return map;
  }, [writeOffsList]);

  const getDayVisual = (date) => {
    const key = date.format("YYYY-MM-DD");
    const agg = dayAggregation[key];
    if (!agg || agg.total === 0) {
      return {
        kind: "empty",
        bg: "red.50",
        border: "red.200",
        text: "red.600",
        hint: "No records",
      };
    }
    if (agg.verified >= agg.total) {
      return {
        kind: "verified",
        bg: "green.50",
        border: "green.200",
        text: "green.600",
        hint: `All verified (${agg.verified}/${agg.total})`,
      };
    }
    return {
      kind: "pending",
      bg: "yellow.50",
      border: "yellow.300",
      text: "yellow.800",
      hint: `Pending verify (${agg.verified}/${agg.total})`,
    };
  };

  const isSelected = (date) => date.format("YYYY-MM-DD") === selectedDate;

  const yearOptions = useMemo(() => {
    const y = moment().year();
    const list = [];
    for (let i = y - 5; i <= y + 2; i += 1) list.push(i);
    return list;
  }, []);

  const handleYearChange = (e) => {
    const y = parseInt(e.target.value, 10);
    onViewingMonthChange(moment({ year: y, month: month - 1, day: 1 }));
  };

  const handleMonthChange = (e) => {
    const m = parseInt(e.target.value, 10);
    onViewingMonthChange(moment({ year, month: m - 1, day: 1 }));
  };

  return (
    <CustomContainer
      title="Daily Records Calendar"
      size="xs"
      filledHeader
      smallHeader
    >
      <HStack spacing={4} align="flex-end" mb={4} flexWrap="wrap">
        <FormControl maxW="140px">
          <FormLabel fontSize="xs" mb={1}>
            Year
          </FormLabel>
          <Select size="sm" value={year} onChange={handleYearChange}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        </FormControl>
        <FormControl maxW="160px">
          <FormLabel fontSize="xs" mb={1}>
            Month
          </FormLabel>
          <Select size="sm" value={month} onChange={handleMonthChange}>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </FormControl>
      </HStack>

      <Flex flexWrap="wrap" gap="8px">
        {dates.map((date, index) => {
          const visual = getDayVisual(date);
          const selected = isSelected(date);

          return (
            <Tooltip
              label={`${date.format("DD/MM/YYYY - ddd")} — ${visual.hint}`}
              key={index}
              openDelay={500}
            >
              <Box
                as="button"
                type="button"
                onClick={() => onSelectDate(date.format("YYYY-MM-DD"))}
                borderRadius="5px"
                w="32px"
                h="32px"
                display="flex"
                justifyContent="center"
                alignItems="center"
                bg={visual.bg}
                border="1px solid"
                borderColor={selected ? "purple.500" : visual.border}
                boxShadow={selected ? "0 0 0 2px var(--chakra-colors-purple-400)" : undefined}
                cursor="pointer"
                _hover={{ opacity: 0.9 }}
              >
                <Text fontWeight="medium" fontSize="xs" color={visual.text}>
                  {date.format("D")}
                </Text>
              </Box>
            </Tooltip>
          );
        })}
      </Flex>
    </CustomContainer>
  );
}

export default WriteOffMonthCalendar;
