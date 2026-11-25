import React from "react";
import { Box, List, ListIcon, ListItem, Text } from "@chakra-ui/react";
import { CheckCircleIcon } from "@chakra-ui/icons";
import { HELP_LINES } from "../../util/telegramAttendance";

/**
 * HELP - five sentences, and deliberately nothing more.
 *
 * The lines live in `util/telegramAttendance.js#HELP_LINES` so they are a
 * value a test can assert against rather than JSX somebody has to scrape.
 *
 * NO APPROVAL CONTROLS AND NOTHING THAT LOOKS LIKE ONE. Approving a
 * regularisation is the manager/HR screens' job, on the ordinary site, behind
 * `approve_attendance_regularization` and the existing chain. Telegram is
 * employee self-service; the last line points at the people who can actually
 * fix an identity problem rather than offering a control that would not work.
 */
export default function TelegramHelp() {
  return (
    <Box>
      <Text fontSize="sm" fontWeight="700" mb={3}>
        How this works
      </Text>
      <List spacing={3}>
        {HELP_LINES.map((line) => (
          <ListItem key={line} fontSize="sm" color="gray.700">
            <ListIcon as={CheckCircleIcon} color="purple.400" />
            {line}
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
