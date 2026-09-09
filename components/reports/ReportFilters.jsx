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
import {
  COMMON_FILTER_FIELDS,
  isEmptyFilter,
  pruneFilters,
} from "../../util/reportFilterRules";

/**
 * Reports — the filters on a report.
 *
 * ================================================== TWO KINDS, NOT ONE =====
 *
 * COMMON filters - Employment Status, Outlet, Department, Designation and
 * Search - are always here, whether or not the matching column is displayed.
 * They are operational controls belonging to the report run: narrowing a
 * Bank/KYC report to one branch does not require Outlet to be one of its
 * columns, and removing a column must never take one of them away. They are
 * the only Employee Master fields this file knows by name, and it is allowed
 * to because each maps onto a backend filter key that predates the catalogue.
 *
 * DYNAMIC filters are any other field, offered only while it is a column of
 * the report - a Bank/KYC report offers a Bank Name filter and a Contact
 * report does not. Removing the column removes the filter, and the backend
 * refuses a dynamic filter on an unselected column in any case, so a filter
 * nobody can see on screen cannot narrow the count.
 *
 * ============================================== THE CONTROLS ARE THE SERVER'S
 *
 * Even for the four common ones, the LABEL and the OPTIONS come from the
 * catalogue entry the server sent. This file names four keys; it does not
 * describe any field. There is no second list of Employee Master fields in
 * React to fall out of step with the backend, and a field the server did not
 * send cannot be rendered at all.
 *
 * ==================================================== AND, AND SAID PLAINLY ==
 *
 * Every filter narrows further; none widens. The chips underneath spell out
 * what is applied - common and dynamic alike - because "12 employees found"
 * with invisible filters is how somebody exports the wrong spreadsheet.
 */

/** Order the four are shown in. Their meaning comes from the catalogue. */
const COMMON_ORDER = ["employment_status", "outlet", "department", "designation"];

export { pruneFilters, isEmptyFilter };

function ReportFilters({
  /** Catalogue groups as the server described them, for this caller. */
  groups,
  /** The report's currently selected column keys, in order. */
  selectedKeys,
  /** Dynamic filters: `[{ field, value }]` / `[{ field, from, to }]`. */
  fieldFilters,
  onChange,
  /** `{ status, outlet_ids, department_ids, designation_ids, search }`. */
  common,
  onCommonChange,
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

  const active = fieldFilters || [];
  const valueOf = (key) => active.find((f) => f.field === key) || null;

  /**
   * Eligible dynamic filters = selected AND filterable AND authorized, minus
   * the four already shown as common ones - which must never appear twice.
   */
  const dynamic = useMemo(
    () =>
      (selectedKeys || [])
        .map((k) => byKey.get(k))
        .filter((f) => f && f.filter && !COMMON_FILTER_FIELDS[f.key]),
    [selectedKeys, byKey]
  );

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

  const setCommon = (patch) => onCommonChange({ ...common, ...patch });

  const optionsFor = (field) => {
    if (field.filter.type === "enum") return field.filter.options || [];
    return (masters && masters[field.filter.master]) || [];
  };

  /* ------------------------------------------------------ common controls */

  const commonControl = (key) => {
    const field = byKey.get(key);
    // A field the server did not send is not rendered. In practice all four
    // are ungated, so this is a guard rather than a common path.
    if (!field || !field.filter) return null;

    const stateKey = COMMON_FILTER_FIELDS[key];

    if (stateKey === "status") {
      return (
        <Select
          size="sm"
          value={common.status || "active"}
          onChange={(e) => setCommon({ status: e.target.value })}
        >
          {(field.filter.options || []).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      );
    }

    const ids = common[stateKey] || [];
    return (
      <Select
        size="sm"
        value={ids[0] || ""}
        placeholder={`All ${field.label.toLowerCase()}`}
        onChange={(e) => setCommon({ [stateKey]: e.target.value ? [Number(e.target.value)] : [] })}
      >
        {optionsFor(field).map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    );
  };

  /* ----------------------------------------------------- dynamic controls */

  const control = (field) => {
    const current = valueOf(field.key);
    const type = field.filter.type;

    if (type === "enum" || type === "master") {
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
              value:
                type === "master"
                  ? e.target.value
                    ? [Number(e.target.value)]
                    : []
                  : e.target.value,
            })
          }
        >
          {optionsFor(field).map((o) => (
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

    return (
      <Input
        size="sm"
        placeholder={type === "id" ? "Exact" : "Contains"}
        value={(current && current.value) || ""}
        onChange={(e) => setFilter(field.key, { value: e.target.value })}
      />
    );
  };

  /* ------------------------------------------------------------- the chips */

  const labelOfCommon = (key) => {
    const field = byKey.get(key);
    const stateKey = COMMON_FILTER_FIELDS[key];
    const label = field ? field.label : key;

    if (stateKey === "status") {
      const opt = field && (field.filter.options || []).find((o) => o.value === common.status);
      return `${label}: ${opt ? opt.label : common.status}`;
    }
    const id = (common[stateKey] || [])[0];
    const opt = field && optionsFor(field).find((o) => String(o.value) === String(id));
    return `${label}: ${opt ? opt.label : id}`;
  };

  const labelOfDynamic = (entry) => {
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

  // A common filter is "applied" when it narrows: an explicit status other
  // than the default, a chosen id, or a search term.
  const commonChips = COMMON_ORDER.filter((key) => {
    const stateKey = COMMON_FILTER_FIELDS[key];
    if (stateKey === "status") return common.status && common.status !== "active";
    return ((common[stateKey] || []).length) > 0;
  });

  const anyChip = commonChips.length > 0 || active.length > 0 || Boolean(common.search);

  const clearCommon = (key) => {
    const stateKey = COMMON_FILTER_FIELDS[key];
    setCommon(stateKey === "status" ? { status: "active" } : { [stateKey]: [] });
  };

  const clearAll = () => {
    onCommonChange({
      status: "active",
      outlet_ids: [],
      department_ids: [],
      designation_ids: [],
      search: "",
    });
    onChange([]);
  };

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

      {/* ------------------------------------------------ always available */}
      <SimpleGrid columns={{ base: 1, md: 2, xl: 4 }} spacingX="12px" spacingY="8px">
        {COMMON_ORDER.map((key) => {
          const field = byKey.get(key);
          if (!field || !field.filter) return null;
          return (
            <Box key={key}>
              <Text fontSize="11px" color="gray.600" marginBottom="2px">
                {field.label}
              </Text>
              {commonControl(key)}
            </Box>
          );
        })}

        <Box>
          <Text fontSize="11px" color="gray.600" marginBottom="2px">
            Search
          </Text>
          <Input
            size="sm"
            placeholder="Name or Employee ID"
            value={common.search || ""}
            onChange={(e) => setCommon({ search: e.target.value })}
          />
        </Box>
      </SimpleGrid>

      {/* ----------------------------------- the report's own columns */}
      {dynamic.length > 0 && (
        <Box marginTop="8px">
          <Button size="xs" variant="link" colorScheme="purple" onClick={() => setShowMore((v) => !v)}>
            {showMore ? "− Fewer filters" : `+ More Filters (${dynamic.length})`}
          </Button>
          {showMore && (
            <SimpleGrid
              columns={{ base: 1, md: 2, xl: 4 }}
              spacingX="12px"
              spacingY="8px"
              marginTop="8px"
            >
              {dynamic.map((field) => (
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

      {anyChip && (
        <Stack spacing="4px" marginTop="10px">
          <Text fontSize="11px" color="gray.600">
            Active filters:
          </Text>
          <Wrap spacing="6px">
            {commonChips.map((key) => (
              <WrapItem key={key}>
                <Tag size="sm" colorScheme="gray" borderRadius="full">
                  <TagLabel>{labelOfCommon(key)}</TagLabel>
                  <TagCloseButton
                    aria-label={`Remove ${key} filter`}
                    onClick={() => clearCommon(key)}
                  />
                </Tag>
              </WrapItem>
            ))}
            {common.search ? (
              <WrapItem>
                <Tag size="sm" colorScheme="gray" borderRadius="full">
                  <TagLabel>Search: {common.search}</TagLabel>
                  <TagCloseButton
                    aria-label="Remove search filter"
                    onClick={() => setCommon({ search: "" })}
                  />
                </Tag>
              </WrapItem>
            ) : null}
            {active.map((entry) => (
              <WrapItem key={entry.field}>
                <Tag size="sm" colorScheme="purple" borderRadius="full">
                  <TagLabel>{labelOfDynamic(entry)}</TagLabel>
                  <TagCloseButton
                    aria-label={`Remove ${entry.field} filter`}
                    onClick={() => onChange(active.filter((f) => f.field !== entry.field))}
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
