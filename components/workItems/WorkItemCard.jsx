import React from "react";
import { Box, Flex, Select, Text } from "@chakra-ui/react";
import {
  ChecklistChip,
  CommentChip,
  DueChip,
  PriorityChip,
  StatusChip,
} from "./Chips";
import { STATUS_LIST, dueMeta, formatRelative } from "../../constants/workItems";

/**
 * The phone view of a work item. Everything a person needs to triage it is on
 * the card, and status can be changed here without opening the form — that is
 * the single most common action on a phone.
 */
function WorkItemCard({ item, onOpen, onStatusChange, canChangeStatus }) {
  const due = dueMeta(item.due_date, item.status);
  const isOverdue = Boolean(due && due.overdue);

  return (
    <Box
      as="article"
      bg="white"
      borderWidth="1px"
      borderColor={isOverdue ? "red.200" : "gray.200"}
      borderLeftWidth="4px"
      borderLeftColor={isOverdue ? "red.400" : `${priorityColor(item.priority)}.300`}
      borderRadius="10px"
      p="14px"
      _active={{ bg: "gray.50" }}
      transition="background 0.15s ease"
    >
      <Flex
        justifyContent="space-between"
        alignItems="flex-start"
        gap="10px"
        onClick={() => onOpen && onOpen(item)}
        onKeyDown={(event) => {
          if (!onOpen) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(item);
          }
        }}
        cursor={onOpen ? "pointer" : "default"}
        role={onOpen ? "button" : undefined}
        tabIndex={onOpen ? 0 : undefined}
        _focusVisible={{ outline: "2px solid", outlineColor: "purple.400" }}
      >
        <Box minW={0} flex="1">
          <Text fontSize="xs" color="gray.500" mb="2px">
            #{item.id} · {formatRelative(item.created_at)}
          </Text>
          <Text fontSize="sm" fontWeight="600" color="gray.800" noOfLines={2}>
            {item.title}
          </Text>
        </Box>
      </Flex>

      <Flex gap="6px" flexWrap="wrap" mt="10px">
        <StatusChip status={item.status} size="xs" />
        <PriorityChip priority={item.priority} size="xs" />
        <DueChip dueDate={item.due_date} status={item.status} size="xs" />
        <ChecklistChip
          done={Number(item.checklist_done) || 0}
          total={Number(item.checklist_total) || 0}
          size="xs"
        />
        <CommentChip count={Number(item.comment_count) || 0} size="xs" />
      </Flex>

      <Flex gap="4px" mt="10px" flexDirection="column">
        <Text fontSize="xs" color="gray.600" noOfLines={1}>
          {item.outlet_name || item.department_name || "No branch or department"}
        </Text>
        <Text fontSize="xs" color="gray.500" noOfLines={1}>
          {item.assigned_to_name
            ? `Assigned to ${item.assigned_to_name}`
            : "Unassigned"}
        </Text>
      </Flex>

      {canChangeStatus && onStatusChange && (
        <Select
          mt="12px"
          size="sm"
          height="38px"
          borderRadius="6px"
          fontSize="sm"
          value={item.status}
          aria-label={`Status for item ${item.id}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => onStatusChange(item, event.target.value)}
        >
          {STATUS_LIST.map((option) => (
            <option key={option.id} value={option.id}>
              {option.value}
            </option>
          ))}
        </Select>
      )}
    </Box>
  );
}

const priorityColor = (priority) => {
  if (priority === "urgent" || priority === "high") return "red";
  if (priority === "medium") return "orange";
  if (priority === "low") return "blue";
  return "gray";
};

export default React.memo(WorkItemCard);
