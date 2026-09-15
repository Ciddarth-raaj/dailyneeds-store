import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Code,
  Divider,
  ListItem,
  OrderedList,
  Stack,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import Drawer from "../Drawer";
import { TELEGRAM_GROUP_CATEGORIES, GROUP_TYPE } from "../../util/telegramGroup";

/**
 * "How to set up a Telegram group" - the operational guide, in the app.
 *
 * WHY IT LIVES HERE RATHER THAN IN A DOC. Every step of it ends at this
 * screen: create the group, convert it, add the bot, find the Chat ID, then
 * type those values into the form behind this drawer. A guide somebody has
 * to go and find is a guide read once; this one is a click away at the
 * moment it is needed.
 *
 * IT MUST NOT DRIFT FROM THE FORM. The field list and the category list are
 * read from `util/telegramGroup.js` rather than typed out again, so adding a
 * category cannot leave this page quietly telling people the old set. The
 * rules it states - negative-only Chat ID, no spaces, uniqueness, the derived
 * group type - are enforced by the form and again by the server; nothing here
 * is the enforcement, only the explanation.
 */

/** The fields the form asks for, in the order it asks for them. */
const FORM_FIELDS = [
  { label: "Group Name", note: "filled in by Detect Group" },
  { label: "Group Chat ID", note: "filled in by Detect Group, and unique" },
  { label: "Category", note: "required" },
  { label: "Used For", note: "required - what this specific group is for" },
  { label: "Outlet", note: "optional - leave blank for a company-wide group" },
  { label: "Bot Is Admin", note: "required - Yes or No" },
  { label: "Status", note: "required - defaults to Active" },
];

function Step({ number, title, children }) {
  return (
    <Box>
      <Text fontWeight="600" fontSize="sm" mb={1}>
        Step {number} — {title}
      </Text>
      <Box fontSize="sm" color="gray.700" pl={1}>
        {children}
      </Box>
    </Box>
  );
}

export default function TelegramGroupSetupGuide({ isOpen, onClose }) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="How to set up a Telegram group"
      size="md"
    >
      <Stack spacing={5} pb={4}>
        <Alert status="info" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Text>
            For Daily Needs operational groups we recommend a{" "}
            <strong>{GROUP_TYPE.SUPERGROUP}</strong>. A{" "}
            {GROUP_TYPE.BASIC_GROUP} can be registered, but invite links and
            member removal need it converted first.
          </Text>
        </Alert>

        <Alert status="success" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Text>
            Steps 4 and 5 replace the old way of finding a Chat ID. Send{" "}
            <Code fontSize="xs">/setup</Code> in the group, then click{" "}
            <strong>Detect Group</strong> on the Add form.
          </Text>
        </Alert>

        <Step number="1" title="Create the Telegram group">
          <OrderedList spacing={1}>
            <ListItem>Open Telegram.</ListItem>
            <ListItem>Tap New Group.</ListItem>
            <ListItem>Add the required members.</ListItem>
            <ListItem>Enter the group name.</ListItem>
            <ListItem>Create the group.</ListItem>
          </OrderedList>
        </Step>

        <Step number="2" title="Convert it to a Supergroup">
          <OrderedList spacing={1}>
            <ListItem>Open the group.</ListItem>
            <ListItem>Tap the group name at the top.</ListItem>
            <ListItem>Open Edit / Manage Group.</ListItem>
            <ListItem>Look for Convert to Supergroup / Upgrade to Supergroup.</ListItem>
            <ListItem>Confirm the conversion.</ListItem>
          </OrderedList>
          <Text mt={2} color="gray.600">
            Telegram may upgrade a basic group automatically when you enable a
            feature that requires a Supergroup.
          </Text>
        </Step>

        <Step number="3" title="Add the Daily Needs bot">
          <OrderedList spacing={1}>
            <ListItem>Open the group.</ListItem>
            <ListItem>Go to Group Info → Administrators.</ListItem>
            <ListItem>Choose Add Administrator.</ListItem>
            <ListItem>
              Select the Daily Needs Telegram bot — the one dnds.co.in already
              uses.
            </ListItem>
            <ListItem>Give it the permissions Daily Needs automation needs.</ListItem>
            <ListItem>Save.</ListItem>
          </OrderedList>
          <Text mt={2} color="gray.600">
            Keep the bot as an administrator.
          </Text>
        </Step>

        <Step number="4" title="Send /setup in the group">
          <Text>
            Send <Code fontSize="xs">/setup</Code> inside the Telegram group.
            That is what tells Daily Needs which group you mean — there is no
            Chat ID to look up and nothing to copy out of a log.
          </Text>
        </Step>

        <Step number="5" title="Detect the group here">
          <Text>
            Open Master → Telegram Groups → Add Group and click{" "}
            <strong>Detect Group</strong>. The group name and Chat ID are
            filled in for you.
          </Text>
          <Text mt={2} color="gray.600">
            Nothing detected? Check the bot is in the group and send{" "}
            <Code fontSize="xs">/setup</Code> again — a detection is only
            offered for a little while.
          </Text>
        </Step>

        <Step number="6" title="Complete the rest and save">
          <Text mb={2}>
            Group Name and Group Chat ID arrive from Detect Group. Complete
            the rest:
          </Text>
          <UnorderedList spacing={1}>
            {FORM_FIELDS.map((field) => (
              <ListItem key={field.label}>
                {field.label}{" "}
                <Text as="span" color="gray.500">
                  — {field.note}
                </Text>
              </ListItem>
            ))}
          </UnorderedList>
          <Text mt={2} color="gray.600">
            Categories: {TELEGRAM_GROUP_CATEGORIES.join(", ")}.
          </Text>
          <Text mt={1} color="gray.600">
            The Group Type is detected from the Chat ID — there is nothing to
            choose.
          </Text>
        </Step>

        <Divider />

        <Box>
          <Text fontWeight="600" fontSize="sm" mb={2}>
            How to verify
          </Text>
          <Stack spacing={2} fontSize="sm">
            <Text>
              A Chat ID starting <Code fontSize="xs">-100</Code> shows as{" "}
              <Badge colorScheme="green">{GROUP_TYPE.SUPERGROUP}</Badge>
            </Text>
            <Text>
              Any other valid negative Chat ID shows as{" "}
              <Badge colorScheme="orange">{GROUP_TYPE.BASIC_GROUP}</Badge>
            </Text>
            <Text color="gray.600">
              No server-log or manual Chat ID lookup is needed.
            </Text>
          </Stack>
        </Box>

        <Alert status="warning" fontSize="sm" borderRadius="md" alignItems="flex-start">
          <AlertIcon />
          <Box>
            <Text fontWeight="600" mb={1}>
              Important
            </Text>
            <UnorderedList spacing={1}>
              <ListItem>
                Detect Group is the reliable way to get the Chat ID. If you do
                type one by hand, the rules below still apply.
              </ListItem>
              <ListItem>
                Do not enter a personal Telegram user ID. A personal ID is
                positive and is rejected.
              </ListItem>
              <ListItem>
                Do not add spaces before or after the Chat ID — it is rejected,
                not tidied up.
              </ListItem>
              <ListItem>Each Chat ID can be registered only once.</ListItem>
              <ListItem>
                If the bot is not an administrator, group-management automation
                will not work. The group is still saved, and flagged.
              </ListItem>
            </UnorderedList>
          </Box>
        </Alert>
      </Stack>
    </Drawer>
  );
}
