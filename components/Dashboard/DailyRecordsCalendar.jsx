import React, { useMemo } from "react";
import { Box, Flex, Text, Tooltip } from "@chakra-ui/react";
import moment from "moment";
import CustomContainer from "../CustomContainer";

function DailyRecordsCalendar({ accountsList = [], fromDate, toDate }) {
  // Generate all dates between fromDate and toDate
  const dates = useMemo(() => {
    const start = moment(fromDate).startOf("day");
    const end = moment(toDate).startOf("day");
    const dateArray = [];

    let current = start.clone();
    while (current.isSameOrBefore(end)) {
      dateArray.push(current.clone());
      current.add(1, "day");
    }

    return dateArray;
  }, [fromDate, toDate]);

  // Create a Set of dates that have records (for O(1) lookup)
  const datesWithRecords = useMemo(() => {
    const dateSet = new Set();
    accountsList.forEach((account) => {
      const accountDate = moment(account.date)
        .startOf("day")
        .format("YYYY-MM-DD");
      dateSet.add(accountDate);
    });
    return dateSet;
  }, [accountsList]);

  // Check if a date has a record
  const hasRecord = (date) => {
    const dateStr = date.format("YYYY-MM-DD");
    return datesWithRecords.has(dateStr);
  };

  return (
    <CustomContainer
      title="Daily Records Calendar"
      size="xs"
      filledHeader
      smallHeader
    >
      <Flex flexWrap="wrap" gap="8px">
        {dates.map((date, index) => {
          const hasRecordForDate = hasRecord(date);

          return (
            <Tooltip
              label={date.format("DD/MM/YYYY - ddd")}
              key={index}
              openDelay={500}
            >
              <Flex
                borderRadius="5px"
                w="32px"
                h="32px"
                justifyContent="center"
                alignItems="center"
                bg={hasRecordForDate ? "green.50" : "red.50"}
                border="1px solid"
                borderColor={hasRecordForDate ? "green.200" : "red.200"}
              >
                <Text
                  fontWeight="medium"
                  fontSize="xs"
                  color={hasRecordForDate ? "green.600" : "red.600"}
                >
                  {date.format("D")}
                </Text>
              </Flex>
            </Tooltip>
          );
        })}
      </Flex>
    </CustomContainer>
  );
}

export default DailyRecordsCalendar;
