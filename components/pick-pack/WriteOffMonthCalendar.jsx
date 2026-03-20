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
 * Month/year picker + day cells styled like Daily Records Calendar.
 * @param {string} selectedDate - YYYY-MM-DD
 * @param {function(string)} onSelectDate
 * @param {object[]} writeOffsList - rows with .date for highlight (green = has record)
 * @param {moment.Moment} viewingMonth - first day of month being viewed
 * @param {function(moment.Moment)} onViewingMonthChange
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

  const datesWithRecords = useMemo(() => {
    const dateSet = new Set();
    writeOffsList.forEach((row) => {
      if (!row?.date) return;
      const d = moment(row.date).format("YYYY-MM-DD");
      dateSet.add(d);
    });
    return dateSet;
  }, [writeOffsList]);

  const hasRecord = (date) => datesWithRecords.has(date.format("YYYY-MM-DD"));
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
          const hasRecordForDate = hasRecord(date);
          const selected = isSelected(date);

          return (
            <Tooltip
              label={date.format("DD/MM/YYYY - ddd")}
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
                bg={hasRecordForDate ? "green.50" : "red.50"}
                border="1px solid"
                borderColor={
                  selected
                    ? "purple.500"
                    : hasRecordForDate
                    ? "green.200"
                    : "red.200"
                }
                boxShadow={selected ? "0 0 0 2px var(--chakra-colors-purple-400)" : undefined}
                cursor="pointer"
                _hover={{ opacity: 0.9 }}
              >
                <Text
                  fontWeight="medium"
                  fontSize="xs"
                  color={hasRecordForDate ? "green.600" : "red.600"}
                >
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
