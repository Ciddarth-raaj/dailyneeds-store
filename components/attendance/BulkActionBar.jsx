import React from "react";
import { Button, Flex, Text } from "@chakra-ui/react";
import { BULK_ACTION } from "../../util/approvalBulk";

/**
 * "12 selected   Approve   Reject   Revoke   Clear" - shown while anything is
 * ticked, with only the actions this tab offers. "Select all matching" asks
 * the server for every request under the current filters this viewer could
 * action, which may be more than the page shows.
 */
const LABEL = { APPROVE: "Approve", REJECT: "Reject", REVOKE: "Revoke" };
const COLOR = { APPROVE: "green", REJECT: "red", REVOKE: "red" };

export default function BulkActionBar({ count, actions, onAction, onClear, onSelectAllMatching, selectingAll, allMatching }) {
  if (!actions || actions.length === 0) return null;
  return (
    <Flex
      align="center"
      gap={2}
      wrap="wrap"
      p={2}
      borderWidth="1px"
      borderRadius="md"
      borderColor={count > 0 ? "purple.300" : "gray.200"}
      bg={count > 0 ? "purple.50" : "white"}
      position="sticky"
      top={0}
      zIndex={2}
    >
      <Text fontSize="sm" fontWeight="600" minW="90px" data-testid="bulk-selected-count">
        {count} selected
      </Text>
      {count > 0
        ? actions.map((action) => (
            <Button
              key={action}
              size="sm"
              colorScheme={COLOR[action]}
              variant={action === BULK_ACTION.APPROVE ? "solid" : "outline"}
              onClick={() => onAction(action)}
            >
              {LABEL[action]}
            </Button>
          ))
        : null}
      {count > 0 ? (
        <Button size="sm" variant="ghost" onClick={onClear}>
          Clear
        </Button>
      ) : null}
      {onSelectAllMatching ? (
        <Button size="sm" variant="link" colorScheme="purple" ml="auto" onClick={onSelectAllMatching} isLoading={selectingAll}>
          Select all matching the filters
        </Button>
      ) : null}
      {allMatching ? (
        <Text fontSize="xs" color="gray.600" w="100%">
          All {allMatching.count} request{allMatching.count === 1 ? "" : "s"} matching the filters that you can action are selected
          {allMatching.truncated ? " (the first 1,000 only)" : ""}.
        </Text>
      ) : null}
    </Flex>
  );
}
