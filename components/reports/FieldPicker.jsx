import React, { useMemo, useState } from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
  Input,
  Stack,
  Text,
} from "@chakra-ui/react";

/**
 * Reports — choosing the columns, and their order.
 *
 * TWO PANES, ONE ANSWER. The left is the catalogue, grouped the way somebody
 * thinks about an employee (Identity, Employment, Contact, Statutory, Bank).
 * The right is the report being built, in the order the columns will appear.
 * They are separate because ticking a box and arranging a spreadsheet are
 * different tasks, and a single list that tries to be both ends up doing
 * neither: order gets lost the moment a group is collapsed.
 *
 * ORDER IS THE CONTRACT. The array position of a field key IS the column
 * position, on screen, in the saved template and in the exported file. Nothing
 * else records it - there is no separate sort index to fall out of step - so
 * reordering here is the only way the column order is ever expressed.
 *
 * WHAT IS NOT SHOWN. A field the caller lacks the permission for is ABSENT
 * from the catalogue the server returns, not greyed out. Showing an unusable
 * field would tell them what exists, which is a small disclosure of its own,
 * and would invite a support call about a checkbox that cannot be ticked.
 *
 * ============================================ GROUPS COLLAPSE, AND SEARCH ==
 *
 * Thirty-odd columns fully expanded is the crowding this redesign exists to
 * remove. Groups start collapsed EXCEPT those holding a column the report
 * already uses - which is where somebody looking at an existing report wants
 * to be - and a search opens whichever groups match, because a filtered list
 * that is still collapsed helps nobody.
 *
 * THIS IS THE ONLY COLUMN CHOOSER. The drawer wraps it rather than
 * reimplementing it, and the create screen uses the same one, so selection,
 * ordering and the cap behave identically wherever columns are chosen.
 */
function FieldPicker({ groups, selected, onChange, maxFields, disabled }) {
  const chosen = Array.isArray(selected) ? selected : [];
  const byKey = new Map();
  (groups || []).forEach((group) =>
    group.fields.forEach((field) => byKey.set(field.key, field))
  );

  const atLimit = maxFields > 0 && chosen.length >= maxFields;

  const [search, setSearch] = useState("");
  const term = search.trim().toLowerCase();

  /** Groups holding a selected column, open on arrival. */
  const initiallyOpen = useMemo(() => {
    const open = {};
    (groups || []).forEach((group) => {
      open[group.group] = group.fields.some((f) => chosen.includes(f.key));
    });
    return open;
    // Deliberately computed once per mount of the picker: after that, opening
    // and closing is the user's business, and a re-render must not spring a
    // group back open under their hands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [open, setOpen] = useState(initiallyOpen);

  const visible = (groups || [])
    .map((group) => ({
      ...group,
      fields: term
        ? group.fields.filter((f) => f.label.toLowerCase().includes(term))
        : group.fields,
    }))
    .filter((group) => group.fields.length > 0);

  // While searching, a matching group is open whatever its collapsed state:
  // a filtered list that stays shut hides the thing just searched for.
  const isOpen = (name) => (term ? true : Boolean(open[name]));

  const toggle = (key) => {
    if (chosen.includes(key)) {
      onChange(chosen.filter((k) => k !== key));
      return;
    }
    // Silently ignoring a tick past the cap would look broken. The checkbox is
    // disabled instead, and the count above says why.
    if (atLimit) return;
    onChange([...chosen, key]);
  };

  const move = (index, delta) => {
    const next = [...chosen];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  };

  return (
    <Flex gap="16px" align="flex-start" wrap={{ base: "wrap", lg: "nowrap" }}>
      {/* ------------------------------------------------ the catalogue */}
      <Box flex="1" minW="280px">
        <Flex justify="space-between" align="center" marginBottom="8px">
          <Text fontWeight="bold" fontSize="14px">
            Available columns
          </Text>
          <Text fontSize="12px" color={atLimit ? "red.600" : "gray.500"}>
            {chosen.length} of {maxFields} selected
          </Text>
        </Flex>

        <Input
          size="sm"
          placeholder="Search columns..."
          value={search}
          marginBottom="8px"
          onChange={(e) => setSearch(e.target.value)}
        />

        <Box
          borderWidth="1px"
          borderRadius="8px"
          padding="12px"
          maxHeight="420px"
          overflowY="auto"
        >
          <Stack spacing="14px">
            {visible.map((group) => (
              <Box key={group.group}>
                <Flex
                  as="button"
                  type="button"
                  width="100%"
                  align="center"
                  justify="space-between"
                  marginBottom="4px"
                  onClick={() => setOpen((o) => ({ ...o, [group.group]: !isOpen(group.group) }))}
                  aria-expanded={isOpen(group.group)}
                >
                  <HStack spacing="6px">
                    <Text fontSize="10px" color="gray.500" width="10px">
                      {isOpen(group.group) ? "\u25BC" : "\u25B6"}
                    </Text>
                    <Text fontSize="12px" fontWeight="bold" color="gray.600">
                      {group.group.toUpperCase()}
                    </Text>
                  </HStack>
                  {/* selected / total, so a collapsed group still says
                      whether anything in it is in the report. */}
                  <Text fontSize="11px" color="gray.500">
                    {group.fields.filter((f) => chosen.includes(f.key)).length}/{group.fields.length}
                  </Text>
                </Flex>
                <Stack spacing="4px" display={isOpen(group.group) ? "flex" : "none"}>
                  {group.fields.map((field) => {
                    const isChosen = chosen.includes(field.key);
                    return (
                      <Checkbox
                        key={field.key}
                        size="sm"
                        isChecked={isChosen}
                        // Disabled only when adding is impossible - an already
                        // chosen field must always be un-tickable, or a report
                        // at the cap cannot be edited at all.
                        isDisabled={disabled || (!isChosen && atLimit)}
                        onChange={() => toggle(field.key)}
                      >
                        <HStack spacing="6px">
                          <Text fontSize="13px">{field.label}</Text>
                          {field.sensitive && (
                            // Marked because exporting one is a different
                            // decision from exporting a name, and the export
                            // is audited as having included it.
                            <Badge colorScheme="orange" fontSize="9px">
                              sensitive
                            </Badge>
                          )}
                        </HStack>
                      </Checkbox>
                    );
                  })}
                </Stack>
              </Box>
            ))}
            {visible.length === 0 && (
              <Text fontSize="13px" color="gray.500">
                {term
                  ? `No column matches "${search.trim()}".`
                  : "No columns are available to you."}
              </Text>
            )}
          </Stack>
        </Box>
      </Box>

      {/* ------------------------------------------- the report being built */}
      <Box flex="1" minW="280px">
        <Flex justify="space-between" align="center" marginBottom="8px">
          <Text fontWeight="bold" fontSize="14px">
            Report columns, in order
          </Text>
          {chosen.length > 0 && (
            <Button size="xs" variant="ghost" isDisabled={disabled} onClick={() => onChange([])}>
              Clear
            </Button>
          )}
        </Flex>

        <Box
          borderWidth="1px"
          borderRadius="8px"
          padding="12px"
          maxHeight="420px"
          overflowY="auto"
        >
          {chosen.length === 0 ? (
            <Text fontSize="13px" color="gray.500">
              Tick a column on the left to start building the report.
            </Text>
          ) : (
            <Stack spacing="4px">
              {chosen.map((key, index) => {
                const field = byKey.get(key);
                return (
                  <Flex
                    key={key}
                    align="center"
                    justify="space-between"
                    borderWidth="1px"
                    borderRadius="6px"
                    paddingX="8px"
                    paddingY="4px"
                  >
                    <HStack spacing="8px" minW="0">
                      <Text fontSize="11px" color="gray.500" width="20px">
                        {index + 1}
                      </Text>
                      {/* A field that has since become unavailable still
                          appears, by key, rather than vanishing without
                          explanation - the warning panel says what happened. */}
                      <Text fontSize="13px" isTruncated>
                        {field ? field.label : key}
                      </Text>
                      {field && field.sensitive && (
                        <Badge colorScheme="orange" fontSize="9px">
                          sensitive
                        </Badge>
                      )}
                      {!field && (
                        <Badge colorScheme="red" fontSize="9px">
                          unavailable
                        </Badge>
                      )}
                    </HStack>
                    <HStack spacing="2px">
                      <IconButton
                        aria-label={`Move ${field ? field.label : key} up`}
                        size="xs"
                        variant="ghost"
                        icon={<span className="fa fa-arrow-up" />}
                        isDisabled={disabled || index === 0}
                        onClick={() => move(index, -1)}
                      />
                      <IconButton
                        aria-label={`Move ${field ? field.label : key} down`}
                        size="xs"
                        variant="ghost"
                        icon={<span className="fa fa-arrow-down" />}
                        isDisabled={disabled || index === chosen.length - 1}
                        onClick={() => move(index, 1)}
                      />
                      <IconButton
                        aria-label={`Remove ${field ? field.label : key}`}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        icon={<span className="fa fa-times" />}
                        isDisabled={disabled}
                        onClick={() => toggle(key)}
                      />
                    </HStack>
                  </Flex>
                );
              })}
            </Stack>
          )}
        </Box>
      </Box>
    </Flex>
  );
}

export default FieldPicker;
