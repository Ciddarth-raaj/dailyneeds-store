import React, { useMemo, useState } from "react";
import {
  Box,
  Button,
  Flex,
  HStack,
  Input,
  Select,
  SimpleGrid,
  Stack,
  Tag,
  TagCloseButton,
  TagLabel,
  Text,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { pruneFilters, isEmptyFilter } from "../../util/reportFilterRules";

/**
 * Reports — filtering by the columns the report shows.
 *
 * ================================================== SELECTED MEANS FILTERABLE
 *
 * The rule this file implements: a column in the report is a column you can
 * narrow by. Not a fixed list of five filters that happen to exist, and not
 * every field in the catalogue either - the eligible set is exactly the
 * SELECTED columns, so a Bank/KYC report offers a Bank Name filter and a
 * Contact report does not.
 *
 * Its corollary matters as much: REMOVING A COLUMN REMOVES ITS FILTER. A
 * filter still narrowing the result on a column nobody can see is the worst
 * outcome here - a count that cannot be explained from the screen - so the
 * pruning happens in `pruneFilters` below and is asserted by a test.
 *
 * ============================================== THE CONTROLS ARE THE SERVER'S
 *
 * Nothing here knows what an Employee Master field is. Each field carries
 * `filter: { type, options?, master? }` from the catalogue, and this renders a
 * control for that type. There is no second list of fields in React to fall
 * out of step with the backend, and a field the server did not send is a
 * field this cannot offer - which is what makes the UI incapable of
 * requesting something unauthorized in the first place.
 *
 * ==================================================== AND, AND SAID PLAINLY ==
 *
 * Every filter narrows further; none of them widens. The chips underneath
 * spell out what is currently applied, because "12 employees found" with
 * invisible filters is how somebody exports the wrong spreadsheet.
 */

/** The filters shown without asking - the ones nearly every report wants. */
const COMMON_FIELDS = ["employment_status", "outlet", "department", "designation"];

// The two rules live in plain JS so they can be RUN rather than read - see
// util/reportFilterRules.js. Re-exported here because this is where callers
// expect to find them.
export { pruneFilters, isEmptyFilter };

function ReportFilters({
  /** Catalogue groups as the server described them, for this caller. */
  groups,
  /** The report's currently selected column keys, in order. */
  selectedKeys,
  /** `[{ field, value }]` / `[{ field, from, to }]`. */
  fieldFilters,
  onChange,
  search,
  onSearchChange,
  masters,
  onApply,
  applying,
}) {
  const [showMore, setShowMore] = useState(false);

  const byKey = useMemo(() => {
    const map = new Map();
    (groups || []).forEach((g) => g.fields.forEach((f) => map.set(f.key, f)));
    return map;
  }, [groups]);

  /**
   * Eligible = selected AND filterable AND authorized. All three come from the
   * server's own description; a field it did not send is simply absent here.
   */
  const eligible = useMemo(
    () => (selectedKeys || []).map((k) => byKey.get(k)).filter((f) => f && f.filter),
    [selectedKeys, byKey]
  );

  const active = fieldFilters || [];
  const valueOf = (key) => active.find((f) => f.field === key) || null;

  const setFilter = (key, patch) => {
    const field = byKey.get(key);
    if (!field) return;
    const existing = valueOf(key) || { field: key };
    const next = { ...existing, ...patch };

    const without = active.filter((f) => f.field !== key);
    if (isEmptyFilter(next, field.filter.type)) {
      onChange(without);
      return;
    }
    // Kept in the order the columns are in, so the chips read like the report.
    onChange(
      [...without, next].sort(
        (a, b) => (selectedKeys || []).indexOf(a.field) - (selectedKeys || []).indexOf(b.field)
      )
    );
  };

  const clear = (key) => onChange(active.filter((f) => f.field !== key));
  const clearAll = () => onChange([]);

  const optionsFor = (field) => {
    if (field.filter.type === "enum") return field.filter.options || [];
    // A master-linked field draws its options from the master already loaded
    // for this screen, rather than a list invented here.
    const list = (masters && masters[field.filter.master]) || [];
    return list;
  };

  const control = (field) => {
    const current = valueOf(field.key);
    const type = field.filter.type;

    if (type === "enum" || type === "master") {
      const opts = optionsFor(field);
      const value =
        type === "master"
          ? (current && current.value && current.value[0]) || ""
          : (current && current.value) || "";
      return (
        <Select
          size="sm"
          value={value}
          placeholder={type === "master" ? `All ${field.label.toLowerCase()}` : "Any"}
          onChange={(e) =>
            setFilter(field.key, {
              value: type === "master" ? (e.target.value ? [Number(e.target.value)] : []) : e.target.value,
            })
          }
        >
          {opts.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }

    if (type === "date") {
      return (
        <HStack spacing="6px">
          <Input
            size="sm"
            type="date"
            aria-label={`${field.label} from`}
            value={(current && current.from) || ""}
            onChange={(e) => setFilter(field.key, { from: e.target.value })}
          />
          <Input
            size="sm"
            type="date"
            aria-label={`${field.label} to`}
            value={(current && current.to) || ""}
            onChange={(e) => setFilter(field.key, { to: e.target.value })}
          />
        </HStack>
      );
    }

    // text and id
    return (
      <Input
        size="sm"
        placeholder={type === "id" ? "Exact" : "Contains"}
        value={(current && current.value) || ""}
        onChange={(e) => setFilter(field.key, { value: e.target.value })}
      />
    );
  };

  const labelFor = (entry) => {
    const field = byKey.get(entry.field);
    if (!field) return entry.field;
    if (field.filter.type === "date") {
      return `${field.label}: ${entry.from || "any"} → ${entry.to || "any"}`;
    }
    if (field.filter.type === "master") {
      const opt = optionsFor(field).find((o) => String(o.value) === String((entry.value || [])[0]));
      return `${field.label}: ${opt ? opt.label : (entry.value || []).join(", ")}`;
    }
    if (field.filter.type === "enum") {
      const opt = (field.filter.options || []).find((o) => o.value === entry.value);
      return `${field.label}: ${opt ? opt.label : entry.value}`;
    }
    return `${field.label}: ${entry.value}`;
  };

  // Common first, then anything the user has already filtered on - a filter
  // with a value is never hidden behind "More", or it becomes the invisible
  // narrowing this design exists to prevent.
  const commonShown = eligible.filter((f) => COMMON_FIELDS.includes(f.key) || valueOf(f.key));
  const more = eligible.filter((f) => !commonShown.includes(f));

  return (
    <Box borderWidth="1px" borderRadius="8px" padding="12px">
      <Flex align="center" justify="space-between" marginBottom="8px">
        <Text fontWeight="bold" fontSize="14px">
          Filters
        </Text>
        {onApply && (
          <Button size="xs" colorScheme="purple" onClick={onApply} isLoading={applying}>
            Apply
          </Button>
        )}
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacingX="12px" spacingY="8px">
        {commonShown.map((field) => (
          <Box key={field.key}>
            <Text fontSize="11px" color="gray.600" marginBottom="2px">
              {field.label}
            </Text>
            {control(field)}
          </Box>
        ))}

        <Box>
          <Text fontSize="11px" color="gray.600" marginBottom="2px">
            Search
          </Text>
          <Input
            size="sm"
            placeholder="Name or Employee ID"
            value={search || ""}
            onChange={(e) => onSearchChange(e.target.value)}
          />
        </Box>
      </SimpleGrid>

      {more.length > 0 && (
        <Box marginTop="8px">
          <Button size="xs" variant="link" colorScheme="purple" onClick={() => setShowMore((v) => !v)}>
            {showMore ? "− Fewer filters" : `+ More Filters (${more.length})`}
          </Button>
          {showMore && (
            <SimpleGrid
              columns={{ base: 1, md: 2, xl: 4 }}
              spacingX="12px"
              spacingY="8px"
              marginTop="8px"
            >
              {more.map((field) => (
                <Box key={field.key}>
                  <Text fontSize="11px" color="gray.600" marginBottom="2px">
                    {field.label}
                  </Text>
                  {control(field)}
                </Box>
              ))}
            </SimpleGrid>
          )}
        </Box>
      )}

      {active.length > 0 && (
        <Stack spacing="4px" marginTop="10px">
          <Text fontSize="11px" color="gray.600">
            Active filters:
          </Text>
          <Wrap spacing="6px">
            {active.map((entry) => (
              <WrapItem key={entry.field}>
                <Tag size="sm" colorScheme="purple" borderRadius="full">
                  <TagLabel>{labelFor(entry)}</TagLabel>
                  <TagCloseButton
                    aria-label={`Remove ${entry.field} filter`}
                    onClick={() => clear(entry.field)}
                  />
                </Tag>
              </WrapItem>
            ))}
            <WrapItem>
              <Button size="xs" variant="link" onClick={clearAll}>
                Clear All
              </Button>
            </WrapItem>
          </Wrap>
        </Stack>
      )}
    </Box>
  );
}

export default ReportFilters;
