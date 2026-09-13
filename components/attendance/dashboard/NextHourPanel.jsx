import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";

/**
 * The next 60 minutes — a SCHEDULE outlook, not a forecast.
 *
 * It says who is rostered to start and finish and how many remain rostered
 * afterwards. It does not predict who will actually arrive, and it never says
 * the remaining cover is too thin: that would need an approved staffing
 * requirement, which does not exist and belongs to the budgeting phase.
 */
export default function NextHourPanel({ nextHour }) {
  const transitions = (nextHour && nextHour.transitions) || [];

  return (
    <CustomContainer title="Next 60 minutes" filledHeader size="xs">
      {transitions.length === 0 ? (
        <Flex minH="120px" align="center" justify="center" px={4}>
          <Text fontSize="sm" color="gray.500" textAlign="center">
            No scheduled shift changes in the next hour.
          </Text>
        </Flex>
      ) : (
        <Box>
          {transitions.map((t) => (
            <Box key={t.at} py={2} borderBottomWidth="1px" borderColor="gray.100">
              <Flex align="baseline" gap={2} wrap="wrap">
                <Text fontSize="sm" fontWeight="700" color="#1B2A5B">
                  {t.at}
                </Text>
                <Text fontSize="xs" color="gray.700">
                  {t.finishing > 0 ? `${t.finishing} finishing` : null}
                  {t.finishing > 0 && t.starting > 0 ? " · " : null}
                  {t.starting > 0 ? `${t.starting} starting` : null}
                </Text>
              </Flex>
              <Text fontSize="11px" color="gray.600" mt="2px">
                {t.remaining} scheduled after this
                {t.remaining_by_role && t.remaining_by_role.length
                  ? `: ${t.remaining_by_role.map((r) => `${r.count} ${r.role}`).join(", ")}`
                  : ""}
              </Text>
            </Box>
          ))}
          <Text fontSize="10px" color="gray.500" mt={2}>
            Scheduled shift changes only. This is what the roster says, not a prediction of who
            will arrive or leave, and it makes no judgement about whether the remaining cover is
            enough.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
