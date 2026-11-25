import React from "react";
import { Box, Flex, Text } from "@chakra-ui/react";
import {
  formatDate,
  formatRelative,
  priorityMeta,
  statusMeta,
} from "../../constants/workItems";

const FIELD_LABELS = {
  title: "title",
  description: "description",
  status: "status",
  priority: "priority",
  due_date: "due date",
  outlet_id: "branch",
  assigned_to: "assignee",
  department_id: "department",
  item_type: "type",
};

/** Renders a stored value the way a person would name it. */
const readValue = (field, value) => {
  if (value === null || value === undefined || value === "") return "nothing";
  if (field === "status") return statusMeta(value).label;
  if (field === "priority") return priorityMeta(value).label;
  if (field === "due_date") return formatDate(value);
  if (field === "description" || field === "title") {
    const text = String(value);
    return text.length > 40 ? `"${text.slice(0, 40)}…"` : `"${text}"`;
  }
  return String(value);
};

/**
 * Who changed what, and when. Ids for branch, department and assignee are
 * shown raw — the log stores the value that was set, not a snapshot of the
 * name it had at the time.
 */
function ActivityLog({ activity = [] }) {
  if (!activity.length) {
    return (
      <Text fontSize="sm" color="gray.400">
        No changes recorded yet.
      </Text>
    );
  }

  return (
    <Flex direction="column" gap="0">
      {activity
        .slice()
        .reverse()
        .map((entry, index) => (
          <Flex key={entry.activity_id} gap="12px" align="stretch">
            <Flex direction="column" align="center" width="12px" flexShrink={0}>
              <Box
                width="8px"
                height="8px"
                borderRadius="999px"
                bg="purple.300"
                mt="6px"
                flexShrink={0}
              />
              {index < activity.length - 1 && (
                <Box width="2px" flex="1" bg="gray.200" minH="12px" />
              )}
            </Flex>

            <Box pb="14px" minW={0}>
              <Text fontSize="sm" color="gray.700">
                <b>{entry.employee_name || "Someone"}</b> changed{" "}
                {FIELD_LABELS[entry.field] || entry.field} from{" "}
                {readValue(entry.field, entry.old_value)} to{" "}
                <b>{readValue(entry.field, entry.new_value)}</b>
              </Text>
              <Text fontSize="xs" color="gray.400">
                {formatRelative(entry.created_at)}
              </Text>
            </Box>
          </Flex>
        ))}
    </Flex>
  );
}

export default ActivityLog;
