import React, { useEffect, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  Flex,
  HStack,
  IconButton,
  Input,
  Spacer,
  Stack,
  Text,
  Tooltip,
} from "@chakra-ui/react";
import {
  clearGroup,
  clearOptional,
  filterGroups,
  isGroupFullySelected,
  move,
  reorder,
  selectAllInGroup,
  SOURCE_BADGE,
  toggle,
} from "../../../util/payrollReportColumns";

/**
 * Payroll Reports - Select Columns.
 *
 * Grouped fields (payroll, statutory, attendance, bank, Employee Master),
 * search, checkboxes, the selected count, Select All per group, Clear
 * optional columns, Reset to Default and reordering - by DRAG AND DROP, with
 * up/down buttons beside it for keyboard users. The order on the right is
 * the order of the table, the saved month layout, a template and the export.
 *
 * Every field shows WHERE ITS VALUE COMES FROM - the finalized payrun, the
 * payrun-time snapshot, the attendance month the payrun read, or the CURRENT
 * Employee Master - because a historical month mixes all four, and a bank
 * account shown for September is today's account, not September's.
 *
 * Fields the user may not see are not in `groups` at all: the server leaves
 * them out of the catalogue it returns.
 */
function PayrollColumnsDrawer({ isOpen, onClose, groups, selected, maxFields, defaultSelected, onApply }) {
  const [draft, setDraft] = useState(selected || []);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState({});
  const [dragFrom, setDragFrom] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setDraft(Array.isArray(selected) ? selected : []);
      setSearch("");
      const initiallyOpen = {};
      (groups || []).forEach((g) => {
        initiallyOpen[g.group] = g.fields.some((f) => (selected || []).includes(f.key));
      });
      setOpen(initiallyOpen);
    }
  }, [isOpen, selected, groups]);

  const byKey = new Map();
  (groups || []).forEach((g) => g.fields.forEach((f) => byKey.set(f.key, f)));
  const visible = filterGroups(groups, search);
  const searching = search.trim() !== "";
  const atLimit = maxFields > 0 && draft.length >= maxFields;

  const sourceBadge = (field) => {
    const badge = SOURCE_BADGE[field.source];
    if (!badge) return null;
    return (
      <Tooltip label={field.note || field.source_label || badge.label} fontSize="xs">
        <Badge colorScheme={badge.color} fontSize="9px" variant="subtle">
          {badge.label}
        </Badge>
      </Tooltip>
    );
  };

  return (
    <Drawer isOpen={isOpen} placement="right" size="xl" onClose={onClose}>
      <DrawerOverlay />
      <DrawerContent>
        <DrawerCloseButton />
        <DrawerHeader paddingBottom="4px">
          <Text fontSize="18px">Select Columns</Text>
          <Text fontSize="12px" color="gray.600" fontWeight="normal">
            Tick the columns to show, then drag them into order. The table, Excel and PDF all follow this order.
          </Text>
        </DrawerHeader>

        <DrawerBody>
          <Flex gap="16px" align="flex-start" wrap={{ base: "wrap", lg: "nowrap" }}>
            {/* ---------------------------------------------- available */}
            <Box flex="1" minW="280px">
              <Flex justify="space-between" align="center" marginBottom="8px">
                <Text fontWeight="bold" fontSize="14px">
                  Available columns
                </Text>
                <Text fontSize="12px" color={atLimit ? "red.600" : "gray.500"} data-testid="selected-count">
                  {draft.length} selected{maxFields ? ` (max ${maxFields})` : ""}
                </Text>
              </Flex>
              <Input
                size="sm"
                placeholder="Search columns..."
                value={search}
                marginBottom="8px"
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search columns"
              />
              <Box borderWidth="1px" borderRadius="8px" padding="10px" maxHeight="60vh" overflowY="auto">
                <Stack spacing="12px">
                  {visible.map((group) => {
                    const isGroupOpen = searching || Boolean(open[group.group]);
                    const full = isGroupFullySelected(draft, group);
                    const count = group.fields.filter((f) => draft.includes(f.key)).length;
                    return (
                      <Box key={group.group}>
                        <Flex align="center" justify="space-between" marginBottom="4px">
                          <HStack
                            as="button"
                            type="button"
                            spacing="6px"
                            onClick={() => setOpen((o) => ({ ...o, [group.group]: !isGroupOpen }))}
                            aria-expanded={isGroupOpen}
                          >
                            <Text fontSize="10px" color="gray.500" width="10px">
                              {isGroupOpen ? "▼" : "▶"}
                            </Text>
                            <Text fontSize="12px" fontWeight="bold" color="gray.600">
                              {group.group.toUpperCase()}
                            </Text>
                            <Text fontSize="11px" color="gray.500">
                              {count}/{group.fields.length}
                            </Text>
                          </HStack>
                          <Button
                            size="xs"
                            variant="link"
                            colorScheme="purple"
                            onClick={() =>
                              setDraft(full ? clearGroup(draft, group) : selectAllInGroup(draft, group, maxFields))
                            }
                          >
                            {full ? "Clear group" : "Select All"}
                          </Button>
                        </Flex>
                        <Stack spacing="3px" display={isGroupOpen ? "flex" : "none"} paddingLeft="16px">
                          {group.fields.map((field) => {
                            const isChosen = draft.includes(field.key);
                            return (
                              <Checkbox
                                key={field.key}
                                size="sm"
                                isChecked={isChosen}
                                isDisabled={!isChosen && atLimit}
                                onChange={() => setDraft(toggle(draft, field.key, maxFields))}
                              >
                                <HStack spacing="6px" wrap="wrap">
                                  <Text fontSize="13px">{field.label}</Text>
                                  {field.subgroup ? (
                                    <Text fontSize="10px" color="gray.400">
                                      {field.subgroup}
                                    </Text>
                                  ) : null}
                                  {sourceBadge(field)}
                                  {field.sensitive && (
                                    <Badge colorScheme="red" fontSize="9px">
                                      sensitive
                                    </Badge>
                                  )}
                                </HStack>
                              </Checkbox>
                            );
                          })}
                        </Stack>
                      </Box>
                    );
                  })}
                  {visible.length === 0 && (
                    <Text fontSize="13px" color="gray.500">
                      {searching ? `No column matches "${search.trim()}".` : "No columns are available to you."}
                    </Text>
                  )}
                </Stack>
              </Box>
            </Box>

            {/* ---------------------------------------------- selected, in order */}
            <Box flex="1" minW="260px">
              <Flex justify="space-between" align="center" marginBottom="8px">
                <Text fontWeight="bold" fontSize="14px">
                  Report columns, in order
                </Text>
                <Button size="xs" variant="ghost" onClick={() => setDraft(clearOptional(draft))}>
                  Clear optional columns
                </Button>
              </Flex>
              <Box borderWidth="1px" borderRadius="8px" padding="6px" maxHeight="64vh" overflowY="auto">
                {draft.length === 0 && (
                  <Text fontSize="13px" color="gray.500" padding="6px">
                    No columns selected.
                  </Text>
                )}
                {draft.map((key, index) => {
                  const field = byKey.get(key);
                  return (
                    <Flex
                      key={key}
                      draggable
                      onDragStart={(e) => {
                        setDragFrom(index);
                        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragFrom !== null) setDraft(reorder(draft, dragFrom, index));
                        setDragFrom(null);
                      }}
                      onDragEnd={() => setDragFrom(null)}
                      align="center"
                      gap="6px"
                      padding="4px 6px"
                      borderRadius="6px"
                      bg={dragFrom === index ? "purple.50" : "transparent"}
                      _hover={{ bg: "gray.50" }}
                      cursor="grab"
                      data-testid="selected-column"
                    >
                      <Text color="gray.400" fontSize="12px" aria-hidden="true">
                        {"☰"}
                      </Text>
                      <Text fontSize="12px" color="gray.500" width="22px">
                        {index + 1}.
                      </Text>
                      <Text fontSize="13px" flex="1">
                        {field ? field.label : key}
                      </Text>
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label="Move up"
                        icon={<i className="fa fa-arrow-up" />}
                        isDisabled={index === 0}
                        onClick={() => setDraft(move(draft, index, -1))}
                      />
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label="Move down"
                        icon={<i className="fa fa-arrow-down" />}
                        isDisabled={index === draft.length - 1}
                        onClick={() => setDraft(move(draft, index, 1))}
                      />
                      <IconButton
                        size="xs"
                        variant="ghost"
                        aria-label="Remove column"
                        icon={<i className="fa fa-times" />}
                        onClick={() => setDraft(draft.filter((k) => k !== key))}
                      />
                    </Flex>
                  );
                })}
              </Box>
            </Box>
          </Flex>
        </DrawerBody>

        <DrawerFooter borderTopWidth="1px">
          <Button
            size="sm"
            variant="ghost"
            isDisabled={!Array.isArray(defaultSelected) || defaultSelected.length === 0}
            onClick={() => setDraft(defaultSelected)}
          >
            Reset to Default
          </Button>
          <Spacer />
          <HStack spacing="8px">
            <Button size="sm" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              colorScheme="purple"
              isDisabled={draft.length === 0}
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Apply
            </Button>
          </HStack>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

export default PayrollColumnsDrawer;
