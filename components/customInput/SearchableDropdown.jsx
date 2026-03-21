import React, { useState, useRef, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { FixedSizeList as VirtualList } from "react-window";
import {
  Input,
  Box,
  Flex,
  Tag,
  TagLabel,
  TagCloseButton,
  useOutsideClick,
  FormControl,
  FormLabel,
  InputGroup,
  InputRightElement,
  IconButton,
} from "@chakra-ui/react";
import { CheckIcon, CloseIcon } from "@chakra-ui/icons";

/**
 * A dropdown that allows searching/filtering within options.
 * @param {Object} props
 * @param {string} [props.label] - Label text
 * @param {Array<{ id: string|number, value: string }>} props.options - Options list
 * @param {string|number|Array<string|number>} [props.value] - Selected id(s); array when multiple
 * @param {function} [props.onChange] - (id|null) or (id[]) when multiple
 * @param {boolean} [props.multiple=false] - If true, value/onChange use arrays of option ids
 * @param {string} [props.placeholder] - Placeholder when nothing selected
 * @param {boolean} [props.isDisabled] - Disable the control
 * @param {string} [props.size] - Chakra size (sm, md, lg)
 * @param {string} [props.name] - Input name (for Formik)
 * @param {function} [props.customRenderer] - (option) => ReactNode to render each list row
 * @param {function} [props.renderSelected] - (option) => string to show in input when option selected
 * @param {boolean} [props.showClearButton=true] - Show a clear control when a value is selected
 */
function SearchableDropdown({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Search or select...",
  isDisabled = false,
  size = "sm",
  name,
  customRenderer,
  renderSelected,
  showClearButton = true,
  multiple = false,
  ...rest
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
  });
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useOutsideClick({
    ref: containerRef,
    handler: (e) => {
      // Don't close when clicking inside the portal dropdown (it's outside containerRef in DOM)
      try {
        if (e?.target && dropdownRef.current?.contains(e.target)) return;
      } catch (_) {}
      setIsOpen(false);
    },
  });

  const selectedIds = useMemo(() => {
    if (multiple) {
      if (!Array.isArray(value)) return [];
      return value.filter(
        (v) =>
          v !== null &&
          v !== undefined &&
          v !== "" &&
          !(typeof v === "number" && Number.isNaN(v))
      );
    }
    if (
      value === null ||
      value === undefined ||
      value === "" ||
      (typeof value === "number" && Number.isNaN(value))
    ) {
      return [];
    }
    return [value];
  }, [multiple, value]);

  const isOptionSelected = (id) =>
    selectedIds.some((s) => String(s) === String(id));

  const selectedOptions = useMemo(
    () =>
      selectedIds
        .map((id) =>
          options.find(
            (opt) => opt != null && String(opt.id) === String(id)
          )
        )
        .filter(Boolean),
    [options, selectedIds]
  );

  const displayText = useMemo(() => {
    if (multiple) {
      if (selectedOptions.length === 0) return "";
      if (selectedOptions.length <= 2) {
        return selectedOptions
          .map((opt) =>
            typeof renderSelected === "function"
              ? renderSelected(opt)
              : opt.value ?? String(opt.id)
          )
          .join(", ");
      }
      return `${selectedOptions.length} selected`;
    }
    const selectedOption = selectedOptions[0];
    return selectedOption
      ? typeof renderSelected === "function"
        ? renderSelected(selectedOption)
        : selectedOption.value ?? ""
      : "";
  }, [multiple, selectedOptions, renderSelected]);

  const hasValue = selectedIds.length > 0;

  const handleClear = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    onChangeRef.current?.(multiple ? [] : null);
    setSearch("");
    setIsOpen(false);
  };

  const handleRemoveOne = (id) => {
    if (!multiple) return;
    const next = selectedIds.filter((s) => String(s) !== String(id));
    onChangeRef.current?.(next);
  };

  const filteredOptions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? options.filter((opt) =>
          String(opt.value || "").toLowerCase().includes(q)
        )
      : options;
  }, [options, search]);

  /** Selected options first (order follows value), then remaining — applies to single & multiple */
  const orderedListOptions = useMemo(() => {
    if (selectedIds.length === 0) return filteredOptions;
    const selectedSet = new Set(selectedIds.map(String));
    const selectedInOrder = [];
    selectedIds.forEach((id) => {
      const opt = filteredOptions.find(
        (o) => o != null && String(o.id) === String(id)
      );
      if (opt) selectedInOrder.push(opt);
    });
    const unselected = filteredOptions.filter(
      (opt) => !selectedSet.has(String(opt.id))
    );
    return [...selectedInOrder, ...unselected];
  }, [filteredOptions, selectedIds]);

  const handleSelect = (id) => {
    if (!multiple) {
      onChangeRef.current?.(id);
      setSearch("");
      setIsOpen(false);
      return;
    }
    const next = isOptionSelected(id)
      ? selectedIds.filter((s) => String(s) !== String(id))
      : [...selectedIds, id];
    onChangeRef.current?.(next);
    setSearch("");
  };

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  // Position dropdown in portal (viewport coordinates for position: fixed)
  useEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setDropdownPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen]);

  const ROW_HEIGHT = customRenderer ? 56 : 44;
  const LIST_HEIGHT = 240;

  const dropdownContent =
    isOpen && orderedListOptions.length > 0 ? (
      <Box
        ref={dropdownRef}
        position="fixed"
        top={dropdownPosition.top}
        left={dropdownPosition.left}
        width={dropdownPosition.width}
        zIndex={9999}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="6px"
        boxShadow="md"
        overflow="hidden"
      >
        <VirtualList
          height={Math.min(
            LIST_HEIGHT,
            orderedListOptions.length * ROW_HEIGHT
          )}
          width={dropdownPosition.width}
          itemCount={orderedListOptions.length}
          itemSize={ROW_HEIGHT}
          overscanCount={5}
        >
          {({ index, style }) => {
            const opt = orderedListOptions[index];
            return (
              <Box
                as="div"
                style={style}
                px={3}
                cursor="pointer"
                fontSize="sm"
                borderBottomWidth="1px"
                borderColor="gray.50"
                _hover={{ bg: "purple.50" }}
                _active={{ bg: "purple.100" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt.id);
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSelect(opt.id);
                }}
                display="flex"
                alignItems="center"
                lineHeight="1.2"
                justifyContent="space-between"
                gap={2}
                bg={multiple && isOptionSelected(opt.id) ? "purple.50" : undefined}
              >
                <Box minW={0} flex={1}>
                  {typeof customRenderer === "function"
                    ? customRenderer(opt)
                    : opt.value}
                </Box>
                {multiple && isOptionSelected(opt.id) ? (
                  <CheckIcon color="var(--chakra-colors-purple-600)" boxSize={3} />
                ) : null}
              </Box>
            );
          }}
        </VirtualList>
      </Box>
    ) : isOpen && orderedListOptions.length === 0 && search.trim() ? (
      <Box
        ref={dropdownRef}
        position="fixed"
        top={dropdownPosition.top}
        left={dropdownPosition.left}
        width={dropdownPosition.width}
        zIndex={9999}
        bg="white"
        borderWidth="1px"
        borderColor="gray.200"
        borderRadius="6px"
        boxShadow="md"
        px={3}
        py={3}
        fontSize="sm"
        color="gray.500"
      >
        No matches
      </Box>
    ) : null;

  return (
    <FormControl isDisabled={isDisabled} {...rest}>
      {label && (
        <FormLabel fontSize="sm" fontWeight={600} color="gray.600" letterSpacing="0.01em" mb={1.5}>
          {label}
        </FormLabel>
      )}
      <Box ref={containerRef} position="relative" width="100%">
        <InputGroup size={size}>
          <Input
            key={
              multiple
                ? `m-${selectedIds.join(",")}`
                : `selected-${value}`
            }
            name={name}
            size={size}
            height="40px"
            borderRadius="6px"
            fontSize="sm"
            bg="white"
            pr={showClearButton && hasValue && !isDisabled ? 9 : undefined}
            value={isOpen ? search : displayText}
            onChange={(e) => {
              const v = e.target.value;
              if (isOpen) {
                setSearch(v);
              } else {
                setIsOpen(true);
                setSearch(v);
              }
            }}
            onFocus={() => setIsOpen(true)}
            placeholder={placeholder}
            isDisabled={isDisabled}
            autoComplete="off"
            focusBorderColor="purple.400"
            _placeholder={{ color: "gray.500" }}
            _disabled={{ opacity: 0.8, cursor: "not-allowed" }}
          />
          {showClearButton && hasValue && !isDisabled ? (
            <InputRightElement
              width="2.25rem"
              height="40px"
              pr={1}
              pointerEvents="auto"
            >
              <IconButton
                type="button"
                aria-label="Clear selection"
                icon={<CloseIcon boxSize={2.5} />}
                size="xs"
                variant="ghost"
                colorScheme="gray"
                borderRadius="md"
                minW="1.75rem"
                h="1.75rem"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onClick={handleClear}
              />
            </InputRightElement>
          ) : null}
        </InputGroup>
        {multiple && selectedOptions.length > 0 ? (
          <Box mt={2}>
            <Box
              fontSize="xs"
              fontWeight={600}
              color="gray.500"
              textTransform="uppercase"
              letterSpacing="0.04em"
              mb={1.5}
            >
              Selected ({selectedOptions.length})
            </Box>
            <Flex wrap="wrap" gap={2}>
              {selectedOptions.map((opt) => (
                <Tag
                  key={String(opt.id)}
                  size="sm"
                  colorScheme="purple"
                  borderRadius="md"
                  maxW="100%"
                >
                  <TagLabel isTruncated maxW="220px">
                    {typeof renderSelected === "function"
                      ? renderSelected(opt)
                      : opt.value ?? String(opt.id)}
                  </TagLabel>
                  {!isDisabled ? (
                    <TagCloseButton
                      aria-label={`Remove ${opt.value ?? opt.id}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveOne(opt.id);
                      }}
                    />
                  ) : null}
                </Tag>
              ))}
            </Flex>
          </Box>
        ) : null}
      </Box>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </FormControl>
  );
}

export default SearchableDropdown;
