import React from "react";
import { Button, Flex, FormControl, FormLabel, Select } from "@chakra-ui/react";
import { hasFilters } from "../../../util/payrollDashboard";

/**
 * The three global filters - Location, Department, Designation, each "All" by
 * default - and Clear Filters. They apply to every panel.
 *
 * THE CHOICES ARE THE SERVER'S: the branches, departments and designations
 * that exist among the month's employees in the caller's scope, each narrowed
 * by the choice before it. Nothing outside the caller's branches is offered.
 */
function FilterSelect({ label, value, options, onChange, isDisabled }) {
  return (
    <FormControl minW={{ base: "100%", md: "200px" }} maxW={{ md: "260px" }}>
      <FormLabel fontSize="xs" color="gray.600" mb={1}>
        {label}
      </FormLabel>
      <Select size="sm" value={value} onChange={(e) => onChange(e.target.value)} isDisabled={isDisabled} aria-label={label}>
        <option value="">All</option>
        {(options || []).map((o) => (
          <option key={o.id} value={o.id}>
            {o.name}
            {o.count ? ` (${o.count})` : ""}
          </option>
        ))}
      </Select>
    </FormControl>
  );
}

export default function DashboardFilterBar({ filters, options, onChange, onClear, loading }) {
  const opts = options || {};
  return (
    <Flex gap={3} wrap="wrap" align="flex-end">
      <FilterSelect
        label="Location"
        value={filters.store_id}
        options={opts.locations}
        onChange={(v) => onChange("store_id", v)}
        isDisabled={loading && !opts.locations}
      />
      <FilterSelect
        label="Department"
        value={filters.department_id}
        options={opts.departments}
        onChange={(v) => onChange("department_id", v)}
        isDisabled={loading}
      />
      <FilterSelect
        label="Designation"
        value={filters.designation_id}
        options={opts.designations}
        onChange={(v) => onChange("designation_id", v)}
        isDisabled={loading}
      />
      <Button size="sm" variant="outline" onClick={onClear} isDisabled={!hasFilters(filters)}>
        Clear Filters
      </Button>
    </Flex>
  );
}
