import React, { useEffect, useState } from "react";
import {
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Select,
  IconButton,
} from "@chakra-ui/react";
import Badge from "../Badge";
import { PRIORITY_LIST, STATUS_LIST } from "../../constants/workItems";

/** Quick views, expressed as the filter patch each one applies. */
const QUICK_FILTERS = [
  { key: "all", label: "All", patch: {} },
  { key: "open", label: "Open", patch: { is_open: true } },
  { key: "overdue", label: "Overdue", patch: { overdue: true } },
  { key: "unassigned", label: "Unassigned", patch: { unassigned: true } },
];

/**
 * Search, quick views and dropdown filters for a work-item list.
 *
 * All of it drives server-side filters that the API already supports, so a
 * phone never has to download the whole table to find one item.
 */
function WorkItemFilters({
  value,
  onChange,
  outlets = [],
  departments = [],
  showTypeFilter = false,
  rightSection,
}) {
  const [searchDraft, setSearchDraft] = useState(value.search || "");

  // Debounce so a request doesn't fire on every keystroke over mobile data.
  useEffect(() => {
    const timer = setTimeout(() => {
      if ((value.search || "") !== searchDraft) {
        onChange({ ...value, search: searchDraft, offset: 0 });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchDraft]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the box in step when the parent resets filters.
  useEffect(() => {
    setSearchDraft(value.search || "");
  }, [value.search]);

  const patch = (changes) => onChange({ ...value, ...changes, offset: 0 });

  const activeQuickKey = () => {
    if (value.overdue) return "overdue";
    if (value.unassigned) return "unassigned";
    if (value.is_open) return "open";
    return "all";
  };

  const applyQuick = (quick) => {
    patch({
      is_open: undefined,
      overdue: undefined,
      unassigned: undefined,
      ...quick.patch,
    });
  };

  const hasFilters =
    value.search ||
    value.status ||
    value.priority ||
    value.outlet_id ||
    value.department_id ||
    value.item_type ||
    value.is_open ||
    value.overdue ||
    value.unassigned;

  return (
    <Flex direction="column" gap="10px" mb="16px">
      <Flex gap="10px" direction={{ base: "column", md: "row" }}>
        <InputGroup size="sm" flex="1">
          <InputLeftElement height="38px" pointerEvents="none">
            <i className="fa fa-search" style={{ color: "#A0AEC0" }} />
          </InputLeftElement>
          <Input
            height="38px"
            borderRadius="6px"
            fontSize="sm"
            placeholder="Search title or description..."
            value={searchDraft}
            aria-label="Search work items"
            onChange={(event) => setSearchDraft(event.target.value)}
          />
          {searchDraft ? (
            <InputRightElement height="38px">
              <IconButton
                size="xs"
                variant="ghost"
                aria-label="Clear search"
                icon={<i className="fa fa-times" />}
                onClick={() => setSearchDraft("")}
              />
            </InputRightElement>
          ) : null}
        </InputGroup>

        {rightSection}
      </Flex>

      {/* Quick views read as chips on a phone and stay tappable at 40px high. */}
      <Flex gap="8px" flexWrap="wrap">
        {QUICK_FILTERS.map((quick) => {
          const active = activeQuickKey() === quick.key;
          return (
            <Button
              key={quick.key}
              size="sm"
              height="34px"
              borderRadius="999px"
              fontSize="xs"
              variant={active ? "solid" : "outline"}
              colorScheme={active ? "purple" : "gray"}
              onClick={() => applyQuick(quick)}
            >
              {quick.label}
            </Button>
          );
        })}

        {hasFilters ? (
          <Button
            size="sm"
            height="34px"
            borderRadius="999px"
            fontSize="xs"
            variant="ghost"
            colorScheme="red"
            onClick={() =>
              onChange({
                ...value,
                search: "",
                status: undefined,
                priority: undefined,
                outlet_id: undefined,
                department_id: undefined,
                item_type: undefined,
                is_open: undefined,
                overdue: undefined,
                unassigned: undefined,
                offset: 0,
              })
            }
          >
            Clear
          </Button>
        ) : null}
      </Flex>

      <Flex
        gap="8px"
        flexWrap="wrap"
        direction={{ base: "column", sm: "row" }}
      >
        <FilterSelect
          label="Status"
          value={value.status}
          options={STATUS_LIST}
          onChange={(status) => patch({ status })}
        />
        <FilterSelect
          label="Priority"
          value={value.priority}
          options={PRIORITY_LIST}
          onChange={(priority) => patch({ priority })}
        />
        <FilterSelect
          label="Branch"
          value={value.outlet_id}
          options={outlets.map((item) => ({
            id: item.outlet_id,
            value: item.outlet_name,
          }))}
          onChange={(outlet_id) => patch({ outlet_id })}
        />
        <FilterSelect
          label="Department"
          value={value.department_id}
          options={departments.map((item) => ({
            id: item.id,
            value: item.department,
          }))}
          onChange={(department_id) => patch({ department_id })}
        />
        {showTypeFilter ? (
          <FilterSelect
            label="Type"
            value={value.item_type}
            options={[
              { id: "ticket", value: "Tickets" },
              { id: "task", value: "Tasks" },
            ]}
            onChange={(item_type) => patch({ item_type })}
          />
        ) : null}
      </Flex>
    </Flex>
  );
}

function FilterSelect({ label, value, options, onChange }) {
  return (
    <Select
      size="sm"
      height="38px"
      borderRadius="6px"
      fontSize="sm"
      bg="white"
      flex={{ base: "1 1 auto", sm: "0 1 170px" }}
      value={value ?? ""}
      aria-label={label}
      placeholder={label}
      onChange={(event) => onChange(event.target.value || undefined)}
    >
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.value}
        </option>
      ))}
    </Select>
  );
}

export default WorkItemFilters;
