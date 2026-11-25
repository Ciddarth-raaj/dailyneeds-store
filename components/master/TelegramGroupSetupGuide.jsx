import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Code,
  Divider,
  Flex,
  ListItem,
  Stack,
  Text,
  UnorderedList,
} from "@chakra-ui/react";
import Drawer from "../Drawer";
import { TELEGRAM_GROUP_CATEGORIES, GROUP_TYPE } from "../../util/telegramGroup";

/**
 * "How to set up a Telegram group" - the operational guide.
 *
 * TWO PRESENTATIONS, ONE COPY. `TelegramGroupSetupSteps` is the content and
 * is rendered INLINE on the Add page, where it is the main instruction and
 * must be readable without clicking anything. The default export wraps the
 * same component in the shared Drawer for the registry list, where the guide
 * is a reference somebody occasionally opens rather than the point of the
 * screen. Two copies of this wording is how one of them quietly goes stale -
 * which has already happened once on this feature.
 *
 * IT MUST NOT DRIFT FROM THE FORM. The field list and the category list are
 * read from `util/telegramGroup.js` rather than typed out again, and the
 * tests assert the field list against the form's own inputs. The rules it
 * states are enforced by the form and again by the server; nothing here is
 * the enforcement, only the explanation.
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
    <Flex gap={3} align="flex-start">
      <Flex
        flexShrink={0}
        align="center"
        justify="center"
        w="24px"
        h="24px"
        borderRadius="full"
        bg="purple.500"
        color="white"
        fontSize="xs"
        fontWeight="700"
        mt="1px"
      >
        {number}
      </Flex>
      <Box>
        <Text fontWeight="600" fontSize="sm" mb={1}>
          {title}
        </Text>
        <Box fontSize="sm" color="gray.700">
          {children}
        </Box>
      </Box>
    </Flex>
  );
}

/**
 * The steps themselves. `compact` drops the closing field checklist, which
 * the Add page does not need: the form is directly below it.
 */
export function TelegramGroupSetupSteps({ compact = false }) {
  return (
    <Stack spacing={5}>
      <Step number="1" title="Create a Telegram group">
        <Text>Create the group in Telegram with the required team members.</Text>
      </Step>

      <Step number="2" title="Convert it to a Supergroup">
        <Text>
          If Telegram shows <strong>Convert to Supergroup</strong> or{" "}
          <strong>Upgrade to Supergroup</strong>, use it.
        </Text>
        <Text mt={2}>
          If that option is not visible, open the group settings and turn on a
          feature that needs a Supergroup — such as{" "}
          <strong>Chat history visible for new members</strong> or{" "}
          <strong>Topics</strong>. Telegram may then upgrade the group for you.
        </Text>
      </Step>

      <Step number="3" title="Add the Daily Needs bot">
        <Text>
          Add the Daily Needs Telegram bot — the one dnds.co.in already uses —
          and make it an administrator.
        </Text>
      </Step>

      <Step number="4" title="Send /setup">
        <Text>
          Send <Code fontSize="xs">/setup</Code> inside the Telegram group.
        </Text>
      </Step>

      <Step number="5" title="Detect the group">
        <Text>
          Click <strong>Detect Group</strong> on this page. The Group Name and
          Group Chat ID are filled in once you select the detected group.
        </Text>
      </Step>

      <Step number="6" title="Complete and save">
        <Text>Complete the remaining fields and click Create.</Text>
        {compact ? null : (
          <>
            <Text mt={2} mb={1}>
              The form asks for:
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
          </>
        )}
      </Step>

      <Divider />

      {/* Small and closing on purpose. Everything actionable is in the steps
          above; this is the handful of facts worth carrying away, not a
          second instruction block. */}
      <Stack spacing={1} fontSize="sm" color="gray.600">
        <Text>
          <Badge colorScheme="green" mr={2}>
            {GROUP_TYPE.SUPERGROUP}
          </Badge>
          Chat IDs normally start with <Code fontSize="xs">-100</Code>.
        </Text>
        <Text>Detect Group is the preferred method.</Text>
        <Text>No third-party bot or server-log lookup is required.</Text>
      </Stack>
    </Stack>
  );
}

/** The same guide as a drawer, for the registry list screen. */
export default function TelegramGroupSetupGuide({ isOpen, onClose }) {
  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="How to set up a Telegram group"
      size="md"
    >
      <Box pb={4}>
        <Alert status="info" fontSize="sm" borderRadius="md" mb={5} alignItems="flex-start">
          <AlertIcon />
          <Text>
            For Daily Needs operational groups we recommend a{" "}
            <strong>{GROUP_TYPE.SUPERGROUP}</strong>. A {GROUP_TYPE.BASIC_GROUP} can
            be registered, but invite links and member removal need it converted
            first.
          </Text>
        </Alert>
        <TelegramGroupSetupSteps />
      </Box>
    </Drawer>
  );
}
