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
import { useModuleTableTheme } from "../../contexts/ModuleTableThemeContext";
import {
  aggregatePickPackDaysByReason,
  getPickPackDayVisual,
} from "./pickPackCalendarUtils";

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

function VerificationMonthCalendar({
  selectedDate,
  onSelectDate,
  verificationsList = [],
  viewingMonth,
  onViewingMonthChange,
}) {
  const { colorScheme } = useModuleTableTheme();
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

  const dayAggregation = useMemo(
    () => aggregatePickPackDaysByReason(verificationsList),
    [verificationsList]
  );

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
          const key = date.format("YYYY-MM-DD");
          const visual = getPickPackDayVisual(dayAggregation[key]);
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
                borderColor={selected ? `${colorScheme}.500` : visual.border}
                boxShadow={
                  selected
                    ? `0 0 0 2px var(--chakra-colors-${colorScheme}-400)`
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
    </CustomContainer>
  );
}

export default VerificationMonthCalendar;
