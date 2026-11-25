import React, { useState } from "react";
import {
  Box,
  Button,
  Checkbox,
  Flex,
  IconButton,
  Input,
  Progress,
  Text,
} from "@chakra-ui/react";
import toast from "react-hot-toast";
import {
  addChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from "../../helper/tickets";
import { formatRelative } from "../../constants/workItems";

/**
 * Tick-off steps inside a work item.
 *
 * Ticking is optimistic — the box flips immediately and rolls back if the
 * request fails, because waiting on a round trip to tick a box feels broken
 * on a slow connection.
 */
function Checklist({ ticketId, items = [], onChange, canEdit, canTick }) {
  const [rows, setRows] = useState(items);
  const [draft, setDraft] = useState("");
  const [adding, setAdding] = useState(false);
  const [busyIds, setBusyIds] = useState([]);

  React.useEffect(() => {
    setRows(items);
  }, [items]);

  const total = rows.length;
  const done = rows.filter((row) => row.is_done).length;

  const setBusy = (id, busy) =>
    setBusyIds((current) =>
      busy ? [...current, id] : current.filter((value) => value !== id)
    );

  const handleToggle = async (row) => {
    const nextDone = !row.is_done;
    const previous = rows;

    setRows((current) =>
      current.map((item) =>
        item.checklist_item_id === row.checklist_item_id
          ? { ...item, is_done: nextDone ? 1 : 0 }
          : item
      )
    );
    setBusy(row.checklist_item_id, true);

    try {
      const updated = await updateChecklistItem(row.checklist_item_id, {
        is_done: nextDone,
      });
      if (Array.isArray(updated)) {
        setRows(updated);
        onChange && onChange(updated);
      }
    } catch (err) {
      setRows(previous);
      toast.error("Could not update that step");
    } finally {
      setBusy(row.checklist_item_id, false);
    }
  };

  const handleAdd = async () => {
    const title = draft.trim();
    if (!title) return;

    setAdding(true);
    try {
      const updated = await addChecklistItem(ticketId, title);
      if (Array.isArray(updated)) {
        setRows(updated);
        onChange && onChange(updated);
        setDraft("");
      } else {
        throw updated;
      }
    } catch (err) {
      toast.error("Could not add that step");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (row) => {
    setBusy(row.checklist_item_id, true);
    try {
      const updated = await deleteChecklistItem(row.checklist_item_id);
      if (Array.isArray(updated)) {
        setRows(updated);
        onChange && onChange(updated);
      }
    } catch (err) {
      toast.error("Could not remove that step");
    } finally {
      setBusy(row.checklist_item_id, false);
    }
  };

  return (
    <Box>
      {total > 0 && (
        <Flex align="center" gap="12px" mb="12px">
          <Progress
            value={(done / total) * 100}
            size="sm"
            borderRadius="999px"
            colorScheme={done === total ? "green" : "purple"}
            flex="1"
          />
          <Text fontSize="xs" color="gray.600" whiteSpace="nowrap">
            {done} of {total}
          </Text>
        </Flex>
      )}

      <Flex direction="column" gap="2px">
        {rows.map((row) => (
          <Flex
            key={row.checklist_item_id}
            align="flex-start"
            gap="10px"
            py="8px"
            px="8px"
            borderRadius="6px"
            _hover={{ bg: "gray.50" }}
          >
            <Checkbox
              mt="2px"
              colorScheme="purple"
              isChecked={Boolean(row.is_done)}
              isDisabled={!canTick || busyIds.includes(row.checklist_item_id)}
              onChange={() => handleToggle(row)}
              aria-label={row.title}
            />
            <Box flex="1" minW={0}>
              <Text
                fontSize="sm"
                color={row.is_done ? "gray.400" : "gray.800"}
                textDecoration={row.is_done ? "line-through" : "none"}
              >
                {row.title}
              </Text>
              {row.is_done && row.done_at ? (
                <Text fontSize="xs" color="gray.400">
                  {row.done_by_name ? `${row.done_by_name} · ` : ""}
                  {formatRelative(row.done_at)}
                </Text>
              ) : null}
            </Box>
            {canEdit && (
              <IconButton
                size="xs"
                variant="ghost"
                colorScheme="red"
                aria-label={`Remove step: ${row.title}`}
                icon={<i className="fa fa-times" />}
                isDisabled={busyIds.includes(row.checklist_item_id)}
                onClick={() => handleDelete(row)}
              />
            )}
          </Flex>
        ))}
      </Flex>

      {rows.length === 0 && !canEdit ? (
        <Text fontSize="sm" color="gray.400">
          No steps on this item.
        </Text>
      ) : null}

      {canEdit && (
        <Flex gap="8px" mt="10px" direction={{ base: "column", sm: "row" }}>
          <Input
            size="sm"
            height="38px"
            borderRadius="6px"
            fontSize="sm"
            placeholder="Add a step..."
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleAdd();
              }
            }}
          />
          <Button
            size="sm"
            height="38px"
            colorScheme="purple"
            isLoading={adding}
            isDisabled={!draft.trim()}
            onClick={handleAdd}
          >
            Add
          </Button>
        </Flex>
      )}
    </Box>
  );
}

export default Checklist;
