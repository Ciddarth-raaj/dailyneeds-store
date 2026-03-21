import React, { useMemo } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Skeleton,
  Switch,
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
 * Red = no STO on that date. Yellow = some transfers missing file_items.
 * Green = all transfers that day have file_items.
 */
function STOMonthCalendar({
  selectedDate,
  onSelectDate,
  transfersList = [],
  viewingMonth,
  onViewingMonthChange,
  loading = false,
  showAll = true,
  onShowAllChange,
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

  /** YYYY-MM-DD -> { total, unfilled } (unfilled = file_items.length === 0) */
  const statsByDay = useMemo(() => {
    const map = {};
    transfersList.forEach((t) => {
      if (!t?.DN_date) return;
      const d = moment(t.DN_date).format("YYYY-MM-DD");
      if (!map[d]) map[d] = { total: 0, unfilled: 0 };
      map[d].total += 1;
      const fi = t.file_items || [];
      if (fi.length === 0) map[d].unfilled += 1;
    });
    return map;
  }, [transfersList]);

  const getDayVisual = (date) => {
    const key = date.format("YYYY-MM-DD");
    const stats = statsByDay[key];
    const n = stats?.total ?? 0;
    if (n === 0) {
      return {
        bg: "red.50",
        border: "red.200",
        text: "red.600",
        hint: "No STO checks",
      };
    }
    if ((stats?.unfilled ?? 0) > 0) {
      return {
        bg: "yellow.50",
        border: "yellow.300",
        text: "yellow.800",
        hint: `${stats.unfilled} unfilled (no file) / ${n} total`,
      };
    }
    return {
      bg: "green.50",
      border: "green.200",
      text: "green.600",
      hint: `${n} STO check${n === 1 ? "" : "s"} — all filled`,
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
    <CustomContainer title="STO by date" size="xs" filledHeader smallHeader>
      <Flex>
        <HStack spacing={4} align="flex-end" mb={4} flexWrap="wrap" flex={1}>
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

        {typeof onShowAllChange === "function" ? (
          <FormControl
            display="flex"
            alignItems="center"
            w="auto"
            minW="min-content"
            pb={0.5}
          >
            <FormLabel
              htmlFor="sto-cal-show-all"
              mb={0}
              mr={2}
              fontSize="xs"
              fontWeight="semibold"
              whiteSpace="nowrap"
            >
              Show All
            </FormLabel>
            <Switch
              id="sto-cal-show-all"
              isChecked={showAll}
              onChange={(e) => onShowAllChange(e.target.checked)}
              colorScheme="purple"
              size="sm"
            />
          </FormControl>
        ) : null}
      </Flex>

      {loading ? (
        <Flex
          flexWrap="wrap"
          gap="8px"
          aria-busy="true"
          aria-label="Loading calendar"
        >
          {dates.map((_, index) => (
            <Skeleton
              key={index}
              w="32px"
              h="32px"
              borderRadius="5px"
              flexShrink={0}
              startColor="purple.100"
              endColor="purple.50"
            />
          ))}
        </Flex>
      ) : (
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
                  boxShadow={
                    selected
                      ? "0 0 0 2px var(--chakra-colors-purple-400)"
                      : undefined
                  }
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
      )}
    </CustomContainer>
  );
}

export default STOMonthCalendar;
