import React, { useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Code,
  Divider,
  Flex,
  Spinner,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import employeeTelegram from "../../helper/employeeTelegram";
import { useEmployeeTelegramGroups } from "../../customHooks/useEmployeeTelegramGroups";
import {
  GROUP_MESSAGES,
  canJoin,
  isJoined,
  isNotReady,
  isPending,
  membershipColor,
  membershipLabel,
  progressSummary,
  readinessReason,
  telegramComplete,
} from "../../util/employeeTelegramGroups";

/**
 * REQUIRED GROUPS - the second half of the Telegram stage. Phase 3B.
 *
 * Shown inside `TelegramSetupPanel` once an identity is connected, so BOTH
 * the onboarding wizard and the Employee Master profile get it from one
 * component. An existing connected employee reaches exactly the same list
 * without reconnecting anything, which is the point: this is not only an
 * onboarding feature.
 *
 * ============================ WHAT THIS SCREEN CANNOT DO ==================
 *
 * There is no Remove, no Leave, no Kick and no "sync members" here, and the
 * API behind it has no endpoint that could. Phase 3B invites and verifies;
 * taking somebody out of a group is Phase 3C and has not been designed.
 *
 * ============================ THE LINK IS FOR ONE PHONE ===================
 *
 * The invite URL is a one-time credential that only works for the Telegram
 * account that employee verified - a forwarded copy is refused by the bot.
 * It is held in React state while it is on screen and never stored; the
 * wording tells the manager to open it on the employee's own phone, because
 * a link opened on the wrong device simply will not work and that is
 * confusing unless it was said first.
 *
 * ============================ NOT READY IS NOT THE EMPLOYEE'S FAULT =======
 *
 * A group whose bot is not an admin shows the reason in plain words and NO
 * Join button - there is nothing the employee or the manager can do from
 * here, and offering a button that always fails is worse than offering none.
 */
export default function TelegramRequiredGroups({ employeeId, connected }) {
  const { data, loading, error, refresh, polling } = useEmployeeTelegramGroups(employeeId, {
    enabled: Boolean(employeeId) && Boolean(connected),
  });
  const [busyGroupId, setBusyGroupId] = useState(null);
  const [links, setLinks] = useState({});

  if (!connected) {
    return (
      <Alert status="info" borderRadius="md">
        <AlertIcon />
        <Text fontSize="sm">{GROUP_MESSAGES.NOT_CONNECTED}</Text>
      </Alert>
    );
  }

  const groups = (data && data.groups) || [];
  const complete = telegramComplete(data);

  const handleJoin = async (group) => {
    setBusyGroupId(group.telegram_group_id);
    try {
      const response = await employeeTelegram.createJoinLink(
        employeeId,
        group.telegram_group_id
      );
      if (response && response.code === 200) {
        if (response.already_joined) {
          toast.success("Already in this group");
        } else if (response.invite_link) {
          // Held here while it is on screen. Never stored.
          setLinks((previous) => ({
            ...previous,
            [group.telegram_group_id]: response.invite_link,
          }));
        }
        await refresh();
        return;
      }
      toast.error((response && response.msg) || "Could not create a join link");
    } catch (err) {
      toast.error((err && err.message) || "Could not create a join link");
    } finally {
      setBusyGroupId(null);
    }
  };

  return (
    <Stack spacing={3}>
      <Divider />

      <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
        <Box>
          <Text fontWeight="600">Required Groups</Text>
          <Text fontSize="sm" color="gray.600">
            {loading && !data ? "Checking…" : progressSummary(data)}
          </Text>
        </Box>
        <Flex align="center" gap={2}>
          {polling && <Spinner size="sm" color="purple.500" />}
          <Button size="sm" variant="outline" onClick={refresh} isDisabled={loading}>
            Refresh
          </Button>
        </Flex>
      </Flex>

      {error && (
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">
            {error.message || "Could not load required groups"}
          </Text>
        </Alert>
      )}

      {/* ZERO REQUIRED GROUPS IS COMPLETE, and says so rather than showing an
          empty box that reads as a loading failure. */}
      {!loading && groups.length === 0 && !error && (
        <Alert status="info" borderRadius="md">
          <AlertIcon />
          <Text fontSize="sm">{GROUP_MESSAGES.NONE_REQUIRED}</Text>
        </Alert>
      )}

      <Stack spacing={2}>
        {groups.map((group) => {
          const reason = readinessReason(group);
          const link = links[group.telegram_group_id];
          return (
            <Box
              key={group.telegram_group_id}
              borderWidth="1px"
              borderRadius="md"
              p={3}
              borderColor={isNotReady(group) ? "red.200" : "gray.200"}
            >
              <Flex align="center" justify="space-between" wrap="wrap" gap={2}>
                <Box>
                  <Text fontWeight="600">{group.group_name}</Text>
                  {group.used_for && (
                    <Text fontSize="xs" color="gray.500">
                      {group.used_for}
                    </Text>
                  )}
                </Box>
                <Flex align="center" gap={2}>
                  <Badge colorScheme={membershipColor(group.membership_status)}>
                    {membershipLabel(group.membership_status)}
                  </Badge>
                  {canJoin(group) && (
                    <Button
                      size="sm"
                      colorScheme="purple"
                      onClick={() => handleJoin(group)}
                      isLoading={busyGroupId === group.telegram_group_id}
                    >
                      Join
                    </Button>
                  )}
                  {isPending(group) && (
                    <Tooltip label={GROUP_MESSAGES.PENDING_HINT}>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJoin(group)}
                        isLoading={busyGroupId === group.telegram_group_id}
                      >
                        New link
                      </Button>
                    </Tooltip>
                  )}
                </Flex>
              </Flex>

              {/* The reason, in words. Never the raw readiness enum. */}
              {reason && (
                <Alert status="warning" borderRadius="md" mt={2} py={2}>
                  <AlertIcon />
                  <Text fontSize="sm">{reason}</Text>
                </Alert>
              )}

              {link && (
                <Box mt={2}>
                  <Text fontSize="sm" color="gray.700">
                    {GROUP_MESSAGES.LINK_READY}
                  </Text>
                  <Code fontSize="xs" mt={1} p={2} borderRadius="md" wordBreak="break-all">
                    {link}
                  </Code>
                </Box>
              )}
            </Box>
          );
        })}
      </Stack>

      {/* Telegram Complete - identity connected AND every required group
          verified joined. A group that is merely not ready keeps this off,
          because the requirement is genuinely unmet. */}
      <Alert status={complete ? "success" : "info"} borderRadius="md">
        <AlertIcon />
        <Text fontSize="sm" fontWeight="600">
          {complete ? GROUP_MESSAGES.COMPLETE : GROUP_MESSAGES.INCOMPLETE}
        </Text>
      </Alert>
    </Stack>
  );
}
