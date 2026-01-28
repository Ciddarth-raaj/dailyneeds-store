import React, { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  Box,
  Checkbox,
  VStack,
  Text,
  Button,
  Input,
  InputGroup,
  InputLeftElement,
  HStack,
  Badge,
  Divider,
} from "@chakra-ui/react";
import { ChevronDownIcon } from "@chakra-ui/icons";

/**
 * Custom AG Grid filter component for dropdown filter type
 * Extracts unique values from rows and displays them in a dropdown
 */
const DropdownFilter = React.memo(({ model, onModelChange, getValue, column, api }) => {
  const [uniqueValues, setUniqueValues] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [localSelectedValues, setLocalSelectedValues] = useState(() => model?.values || []);
  const selectedValues = isOpen ? localSelectedValues : (model?.values || []);
  const dropdownRef = useRef(null);
  const buttonRef = useRef(null);
  const positionRef = useRef({ top: 0, left: 0, width: 0 });
  const positionLockedRef = useRef(false);
  const rafIdRef = useRef(null);

  // Sync local state with model when model changes externally
  useEffect(() => {
    if (!isOpen) {
      setLocalSelectedValues(model?.values || []);
    }
  }, [model, isOpen]);

  // Extract unique values from the data
  useEffect(() => {
    if (!api || !column) return;

    const extractUniqueValues = () => {
      const colDef = column.getColDef();
      const field = column.getColId();
      const valueGetter = colDef.valueGetter;
      const values = new Set();

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

        // Convert value to string and add to set (handles null/undefined)
        const stringValue = value !== null && value !== undefined ? String(value) : "";
        if (stringValue !== "") {
          values.add(stringValue);
        }
      });

      // Sort values
      const sortedValues = Array.from(values).sort((a, b) =>
        a.localeCompare(b)
      );

      setUniqueValues(sortedValues);
    };

    // Extract unique values initially
    extractUniqueValues();

    // Update when data changes
    const onModelUpdated = () => {
      extractUniqueValues();
    };

    api.addEventListener("filterChanged", onModelUpdated);
    api.addEventListener("rowDataUpdated", onModelUpdated);

    return () => {
      api.removeEventListener("filterChanged", onModelUpdated);
      api.removeEventListener("rowDataUpdated", onModelUpdated);
    };
  }, [api, column]);

  const commitChanges = useCallback((values) => {
    const newModel =
      values.length === 0
        ? null
        : {
            filterType: "dropdown",
            values: values,
          };

    onModelChange(newModel);
  }, [onModelChange]);

  const handleValueToggle = useCallback((value, e) => {
    e?.stopPropagation();
    e?.preventDefault();
    
    setLocalSelectedValues((prev) => {
      return prev.includes(value)
        ? prev.filter((v) => v !== value)
        : [...prev, value];
    });
  }, []);

  const handleSelectAll = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    const filteredValues = getFilteredValues();
    
    setLocalSelectedValues((prev) => {
      if (prev.length === filteredValues.length && 
          filteredValues.every(v => prev.includes(v))) {
        return [];
      } else {
        return [...new Set([...prev, ...filteredValues])];
      }
    });
  }, [getFilteredValues]);

  const handleClearAll = useCallback((e) => {
    e?.stopPropagation();
    e?.preventDefault();
    setLocalSelectedValues([]);
    setSearchTerm("");
  }, []);

  // Open dropdown immediately when component mounts (AgGrid filter is clicked)
  useEffect(() => {
    if (!isOpen) {
      setLocalSelectedValues(model?.values || []);
      setIsOpen(true);
    }
  }, [isOpen, model?.values]);

  const handleToggle = useCallback(() => {
    if (isOpen) {
      // On close, commit changes
      commitChanges(localSelectedValues);
      setIsOpen(false);
    }
  }, [isOpen, localSelectedValues, commitChanges]);

  // Calculate and lock dropdown position - render directly below the filter cell
  useEffect(() => {
    if (isOpen && buttonRef.current && dropdownRef.current) {
      const lockPosition = () => {
        if (!buttonRef.current || !dropdownRef.current) return;
        
        const buttonRect = buttonRef.current.getBoundingClientRect();
        const dropdown = dropdownRef.current;
        
        // Lock position if not already locked
        if (!positionLockedRef.current) {
          positionRef.current = {
            top: buttonRect.bottom,
            left: buttonRect.left,
            width: Math.max(buttonRect.width, 280),
          };
          positionLockedRef.current = true;
        }
        
        // Apply locked position
        dropdown.style.position = 'fixed';
        dropdown.style.top = `${positionRef.current.top}px`;
        dropdown.style.left = `${positionRef.current.left}px`;
        dropdown.style.width = `${positionRef.current.width}px`;
        dropdown.style.zIndex = '9999';
        dropdown.style.maxHeight = '400px';
        dropdown.style.minWidth = '280px';
        dropdown.style.transform = 'none';
        dropdown.style.willChange = 'auto';
      };
      
      // Initial position calculation
      const timeoutId = setTimeout(() => {
        lockPosition();
        // Keep position locked using requestAnimationFrame
        const lockLoop = () => {
          if (dropdownRef.current && positionLockedRef.current) {
            dropdownRef.current.style.top = `${positionRef.current.top}px`;
            dropdownRef.current.style.left = `${positionRef.current.left}px`;
            rafIdRef.current = requestAnimationFrame(lockLoop);
          }
        };
        rafIdRef.current = requestAnimationFrame(lockLoop);
      }, 10);
      
      // Update position on scroll/resize (unlock temporarily)
      const handleScroll = () => {
        if (buttonRef.current && dropdownRef.current) {
          const buttonRect = buttonRef.current.getBoundingClientRect();
          positionRef.current = {
            top: buttonRect.bottom,
            left: buttonRect.left,
            width: Math.max(buttonRect.width, 280),
          };
        }
      };
      
      const handleResize = handleScroll;
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        clearTimeout(timeoutId);
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }
        positionLockedRef.current = false;
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      const target = event.target;
      
      // Check if click is outside both dropdown and button
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target);
      const isOutsideButton = buttonRef.current && !buttonRef.current.contains(target);
      
      // Also check if click is on AgGrid filter panel close button or other AgGrid elements
      const isAgGridFilterClose = target.closest('.ag-filter-apply-panel') || 
                                   target.closest('.ag-popup') ||
                                   target.closest('[ref="eFilterWrapper"]');
      
      if (isOutsideDropdown && isOutsideButton && !isAgGridFilterClose) {
        event.stopPropagation();
        commitChanges(localSelectedValues);
        setIsOpen(false);
      }
    };

    // Use capture phase to catch events before AgGrid
    document.addEventListener('mousedown', handleClickOutside, true);
    document.addEventListener('click', handleClickOutside, true);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
      document.removeEventListener('click', handleClickOutside, true);
    };
  }, [isOpen, localSelectedValues, commitChanges]);

  const getFilteredValues = React.useCallback(() => {
    if (!searchTerm) return uniqueValues;
    const lowerSearch = searchTerm.toLowerCase();
    return uniqueValues.filter((value) =>
      value.toLowerCase().includes(lowerSearch)
    );
  }, [searchTerm, uniqueValues]);

  const filteredValues = getFilteredValues();
  const allSelected =
    filteredValues.length > 0 &&
    filteredValues.every((val) => selectedValues.includes(val));
  const someSelected =
    filteredValues.some((val) => selectedValues.includes(val)) &&
    !allSelected;

  // Display text - show local selections while menu is open, model values when closed
  const displayText = React.useMemo(() => {
    const values = isOpen ? localSelectedValues : (model?.values || []);
    return values.length === 0
      ? "All"
      : values.length === 1
      ? values[0]
      : `${values.length} selected`;
  }, [isOpen, localSelectedValues, model?.values]);

  const hasSelectedValues = React.useMemo(() => {
    const values = isOpen ? localSelectedValues : (model?.values || []);
    return values.length > 0;
  }, [isOpen, localSelectedValues, model?.values]);

  const selectedCount = React.useMemo(() => {
    const values = isOpen ? localSelectedValues : (model?.values || []);
    return values.length;
  }, [isOpen, localSelectedValues, model?.values]);


  return (
    <>
      <Box 
        ref={buttonRef}
        position="absolute"
        top={0}
        left={0}
        width="100%"
        height="100%"
        pointerEvents="none"
      />
      {isOpen && typeof document !== 'undefined' && createPortal(
        <Box
          ref={dropdownRef}
          overflowY="auto"
          boxShadow="lg"
          border="1px solid"
          borderColor="gray.200"
          borderRadius="md"
          bg="white"
          position="fixed"
          zIndex={9999}
        >
            <Box p={3}>
              <VStack align="stretch" spacing={3}>
                {/* Search input */}
                <InputGroup size="sm">
                  <InputLeftElement pointerEvents="none" color="gray.400">
                    <Text fontSize="xs">🔍</Text>
                  </InputLeftElement>
                  <Input
                    placeholder="Search values..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => e.stopPropagation()}
                    bg="white"
                    borderColor="gray.200"
                    _focus={{ borderColor: "purple.400", boxShadow: "0 0 0 1px var(--chakra-colors-purple-400)" }}
                  />
                </InputGroup>

                {/* Select All / Clear buttons */}
                <HStack justify="space-between" align="center">
                  <Checkbox
                    isChecked={allSelected}
                    isIndeterminate={someSelected}
                    onChange={handleSelectAll}
                    size="sm"
                    colorScheme="purple"
                  >
                    <Text fontSize="sm" fontWeight="semibold" color="gray.700">
                      Select All
                    </Text>
                  </Checkbox>
                  {selectedValues.length > 0 && (
                    <Button
                      size="xs"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={handleClearAll}
                      fontWeight="medium"
                      _hover={{ bg: "purple.50" }}
                    >
                      Clear
                    </Button>
                  )}
                </HStack>

                <Divider borderColor="gray.200" />

                {/* Values list */}
                <Box maxH="280px" overflowY="auto">
                  {filteredValues.length === 0 ? (
                    <Box p={4} textAlign="center">
                      <Text fontSize="sm" color="gray.500">
                        {searchTerm ? "No matches found" : "No values found"}
                      </Text>
                    </Box>
                  ) : (
                    <VStack align="stretch" spacing={1}>
                      {filteredValues.map((value) => {
                        const isSelected = selectedValues.includes(value);

                        return (
                          <Box
                            key={value}
                            px={2}
                            py={1.5}
                            borderRadius="md"
                            _hover={{ bg: isSelected ? "purple.50" : "gray.50" }}
                            cursor="pointer"
                            onClick={(e) => handleValueToggle(value, e)}
                          >
                            <Checkbox
                              isChecked={isSelected}
                              onChange={(e) => handleValueToggle(value, e)}
                              size="sm"
                              colorScheme="purple"
                              width="100%"
                            >
                              <Text 
                                fontSize="sm" 
                                isTruncated
                                color={isSelected ? "purple.700" : "gray.700"}
                                fontWeight={isSelected ? "medium" : "normal"}
                              >
                                {value}
                              </Text>
                            </Checkbox>
                          </Box>
                        );
                      })}
                    </VStack>
                  )}
                </Box>
              </VStack>
            </Box>
          </Box>,
        document.body
      )}
    </>
  );
}, (prevProps, nextProps) => {
  // Only re-render if model values actually change (not just reference)
  const prevValues = prevProps.model?.values || [];
  const nextValues = nextProps.model?.values || [];
  
  if (prevValues.length !== nextValues.length) return false;
  if (prevValues.some((v, i) => v !== nextValues[i])) return false;
  
  // Re-render if column or api changes
  if (prevProps.column !== nextProps.column) return false;
  if (prevProps.api !== nextProps.api) return false;
  
  // Don't re-render for other prop changes (like onModelChange reference)
  return true;
});

/**
 * Filter handler that implements the filtering logic
 * Reference: https://www.ag-grid.com/react-data-grid/component-filter/#filter-handler
 */
export const dropdownFilterHandler = (params) => {
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

      // Convert value to string for comparison
      const stringValue =
        value !== null && value !== undefined ? String(value) : "";

      return currentModel.values.includes(stringValue);
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

DropdownFilter.displayName = "DropdownFilter";

export default DropdownFilter;
