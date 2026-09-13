import React from "react";
import { Box, Button, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";

/**
 * Repeated shortfalls against the SCHEDULE — a secondary, evidence-showing
 * panel.
 *
 * Every statement carries the dates and counts behind it, because the point of
 * this panel is to be checkable rather than to produce a score. It measures
 * recorded attendance against the roster, never whether the roster itself was
 * adequate, and the limitation about unverifiable punch delivery travels with
 * it rather than sitting in a footnote nobody reads.
 */
export default function RecurringGapsPanel({ data, loading, error, onLoad }) {
  const patterns = (data && data.patterns) || [];

  return (
    <CustomContainer
      title="Recurring coverage gaps"
      filledHeader
      size="xs"
      rightSection={
        <Button size="xs" variant="outline" colorScheme="purple" onClick={onLoad} isLoading={loading}>
          {data ? "Refresh" : "Analyse"}
        </Button>
      }
    >
      {error ? (
        <Flex minH="90px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="red.600" textAlign="center">
            {error}
          </Text>
        </Flex>
      ) : !data ? (
        <Flex minH="90px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            Compare the last few comparable days for repeated gaps against the schedule.
          </Text>
        </Flex>
      ) : patterns.length === 0 ? (
        <Box px={1} py={3}>
          <Text fontSize="sm" color="gray.600">
            {data.available === false
              ? "Not enough usable history to say anything about repeated gaps."
              : "No location and role shows a repeated gap across the days compared."}
          </Text>
          <Text fontSize="10px" color="gray.500" mt={2}>
            {data.basis}
          </Text>
        </Box>
      ) : (
        <Box>
          {patterns.map((p) => (
            <Box
              key={`${p.store_id}-${p.designation_id}-${p.band_from}`}
              py={2}
              borderBottomWidth="1px"
              borderColor="gray.100"
            >
              <Text fontSize="xs" fontWeight="600" color="gray.800">
                {p.outlet_name} — {p.designation_name}, {p.band_from}–{p.band_to}
              </Text>
              <Text fontSize="11px" color="gray.700">
                Recorded below the schedule on {p.days_short} of {p.days_examined} comparable days
              </Text>
              <Text fontSize="10px" color="gray.500" mt="2px">
                {p.observations
                  .map((o) => `${o.attendance_date}: ${o.recorded}/${o.expected}`)
                  .join(" · ")}
              </Text>
            </Box>
          ))}
          <Text fontSize="10px" color="gray.500" mt={2}>
            {data.basis}
          </Text>
        </Box>
      )}

      {data ? (
        <Text fontSize="10px" color="orange.700" mt={2}>
          {data.limitation}
        </Text>
      ) : null}
    </CustomContainer>
  );
}
