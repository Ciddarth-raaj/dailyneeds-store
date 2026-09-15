import React from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Radio,
  RadioGroup,
  Spinner,
  Stack,
  Text,
} from "@chakra-ui/react";
import CustomModal from "../CustomModal";
import { GROUP_TYPE, deriveGroupType } from "../../util/telegramGroup";

/**
 * Detect Group - pick the Telegram group that just sent `/setup`.
 *
 * WHAT IT REPLACES. Reading a Chat ID out of the bot logs and typing it in,
 * which is where the wrong-id mistakes come from: a personal id copied by
 * accident, a digit dropped, a stray space. A detected id is the one
 * Telegram itself reported.
 *
 * IT NEVER SILENTLY OVERWRITES. Selecting a group fills Group Name and Chat
 * ID, and that is an explicit act - the button does not autofill on open, and
 * when either field already has something in it the confirm step says so
 * first. Somebody who typed a Chat ID by hand and then went looking for the
 * button should not lose what they typed.
 *
 * GROUP TYPE IS SHOWN, NEVER CHOSEN. It is derived from the detected Chat ID
 * exactly as it is everywhere else.
 */

const EMPTY_STATE =
  "No Telegram group detected yet. Add the Daily Needs bot to the group and send /setup, then try again.";

/** "2 minutes ago", from the ISO timestamp the API returns. */
export function detectedAgo(iso, now = new Date()) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return "";
  const seconds = Math.max(0, Math.round((now.getTime() - at.getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function DetectedGroup({ group }) {
  const type = group.group_type || deriveGroupType(group.chat_id);
  return (
    <Box>
      <Text fontWeight="600" fontSize="sm">
        {group.group_name}
      </Text>
      <Flex gap={2} align="center" wrap="wrap" mt={1}>
        <Text fontSize="sm" fontFamily="mono">
          {group.chat_id}
        </Text>
        <Badge colorScheme={type === GROUP_TYPE.SUPERGROUP ? "green" : "orange"}>
          {type}
        </Badge>
        <Text fontSize="xs" color="gray.500">
          detected {detectedAgo(group.detected_at)}
        </Text>
      </Flex>
    </Box>
  );
}

export default function DetectTelegramGroup({
  isOpen,
  onClose,
  detected,
  loading,
  error,
  onRetry,
  onSelect,
  willOverwrite,
}) {
  const [selected, setSelected] = React.useState(null);

  // A fresh open starts with nothing chosen, so a previous selection cannot
  // be applied by a stray second click.
  React.useEffect(() => {
    if (isOpen) setSelected(null);
  }, [isOpen]);

  const groups = Array.isArray(detected) ? detected : [];
  const single = groups.length === 1;
  const chosen = single ? groups[0] : groups.find((g) => g.chat_id === selected);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="Detect Telegram group"
      size="lg"
      footer={
        <Flex gap={3} justify="flex-end" w="100%">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="outline" colorScheme="purple" onClick={onRetry} isLoading={loading}>
            Check again
          </Button>
          <Button
            colorScheme="purple"
            isDisabled={!chosen || loading}
            onClick={() => chosen && onSelect(chosen)}
          >
            Use this group
          </Button>
        </Flex>
      }
    >
      {loading ? (
        <Stack align="center" py={8}>
          <Spinner color="purple.500" />
          <Text fontSize="sm" color="gray.500">
            Checking for a group that sent /setup…
          </Text>
        </Stack>
      ) : error ? (
        <Alert status="error" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {error.message || "Could not check for detected Telegram groups."}
        </Alert>
      ) : groups.length === 0 ? (
        <Alert status="info" fontSize="sm" borderRadius="md">
          <AlertIcon />
          {EMPTY_STATE}
        </Alert>
      ) : (
        <Stack spacing={4}>
          {willOverwrite ? (
            <Alert status="warning" fontSize="sm" borderRadius="md">
              <AlertIcon />
              This will replace the Group Name and Chat ID you have already
              entered.
            </Alert>
          ) : null}

          {single ? (
            <Box borderWidth="1px" borderRadius="md" p={3}>
              <DetectedGroup group={groups[0]} />
            </Box>
          ) : (
            <>
              <Text fontSize="sm" color="gray.600">
                {groups.length} groups have sent /setup. Choose the one you are
                registering.
              </Text>
              <RadioGroup value={selected || ""} onChange={setSelected}>
                <Stack spacing={3}>
                  {groups.map((group) => (
                    <Box key={group.chat_id} borderWidth="1px" borderRadius="md" p={3}>
                      <Radio value={group.chat_id} colorScheme="purple" alignItems="flex-start">
                        <DetectedGroup group={group} />
                      </Radio>
                    </Box>
                  ))}
                </Stack>
              </RadioGroup>
            </>
          )}

          <Text fontSize="xs" color="gray.500">
            Detecting a group confirms the bot can read it. It does not prove
            the bot is an administrator — set Bot Is Admin yourself below.
          </Text>
        </Stack>
      )}
    </CustomModal>
  );
}

export { EMPTY_STATE };
