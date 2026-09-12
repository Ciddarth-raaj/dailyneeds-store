import React from "react";
import { Badge, Box, Button, Flex, Text } from "@chakra-ui/react";
import CustomContainer from "../../CustomContainer";
import { ISSUE_LINK, tone } from "../../../util/attendanceDashboard";

/**
 * Panel E - Attention Required: the four canonical attendance issues,
 * prioritized for follow-up.
 *
 * THE FOUR ARE THE CANONICAL ONES and the labels are the words staff already
 * see on the Employee Attendance screen: Missing Punch, Regularization
 * Pending, No Shift Assigned, Shift Setup Issue. The server orders them by
 * count so the biggest queue is first.
 *
 * IT LINKS OUT; IT DOES NOT DECIDE. There is no approve or reject button
 * anywhere on this dashboard. Each row opens the EXISTING permitted screen for
 * that kind of work - Attendance Approval, Employee Shift Assignment, Shift
 * Management - and the link is only offered to somebody who holds that
 * screen's own permission, so nobody is handed a button that 403s. Building a
 * second approvals workflow here would put the same decision behind two
 * different sets of rules.
 *
 * The count itself is always clickable: seeing WHO is affected is the read
 * this dashboard's own permission already covers.
 */
export default function AttentionPanel({ issues, canFor, onOpenIssue, onNavigate }) {
  const rows = Array.isArray(issues) ? issues : [];
  const anything = rows.some((r) => Number(r.count) > 0);

  return (
    <CustomContainer title="Attention Required" filledHeader size="xs">
      {!anything ? (
        <Flex minH="140px" align="center" justify="center">
          <Text fontSize="sm" color="gray.500">
            Nothing needs action for this date and these filters.
          </Text>
        </Flex>
      ) : (
        <Box>
          {rows.map((row) => {
            const link = ISSUE_LINK[row.key] || {};
            const t = tone(link.color || "gray");
            const permitted = link.href ? canFor(link.permission) : false;
            return (
              <Flex
                key={row.key}
                align="center"
                justify="space-between"
                gap={2}
                py={2}
                borderBottomWidth="1px"
                borderColor="gray.100"
              >
                <Flex align="center" gap={2} minW={0}>
                  <Box w="8px" h="8px" borderRadius="full" bg={t.chart} flexShrink={0} />
                  <Box minW={0}>
                    <Text fontSize="xs" fontWeight="600" color="gray.800" noOfLines={1}>
                      {row.label}
                    </Text>
                    {link.action && !permitted ? (
                      <Text fontSize="10px" color="gray.400">
                        You do not have access to {link.action.replace(/^Open /, "")}
                      </Text>
                    ) : null}
                  </Box>
                </Flex>

                <Flex align="center" gap={2} flexShrink={0}>
                  <Badge
                    as="button"
                    type="button"
                    onClick={() => onOpenIssue(row.key)}
                    colorScheme={link.color === "gray" ? "gray" : link.color === "red" ? "red" : "orange"}
                    fontSize="11px"
                    px={2}
                    borderRadius="md"
                    title={`Show the ${row.label} list`}
                  >
                    {row.count}
                  </Badge>
                  {link.href && permitted ? (
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="purple"
                      onClick={() => onNavigate(link.href)}
                    >
                      Open
                    </Button>
                  ) : null}
                </Flex>
              </Flex>
            );
          })}
          <Text fontSize="10px" color="gray.500" mt={2}>
            Counts are distinct employees for this date. This panel links to the existing approval
            and shift screens — nothing is approved, rejected or edited from the dashboard.
          </Text>
        </Box>
      )}
    </CustomContainer>
  );
}
