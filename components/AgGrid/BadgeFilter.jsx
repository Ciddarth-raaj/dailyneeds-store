import React, { useState, useEffect } from "react";
import { Box, Checkbox, VStack, Text } from "@chakra-ui/react";
import Badge from "../Badge";

/**
 * Custom AG Grid filter component for badge-column type
 * Follows AG Grid's new filter component pattern
 */
const BadgeFilter = ({ model, onModelChange, getValue, column, api }) => {
  const [uniqueBadges, setUniqueBadges] = useState([]);
  const selectedLabels = model?.values || [];

  // Extract unique badge values from the data
  useEffect(() => {
    if (!api || !column) return;

    const extractUniqueBadges = () => {
      const colDef = column.getColDef();
      const field = column.getColId();
      const valueGetter = colDef.valueGetter;
      const badges = new Map();

      // Use forEachNode to get all rows (not just filtered ones)
      api.forEachNode((node) => {
        if (!node || !node.data) return;

        let value;
        if (valueGetter) {
          // Use valueGetter if provided
          value = valueGetter({
            data: node.data,
            value: node.data?.[field],
            node: node,
            api: api,
            columnApi: null,
            context: null,
            colDef: colDef,
            column: column,
          });
        } else {
          // Fall back to field value
          value = node.data?.[field];
        }

        if (value && typeof value === "object" && value.label) {
          const label = value.label;
          if (!badges.has(label)) {
            badges.set(label, {
              label: label,
              colorScheme: value.colorScheme || "purple",
            });
          }
        }
      });

      // Sort badges by label
      const sortedBadges = Array.from(badges.values()).sort((a, b) =>
        a.label.localeCompare(b.label)
      );

      setUniqueBadges(sortedBadges);
    };

    // Extract unique badges initially
    extractUniqueBadges();

    // Update when data changes
    const onModelUpdated = () => {
      extractUniqueBadges();
    };

    api.addEventListener("filterChanged", onModelUpdated);
    api.addEventListener("rowDataUpdated", onModelUpdated);

    return () => {
      api.removeEventListener("filterChanged", onModelUpdated);
      api.removeEventListener("rowDataUpdated", onModelUpdated);
    };
  }, [api, column]);

  const handleLabelToggle = (label) => {
    const newSelectedLabels = selectedLabels.includes(label)
      ? selectedLabels.filter((l) => l !== label)
      : [...selectedLabels, label];

    // Update model - null means no filter, otherwise pass the values
    const newModel =
      newSelectedLabels.length === 0
        ? null
        : {
            filterType: "badge",
            values: newSelectedLabels,
          };

    // Call onModelChange - this triggers the filter
    onModelChange(newModel);
  };

  const handleSelectAll = () => {
    if (selectedLabels.length === uniqueBadges.length) {
      // Clear all
      onModelChange(null);
    } else {
      // Select all
      const allLabels = uniqueBadges.map((badge) => badge.label);
      onModelChange({
        filterType: "badge",
        values: allLabels,
      });
    }
  };

  const allSelected =
    uniqueBadges.length > 0 && selectedLabels.length === uniqueBadges.length;
  const someSelected =
    selectedLabels.length > 0 && selectedLabels.length < uniqueBadges.length;

  return (
    <Box p={3} minW="200px" maxH="400px" overflowY="auto">
      <VStack align="stretch" spacing={2}>
        <Checkbox
          isChecked={allSelected}
          isIndeterminate={someSelected}
          onChange={handleSelectAll}
        >
          <Text fontSize="sm" fontWeight="medium">
            Select All
          </Text>
        </Checkbox>

        <Box borderTop="1px solid" borderColor="gray.200" pt={2} />

        {uniqueBadges.length === 0 ? (
          <Text fontSize="sm" color="gray.500">
            No badges found
          </Text>
        ) : (
          uniqueBadges.map((badge) => {
            const isSelected = selectedLabels.includes(badge.label);

            return (
              <Checkbox
                key={badge.label}
                isChecked={isSelected}
                onChange={() => handleLabelToggle(badge.label)}
              >
                <Badge size="md" colorScheme={badge.colorScheme || "purple"}>
                  {badge.label}
                </Badge>
              </Checkbox>
            );
          })
        )}
      </VStack>
    </Box>
  );
};

/**
 * Filter handler that implements the filtering logic
 * Reference: https://www.ag-grid.com/react-data-grid/component-filter/#filter-handler
 */
export const badgeFilterHandler = (params) => {
  // Store column and colDef from the handler params
  const column = params.column;
  const colDef = params.colDef;
  const field = column.getColId();
  const valueGetter = colDef.valueGetter;

  // Store current model - will be updated via refresh()
  // Initialize with the model from params (could be null initially)
  let currentModel = params.model || null;

  return {
    // Called when the model changes
    refresh(newParams) {
      currentModel = newParams.model;
    },

    doesFilterPass(filterParams) {
      // If no model or no values selected, show all rows
      if (
        !currentModel ||
        !currentModel.values ||
        currentModel.values.length === 0
      ) {
        return true;
      }

      const node = filterParams.node;

      if (!node || !node.data) {
        return false;
      }

      let value;
      if (valueGetter) {
        // Use valueGetter if provided
        value = valueGetter({
          data: node.data,
          value: node.data?.[field],
          node: node,
          api: params.api,
          columnApi: params.columnApi,
          context: params.context,
          colDef: colDef,
          column: column,
        });
      } else {
        // Fall back to field value
        value = node.data?.[field];
      }

      if (!value || typeof value !== "object" || !value.label) {
        return false;
      }

      return currentModel.values.includes(value.label);
    },

    getModelAsString() {
      if (
        !currentModel ||
        !currentModel.values ||
        currentModel.values.length === 0
      ) {
        return "";
      }
      return currentModel.values.join(", ");
    },
  };
};

BadgeFilter.displayName = "BadgeFilter";

export default BadgeFilter;
