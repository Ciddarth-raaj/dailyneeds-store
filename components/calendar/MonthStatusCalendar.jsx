import React, { useMemo } from "react";
import {
  Box,
  Flex,
  FormControl,
  FormLabel,
  HStack,
  Select,
  Skeleton,
  Text,
  Tooltip,
  VStack,
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

/** Rich tooltip card for a calendar day (status stripe + typography). */
function CalendarDayTooltipCard({ date, visual }) {
  return (
    <Box
      minW="136px"
      maxW="200px"
      borderRadius="lg"
      overflow="hidden"
      boxShadow="0 12px 40px -8px rgba(0, 0, 0, 0.45), 0 4px 12px -4px rgba(0, 0, 0, 0.25)"
      border="1px solid"
      borderColor="whiteAlpha.200"
      bg="gray.800"
      color="white"
    >
      <Flex align="stretch">
        <Box w="4px" flexShrink={0} bg={visual.text} aria-hidden />
        <VStack align="flex-start" spacing={1.5} px={3} py={2.5} flex={1}>
          <Text
            as="span"
            display="block"
            fontSize="10px"
            fontWeight="semibold"
            letterSpacing="0.08em"
            textTransform="uppercase"
            color="whiteAlpha.500"
            lineHeight={1.2}
          >
            {date.format("ddd · D MMM")}
          </Text>
          <Text
            as="span"
            display="block"
            fontSize="22px"
            fontWeight="extrabold"
            lineHeight={1}
            letterSpacing="-0.04em"
            fontVariantNumeric="tabular-nums"
          >
            {visual.primary}
          </Text>
          <Box
            w="100%"
            h="1px"
            bg="whiteAlpha.200"
            opacity={0.85}
            aria-hidden
          />
          <Text
            as="span"
            display="block"
            fontSize="sm"
            fontWeight="medium"
            color="whiteAlpha.800"
            lineHeight={1.35}
          >
            {visual.secondary}
          </Text>
        </VStack>
      </Flex>
    </Box>
  );
}

/**
 * Month grid of day cells with status styling from getDayVisual.
 * @param {string} title
 * @param {string} selectedDate YYYY-MM-DD
 * @param {(date: string) => void} onSelectDate
 * @param {moment.Moment} viewingMonth
 * @param {(m: moment.Moment) => void} onViewingMonthChange
 * @param {(date: moment.Moment) => { bg: string, border: string, text: string, primary: string, secondary: string }} getDayVisual
 * @param {boolean} loading
 * @param {React.ReactNode} [headerRight] — e.g. toggles, filters (aligned end)
 * @param {string} [size] CustomContainer size
 */
function MonthStatusCalendar({
  title,
  selectedDate,
  onSelectDate,
  viewingMonth,
  onViewingMonthChange,
  getDayVisual,
  loading = false,
  headerRight = null,
  size = "xs",
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
    <CustomContainer title={title} size={size} filledHeader smallHeader>
      <Flex align="flex-end" mb={4} flexWrap="wrap" gap={4}>
        <HStack spacing={4} align="flex-end" flexWrap="wrap" flex={1}>
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
        {headerRight ? (
          <Box flexShrink={0} pb={0.5}>
            {headerRight}
          </Box>
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
                hasArrow={false}
                gutter={10}
                openDelay={350}
                placement="top"
                p={0}
                bg="transparent"
                boxShadow="none"
                label={<CalendarDayTooltipCard date={date} visual={visual} />}
                key={index}
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

export default MonthStatusCalendar;
