import React, { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { FixedSizeList as VirtualList } from "react-window";
import {
  Input,
  Box,
  useOutsideClick,
  FormControl,
  FormLabel,
} from "@chakra-ui/react";

/**
 * A dropdown that allows searching/filtering within options.
 * @param {Object} props
 * @param {string} [props.label] - Label text
 * @param {Array<{ id: string|number, value: string }>} props.options - Options list
 * @param {string|number} [props.value] - Selected option id
 * @param {function} [props.onChange] - (id) => void when selection changes
 * @param {string} [props.placeholder] - Placeholder when nothing selected
 * @param {boolean} [props.isDisabled] - Disable the control
 * @param {string} [props.size] - Chakra size (sm, md, lg)
 * @param {string} [props.name] - Input name (for Formik)
 * @param {function} [props.customRenderer] - (option) => ReactNode to render each list row
 * @param {function} [props.renderSelected] - (option) => string to show in input when option selected
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

  const selectedOption = options.find(
    (opt) => opt != null && (String(opt.id) === String(value) || opt.id === value)
  );
  const displayText = selectedOption
    ? typeof renderSelected === "function"
      ? renderSelected(selectedOption)
      : selectedOption.value ?? ""
    : "";

  const filteredOptions = search.trim()
    ? options.filter((opt) =>
        String(opt.value || "")
          .toLowerCase()
          .includes(search.toLowerCase())
      )
    : options;

  const handleSelect = (id) => {
    onChangeRef.current?.(id);
    setSearch("");
    setIsOpen(false);
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
    isOpen && filteredOptions.length > 0 ? (
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
          height={Math.min(LIST_HEIGHT, filteredOptions.length * ROW_HEIGHT)}
          width={dropdownPosition.width}
          itemCount={filteredOptions.length}
          itemSize={ROW_HEIGHT}
          overscanCount={5}
        >
          {({ index, style }) => {
            const opt = filteredOptions[index];
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
              >
                {typeof customRenderer === "function"
                  ? customRenderer(opt)
                  : opt.value}
              </Box>
            );
          }}
        </VirtualList>
      </Box>
    ) : isOpen && filteredOptions.length === 0 && search.trim() ? (
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
        <Input
          key={`selected-${value}`}
          name={name}
          size={size}
          height="40px"
          borderRadius="6px"
          fontSize="sm"
          bg="white"
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
          _disabled={{ opacity: 0.8, cursor: "not-allowed" }}
        />
      </Box>
      {typeof document !== "undefined" &&
        createPortal(dropdownContent, document.body)}
    </FormControl>
  );
}

export default SearchableDropdown;
