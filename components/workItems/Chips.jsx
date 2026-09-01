import React from "react";
import { Flex, Text, Tooltip } from "@chakra-ui/react";
import Badge from "../Badge";
import {
  dueMeta,
  formatDate,
  itemTypeMeta,
  priorityMeta,
  statusMeta,
} from "../../constants/workItems";

export function StatusChip({ status, size = "md" }) {
  const meta = statusMeta(status);
  return (
    <Badge size={size} colorScheme={meta.colorScheme}>
      {meta.label}
    </Badge>
  );
}

export function PriorityChip({ priority, size = "md" }) {
  const meta = priorityMeta(priority);
  return (
    <Badge size={size} colorScheme={meta.colorScheme}>
      {priority === "urgent" ? `${meta.label} !` : meta.label}
    </Badge>
  );
}

export function TypeChip({ itemType, size = "md" }) {
  const meta = itemTypeMeta(itemType);
  return (
    <Badge size={size} colorScheme={meta.colorScheme}>
      {meta.label}
    </Badge>
  );
}

/** Renders nothing when the item has no due date — most tickets won't. */
export function DueChip({ dueDate, status, size = "md" }) {
  const meta = dueMeta(dueDate, status);
  if (!meta) return null;

  return (
    <Tooltip label={`Due ${formatDate(dueDate)}`} openDelay={400}>
      <span>
        <Badge size={size} colorScheme={meta.colorScheme}>
          {meta.overdue ? `! ${meta.label}` : meta.label}
        </Badge>
      </span>
    </Tooltip>
  );
}

/** "3/7" — hidden when the item has no checklist at all. */
export function ChecklistChip({ done = 0, total = 0, size = "md" }) {
  if (!total) return null;
  const complete = done >= total;

  return (
    <Badge size={size} colorScheme={complete ? "green" : "gray"}>
      {done}/{total} done
    </Badge>
  );
}

export function CommentChip({ count = 0, size = "md" }) {
  if (!count) return null;
  return (
    <Badge size={size} colorScheme="gray">
      {count} comment{count === 1 ? "" : "s"}
    </Badge>
  );
}

/** A labelled value used throughout the detail view. */
export function MetaLine({ label, children }) {
  return (
    <Flex gap="6px" alignItems="baseline" minW={0}>
      <Text fontSize="xs" color="gray.500" whiteSpace="nowrap">
        {label}
      </Text>
      <Text fontSize="sm" color="gray.800" noOfLines={1}>
        {children || "—"}
      </Text>
    </Flex>
  );
}
