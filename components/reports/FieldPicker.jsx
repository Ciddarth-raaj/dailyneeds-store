import React from "react";
import {
  Badge,
  Box,
  Button,
  Checkbox,
  Flex,
  HStack,
  IconButton,
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
 */
function FieldPicker({ groups, selected, onChange, maxFields, disabled }) {
  const chosen = Array.isArray(selected) ? selected : [];
  const byKey = new Map();
  (groups || []).forEach((group) =>
    group.fields.forEach((field) => byKey.set(field.key, field))
  );

  const atLimit = maxFields > 0 && chosen.length >= maxFields;

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

        <Box
          borderWidth="1px"
          borderRadius="8px"
          padding="12px"
          maxHeight="420px"
          overflowY="auto"
        >
          <Stack spacing="14px">
            {(groups || []).map((group) => (
              <Box key={group.group}>
                <Text fontSize="12px" fontWeight="bold" color="gray.600" marginBottom="4px">
                  {group.group.toUpperCase()}
                </Text>
                <Stack spacing="4px">
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
            {(groups || []).length === 0 && (
              <Text fontSize="13px" color="gray.500">
                No columns are available to you.
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
