import React, { useMemo, useState } from "react";
import {
  Alert,
  AlertIcon,
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Spinner,
  Stack,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tooltip,
  Tr,
} from "@chakra-ui/react";
import {
  canRevoke,
  membershipChip,
  membershipSummary,
  revokeBlockedReason,
  sourceChip,
} from "../../util/telegramManagedMembership";

/**
 * WHO THIS GROUP MANAGES, and the one place a person is added by hand.
 *
 * ============================== WHY THIS IS ON THE GROUP MAP ===============
 *
 * Granting somebody a company Telegram group is granting ACCESS. It belongs
 * beside the mappings that grant it by rule, under the same
 * `manage_telegram_groups` key, and NOT on the employee record - where
 * `employee_edit` is held by everybody who maintains employee details, and
 * where an ordinary record edit would become a way into a group its owners
 * never agreed to.
 *
 * ===================== ADDING SOMEBODY DOES NOT PUT THEM IN THE GROUP ======
 *
 * No bot can add a person to a Telegram group - Telegram does not offer it.
 * What this does is make the group REQUIRED for them, so their own Telegram
 * panel offers the join link and reports the status. The wording says so
 * rather than implying an instant result that will not happen.
 */
export default function TelegramGroupManagedMembership({
  claims = [],
  loading = false,
  error = null,
  canManage = false,
  onGrant,
  onRevoke,
  busy = false,
}) {
  const [employeeId, setEmployeeId] = useState("");

  const live = useMemo(() => claims.filter((claim) => claim.state !== "CLOSED"), [claims]);

  const submit = async (event) => {
    event.preventDefault();
    const id = Number(employeeId);
    if (!Number.isInteger(id) || id <= 0) return;
    await onGrant(id);
    setEmployeeId("");
  };

  return (
    <Box borderWidth="1px" borderRadius="md" p={4}>
      <Flex justify="space-between" align="center" wrap="wrap" gap={2} mb={2}>
        <Box>
          <Text fontWeight="600">Managed Membership</Text>
          <Text fontSize="xs" color="gray.500">
            Who Diya manages into this group, and why
          </Text>
        </Box>
        {canManage && (
          <form onSubmit={submit}>
            <Flex gap={2}>
              <Input
                size="sm"
                width="160px"
                placeholder="Employee ID"
                value={employeeId}
                onChange={(event) => setEmployeeId(event.target.value)}
                aria-label="Employee ID to add to this group"
              />
              <Button size="sm" colorScheme="purple" type="submit" isLoading={busy}>
                Add Employee
              </Button>
            </Flex>
          </form>
        )}
      </Flex>

      {loading && (
        <Box textAlign="center" py={6}>
          <Spinner color="purple.500" size="sm" />
        </Box>
      )}

      {error && (
        <Alert status="error" borderRadius="md" mb={2}>
          <AlertIcon />
          <Box fontSize="sm">{error.message || "Failed to load managed membership"}</Box>
        </Alert>
      )}

      {!loading && !error && (
        <>
          <Text fontSize="sm" color="gray.600" mb={2}>
            {membershipSummary(claims)}
          </Text>

          {live.length > 0 && (
            <Table size="sm" variant="simple">
              <Thead>
                <Tr>
                  <Th>Employee</Th>
                  <Th>Source</Th>
                  <Th>Status</Th>
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {live.map((claim) => {
                  const state = membershipChip(claim);
                  const source = sourceChip(claim);
                  const blocked = revokeBlockedReason(claim, { canManage });
                  return (
                    <Tr key={`${claim.employee_id}-${claim.source}`}>
                      <Td>
                        <Text fontSize="sm">{claim.employee_name || `Employee ${claim.employee_id}`}</Text>
                      </Td>
                      <Td>
                        <Tooltip label={source.hint} hasArrow>
                          <Badge colorScheme={source.scheme}>{source.label}</Badge>
                        </Tooltip>
                      </Td>
                      <Td>
                        <Tooltip label={state.hint} hasArrow>
                          <Badge colorScheme={state.scheme}>{state.label}</Badge>
                        </Tooltip>
                      </Td>
                      <Td textAlign="right">
                        {canRevoke(claim, { canManage }) ? (
                          <Button
                            size="xs"
                            variant="outline"
                            colorScheme="red"
                            isLoading={busy}
                            onClick={() => onRevoke(claim.employee_id)}
                          >
                            Remove
                          </Button>
                        ) : (
                          blocked && (
                            <Tooltip label={blocked} hasArrow>
                              <Text fontSize="xs" color="gray.400">
                                —
                              </Text>
                            </Tooltip>
                          )
                        )}
                      </Td>
                    </Tr>
                  );
                })}
              </Tbody>
            </Table>
          )}

          <Alert status="info" borderRadius="md" mt={3}>
            <AlertIcon />
            <Box fontSize="xs">
              Adding somebody here makes this group required for them and offers the join link on
              their Telegram panel. Nobody is added to the Telegram group automatically - Telegram
              does not allow a bot to do that.
            </Box>
          </Alert>
        </>
      )}
    </Box>
  );
}
