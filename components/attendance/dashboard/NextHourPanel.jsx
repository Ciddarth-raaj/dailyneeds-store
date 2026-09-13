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
 *
 * IT SHOWS STARTERS, WHICH IT PREVIOUSLY COULD NOT. The server built this view
 * from the Expected Now population alone, so somebody whose shift began in
 * twenty minutes was missing — at 09:30 the 10-10 staff simply did not appear.
 * It is now built from every relevant shift on one timeline, running or not, so
 * a starter shows up before they start, which is the only reason to look at a
 * "next 60 minutes" panel at all.
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
              {t.starting > 0 && t.starting_by_location && t.starting_by_location.length ? (
                <Text fontSize="10px" color="gray.600" mt="2px">
                  Starting: {t.starting_by_location.map((r) => `${r.count} at ${r.location}`).join(", ")}
                </Text>
              ) : null}
              {t.finishing > 0 && t.finishing_by_location && t.finishing_by_location.length ? (
                <Text fontSize="10px" color="gray.600" mt="2px">
                  Finishing: {t.finishing_by_location.map((r) => `${r.count} at ${r.location}`).join(", ")}
                </Text>
              ) : null}
              <Text fontSize="11px" color="gray.600" mt="2px">
                {t.remaining} scheduled after this
                {t.remaining_by_role && t.remaining_by_role.length
                  ? `: ${t.remaining_by_role.map((r) => `${r.count} ${r.role}`).join(", ")}`
                  : ""}
              </Text>
            </Box>
          ))}
          <Text fontSize="10px" color="gray.500" mt={2}>
            Scheduled shift changes only, from every shift relevant to this window — running,
            starting, finishing, and one that began yesterday. This is what the roster says, not a
            prediction of who will arrive or leave, and it makes no judgement about whether the
            remaining cover is enough.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
