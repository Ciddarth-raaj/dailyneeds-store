import React, { useEffect, useState } from "react";
import { Badge, Box, Divider, Flex, Stack, Text, Tooltip } from "@chakra-ui/react";
import employeeTelegram from "../../helper/employeeTelegram";
import {
  membershipChip,
  sourceChip,
} from "../../util/telegramManagedMembership";

/**
 * MANAGED MEMBERSHIP, READ-ONLY, on the employee's record. Phase 3C.
 *
 * It answers one question a manager looking at a person actually asks: why
 * is this group on their list - because a rule matches them, or because
 * somebody put them there? And, when a removal has been decided but Telegram
 * has not caught up, it says that too rather than showing them as settled.
 *
 * THERE IS NO CONTROL HERE, DELIBERATELY. Granting or revoking a group is
 * `manage_telegram_groups` work on the Group Map. Putting a button here
 * would put it behind `employee_edit`, which is held by everybody who
 * maintains employee records - and group access is not an employee detail.
 *
 * It renders NOTHING when there is nothing to say, so an employee with only
 * rule-matched groups and no pending cleanup sees no extra furniture.
 */
export default function TelegramManagedMembership({ employeeId, connected }) {
  const [claims, setClaims] = useState([]);

  useEffect(() => {
    let cancelled = false;
    if (!employeeId) return undefined;
    employeeTelegram
      .getManagedMembership(employeeId)
      .then((response) => {
        if (cancelled) return;
        setClaims(response && response.code === 200 && Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        // A screen that already works must not break because an optional
        // read failed; the required-groups list above is the primary view.
        if (!cancelled) setClaims([]);
      });
    return () => {
      cancelled = true;
    };
  }, [employeeId, connected]);

  const live = claims.filter((claim) => claim.state !== "CLOSED");
  if (live.length === 0) return null;

  return (
    <Stack spacing={2}>
      <Divider />
      <Box>
        <Text fontWeight="600">Managed Membership</Text>
        <Text fontSize="xs" color="gray.500">
          Why each group applies to this employee. Managed from the Telegram Group Map.
        </Text>
      </Box>
      <Stack spacing={1}>
        {live.map((claim) => {
          const state = membershipChip(claim);
          const source = sourceChip(claim);
          return (
            <Flex
              key={`${claim.telegram_group_id}-${claim.source}`}
              align="center"
              justify="space-between"
              gap={2}
              wrap="wrap"
            >
              <Text fontSize="sm">{claim.group_name || `Group ${claim.telegram_group_id}`}</Text>
              <Flex gap={2}>
                <Tooltip label={source.hint} hasArrow>
                  <Badge colorScheme={source.scheme}>{source.label}</Badge>
                </Tooltip>
                <Tooltip label={state.hint} hasArrow>
                  <Badge colorScheme={state.scheme}>{state.label}</Badge>
                </Tooltip>
              </Flex>
            </Flex>
          );
        })}
      </Stack>
    </Stack>
  );
}
